// Handler HTTP yang dipakai dua tempat:
// 1. Vercel Function -> api/chat.js
// 2. Vite dev server  -> vite.config.js
// Jadi logic-nya cuma satu, mudah dibaca dan diubah.

import { createHash } from "node:crypto";
import {
  askAI,
  askAIParalel,
  providerAktif,
  alasanGagalTerakhir,
  RECOMMEND_SYSTEM_PROMPT,
  SEARCH_SYSTEM_PROMPT,
  SEARCH_DETAIL_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  PLAN_FIELDS_SYSTEM_PROMPT,
  CREATE_PLAN_SYSTEM_PROMPT,
  DEFAULT_IMAGE_FOOD,
  DEFAULT_IMAGE_OUTDOOR,
} from "./aiProviders.js";
import {
  jawabanDuniaDariPesan,
  pusatDunia,
  batasJumlah,
  WORLD_CITIES,
} from "./worldKnowledge.js";
import {
  getRecommendationCandidates,
  mapsLinkFor,
  searchCityKey,
  resolveCity,
  normalizeText,
  cityLabels,
} from "../src/api/plannerEngine.js";
import { fotoTempat, linkMaps } from "./placeMedia.js";
import { googleAktif, fotoGoogle, balasanDariGoogle } from "./googlePlaces.js";
import { geoapifyAktif } from "./geoapify.js";
import { MODULES } from "../src/utils/tripModules.js";
import {
  pertanyaanDobel,
  terpotong,
  rapikanAkhir,
  catatanKoreksi,
} from "./qualityGuard.js";
import {
  kumpulkanLapangan,
  perkuatRencana,
  blokKebutuhan,
  cocokkanNama,
  tempatDalamTeks,
  keKartuPeta,
  jawabanTempatRekreasi,
  perluCekLokasiFilm,
  cariFaktaLokasiFilm,
} from "./liveKnowledge.js";

// Pesan yang layak diberi data lapangan (peta nyata). Obrolan ringan tidak.
const TOPIK_PERJALANAN =
  /(wisata|tempat|places?\b|jalan-jalan|liburan|trip|itinerar|rute|makan|kuliner|restaurant|restoran|cafe|kafe|hotel|nginap|menginap|penginapan|cuaca|biaya|budget|rencana|rekomendasi|destinasi|kunjung|dekat|murah|gratis|umroh|umrah|ibadah|masjid|mosque|pantai|beach|waterfall|gunung|museum|taman|park|zoo|aquarium|mall|market|shopping|theme park|water ?park|amusement park|attraction|landmark|places to visit|things to see|things to do|where to|where is|where are|eat|stay|berapa hari|hari di|ada apa|mau ke|pergi ke|ke sana)/i;
const PERTANYAAN_DAFTAR_TEMPAT =
  /\b(tempat|place|wisata|restaurant|restoran|cafe|kafe|hotel|taman|park|zoo|aquarium|museum|pantai|beach|mosque|masjid|mall|market|shopping|rekomendasi|attraction|landmark|places to visit|things to see|things to do|di mana|dimana|where is|where are)\b/i;

// Permintaan tempat spesifik (makan, ibadah, belanja, menginap, dll). Kalau Google Maps
// aktif, pertanyaan seperti ini WAJIB dijawab dari hasil Google, bukan dari ingatan AI.
const MINTA_TEMPAT =
  /\b(tempat|place|wisata|restaurant|restoran|resto|rumah makan|warung|kedai|cafe|kafe|kopi|coffee|kuliner|makan|makanan|nasi|bakso|sate|soto|ayam|padang|minang|halal|hotel|penginapan|villa|hostel|masjid|mosque|musholla|mushola|surau|taman|park|zoo|aquarium|museum|pantai|beach|air terjun|waterfall|mall|market|pasar|toko|supermarket|oleh oleh|souvenir|atm|apotek|rumah sakit|bandara|stasiun|rekomendasi|attraction|landmark|places to visit|things to do|nongkrong|tongkrongan|dekat|terdekat|nearby)\b/i;

/**
 * Ubah pesan user jadi kueri Google Maps. Kata basa-basi dibuang; kalau pesan tidak
 * menyebut lokasi, tujuan dari profil trip ditempel supaya pencarian tidak melenceng.
 */
export function kueriGoogle(message = "", fakta = null) {
  let q = String(message || "")
    .replace(/[?!]+/g, " ")
    .replace(/\b(bro|bang|brother|sis|kak|min|sih|dong|deh|nih|tuh|ya|yah|kan|gak|nggak|tolong|please|pls|plis|kira kira|kira-kira|bisa gak|bisa tidak|boleh tau|boleh tahu)\b/gi, " ")
    .replace(/\b(kasih(?:\s?tahu|\s?tau)?|carikan|cariin|cari|sebutkan|sebutin|tunjukkan|tunjukin|rekomendasikan|rekomendasiin)\s+(?:aku|saya|gue|gw)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  const adaLokasi = /\b(?:di|in|ke|near|dekat|sekitar|around|terdekat)\s+\p{L}/iu.test(q);
  const tujuan = fakta?.destinations?.[0];
  if (!adaLokasi && tujuan) q = `${q} di ${tujuan}`.trim();
  return q;
}

/** Teks yang HANYA ditulis user (bukan jawaban AI), dipakai membaca kebutuhan. */
function teksUser(history = [], message = "") {
  return [
    ...history.filter((h) => (h?.role || "user") === "user").map((h) => h?.text || ""),
    message,
  ].join(" ");
}

const RATE_WINDOW = 60 * 1000; // 1 menit
const RATE_LIMIT = 10; // maksimal 10 request/menit per IP

// Tidak ada cache jawaban: setiap prompt selalu diproses AI.
// Data terverifikasi tetap dipakai, tetapi sebagai KONTEKS, bukan jawaban jadi.
const requests = new Map(); // ip -> { count, resetAt }

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

// Vercel sudah mengurai body, Vite belum. Tangani keduanya.
function readJson(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(JSON.parse(req.body));

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
    req.on("error", reject);
  });
}

function hashIp(req) {
  const ip =
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function fallbackReply() {
  return "Maaf, AI SETAPAK sedang sibuk. Coba lagi sebentar ya.";
}

/* ------------------------------------------------------------------ */
/* Mode Searching & Planning                                           */
/* ------------------------------------------------------------------ */

// AI kadang membungkus JSON array dengan ```json ... ``` atau kalimat pembuka.
function bacaJsonArrayAI(text) {
  const mulai = String(text || "").indexOf("[");
  if (mulai === -1) return null;
  let s = String(text).slice(mulai);
  const akhir = s.lastIndexOf("]");
  if (akhir > 0) s = s.slice(0, akhir + 1);
  try {
    const hasil = JSON.parse(s);
    return Array.isArray(hasil) ? hasil : null;
  } catch {
    return null;
  }
}

const infoModul = (id) => {
  const m = MODULES.find((item) => item.id === id);
  return m ? { id: m.id, no: m.no, name: m.name } : null;
};

// Fallback kalau AI sedang gagal: tetap 3 modul paling dasar, bukan teks acak.
const FIELD_DEFAULT = [
  {
    key: "tema",
    module: infoModul("overview"),
    label: "Trip ini temanya apa — santai, keluarga, atau petualangan?",
    type: "select",
    options: ["Santai", "Keluarga", "Petualangan", "Kuliner", "Budaya"],
    reason: "Menentukan arah seluruh rencana",
    placeholder: "",
  },
  {
    key: "durasi",
    module: infoModul("dates"),
    label: "Mau berapa hari, atau dari tanggal berapa?",
    type: "text",
    reason: "Dasar penyusunan jadwal harian",
    placeholder: "",
  },
  {
    key: "budget",
    module: infoModul("budget"),
    label: "Kira-kira total budget perjalanan ini berapa?",
    type: "text",
    reason: "Menentukan akomodasi & aktivitas",
    placeholder: "",
  },
];

function bersihkanModul(raw, key = "", label = "") {
  if (raw && typeof raw === "object") {
    const dariId = infoModul(String(raw.id || "").trim());
    if (dariId) return dariId;
    const dariNo = MODULES.find((m) => m.no === Number(raw.no));
    if (dariNo) return infoModul(dariNo.id);
  }
  const teks = `${String(raw || "")} ${key} ${label}`.toLowerCase();
  const aturan = [
    ["destination", /kota|tujuan|destinasi|negara|provinsi|area|tempat/],
    ["dates", /tanggal|hari|durasi|kapan|malam|date/],
    ["budget", /budget|biaya|anggaran|uang/],
    ["accommodation", /hotel|villa|hostel|menginap|akomodasi/],
    ["transportation", /transport|pesawat|kereta|mobil|moda/],
    ["food", /makan|kuliner|restoran|food/],
    ["activities", /alam|aktivitas|wisata|minat|suasana|petualangan/],
    ["documents", /paspor|visa|dokumen/],
    ["packing", /barang|packing|bawa/],
    ["safety", /darurat|alergi|kontak|safety/],
    ["overview", /orang|tema|skala|nama/],
  ];
  const cocok = aturan.find(([, pola]) => pola.test(teks));
  return infoModul(cocok?.[0] || "overview");
}

function parsePlanFields(text) {
  const raw = bacaJsonArrayAI(text);
  if (!raw) return FIELD_DEFAULT;
  const bersih = raw
    .slice(0, 5)
    .map((item) => {
      const key = String(item?.key || "").trim().slice(0, 24);
      const label = String(item?.label || "").trim().slice(0, 90);
      return {
        key,
        module: bersihkanModul(item?.module, key, label),
        label,
        type: ["text", "number", "date", "select"].includes(item?.type)
          ? item.type
          : "text",
        reason: String(item?.reason || "").trim().slice(0, 60),
        placeholder: String(item?.placeholder || "").trim().slice(0, 60),
        // Pilihan cepat juga dari AI, untuk semua tipe field — bukan contoh
        // hardcoded di browser.
        ...(Array.isArray(item.options) && item.options.length
          ? { options: item.options.slice(0, 6).map((o) => String(o).slice(0, 40)) }
          : {}),
      };
    })
    .filter((item) => item.key && item.label);
  return bersih.length ? bersih : FIELD_DEFAULT;
}

/* ------------------------------------------------------------------ */
/* Profil trip: satu-satunya "ingatan" tentang data yang sudah ada      */
/* ------------------------------------------------------------------ */
// Browser mengirim profil hasil extractTripFacts() dari SEMUA pesan user.
// Server memakainya untuk menolak pertanyaan dobel dan memberi konteks ke AI.
// Kalau client lama tidak mengirim profil, semua logika masih jalan seperti
// sebelumnya lewat regex pada riwayat.

function bersihkanFakta(raw = {}) {
  if (!raw || typeof raw !== "object") return null;
  const daftar = (nilai, batas = 8) =>
    Array.isArray(nilai)
      ? nilai.slice(0, batas).map((item) => String(item).slice(0, 40)).filter(Boolean)
      : [];
  const teks = (nilai, batas = 80) =>
    typeof nilai === "string" ? nilai.trim().slice(0, batas) : null;
  const angka = Number(raw.days);
  const destinations = daftar(raw.destinations, 6);
  const daysByDestination =
    raw.daysByDestination && typeof raw.daysByDestination === "object"
      ? Object.fromEntries(
          Object.entries(raw.daysByDestination)
            .filter(([nama]) => destinations.includes(nama))
            .map(([nama, hari]) => [String(nama).slice(0, 40), Number(hari)])
            .filter(([, hari]) => Number.isInteger(hari) && hari > 0 && hari <= 30)
        )
      : {};

  const hasil = {
    destinations,
    destinationLabel: teks(raw.destinationLabel, 80),
    days: Number.isFinite(angka) && angka > 0 ? Math.min(30, Math.round(angka)) : null,
    daysByDestination,
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate || "")) ? raw.startDate : null,
    occasion: teks(raw.occasion, 60),
    budget: teks(raw.budget, 60),
    budgetScope: ["per orang", "total perjalanan"].includes(raw.budgetScope)
      ? raw.budgetScope
      : null,
    budgetTicket: ["tanpa tiket", "termasuk tiket"].includes(raw.budgetTicket)
      ? raw.budgetTicket
      : null,
    food: teks(raw.food, 60),
    purpose: teks(raw.purpose, 40),
    tema: teks(raw.tema, 40),
    companions: teks(raw.companions, 40),
    specialNeeds: teks(raw.specialNeeds, 120),
    knownKeys: daftar(raw.knownKeys),
    knownModules: daftar(raw.knownModules),
  };
  const adaIsi =
    hasil.destinations.length ||
    hasil.days ||
    hasil.startDate ||
    hasil.budget ||
    hasil.food ||
    hasil.occasion ||
    hasil.specialNeeds ||
    hasil.knownKeys.length;
  return adaIsi ? hasil : null;
}

function formatFakta(fakta) {
  if (!fakta) return "";
  const baris = [];
  const tujuan = fakta.destinationLabel || fakta.destinations.join(" + ");
  if (tujuan) baris.push(`- Tujuan: ${tujuan}`);
  if (fakta.days) baris.push(`- Durasi: ${fakta.days} hari`);
  const durasiTujuan = Object.entries(fakta.daysByDestination || {})
    .map(([nama, hari]) => `${nama} ${hari} hari`)
    .join(", ");
  if (durasiTujuan) baris.push(`- Pembagian durasi: ${durasiTujuan}`);
  if (fakta.startDate) baris.push(`- Mulai tanggal: ${fakta.startDate}`);
  if (fakta.occasion) baris.push(`- Momen/waktu: ${fakta.occasion}`);
  if (fakta.budget) {
    baris.push(`- Budget: ${fakta.budget}${fakta.budgetScope ? ` (${fakta.budgetScope})` : ""}`);
  }
  if (fakta.budgetTicket) {
    baris.push(`- Cakupan budget: ${fakta.budgetTicket === "tanpa tiket" ? "TANPA tiket pesawat (jangan masukkan tiket pesawat ke total budget; tampilkan perkiraannya terpisah)" : "SUDAH termasuk tiket pesawat (masukkan tiket pergi-pulang ke total budget)"}`);
  }
  if (fakta.food) baris.push(`- Makanan: ${fakta.food}`);
  if (fakta.purpose) baris.push(`- Karakter perjalanan: ${fakta.purpose}`);
  if (fakta.tema) baris.push(`- Tema/gaya: ${fakta.tema}`);
  if (fakta.companions) baris.push(`- Pendamping: ${fakta.companions}`);
  if (fakta.specialNeeds) baris.push(`- Kebutuhan khusus/kesehatan: ${fakta.specialNeeds}`);
  if (fakta.knownKeys.length) baris.push(`- Topik yang sudah diketahui: ${fakta.knownKeys.join(", ")}`);
  if (!baris.length) return "";

  return (
    `\n\n=== PROFIL TRIP (SUDAH DIKETAHUI — JANGAN DITANYAKAN LAGI) ===\n` +
    `${baris.join("\n")}\n` +
    `Gunakan profil ini apa adanya. Jangan menanyakan ulang topik di atas, ` +
    `jangan mengganti jumlah hari, dan jangan menyarankan kota lain sebagai pengganti.\n` +
    `=== AKHIR PROFIL ===`
  );
}

const KUNCI_TOPIK = {
  kota: /kota|tujuan|destinasi|city|country|area|lokasi/,
  durasi: /durasi|hari|tanggal|date|waktu|nights|minggu/,
  budget: /budget|biaya|anggaran|cost|uang/,
  tema: /tema|theme|skala|companion|nama/,
  makanan: /makan|food|kuliner|alergi/,
  safety: /safety|darurat|kesehatan|medis|alergi|kebutuhan khusus|disabilitas/,
  dokumen: /dokumen|paspor|visa|document/,
  transport: /transport|moda|pesawat|kereta/,
  akomodasi: /hotel|akomodasi|menginap|accommodation/,
};

function topikSudahAda(key = "", knownKeys = []) {
  const nilai = String(key || "").toLowerCase();
  return knownKeys.some((kunci) => KUNCI_TOPIK[kunci]?.test(nilai));
}

/** Searching yang sebenarnya minta riset rencana (bukan tanya fakta singkat). */
function butuhRiset(normalized = "", fakta = null) {
  const teks = String(normalized || "");
  const durasi =
    Boolean(fakta?.days && fakta.days >= 3) ||
    /\b([3-9]|10)\s*(hari|days?|minggu)\b/.test(teks);
  const kataRencana =
    /(rencanain|rencana|itinerary|bantu susun|bikin jadwal|kasih saran|sarankan|bantu atur)/.test(teks);
  const topikRencana =
    /(budget|anggaran|biaya|makan|kuliner|hotel|akomodasi|transport|tiket|hari)/.test(teks);
  return durasi && (kataRencana || topikRencana);
}

/* ------------------------------------------------------------------ */
/* Verifikasi pilihan jawaban dari AI                                   */
/* ------------------------------------------------------------------ */
// AI bebas merangkai pertanyaan & pilihan, tapi pilihannya tetap dicek
// terhadap data kurasi. Tujuannya: trip ke Jepang tidak boleh ditawari
// Bogor/Jogja/Bandung/Bali, dan tidak boleh muncul nama tempat karangan.

const KOTA_LOKAL = [
  "bogor", "jogja", "yogyakarta", "bandung", "bali", "jakarta",
  "depok", "bekasi", "malang", "semarang", "surabaya", "kuta",
];

const NEGERI_LUAR = [
  "amerika", "usa", "palestina", "makkah", "mekah", "mecca", "arab",
  "jepang", "japan", "singapura", "malaysia", "thailand", "korea",
  "china", "eropa", "australia", "turki", "mesir",
];

export function konteksTujuan(history = [], message = "", fakta = null) {
  const gabung = [
    ...history.filter((h) => h?.role === "user").map((h) => h.text || ""),
    String(message || ""),
  ]
    .join(" ")
    .toLowerCase();
  const tujuanFakta = Array.isArray(fakta?.destinations) ? fakta.destinations.join(" ") : "";
  const seluruhPesanUser = `${gabung} ${tujuanFakta}`.trim();
  // Kota luar negeri (kunci worldKnowledge) lebih dulu.
  const luar = Object.keys(WORLD_CITIES).find((k) => seluruhPesanUser.includes(k));
  if (luar) return { key: luar, luarNegeri: !KOTA_LOKAL.includes(luar) };
  const negeri = NEGERI_LUAR.find((k) => seluruhPesanUser.includes(k));
  if (negeri) return { key: negeri, luarNegeri: true };
  const lokal = KOTA_LOKAL.find((k) => seluruhPesanUser.includes(k));
  return lokal ? { key: lokal, luarNegeri: false } : { key: null, luarNegeri: false };
}

function tokenTerverifikasi(kota) {
  const tokens = new Set([kota]);
  const dunia = WORLD_CITIES[kota];
  if (dunia) {
    dunia.places.forEach((p) => {
      tokens.add(normalizeText(p.name));
      String(p.area || "")
        .split(/[,\s]+/)
        .filter((a) => a.length > 2)
        .forEach((a) => tokens.add(normalizeText(a)));
    });
  }
  [...getRecommendationCandidates("in", kota), ...getRecommendationCandidates("near", kota)]
    .forEach((p) => tokens.add(normalizeText(p.name)));
  return tokens;
}

function verifikasiOpsi(options = [], tujuan = {}) {
  if (!Array.isArray(options)) return [];
  const { key, luarNegeri } = tujuan;
  const tokens = key ? tokenTerverifikasi(key) : null;
  const hasil = [];
  for (const opsi of options) {
    const teks = String(opsi).trim();
    if (!teks || teks.length > 70) continue;
    const norm = normalizeText(teks);

    // 1. Jangan tawarkan kota Indonesia kalau tujuannya luar negeri.
    if (luarNegeri && KOTA_LOKAL.some((k) => norm.includes(k))) continue;

    // 2. Kalau opsi itu nama tempat/kota yang dikenal data kurasi tapi bukan
    //    milik tujuan ini, tolak (anti halusinasi lintas destinasi).
    if (tokens) {
      const namaDikenal = Object.values(WORLD_CITIES).some((c) =>
        c.places.some((p) => normalizeText(p.name) === norm)
      );
      const kotaDikenal = [...KOTA_LOKAL, ...Object.keys(WORLD_CITIES)].some((k) => norm === k);
      if ((namaDikenal || kotaDikenal) && !tokens.has(norm)) continue;
    }
    hasil.push(teks);
  }
  return hasil.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Jangan bertanya dua kali                                             */
/* ------------------------------------------------------------------ */
// Obrolan di mode Planning sudah mengumpulkan budget, waktu, dan tema.
// Saat form 15 modul dibuka, data itu tidak boleh ditanyakan lagi.

const BULAN =
  "januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember";

function infoSudahDijawab(history = [], fakta = null) {
  const teks = history
    .filter((h) => h.role === "user")
    .map((h) => String(h.text || ""))
    .join(" ")
    .toLowerCase();
  const dariTeks = {
    budget: /budget|anggaran|rp\.?\s*\d|\d+\s*(juta|rb|ribu)|biaya|uang/.test(teks),
    waktu: new RegExp(`\\d+\\s*(hari|malam|minggu)|${BULAN}|tanggal|kapan|mulai|durasi|akhir tahun|tahun baru|natal|lebaran`).test(teks),
    tema: /santai|keluarga|petualangan|kuliner|budaya|romantis|bulan madu|honeymoon|berdua|istri|suami|pasangan|tema|menikmati/.test(teks),
    safety: /kebutuhan khusus|kondisi kesehatan|alergi|hamil|disabilitas|kursi roda|lansia|medis|darurat/.test(teks),
  };
  if (!fakta) return dariTeks;

  const known = new Set(fakta.knownKeys || []);
  return {
    budget: dariTeks.budget || known.has("budget"),
    waktu: dariTeks.waktu || Boolean(fakta.days || fakta.startDate || fakta.occasion) || known.has("durasi"),
    tema: dariTeks.tema || known.has("tema"),
    makanan: known.has("makanan"),
    safety: dariTeks.safety || known.has("safety") || Boolean(fakta.specialNeeds),
    dokumen: known.has("dokumen"),
    transport: known.has("transport"),
    akomodasi: known.has("akomodasi"),
  };
}

function fieldsTanpaPengulangan(fields = [], history = [], fakta = null) {
  const sudah = infoSudahDijawab(history, fakta);
  const knownKeys = fakta?.knownKeys || [];
  const knownModules = fakta?.knownModules || [];
  const dilalui = {
    overview: sudah.tema,
    dates: sudah.waktu,
    budget: sudah.budget,
    food: Boolean(sudah.makanan),
    safety: Boolean(sudah.safety),
    documents: Boolean(sudah.dokumen),
    transportation: Boolean(sudah.transport),
    accommodation: Boolean(sudah.akomodasi),
  };

  // Satu modul hanya boleh ditanyakan sekali. Modul yang sudah ada di profil
  // (atau kuncinya sudah disebut user) dibuang sebelum fallback dihitung.
  const unik = [];
  for (const field of fields) {
    const modul = field.module?.id;
    if (!modul || dilalui[modul] || knownModules.includes(modul)) continue;
    if (knownKeys.includes(field.key) || topikSudahAda(field.key, knownKeys)) continue;
    if (unik.some((item) => item.module?.id === modul || item.key === field.key)) continue;
    unik.push(field);
  }
  if (unik.length >= 3) return unik.slice(0, 5);

  const hasil = [...unik];
  for (const field of fieldLanjutan(history, unik, fakta)) {
    if (hasil.length >= 5) break;
    if (hasil.some((item) => item.module?.id === field.module?.id || item.key === field.key)) continue;
    hasil.push(field);
  }
  return hasil;
}

// Cadangan pintar: isi slot dengan modul yang MASIH kurang, bukan mengulang
// tema/durasi/budget. Ikut menyesuaikan konteks (luar negeri -> dokumen).
function fieldLanjutan(history = [], yangAda = [], fakta = null) {
  const tujuan = konteksTujuan(history, "", fakta);
  const sudah = infoSudahDijawab(history, fakta);
  const dipakai = new Set([
    ...yangAda.map((f) => f.module?.id),
    ...(fakta?.knownModules || []),
  ]);
  const knownKeys = fakta?.knownKeys || [];
  const romantis = fakta?.tema === "romantis" || /romantis|honeymoon|bulan madu/.test(teksUser(history, ""));
  const calon = [
    {
      key: "safety",
      module: infoModul("safety"),
      label: "Apakah ada kebutuhan khusus atau kondisi kesehatan yang perlu kami perhatikan?",
      type: "text",
      options: ["Tidak ada", "Alergi makanan", "Butuh akses mudah", "Ada kondisi medis"],
      reason: "Menjaga kenyamanan dan keamanan",
    },
    {
      key: "akomodasi",
      module: infoModul("accommodation"),
      label:
        fakta?.purpose === "ibadah" &&
        fakta.destinations.includes("Makkah") &&
        fakta.destinations.includes("Madinah")
          ? "Untuk fokus ibadah, lebih memilih penginapan dekat masjid atau opsi hemat dengan shuttle?"
          : romantis
            ? "Untuk momen romantis ini, suasana penginapan seperti apa yang kamu cari?"
            : tujuan.luarNegeri
              ? `Untuk perjalanan ke ${tujuan.key}, area menginap seperti apa yang kamu prioritaskan?`
              : "Mau menginap di hotel, guesthouse, atau tempat lain?",
      type: "select",
      options:
        fakta?.purpose === "ibadah"
          ? ["Dekat masjid", "Lebih hemat dengan shuttle", "Belum ada preferensi"]
          : romantis
            ? ["Privat & tenang", "Dekat pusat kota", "View bagus", "Yang penting nyaman"]
            : ["Dekat pusat kota", "Dekat tempat wisata", "Area tenang", "Belum tentu"],
      reason: "Menentukan base camp harian",
    },
    {
      key: "transport",
      module: infoModul("transportation"),
      label: "Bagaimana cara menuju ke sana?",
      type: "select",
      options: ["Pesawat", "Kereta", "Mobil", "Bus"],
      reason: "Menghitung waktu tempuh",
    },
    {
      key: "dokumen",
      module: infoModul("documents"),
      label: "Apakah paspor dan visa sudah siap?",
      type: "select",
      options: ["Sudah siap", "Masih proses", "Belum tahu"],
      reason: "Syarat masuk negara tujuan",
    },
    {
      key: "makanan",
      module: infoModul("food"),
      label: "Ada preferensi makanan atau alergi yang harus dihindari?",
      type: "text",
      options: romantis
        ? ["Tidak ada", "Makanan lokal", "Dinner romantis", "Alergi tertentu"]
        : ["Tidak ada", "Alergi kacang", "Vegetarian", "Makanan lokal"],
      reason: "Menyesuaikan pilihan kuliner",
    },
  ];
  return calon
    .filter((f) => !dipakai.has(f.module.id))
    .filter((f) => !(f.module.id === "documents" && !tujuan.luarNegeri))
    .filter((f) => !(f.module.id === "budget" && sudah.budget))
    .filter((f) => !(f.module.id === "food" && sudah.makanan))
    .filter((f) => !(f.module.id === "transportation" && sudah.transport))
    .filter((f) => !(f.module.id === "accommodation" && sudah.akomodasi))
    .filter((f) => !knownKeys.includes(f.key) && !topikSudahAda(f.key, knownKeys))
    .slice(0, 3);
}

function parsePlanJson(text, fakta = null) {
  try {
    const raw = bacaJsonAI(text);
    if (!raw || !Array.isArray(raw.days) || raw.days.length === 0) return null;
    // Trip 10 hari harus tetap 10 hari — batas lama 7 memotong rencana user.
    const batasHari = fakta?.days ? Math.min(14, fakta.days) : 14;
    return {
      city: String(raw.city || "").slice(0, 80),
      days: raw.days.slice(0, batasHari).map((hari, index) => ({
        title: String(hari?.title || `Hari ${index + 1}`).slice(0, 60),
        places: (Array.isArray(hari?.places) ? hari.places : [])
          .slice(0, 3)
          .map((tempat) => ({
            name: String(tempat?.name || "Tempat wisata").slice(0, 80),
            category: String(tempat?.category || "lainnya").slice(0, 20),
            cost: Math.max(0, Number(tempat?.cost) || 0),
            durationHours: Math.max(1, Number(tempat?.durationHours) || 2),
            address: String(tempat?.address || "").slice(0, 140),
            ref: tempat?.ref ? String(tempat.ref).slice(0, 8) : null,
            why: String(tempat?.why || "").slice(0, 100),
            startTime: /^\d{1,2}:\d{2}$/.test(String(tempat?.startTime || ""))
              ? String(tempat.startTime)
              : "",
          })),
      })),
      totalCost: Math.max(0, Number(raw.totalCost) || 0),
      // Modul tambahan (transport/makanan/dokumen/budget) diteruskan ke
      // normalizePlan() di browser supaya plan yang tersimpan tidak hanya
      // berisi daftar tempat.
      ...(raw.modules && typeof raw.modules === "object" ? { modules: raw.modules } : {}),
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function rencanaSesuaiPembagian(plan, fakta, lapangan) {
  const pembagian = Object.entries(fakta?.daysByDestination || {});
  if (pembagian.length < 2) return true;

  const totalHari = pembagian.reduce((sum, [, hari]) => sum + hari, 0);
  if (!Array.isArray(plan?.days) || plan.days.length !== totalHari) return false;
  if (!(lapangan?.byId instanceof Map)) return false;

  let indeksHari = 0;
  for (const [destinasi, jumlahHari] of pembagian) {
    const tujuan = normalizeText(destinasi);
    for (let i = 0; i < jumlahHari; i += 1) {
      const tempat = plan.days[indeksHari]?.places || [];
      const semuaSesuai =
        tempat.length > 0 &&
        tempat.every((item) => {
          const rujukan = item.ref ? lapangan.byId.get(String(item.ref).toUpperCase()) : null;
          return (
            rujukan &&
            [rujukan.kota, rujukan.indukNegara].some(
              (nama) => normalizeText(nama || "") === tujuan
            )
          );
        });
      if (!semuaSesuai) return false;
      indeksHari += 1;
    }
  }
  return true;
}

function beriLabelPembagian(plan, fakta) {
  const pembagian = Object.entries(fakta?.daysByDestination || {});
  if (pembagian.length < 2) return plan;

  let indeksHari = 0;
  for (const [destinasi, jumlahHari] of pembagian) {
    for (let i = 0; i < jumlahHari; i += 1) {
      const hari = plan.days[indeksHari];
      if (!normalizeText(hari.title).includes(normalizeText(destinasi))) {
        hari.title = `${hari.title} · ${destinasi}`.slice(0, 60);
      }
      indeksHari += 1;
    }
  }

  const hilang = pembagian
    .map(([destinasi]) => destinasi)
    .filter((destinasi) => !normalizeText(plan.city).includes(normalizeText(destinasi)));
  if (hilang.length) {
    plan.city = `${plan.city ? `${plan.city} (` : ""}${hilang.join(" & ")}${plan.city ? ")" : ""}`.slice(0, 80);
  }
  return plan;
}

/**
 * Cadangan kalau AI lupa mengirim penanda <<SIAP>>: obrolan dianggap cukup
 * ketika tujuan + durasi/tanggal + (budget atau minat) sudah disebut user.
 */
// User secara eksplisit minta dibuatkan plan ("buatkan plan", "susun rencana",
// "create planning", ...): kartu Create Planning harus langsung muncul.
export const MINTA_BUAT_PLAN =
  /\b(buat(?:kan|in)?|bikin(?:kan|in)?|susun(?:kan)?|rancang(?:kan)?|create|generate|make)\b[^.\n]{0,40}\b(plan(?:ning)?|rencana|itinerary|jadwal|trip)\b/i;

function siapDariObrolan(history, message, fakta = null) {
  if (MINTA_BUAT_PLAN.test(String(message || ""))) return true;
  if (fakta) {
    const adaTujuan = fakta.destinations.length > 0 || fakta.knownKeys.includes("kota");
    const adaWaktu = Boolean(fakta.days || fakta.startDate) || fakta.knownKeys.includes("durasi");
    const adaMinat = Boolean(
      fakta.budget || fakta.food || fakta.tema ||
      fakta.knownKeys.some((key) => ["budget", "makanan", "tema"].includes(key))
    );
    if (adaTujuan && adaWaktu && adaMinat) return true;
  }

  const userText = history
    .filter((item) => item.role === "user")
    .map((item) => String(item.text || ""))
    .concat(message);
  if (userText.length < 2) return false;

  const gabung = userText.join(" ").toLowerCase();
  const adaWaktu =
    /\b\d{1,2}\s*(hari|days?)\b|\b(besok|lusa|weekend)\b|\d{4}-\d{1,2}-\d{1,2}|\b(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\b/.test(
      gabung
    );
  const adaBudgetAtauMinat =
    /\b(rb|ribu|juta|budget|rp|alam|nature|kuliner|food|budaya|culture|pantai|beach|gunung|museum|candi)\b/.test(
      gabung
    );
  const adaTujuan =
    /\b(kota|ke\s+[a-z]|[a-z]+\s+(kota|city)|trip|liburan|wisata|perjalanan)\b/.test(
      gabung
    );
  return adaWaktu && adaBudgetAtauMinat && adaTujuan;
}

/**
 * OpenStreetMap / Nominatim = geocoding GRATIS tanpa API key.
 * Dipakai supaya peta yang ditampilkan detail dan tidak butuh billing Google.
 */
const PUSAT_KOTA = {
  bogor: [-6.6, 106.8],
  yogyakarta: [-7.8, 110.36],
  bandung: [-6.92, 107.61],
  bali: [-8.65, 115.17],
  kuta: [-8.72, 115.17],
  makassar: [-5.14, 119.43],
  jakarta: [-6.2, 106.8],
  ...pusatDunia(),
};

function embedDenganMarker(lat, lon, lebar = 0.015) {
  const bbox = [lon - lebar, lat - lebar, lon + lebar, lat + lebar]
    .map((n) => n.toFixed(5))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
}

/** Cari satu titik di Nominatim; tolak hasil yang jauh dari kota yang diminta. */
async function cariTitik(query, pusat) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "SETAPAK/1.0 (travel planner)",
          "Accept-Language": "id",
        },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const data = await response.json();
    const lat = Number(data?.[0]?.lat);
    const lon = Number(data?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (pusat && (Math.abs(lat - pusat[0]) > 0.5 || Math.abs(lon - pusat[1]) > 0.5)) {
      return null;
    }
    return { lat, lon };
  } catch (error) {
    console.warn("[setapak] geocode gagal:", query, error.message);
    return null;
  }
}

/** Lengkapi satu nama tempat dengan koordinat & embed peta OpenStreetMap. */
async function petaUntuk(nama, label = "", pusat = null) {
  const konteks = [label, "Indonesia"].filter(Boolean).join(", ");
  const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${nama}, ${konteks}`)}`;
  let titik = await cariTitik(`${nama}, ${konteks}`, pusat);
  if (!titik && label) titik = await cariTitik(nama, pusat);

  if (!titik) {
    return {
      name: nama,
      osmUrl,
      embedUrl: pusat ? embedDenganMarker(pusat[0], pusat[1], 0.12) : null,
    };
  }
  return {
    name: nama,
    lat: titik.lat,
    lon: titik.lon,
    osmUrl,
    embedUrl: embedDenganMarker(titik.lat, titik.lon),
  };
}

/**
 * Nama yang jelas-jelas bukan destinasi wisata. Dipakai supaya jawaban AI
 * yang mengarang "Pegadaian", "bank", dll. tidak ikut masuk ke peta.
 */
const NAMA_SAMPAH =
  /\b(pegadaian|bank|atm|kantor|sekolah|kampus|rumah sakit|apotek|spbu|pom bensin|pinjaman|kredit|promo|diskon|jasa|toko hardware|mall|plaza)\b/i;

/**
 * AI tidak selalu patuh menulis baris LOKASI:. Kalau tidak ada, ambil nama
 * tempat dari daftar jawaban; kalau tetap kosong, pakai data planner lokal.
 * Dengan begini toggle "Peta" hampir pasti menampilkan peta.
 */
function namaTempatFallback(reply, kota, diperbolehkan = null) {
  // Hanya baris daftar (- / 1.) yang dianggap nama tempat. Judul, pertanyaan,
  // dan catatan DILARANG masuk kartu peta — kalau tidak, tiap kalimat jadi
  // kartu "Lihat tempat" seperti yang terjadi pada rencana Jepang.
  const dariJawaban = String(reply || "")
    .split("\n")
    .map((baris) => {
      if (!/^\s*([-*+]|\d+[.)])\s+/.test(baris)) return "";
      return baris
        .replace(/^\s*([-*+]|\d+[.)])\s+/, "")
        .replace(/\*\*/g, "")
        .split(/[—–,|]/)[0]
        .trim();
    })
    .filter(
      (nama) =>
        nama.length >= 4 &&
        nama.length <= 60 &&
        !/\?$/.test(nama) &&
        !NAMA_SAMPAH.test(nama) &&
        !/^(LOKASI|Catatan|Tips|Kesimpulan|Perencanaan|Rencana|Ringkasan|Checklist|Kota|Tanggal|Budget)\b/i.test(
          nama
        ) &&
        (!diperbolehkan || diperbolehkan.includes(nama))
    )
    .slice(0, 4);
  if (dariJawaban.length) return dariJawaban;

  const key = searchCityKey(kota);
  const lokal = [
    ...getRecommendationCandidates("in", key),
    ...getRecommendationCandidates("near", key),
  ];
  const unik = [...new Set(lokal.map((item) => item.name))];
  return unik.slice(0, 4);
}

const AREA_KOTA = {
  kuta: "Kuta",
  ubud: "Ubud",
  seminyak: "Seminyak",
  lembang: "Lembang",
  dago: "Dago",
  braga: "Braga",
  cikole: "Cikole",
  puncak: "Puncak",
  cisarua: "Cisarua",
  cibodas: "Cibodas",
};

function areaDariPesan(normalized) {
  return Object.keys(AREA_KOTA).find((area) => normalized.includes(area)) || null;
}

/**
 * Kandidat terverifikasi untuk satu kota. Diurutkan: sesuai area yang disebut
 * user (mis. Kuta), lalu yang paling relevan dengan minat, lalu rating tertinggi.
 */
function kandidatTerverifikasi(kotaKey, normalized) {
  const areaMode = /\b(sekitar|luar kota|near|sekitar kota)\b/.test(normalized)
    ? "near"
    : "in";
  const gabung = [
    ...getRecommendationCandidates(areaMode, kotaKey),
    ...getRecommendationCandidates(areaMode === "in" ? "near" : "in", kotaKey),
  ];
  const unik = [...new Map(gabung.map((item) => [item.name, item])).values()];

  const area = areaDariPesan(normalized);
  let hasil = unik;
  if (area) {
    const sesuai = unik.filter((item) =>
      `${item.name} ${item.address}`.toLowerCase().includes(area)
    );
    if (sesuai.length) hasil = [...sesuai, ...unik.filter((item) => !sesuai.includes(item))];
  }

  let minat = null;
  if (/\b(kuliner|makan|food|resto|warung|makanan)\b/.test(normalized)) minat = "food";
  else if (/\b(alam|nature|taman|gunung|hutan|pantai|beach)\b/.test(normalized)) minat = "alam";
  else if (/\b(budaya|culture|sejarah|keraton|museum)\b/.test(normalized)) minat = "culture";

  if (minat) {
    const cocok = hasil.filter((item) =>
      minat === "alam"
        ? ["nature", "adventure", "beach"].includes(item.category)
        : item.category === minat
    );
    if (cocok.length >= 2) hasil = [...cocok, ...hasil.filter((item) => !cocok.includes(item))];
  }
  return { daftar: hasil, area };
}

/** Jawaban Searching untuk kota yang datanya tersedia: 100% dari data lokal. */
function balasanKotaTerverifikasi(kotaKey, normalized) {
  const label = cityLabels[kotaKey] || kotaKey;
  const { daftar, area } = kandidatTerverifikasi(kotaKey, normalized);
  const judul = area ? `${AREA_KOTA[area]} - ${label}` : label;
  const atas = daftar.slice(0, batasJumlah(normalized, 5));

  const baris = atas
    .map(
      (item) =>
        `- **${item.name}** - ${item.address}. Rating **${Number(item.rating).toFixed(1)}/5**.`
    )
    .join("\n");

  return (
    `## Tempat di ${judul}\n\n${baris}\n\n` +
    `## Tips singkat\n` +
    `- Cek jam buka dan harga tiket sebelum berangkat.\n` +
    `- Nama di atas berasal dari data terverifikasi SETAPAK untuk ${label}.`
  );
}

/* ------------------------------------------------------------------ */
/* Data kurasi = KONTEKS AI (bukan jawaban jadi)                        */
/* ------------------------------------------------------------------ */

// Ditempel ke system prompt. AI tetap yang merangkai kalimat, tetapi tidak
// boleh mengarang nama tempat/lokasi di luar data yang dikirim server.
const GROUND_ATURAN = `
Untuk rekomendasi atau klaim tentang tempat wisata, restoran, hotel, atau POI lain, gunakan hanya nama dan lokasi yang tercantum di DATA LAPANGAN OpenStreetMap. Jangan mengambil nama tempat dari ingatan model atau daftar kurasi non-peta. Jika tempat tidak ditemukan di peta, katakan "belum terverifikasi di data peta"; jangan menyimpulkan bahwa tempat itu pasti tidak ada.
DATA TERVERIFIKASI SETAPAK dan pengetahuan umum bukan sumber pengganti untuk nama POI. DATA SUMBER khusus (mis. sumber film) hanya boleh dipakai untuk fakta non-POI yang memang tertulis di sana.
Untuk fakta yang tidak bisa diberikan peta (mis. harga, visa, atau jam operasional terkini), gunakan hanya sumber tepercaya yang disertakan. Jika tidak ada sumber, tandai sebagai perkiraan atau belum terverifikasi; jangan mengarang kepastian.
Ikuti "CARA PAKAI DATA LAPANGAN" dan blok KEBUTUHAN bila ada.
Tetap jawab ramah dan pakai format Markdown yang diminta system prompt. Ikuti panjang jawaban yang ditentukan system prompt (boleh panjang untuk riset rencana).`;

// Cadangan saat data peta kosong: jangan menyerah, cari di web (Gemini/Groq punya search bawaan)
// dan jawab dari hasil web yang benar-benar ada.
const WEB_TEMPAT_PROMPT = `Kamu asisten perjalanan SETAPAK. Data peta untuk permintaan ini KOSONG, jadi CARI DI WEB sekarang dan jawab dari hasil pencarian.
Beri sampai 5 tempat nyata (hotel/restoran/wisata sesuai permintaan) dengan format "- **Nama persis** — area/kota; info singkat dari sumber (kisaran harga bila ada)".
ATURAN: nama harus benar-benar muncul di hasil web; jangan mengarang nama, alamat, harga, atau jam buka. Kelas bintang hotel hanya disebut jika sumber menyatakannya; kalau tidak, tulis "kelas bintang perlu dicek". Kalau yang terverifikasi kurang dari 5, tampilkan yang ada dan katakan jujur — jangan menolak mentah-mentah.
Akhiri satu kalimat: harga & ketersediaan bisa berubah, cek lagi di Google Maps/situs resmi. Jangan menulis baris "LOKASI:". Bahasa sama dengan user, maksimal 200 kata, pakai "- " dan **tebal**, tanpa tabel dan tanpa "#".`;

// Data peta dianggap KOSONG kalau tidak ada satu pun tempat yang sejenis dengan yang diminta
// (mis. minta hotel tapi peta hanya mengembalikan masjid & jalan). Peta OSM tidak memuat hotel.
const JENIS_DIMINTA = [
  {
    minta: /\b(hotel|penginapan|villa|hostel|losmen|homestay|guest ?house|resort|menginap|nginap)\b/i,
    cocok: /(penginapan|hotel|hostel|villa|resort|\binn\b|lodg|guest|homestay|apartment|apartemen|suite|motel)/i,
  },
  {
    minta: /\b(restoran|restaurant|resto|rumah makan|warung|kedai|cafe|kafe|kuliner|makan|makanan)\b/i,
    cocok: /(kuliner|restoran|restaurant|resto|cafe|kafe|warung|rumah makan|kedai|food|coffee|kopi|bakery)/i,
  },
  { minta: /\b(masjid|mosque|musholla|mushola)\b/i, cocok: /(ibadah|masjid|mosque|mushola)/i },
];
export function lapanganRelevan(normalized, lapangan) {
  const places = lapangan?.places || [];
  if (!places.length) return false;
  const aturan = JENIS_DIMINTA.find((a) => a.minta.test(normalized));
  if (!aturan) return true;
  return places.some((p) => aturan.cocok.test(`${p.jenis || ""} ${p.name || ""} ${p.masakan || ""}`));
}

const GROUND_ATURAN_GOOGLE = `
Untuk rekomendasi atau klaim tentang tempat wisata, restoran, hotel, masjid, toko, atau POI lain, gunakan HANYA nama, alamat, rating, jumlah ulasan, dan status buka yang tercantum di DATA LAPANGAN Google Maps. Jangan mengambil nama tempat dari ingatan model atau daftar kurasi lain. Jika Google Maps tidak mengembalikan hasil yang cocok, katakan terus terang dan minta user memperjelas area/jenis tempat; jangan menebak dan jangan menyimpulkan bahwa tempat itu pasti tidak ada.
Untuk fakta yang tidak ada di Google Maps (harga, visa, jam operasional lengkap, kepemilikan usaha), jangan mengarang kepastian: tandai sebagai perkiraan atau arahkan cek ke Google Maps/situs resmi.
Ikuti "CARA PAKAI DATA LAPANGAN" dan blok KEBUTUHAN bila ada.
Tetap jawab ramah dan pakai format Markdown yang diminta system prompt. Ikuti panjang jawaban yang ditentukan system prompt (boleh panjang untuk riset rencana).`;

function konteksTerverifikasi({ label, daftar = [], area = null, fakta = null, batas = 5 }) {
  if (!label || !daftar.length) return "";
  const baris = daftar
    .slice(0, batas)
    .map((item, index) => {
      const areaTeks = item.area || item.address || "-";
      return `${index + 1}. ${item.name} | ${areaTeks}${item.category ? ` | ${item.category}` : ""}`;
    })
    .join("\n");
  const catatanArea = area
    ? `\nArea yang diminta user: ${area}. Utamakan tempat di area ini.`
    : "";
  const catatanFakta = fakta
    ? `\nFAKTA LOKASI: ${fakta.nama} berada di ${fakta.lokasi}${fakta.jarak ? `, ${fakta.jarak}` : ""}. Jangan sebut ${fakta.nama} berada di ${label}.`
    : "";
  return (
    `\n\n=== DATA TERVERIFIKASI SETAPAK ===\n` +
    `Destinasi: ${label}${catatanArea}\n` +
    `Nama tempat yang BOLEH disebut (salin apa adanya):\n${baris}\n` +
    `Jangan pakai nama atau alamat di luar daftar ini.${catatanFakta}\n` +
    `=== AKHIR DATA ===`
  );
}

export function namaTempatTidakAdaDiPeta(reply, lapangan, fakta = null) {
  const daftar = String(reply || "").matchAll(
    /^\s*(?:[-*+]|\d+[.)])\s+\*\*([^*]{2,100})\*\*/gm
  );
  const tersedia = lapangan?.places || [];
  const tujuan = [
    ...(lapangan?.dests || []).flatMap((dest) => [dest.name, dest.display]),
    ...(fakta?.destinations || []),
  ].filter(Boolean);
  const bukanNamaTempat = new Set([
    "akomodasi",
    "budget",
    "biaya",
    "lain-lain",
    "makan",
    "makanan",
    "perkiraan total",
    "tiket masuk",
    "tiket pesawat",
    "total",
    "transport",
    "transport darat",
  ]);
  return [...daftar]
    .map((item) => item[1].trim())
    .filter((nama) => {
      const namaNormal = normalizeText(nama);
      if (bukanNamaTempat.has(namaNormal)) return false;
      if (tujuan.some((label) => normalizeText(label) === namaNormal)) return false;
      return !cocokkanNama(nama, tersedia);
    });
}

const GROUP_KEYS = ["Coffe And Snacks", "Outdoor parks & Trials"];
const FOOD_KEY = GROUP_KEYS[0];

// URL Unsplash yang sudah dicek benar-benar mengembalikan image/jpeg (200).
// Dipakai untuk tempat di luar data lokal SETAPAK: AI sering mengarang URL
// Wikimedia yang ternyata 404/429, sehingga gambar tidak pernah tampil.
const GAMBAR_MAKANAN = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
];
const GAMBAR_ALAM = [
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600",
];

/**
 * Terima hanya URL langsung ke file gambar. AI kadang mengirim link artikel
 * atau string kosong; itu ditolak supaya <img> tidak rusak di browser.
 */
function gambarValid(url) {
  const teks = String(url || "").trim();
  if (!/^https?:\/\//i.test(teks)) return false;
  const bersih = teks.split(/[?#]/)[0];
  return /\.(jpe?g|png|webp|gif)$/i.test(bersih) || /wikimedia|unsplash|gstatic/i.test(teks);
}

/**
 * AI kadang terpotong di tengah URL gambar sehingga JSON tidak lengkap.
 * Tutup string dan kurung yang menggantung supaya kartu yang sudah jadi
 * tetap bisa dipakai (tidak perlu mengulang panggilan AI yang mahal).
 */
function perbaikiJson(text) {
  let s = String(text);
  const mulai = s.indexOf("{");
  if (mulai === -1) return null;
  s = s.slice(mulai);

  const tumpukan = [];
  let dalamString = false;
  let escape = false;

  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && dalamString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      dalamString = !dalamString;
      continue;
    }
    if (dalamString) continue;
    if (ch === "{" || ch === "[") tumpukan.push(ch);
    else if ((ch === "}" || ch === "]") && tumpukan.length) tumpukan.pop();
  }

  if (dalamString) s += '"';
  while (tumpukan.length) s += tumpukan.pop() === "{" ? "}" : "]";
  return s;
}

function bacaJsonAI(text) {
  const mulai = String(text).indexOf("{");
  if (mulai === -1) return null;
  let s = String(text).slice(mulai);

  try {
    return JSON.parse(s);
  } catch {
    // buang kalimat penutup di luar JSON, lalu coba lagi
  }

  const akhir = s.lastIndexOf("}");
  if (akhir > 0) {
    s = s.slice(0, akhir + 1);
    try {
      return JSON.parse(s);
    } catch {
      // lanjut ke perbaikan string yang terpotong
    }
  }

  const diperbaiki = perbaikiJson(s);
  return diperbaiki ? JSON.parse(diperbaiki) : null;
}

/**
 * AI kadang membalas JSON dalam blok ```json ... ``` atau menyisipkan kalimat.
 * Fungsi ini mengambil bagian { ... } saja, lalu merapikan jadi kartu.
 */
function parseRecommendations(text, minRating = 0) {
  try {
    const raw = bacaJsonAI(text);
    if (!raw) return null;
    const groups = {};

    for (const key of GROUP_KEYS) {
      const items = Array.isArray(raw[key]) ? raw[key] : [];
      const cadangan = key === FOOD_KEY ? DEFAULT_IMAGE_FOOD : DEFAULT_IMAGE_OUTDOOR;
      groups[key] = items
        .map((item, index) => {
          const image = String(item?.image || "");
          return {
            id: `${key}-${index}`,
            name: String(item?.name || "Tempat wisata").trim().slice(0, 80),
            rating: Number(item?.rating) || 0,
            fact: String(item?.fact || "").replace(/\s+/g, " ").trim().slice(0, 140),
            address: String(item?.address || "").trim().slice(0, 140),
            // Setiap kartu pasti punya gambar, walaupun AI lupa mengirim URL.
            image: gambarValid(image) ? image.slice(0, 500) : cadangan,
            mapsUrl: mapsLinkFor(
              String(item?.name || "Tempat wisata").trim(),
              String(item?.address || "").trim()
            ),
          };
        })
        // Saring dulu sesuai bintang & nama sampah, baru urutkan, baru potong 4.
        .filter((item) => item.rating > 0 && item.rating >= minRating && !NAMA_SAMPAH.test(item.name) && item.name !== "Tempat wisata")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4);
    }

    // Kalau dua-duanya kosong, berarti AI tidak mengikuti format.
    if (GROUP_KEYS.every((key) => groups[key].length === 0)) return null;
    return groups;
  } catch {
    return null;
  }
}

/**
 * Jaga-jaga kalau AI tetap menyelipkan nama lama saat reload. Nama itu dibuang,
 * lalu slot kosong diisi dari kandidat lokal yang belum pernah tampil.
 */
function buangNamaLama(groups, namaLama, daftarLokal) {
  if (!namaLama.length || !groups) return groups;

  const dilarang = new Set(namaLama.map((nama) => nama.toLowerCase()));
  const hasil = {};

  for (const key of GROUP_KEYS) {
    const items = (groups[key] || []).filter(
      (item) => !dilarang.has(item.name.toLowerCase())
    );
    const kategori = key === FOOD_KEY ? "food" : "lainnya";
    const cadangan = daftarLokal.filter(
      (item) =>
        (kategori === "food" ? item.category === "food" : item.category !== "food") &&
        !dilarang.has(item.name.toLowerCase()) &&
        !items.some((sudah) => sudah.name === item.name)
    );

    for (const item of cadangan) {
      if (items.length >= 4) break;
      items.push({ ...item, id: `${key}-${items.length}` });
    }

    hasil[key] = items.sort((a, b) => b.rating - a.rating).slice(0, 4);
  }

  return hasil;
}

// Logging opsional ke Supabase. Kalau env kosong, fungsi ini tidak melakukan apa-apa.
async function logToSupabase(env, row) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/chat_logs`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        source: row.source,
        prompt: row.prompt.slice(0, 2000),
        reply: row.reply.slice(0, 4000),
        ip_hash: row.ipHash,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn("[setapak] gagal simpan log Supabase:", error.message);
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {NodeJS.ProcessEnv} env
 */
export async function handleChatRequest(req, res, env = process.env) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Gunakan POST" });
    return;
  }

  try {
    const body = await readJson(req);
    const modeValid = ["recommend", "search", "plan", "planFields", "createPlan"];
    const mode = modeValid.includes(body.mode) ? body.mode : "chat";
    const message = String(body.message || "").trim().slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const showMap = body.showMap === true; // toggle peta gratis di mode Searching
    const areaMode = body.areaMode === "in" ? "in" : "near";
    const city = String(body.city || "").trim().slice(0, 60);
    const refresh = body.refresh === true; // tombol reload: cari hasil yang berbeda
    // Nama yang sedang tampil di layar dikirim browser saat reload. Ini sumber
    // kebenaran paling akurat (juga berlaku untuk kota hasil AI tanpa data lokal).
    const excludeNames = Array.isArray(body.excludeNames)
      ? body.excludeNames
          .map((nama) => String(nama || "").trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 24)
      : [];
    const minRating = Math.min(
      5,
      Math.max(0, Number(body.minRating) || 0)
    );

    if (!message) {
      send(res, 400, { error: "Pesan tidak boleh kosong" });
      return;
    }

    if (mode === "recommend" && !city) {
      send(res, 400, { error: "Nama kota tidak boleh kosong" });
      return;
    }

    const ipHash = hashIp(req);
    if (isRateLimited(ipHash)) {
      send(res, 429, {
        error: "Terlalu banyak permintaan. Tunggu sebentar ya.",
      });
      return;
    }

    // "Kuta" tetap kuta, "Jepang" tetap jepang. Hanya sinonim asli yang digabung.
    const cityKey = searchCityKey(city);
    const fakta = bersihkanFakta(body.facts);
    const profil = formatFakta(fakta);

    // Tidak ada cache jawaban. Setiap request lewat AI; planner data bersama
    // tetap dipakai sebagai konteks/penyimpanan kartu "For you".
    let payload;

    if (mode === "recommend") {
      // Mode ini dipakai tombol panah di "For you". AI balas JSON kartu.
      // Kota/area baru hasil AI disimpan di planner data bersama, supaya orang
      // lain yang mencari hal yang sama mendapat kartu yang identik.
      // Tanpa data lokal & tanpa hasil simpanan: setiap request langsung ke AI.
      const tersimpan = null;

      // Tombol reload sengaja melewati hasil lama dan minta yang berbeda.
      if (tersimpan && !refresh) {
        // Planner data bersama (bukan cache AI): hasil pencarian yang sama
        // tetap identik untuk semua orang, sesuai permintaan SETAPAK.
        payload = { ...tersimpan, cached: true };
      } else {
        const daftarLokal = []; // data lokal tidak dipakai untuk "For you"

        // Saat reload, nama yang sedang tampil berasal dari browser. Kalau browser
        // tidak mengirim (misal request lama), pakai nama dari planner data.
        const namaLama = refresh
          ? excludeNames.length
            ? excludeNames
            : Object.values(tersimpan?.groups || {})
                .flat()
                .map((item) => item.name)
                .filter(Boolean)
          : [];

        // Tempat lokal yang belum tampil jadi prioritas saat reload. AI tetap
        // boleh mengusulkan tempat nyata lain di area itu supaya ada variasi.
        const tersedia = refresh
          ? daftarLokal.filter((item) => !namaLama.includes(item.name))
          : daftarLokal;

        const barisLokal = (daftar) =>
          daftar
            .slice(0, 20)
            .map(
              (item) =>
                `- ${item.name} | rating ${item.rating} | ${item.address} | kategori ${item.category}`
            )
            .join("\n");

        const aturanNama = refresh
          ? `\n\nIni permintaan RELOAD. Nama yang SUDAH tampil dan DILARANG dipakai: ${namaLama.join(", ")}. Beri tempat LAIN yang benar-benar ada dan bisa dicari di Google Maps di area ${city}. ${tersedia.length ? `Utamakan tempat di daftar ini (salin alamat & kategorinya):\n${barisLokal(tersedia)}` : "Boleh pakai nama tempat nyata di luar daftar SETAPAK."} Jangan ulang tempat yang sama di dua kategori.`
          : daftarLokal.length
            ? `\n\nNama tempat yang BOLEH dipakai HANYA ini (salin alamatnya apa adanya):\n${barisLokal(daftarLokal)}\nJangan pakai nama atau alamat di luar daftar. Tempat kategori food masuk "Coffe And Snacks", sisanya masuk "Outdoor parks & Trials". Jangan mengulang tempat yang sama di dua kategori.`
            : "";

        // Kota di luar data kurasi: nama tempat diambil dari peta nyata (bukan karangan AI).
        let kandidatLive = [];
        const googleOn = googleAktif(env);
        const geoOn = geoapifyAktif(env);
        if (!daftarLokal.length) {
          const lap = await kumpulkanLapangan({
            message: city,
            fakta: { destinations: [city] },
            pakaiPesan: false,
            ringan: true,
            batasMs: 7000,
            env: (googleOn || geoOn) ? env : null,
          });
          kandidatLive = (lap?.places || []).filter(
            (item) =>
              !namaLama.includes(item.name) &&
              // Google: hormati batas rating yang dipilih user (rating asli, bukan tebakan AI).
              (item.sumber !== "google" || !item.rating || item.rating >= minRating)
          );
        }
        const aturanLive = kandidatLive.length
          ? `\n\nNama tempat yang BOLEH dipakai HANYA ini (${kandidatLive[0]?.sumber === "google" ? "Google Maps" : "peta nyata"}, salin nama persis):\n${kandidatLive
              .slice(0, 24)
              .map(
                (item) =>
                  `- ${item.name} | ${item.alamat || `${item.jarak.toFixed(1)} km dari pusat`}${item.rating ? ` | rating ${item.rating.toFixed(1)}` : ""} | kategori ${item.jenis === "kuliner" ? "food" : "outdoor"}`
              )
              .join("\n")}\nTempat kategori food masuk "Coffe And Snacks", sisanya "Outdoor parks & Trials". Jangan mengulang tempat yang sama di dua kategori.`
          : "";

        const aiMessage = `Beri rekomendasi tempat ${
          areaMode === "in" ? "di dalam kota" : "di sekitar luar kota"
        } ${city}. Rating minimal ${minRating}. Isi tepat 4 tempat di dua kategori: Coffe And Snacks dan Outdoor parks & Trials. Urutkan dari rating tertinggi. Setiap tempat WAJIB punya "image" berupa URL langsung ke file gambar (.jpg/.png/.webp), jangan kosong. Balas JSON sesuai format.${aturanNama}${aturanLive}`;

        const result = await askAI({
          message: aiMessage,
          history: [],
          env,
          systemPrompt: RECOMMEND_SYSTEM_PROMPT,
          // 800 token sering terpotong karena URL gambar panjang -> JSON rusak.
          maxTokens: 2200,
        });
        let groups = result ? parseRecommendations(result.reply, minRating) : null;

        // AI hanya menyusun/mengurutkan. Untuk nama yang ada di data lokal,
        // pakai rating, alamat, dan foto aslinya (bukan karangan AI).
        // Untuk nama di luar data lokal (mis. Makassar), URL gambar dari AI
        // hampir selalu karangan yang 404 — ganti dengan URL terverifikasi.
        if (groups) {
          const lokal = new Map(
            (daftarLokal || []).map((item) => [item.name, item])
          );
          for (const key of GROUP_KEYS) {
            const pool = key === FOOD_KEY ? GAMBAR_MAKANAN : GAMBAR_ALAM;
            groups[key] = groups[key].map((item, index) => {
              const asli = lokal.get(item.name);
              if (asli) {
                return {
                  ...item,
                  rating: asli.rating,
                  address: asli.address,
                  image: asli.image,
                  mapsUrl: asli.mapsUrl,
                };
              }
              const live = kandidatLive.length
                ? cocokkanNama(item.name, kandidatLive)
                : null;
              if (live) {
                const google = live.sumber === "google";
                return {
                  ...item,
                  name: live.name,
                  address: live.alamat || item.address,
                  ...(google && live.rating ? { rating: live.rating } : {}),
                  image: live.foto || null, // foto resmi dari tag OSM bila ada
                  _gphoto: google ? live.photoName : null,
                  _cocok: true,
                  _pool: pool[index % pool.length],
                  mapsUrl: google ? live.mapsUrl : linkMaps(live.name, city),
                };
              }
              return { ...item, image: null, _pool: pool[index % pool.length] };
            });
          }
          // Google aktif: nama karangan AI dibuang, slot diisi hasil Google yang belum dipakai.
          if (kandidatLive[0]?.sumber === "google") {
            const terpakai = new Set();
            for (const key of GROUP_KEYS) {
              groups[key] = groups[key].filter((item) => {
                if (!item._cocok || terpakai.has(item.name)) return false;
                terpakai.add(item.name);
                return true;
              });
            }
            for (const key of GROUP_KEYS) {
              const pool = key === FOOD_KEY ? GAMBAR_MAKANAN : GAMBAR_ALAM;
              for (const live of kandidatLive) {
                if (groups[key].length >= 4) break;
                const makanan = live.jenis === "kuliner";
                if (makanan !== (key === FOOD_KEY) || terpakai.has(live.name)) continue;
                terpakai.add(live.name);
                groups[key].push({
                  name: live.name,
                  rating: live.rating || 0,
                  address: live.alamat || "",
                  image: live.foto || null,
                  _gphoto: live.photoName,
                  _cocok: true,
                  _pool: pool[groups[key].length % pool.length],
                  mapsUrl: live.mapsUrl,
                });
              }
              groups[key].sort((a, b) => (b.rating || 0) - (a.rating || 0));
            }
          }
        }

        // Foto dicari dari NAMA tempat (Wikipedia/Commons) supaya gambar = lokasi.
        if (groups) {
          for (const key of GROUP_KEYS) {
            groups[key] = await Promise.all(
              groups[key].map(async (item) => {
                const { _pool, _gphoto, _cocok, ...bersih } = item;
                void _cocok;
                if (item.image) return bersih;
                // Foto Google (URL publik tanpa key) lebih dulu, sama dengan tempat yang dipilih.
                if (_gphoto) {
                  const fotoG = await fotoGoogle(_gphoto, env);
                  if (fotoG) return { ...bersih, image: fotoG };
                }
                const foto = await fotoTempat(item.name, city);
                return {
                  ...bersih,
                  image: foto?.image || _pool,
                  infoUrl: foto?.link || null,
                  mapsUrl: item.mapsUrl || linkMaps(item.name, city),
                };
              })
            );
          }
        }

        // Reload: nama lama harus benar-benar hilang. Kalau AI menyelipkannya,
        // slotnya diisi otomatis dari kandidat lokal yang belum pernah tampil.
        if (groups && refresh) {
          groups = buangNamaLama(groups, namaLama, tersedia);
        }

        // Kalau AI gagal saat reload, jangan sampai kartunya hilang.
        payload = groups
          ? { groups, source: result.source }
          : { groups: {}, source: "error", error: "AI belum memberi rekomendasi" };

      }
    } else if (mode === "planFields") {
      // AI yang menentukan data apa saja yang masih kurang untuk membuat plan.
      const result = await askAI({
        message,
        history,
        env,
        systemPrompt: PLAN_FIELDS_SYSTEM_PROMPT + profil,
        maxTokens: 500,
      });
      const tujuan = konteksTujuan(history, message, fakta);
      const fields = fieldsTanpaPengulangan(parsePlanFields(result?.reply), history, fakta).map(
        (field) => ({
          ...field,
          // Pertanyaan & pilihan tetap dari AI, lalu diverifikasi ke data kurasi.
          options: verifikasiOpsi(field.options, tujuan),
        })
      );
      payload = {
        fields,
        source: result?.source || "template",
      };
    } else if (mode === "createPlan") {
      // Rencana 10–14 hari + modul butuh output JSON panjang.
      // Data nyata dulu (peta, panduan, cuaca), baru AI menyusun dari data itu.
      const hariPlan = Math.min(14, Math.max(1, fakta?.days || 3));
      const lapangan = await kumpulkanLapangan({
        message,
        fakta,
        pakaiPesan: false,
        teksKota: message,
        // rencana panjang butuh kandidat lebih banyak supaya tempat tidak berulang
        maksTempat: [Math.min(40, hariPlan * 3 + 6), Math.min(16, hariPlan + 6)],
        batasMs: 9000,
        env: googleAktif(env) ? env : null,
      });
      // Anggaran waktu: fungsi Vercel dibatasi 60 dtk. Ketiga AI (Gemini, Groq,
      // 100milionseek) dipanggil BERSAMAAN; jawaban pertama yang JSON-nya valid dipakai.
      const mulaiPlan = Date.now();
      // Anggaran waktu total (detik). Atur AI_MAX_SECONDS; harus < maxDuration fungsi (300).
      const sisaMs = () => (Number(env.AI_MAX_SECONDS) || 230) * 1000 - (Date.now() - mulaiPlan);
      const planValid = (teks) => Boolean(parsePlanJson(teks, fakta));
      const result = await askAIParalel({
        message: `${message}${lapangan?.blok || ""}${blokKebutuhan(message)}`,
        history: [],
        env,
        systemPrompt: CREATE_PLAN_SYSTEM_PROMPT + profil,
        maxTokens: 3600,
        // Gemini/Groq riset harga & kondisi terkini, AI penulis menyusun JSON-nya.
        webSearch: "riset",
        // Saat Groq/Gemini istirahat, 100milionseek (lebih lambat) butuh waktu lebih longgar.
        batasMs: Math.max(20000, Math.min(150000, sisaMs() - 8000)),
        valid: planValid,
        json: true, // structured output + temperature rendah
      });
      const normPlanDays = (p) => {
        if (!p || !Array.isArray(p.days)) return p;
        const target = Math.min(14, Math.max(1, Number(fakta?.days) || p.days.length || 1));
        if (p.days.length === target) return p;
        if (p.days.length > target) return { ...p, days: p.days.slice(0, target) };
        // Kurang hari: isi hari tersisa dengan aktivitas ringan agar tidak mengurangi durasi user.
        const days = [...p.days];
        while (days.length < target) {
          const i = days.length;
          const used = new Set(days.flatMap(d => (d.places||[]).map(pl=>String(pl?.name||"").toLowerCase())));
          const base = days[i % Math.max(1, days.length)] || { places: [] };
          const pool = (base.places || []).filter(pl => !used.has(String(pl?.name||"").toLowerCase()));
          const picks = (pool.length ? pool : [{ name: "Waktu bebas / eksplorasi sekitar", why: "Nikmati suasana kota dengan santai", startTime: "10:00" }]).slice(0,2);
          days.push({
            title: `Hari ${i + 1}`,
            places: picks.map((pl, j) => ({
              ...pl,
              name: String(pl?.name || "Waktu bebas / eksplorasi sekitar").slice(0,80),
              why: String(pl?.why || (j===0 ? "Waktu fleksibel untuk menikmati suasana" : "Eksplorasi santai")).slice(0,100),
              startTime: pl?.startTime || (j===0 ? "10:00" : "14:00"),
            })),
          });
        }
        return { ...p, days };
      };
      let plan = normPlanDays(parsePlanJson(result?.reply, fakta));
      let sumberPlan = result?.source;
      let alasanPlanGagal = null;
      // JSON gagal/terpotong atau jumlah hari tidak sesuai: coba sekali lagi.
      if ((!plan || (fakta?.days && plan.days.length !== Math.min(14, fakta.days))) && sisaMs() > 14000) {
        const ulang = await askAIParalel({
          message: `${message}${lapangan?.blok || ""}${blokKebutuhan(message)}\n\nKOREKSI WAJIB: balasan sebelumnya tidak valid/lengkap atau jumlah hari tidak sesuai. Buat tepat ${Math.min(14, fakta?.days || 3)} hari. Balas HANYA JSON valid dan LENGKAP. Boleh kosongkan "modules" dan singkatkan "why" supaya JSON pasti selesai.`,
          history: [],
          env,
          systemPrompt: CREATE_PLAN_SYSTEM_PROMPT + profil,
          maxTokens: 3600,
          batasMs: Math.max(10000, sisaMs() - 8000),
          valid: planValid,
        });
        const parsedUlang = normPlanDays(parsePlanJson(ulang?.reply, fakta));
        if (parsedUlang) { plan = parsedUlang; sumberPlan = ulang?.source; }
      }
      if (plan && !rencanaSesuaiPembagian(plan, fakta, lapangan) && sisaMs() > 14000) {
        const ulang = await askAIParalel({
          message: `${message}${lapangan?.blok || ""}${blokKebutuhan(message)}\n\nKOREKSI WAJIB: rencana sebelumnya tidak memenuhi pembagian hari per destinasi. Buat tepat ${fakta.days} hari; setiap hari wajib berisi tempat dari destinasi yang sesuai urutan dan jumlah pada PROFIL TRIP. Gunakan hanya ref dari DATA LAPANGAN, dan jangan menghilangkan destinasi mana pun.`,
          history: [],
          env,
          systemPrompt: CREATE_PLAN_SYSTEM_PROMPT + profil,
          maxTokens: 3600,
          batasMs: Math.max(10000, sisaMs() - 8000),
          valid: planValid,
        });
        const rencanaUlang = parsePlanJson(ulang?.reply, fakta);
        if (rencanaSesuaiPembagian(rencanaUlang, fakta, lapangan)) {
          plan = rencanaUlang;
          sumberPlan = ulang?.source;
        } else {
          plan = null;
          alasanPlanGagal =
            "AI belum bisa memastikan semua hari dan tempat terbagi benar untuk setiap destinasi. Coba buat rencana lagi sebentar.";
        }
      }
      // Tiap tempat dicocokkan ke peta nyata; yang tidak terbukti ada dibuang.
      if (plan && lapangan) {
        plan = await perkuatRencana(plan, lapangan, { env });
        if (!rencanaSesuaiPembagian(plan, fakta, lapangan)) {
          plan = null;
          alasanPlanGagal =
            "Sebagian tempat tidak berhasil diverifikasi untuk semua destinasi. Coba buat rencana lagi.";
        } else {
          plan = beriLabelPembagian(plan, fakta);
        }
      }
      if (!plan && !alasanPlanGagal) {
        alasanPlanGagal = result
          ? "AI membalas, tapi rencananya belum utuh. Tekan Create Planning sekali lagi ya."
          : providerAktif(env).length
            ? `AI (${providerAktif(env).join(", ")}) belum merespons tepat waktu — kemungkinan kuota habis atau sedang sibuk. Coba lagi sebentar.${alasanGagalTerakhir() ? ` [Detail: ${alasanGagalTerakhir()}]` : ""}`
            : "Server belum punya API key AI. Isi GROQ_API_KEY / GEMINI_API_KEY (dan HUNDREDMILLIONSEEK_API_KEY) di Vercel → Settings → Environment Variables, lalu Redeploy.";
      }
      payload = {
        plan,
        ...(alasanPlanGagal ? { error: alasanPlanGagal } : {}),
        source: sumberPlan || "template",
      };
    } else if (mode === "search" || mode === "plan") {
      const normalized = normalizeText(message);
      const pertanyaanLokasiFilm =
        mode === "search" && perluCekLokasiFilm(message);
      let faktaFilm = null;
      if (pertanyaanLokasiFilm) {
        try {
          faktaFilm = await cariFaktaLokasiFilm(message);
        } catch (error) {
          console.warn("[setapak] verifikasi lokasi film gagal:", error.message);
        }
      }
      const butuhRisetDetail = mode === "search" && butuhRiset(normalized, fakta);
      const tanyaDaftarTempat =
        mode === "search" &&
        !pertanyaanLokasiFilm &&
        PERTANYAAN_DAFTAR_TEMPAT.test(normalized);
      const kotaKey = mode === "search" ? resolveCity(normalized) : null;
      const terverifikasi = kotaKey
        ? kandidatTerverifikasi(kotaKey, normalized)
        : { daftar: [], area: null };
      const kandidat = terverifikasi.daftar;
      const jawabanLokal = mode === "search" && kotaKey && kandidat.length >= 2;
      const jawabanDunia =
        mode === "search" && !jawabanLokal
          ? jawabanDuniaDariPesan(normalized)
          : null;

      // Google Maps aktif + user menanyakan tempat spesifik -> jawaban WAJIB dari hasil Google.
      const googleOn = googleAktif(env);
      const geoOn = geoapifyAktif(env);
      const tanyaTempatGoogle =
        googleOn &&
        !pertanyaanLokasiFilm &&
        (mode === "search" || mode === "plan") &&
        MINTA_TEMPAT.test(normalized);
      const butuhLapanganSpesifik =
        !pertanyaanLokasiFilm &&
        (mode === "search" || mode === "plan") &&
        (MINTA_TEMPAT.test(normalized) || PERTANYAAN_DAFTAR_TEMPAT.test(normalized));
      const pakaiGoogleLapangan =
        googleOn &&
        !pertanyaanLokasiFilm &&
        (tanyaTempatGoogle || (mode === "search" && butuhRisetDetail));
      const kueriTempat =
        mode === "search" && (tanyaTempatGoogle || butuhLapanganSpesifik || butuhRisetDetail)
          ? kueriGoogle(message, fakta)
          : "";

      const gerbangLapangan =
        !pertanyaanLokasiFilm &&
        (tanyaTempatGoogle ||
          (mode === "plan"
            ? TOPIK_PERJALANAN.test(message)
            : butuhRisetDetail || TOPIK_PERJALANAN.test(message)));

      // Data kurasi -> KONTEKS. AI yang tetap menulis jawabannya.
      // Untuk pertanyaan perjalanan, tempat hanya boleh bersumber dari OSM.
      const konteks = gerbangLapangan
        ? ""
        : jawabanLokal
        ? konteksTerverifikasi({
            label: cityLabels[kotaKey] || kotaKey,
            daftar: kandidat,
            area: terverifikasi.area ? AREA_KOTA[terverifikasi.area] : null,
            batas: batasJumlah(normalized, 5),
          })
        : jawabanDunia
          ? konteksTerverifikasi({
              label: jawabanDunia.label,
              daftar: jawabanDunia.places,
              fakta: jawabanDunia.fakta,
              batas: jawabanDunia.places.length,
            })
          : "";

      const mintaKartu = showMap || ((tanyaTempatGoogle || (geoOn && butuhLapanganSpesifik)) && mode === "search");
      const tambahanPeta = mintaKartu
        ? "\n\nUser ingin melihat kartu tempat. Jika kamu menyebut nama tempat, WAJIB akhiri jawaban dengan satu baris: LOKASI: Nama 1 | Nama 2 | Nama 3 (maksimal 4 nama, dipisah ' | '). Nama itu harus berasal dari data terverifikasi di atas."
        : "";

      // Data lapangan nyata untuk tujuan yang sedang dibahas (gagal jaringan -> null,
      // alur lama tetap jalan). Obrolan ringan tidak memicu pengambilan data.
      let lapangan = null;
      if (gerbangLapangan) {
        lapangan = await kumpulkanLapangan({
          message,
          fakta,
          teksKota: teksUser(history, message),
          env: (pakaiGoogleLapangan || butuhLapanganSpesifik || butuhRisetDetail || TOPIK_PERJALANAN.test(message)) ? env : null,
          kueri: kueriTempat,
        });
      } else if (mode === "plan" && fakta?.destinations?.length) {
        // Hangatkan data supaya "Create Planning" nanti langsung cepat.
        kumpulkanLapangan({ message, fakta, pakaiPesan: false, env }).catch(() => {});
      }
      const blokLapangan = lapangan?.blok || "";
      const blokButuh = blokKebutuhan(teksUser(history, message));
      const catatanPlan =
        mode === "plan" && blokLapangan
          ? "\n\nCatatan mode Planning: pakai data lapangan HANYA untuk membuat pertanyaanmu spesifik dan relevan (musim, zona, pilihan yang memang ada). JANGAN menulis daftar tempat saat masih bertanya."
          : "";

      const systemPrompt =
        (mode === "search"
          ? butuhRisetDetail
            ? SEARCH_DETAIL_SYSTEM_PROMPT
            : SEARCH_SYSTEM_PROMPT
          : PLAN_SYSTEM_PROMPT) +
        (pertanyaanLokasiFilm
          ? `\n\nPERTANYAAN LOKASI FILM: Pisahkan lokasi produksi/syuting dari lokasi latar cerita atau rumah yang menginspirasi film. Jika ada DATA SUMBER FILM, gunakan hanya klaim yang benar-benar tertulis di sana, sebutkan kota/negara secara tepat, dan jangan menyamakan lokasi cerita dengan lokasi produksi. Jangan mengarang alamat rumah, akses kunjungan, maupun tautan. Jika data sumber tidak memuat lokasi produksi, katakan bahwa lokasinya belum dapat diverifikasi.`
          : "") +
        (lapangan?.sumber === "google" ? GROUND_ATURAN_GOOGLE : GROUND_ATURAN) +
        profil +
        tambahanPeta;

      const blokFaktaFilm = pertanyaanLokasiFilm
        ? faktaFilm
          ? `\n\n=== DATA SUMBER FILM (Wikipedia) ===\nJudul halaman: ${faktaFilm.title}\nPernyataan sumber: ${faktaFilm.evidence}\n=== AKHIR DATA SUMBER ===`
          : "\n\n=== DATA SUMBER FILM ===\nTidak ditemukan sumber yang dapat mengonfirmasi lokasi produksi. Nyatakan bahwa lokasi belum terverifikasi; jangan menebak kota, negara, alamat, atau membuat tautan.\n=== AKHIR DATA SUMBER ==="
        : "";
      const pesanAI = `${message}${konteks}${blokLapangan}${blokButuh}${catatanPlan}${blokFaktaFilm}`;
      const opsiAI = {
        history,
        env,
        systemPrompt,
        maxTokens: butuhRisetDetail ? 2000 : mode === "search" ? 500 : 400,
        // Urutan provider mengikuti prioritas global (AI_PROVIDER_ORDER / default).
        // Kalau provider melaporkan jawaban terpotong, lanjutkan sekali (semua mode).
        allowContinue: true,
        // Mode Searching boleh mengambil data online (cuaca, harga, jadwal, berita).
        // Nama tempat spesifik tetap hanya dari DATA LAPANGAN (lihat prompt).
        webSearch: mode === "search",
      };
      const jawabanRekreasi =
        mode === "search" && !googleOn
          ? jawabanTempatRekreasi(message, lapangan, fakta)
          : null;

      // Pertanyaan tempat + Google aktif, tapi Google tak memberi hasil / tak terjangkau:
      // jangan serahkan ke AI (rawan menebak). Jawab jujur, langsung dari status data.
      const googleTanpaData =
        tanyaTempatGoogle &&
        mode === "search" &&
        (!lapangan || (lapangan.sumber === "google" && lapangan.places.length === 0));
      // Data peta kosong untuk pertanyaan tempat -> cari di web, bukan menolak.
      const tanyaTempatUmum =
        mode === "search" &&
        !pertanyaanLokasiFilm &&
        (MINTA_TEMPAT.test(normalized) || PERTANYAAN_DAFTAR_TEMPAT.test(normalized));
      const lapanganKosong = !lapanganRelevan(normalized, lapangan);
      const jawabWeb = async () => {
        try {
          const tujuan = fakta?.destinationLabel || fakta?.destinations?.[0] || "";
          const hasil = await askAI({
            message: `${message}${tujuan ? `\n\n(Konteks tujuan: ${tujuan})` : ""}`,
            history,
            env,
            systemPrompt: WEB_TEMPAT_PROMPT,
            maxTokens: 1200,
            allowContinue: true,
            // AI dengan internet bawaan didahulukan; sisanya dibantu catatan riset.
            providerOrder: ["groq", "gemini", "100milionseek", "cerebras", "mistral", "openrouter", "ollama"],
            webSearch: true,
            wajibWeb: true,
          });
          const teks = String(hasil?.reply || "")
            .replace(/^LOKASI:.*$/gim, "")
            .trim();
          console.log(`[setapak] jawab web: ${hasil ? hasil.source : "tidak ada provider"} (${teks.length} huruf)`);
          if (teks.length < 40) return null;
          const cari = kueriTempat || kueriGoogle(message, fakta) || message;
          return {
            reply: `${teks}\n\n[Cari di Google Maps](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(cari).slice(0, 120))})`,
            source: `${hasil.source}+web`,
          };
        } catch (error) {
          console.warn("[setapak] jawab web gagal:", error.message);
          return null;
        }
      };

      let result = null;
      let dariWeb = false;
      if (tanyaTempatUmum && lapanganKosong && !jawabanRekreasi) {
        result = await jawabWeb();
        dariWeb = Boolean(result);
      }
      if (!result && tanyaTempatUmum && lapanganKosong && !jawabanRekreasi && !jawabanLokal && !jawabanDunia) {
        // Web juga gagal: jujur soal penyebabnya, jangan pura-pura "tidak ada tempatnya".
        result = {
          reply:
            "Aku belum berhasil mencari di internet untuk pertanyaan ini (pencarian web sedang gagal atau belum diaktifkan), jadi aku tidak mau menebak nama tempat. Coba kirim ulang sebentar lagi. Untuk pemilik aplikasi: isi GEMINI_API_KEY atau GROQ_API_KEY di .env, lalu restart server.",
          source: "web-gagal",
        };
      }
      if (result) {
        // sudah dijawab (web / pesan jujur)
      } else if (googleTanpaData) {
        result = {
          reply: lapangan
            ? balasanDariGoogle([], { kueri: kueriTempat })
            : "Aku belum bisa mengambil data dari Google Maps saat ini, jadi aku tidak mau menebak nama tempat. Coba kirim ulang pertanyaannya sebentar lagi ya.",
          source: "google-maps",
        };
      } else if (jawabanRekreasi) {
        result = { reply: jawabanRekreasi, source: "openstreetmap" };
      } else {
        result = await askAI({ message: pesanAI, ...opsiAI });
      }

      // Penjaga mutu: jangan menanyakan hal yang sudah diketahui / sudah pernah
      // ditanya, dan jangan menyerahkan jawaban yang berhenti di tengah kalimat.
      if (result?.reply && !dariWeb) {
        const dobel = pertanyaanDobel(result.reply, fakta, history);
        const potong = terpotong(result.reply);
        if (dobel.length || potong) {
          const ulang = await askAI({
            message: `${pesanAI}${catatanKoreksi({ dobel, potong })}`,
            ...opsiAI,
            allowContinue: false,
          });
          if (
            ulang?.reply &&
            !pertanyaanDobel(ulang.reply, fakta, history).length
          ) {
            result = ulang;
          }
        }
        // Masih menggantung? Rapikan ujungnya secara lokal.
        result = { ...result, reply: rapikanAkhir(result.reply) };
      }
      if ((tanyaDaftarTempat || tanyaTempatGoogle) && result?.reply && !googleTanpaData && !dariWeb) {
        const dariGoogle = lapangan?.sumber === "google";
        const namaTidakTerverifikasi = namaTempatTidakAdaDiPeta(
          result.reply,
          lapangan,
          fakta
        );
        if (namaTidakTerverifikasi.length) {
          const ulang = await askAI({
            message: dariGoogle
              ? `${pesanAI}\n\nKOREKSI SUMBER: Nama berikut TIDAK ada di hasil Google Maps pada DATA LAPANGAN: ${namaTidakTerverifikasi.join(", ")}. Jangan sebut nama-nama itu. Pakai hanya nama persis dari DATA LAPANGAN (format "- **Nama persis** — alasan").`
              : `${pesanAI}\n\nKOREKSI SUMBER: Nama tempat berikut tidak ditemukan di DATA LAPANGAN OpenStreetMap: ${namaTidakTerverifikasi.join(", ")}. Jangan sebut nama-nama itu. Gunakan hanya nama tempat yang tercantum di DATA LAPANGAN. Jika tidak ada tempat yang cocok, katakan belum bisa memverifikasinya di data peta; jangan menyimpulkan tempat itu pasti tidak ada.`,
            ...opsiAI,
            allowContinue: false,
          });
          if (
            ulang?.reply &&
            namaTempatTidakAdaDiPeta(ulang.reply, lapangan, fakta).length === 0
          ) {
            result = ulang;
          } else if (dariGoogle) {
            // Jaring pengaman: jawaban disusun langsung dari data Google, tanpa AI.
            result = {
              reply: balasanDariGoogle(lapangan.places, { kueri: kueriTempat }),
              source: "google-maps",
            };
          } else if (await jawabWeb().then((w) => (w ? ((result = w), true) : false))) {
            // Nama dari AI tidak ada di data OSM -> dijawab ulang dari hasil web nyata.
          } else {
            const tujuan =
              lapangan?.dests?.[0]?.display ||
              fakta?.destinations?.[0] ||
              "tujuan yang ditanyakan";
            result = {
              ...result,
              reply: `Aku belum bisa memverifikasi nama tempat yang disebut dari OpenStreetMap untuk ${tujuan}. Data peta yang tersedia belum cukup untuk memastikan rekomendasinya, jadi aku tidak akan mengulang nama yang belum terverifikasi.`,
              source: "openstreetmap",
            };
          }
        }
      }
      let reply =
        result?.reply ||
        // Jaring pengaman terakhir kalau semua provider AI sedang gagal.
        (gerbangLapangan
          ? lapangan?.sumber === "google" && tanyaTempatGoogle && lapangan.places.length
            ? balasanDariGoogle(lapangan.places, { kueri: kueriTempat })
            : null
          : jawabanLokal
          ? balasanKotaTerverifikasi(kotaKey, normalized)
          : jawabanDunia?.reply) ||
        fallbackReply();
      if (pertanyaanLokasiFilm) {
        if (!faktaFilm) {
          reply =
            "Aku belum menemukan sumber tepercaya yang mengonfirmasi lokasi produksi film itu, jadi aku tidak mau menebak kota atau alamat. Lokasi cerita dan lokasi syuting bisa berbeda; sebaiknya jangan berangkat berdasarkan alamat yang belum terverifikasi.";
        } else {
          const tautanSumber = faktaFilm.url;
          reply = reply
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (tautan, label, url) =>
              url === tautanSumber ? tautan : label
            )
            .replace(/https?:\/\/\S+/g, (url) => (url === tautanSumber ? url : ""));
          reply += `\n\nSumber: [${faktaFilm.title}](${tautanSumber})`;
        }
      }

      const detail = { source: result?.source || "engine" };
      if (lapangan) {
        detail.grounding = {
          sumber: lapangan.sumber === "google" ? "Google Maps" : "OpenStreetMap",
          tujuan: lapangan.dests.map((d) => d.display || d.name),
          tempat: lapangan.places.length,
          cuaca: lapangan.cuaca || null,
        };
      }
      if (butuhRisetDetail) detail.handoff = true;

      // Pilihan jawaban juga harus dari AI, bukan contoh hardcoded di browser.
      // Baris PILIHAN: disembunyikan dari teks, dikirim sebagai chip pilihan.
      const barisPilihan = reply.match(/^PILIHAN:\s*(.+)$/im);
      if (barisPilihan) {
        reply = reply.replace(/^PILIHAN:\s*.+$/im, "").trim();
        detail.options = verifikasiOpsi(
          barisPilihan[1].split("|").map((item) => item.trim()).filter(Boolean),
          konteksTujuan(history, message, fakta)
        );
      }

      if (mode === "plan") {
        detail.ready = /<<\s*SIAP\s*>>/.test(reply);
        reply = reply.replace(/<<\s*SIAP\s*>>/g, "").trim();
        if (!detail.ready) detail.ready = siapDariObrolan(history, message, fakta);
      }

      // Selain kartu, jangan biarkan baris LOKASI: bocor ke teks jawaban.
      const kartuGoogle = lapangan?.sumber === "google" && tanyaTempatGoogle && mode === "search";
      if (showMap || kartuGoogle) {
        const livePlaces = lapangan?.places || [];
        const namaKurasi = gerbangLapangan
          ? []
          : jawabanLokal
          ? kandidat.map((item) => item.name)
          : jawabanDunia?.places.map((item) => item.name) || [];
        const diperbolehkan = [...namaKurasi, ...livePlaces.map((item) => item.name)];

        // Destinasi di luar data kurasi (mis. USA, Palestina, Makkah) tidak
        // punya nama tempat terverifikasi. Jangan ever bikin kartu "Lihat
        // tempat" dari kalimat/opsi jawaban — itu bukan tempat, hasilnya
        // kartu palsu seperti "USA: wisata sejarah".
        if (diperbolehkan.length) {
          const kotaPeta = jawabanLokal ? kotaKey : jawabanDunia?.kotaKey;
          const labelPeta = jawabanLokal
            ? cityLabels[kotaKey] || ""
            : jawabanDunia?.label || "";
          const pusat = PUSAT_KOTA[kotaPeta] || null;

          const barisLokasi = reply.match(/^LOKASI:\s*(.+)$/im);
          let nama = [];
          if (barisLokasi) {
            reply = reply.replace(/^LOKASI:\s*.+$/im, "").trim();
            nama = barisLokasi[1]
              .split("|")
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 4);
          }
          // Nama dari AI dicocokkan toleran ke daftar nyata (huruf/kata sedikit beda tetap kena).
          if (!nama.length && livePlaces.length) {
            nama = tempatDalamTeks(reply, livePlaces).map((p) => p.name);
          }
          // Pertanyaan tempat + Google: kartu selalu muncul dari hasil teratas Google.
          if (!nama.length && kartuGoogle) nama = livePlaces.slice(0, 4).map((p) => p.name);
          if (!nama.length) nama = namaTempatFallback(reply, kotaPeta, diperbolehkan);
          nama = nama
            .map((n) =>
              diperbolehkan.includes(n) ? n : cocokkanNama(n, livePlaces)?.name || null
            )
            .filter(Boolean);
          // Tanpa nama yang terbukti ada, jangan memunculkan peta sembarang (kecuali data kurasi).
          if (!nama.length && namaKurasi.length) nama = namaKurasi.slice(0, 4);

          if (nama.length) {
            detail.mapPlaces = await Promise.all(
              [...new Set(nama)]
                .slice(0, Math.min(4, batasJumlah(normalized, 4)))
                .map(async (n) => {
                  // Tempat dari peta nyata sudah punya koordinat: tak perlu geocode lagi.
                  const live = livePlaces.find((p) => p.name === n);
                  if (!live) return petaUntuk(n, labelPeta, pusat);
                  const kartu = keKartuPeta(live, embedDenganMarker);
                  // Foto resmi Google (URL publik tanpa API key).
                  if (live.sumber === "google" && live.photoName) {
                    const foto = await fotoGoogle(live.photoName, env);
                    if (foto) kartu.image = foto;
                  }
                  return kartu;
                })
            );
          }
        }
      }
      reply = reply.replace(/^LOKASI:.*$/gim, "").trim();

      payload = { reply, ...detail };
    } else {
      const result = await askAI({ message, history, env, maxTokens: 400 });
      payload = result || { reply: fallbackReply(), source: "template" };
    }

    // Tidak ada cache jawaban — log saja untuk riwayat/analitik.
    logToSupabase(env, {
      ...payload,
      reply:
        payload.reply ||
        JSON.stringify(payload.groups || payload.fields || payload.plan || ""),
      prompt: message,
      ipHash,
    });

    send(res, 200, payload);
  } catch (error) {
    console.error("[setapak] chat handler error:", error);
    send(res, 500, { reply: fallbackReply(), source: "template" });
  }
}
