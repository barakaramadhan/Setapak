// Handler HTTP yang dipakai dua tempat:
// 1. Vercel Function -> api/chat.js
// 2. Vite dev server  -> vite.config.js
// Jadi logic-nya cuma satu, mudah dibaca dan diubah.

import { createHash } from "node:crypto";
import {
  askAI,
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
  recommendPlaces,
  getRecommendationCandidates,
  mapsLinkFor,
  searchCityKey,
  resolveCity,
  normalizeText,
  cityLabels,
} from "../src/api/plannerEngine.js";
import { fotoTempat, linkMaps } from "./placeMedia.js";
import { MODULES } from "../src/utils/tripModules.js";
import {
  getSavedRecommendations,
  saveRecommendations,
} from "./plannerStore.js";

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

  const hasil = {
    destinations: daftar(raw.destinations, 6),
    destinationLabel: teks(raw.destinationLabel, 80),
    days: Number.isFinite(angka) && angka > 0 ? Math.min(30, Math.round(angka)) : null,
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate || "")) ? raw.startDate : null,
    budget: teks(raw.budget, 60),
    food: teks(raw.food, 60),
    purpose: teks(raw.purpose, 40),
    tema: teks(raw.tema, 40),
    companions: teks(raw.companions, 40),
    knownKeys: daftar(raw.knownKeys),
    knownModules: daftar(raw.knownModules),
  };
  const adaIsi =
    hasil.destinations.length ||
    hasil.days ||
    hasil.startDate ||
    hasil.budget ||
    hasil.food ||
    hasil.knownKeys.length;
  return adaIsi ? hasil : null;
}

function formatFakta(fakta) {
  if (!fakta) return "";
  const baris = [];
  const tujuan = fakta.destinationLabel || fakta.destinations.join(" + ");
  if (tujuan) baris.push(`- Tujuan: ${tujuan}`);
  if (fakta.days) baris.push(`- Durasi: ${fakta.days} hari`);
  if (fakta.startDate) baris.push(`- Mulai tanggal: ${fakta.startDate}`);
  if (fakta.budget) baris.push(`- Budget: ${fakta.budget}`);
  if (fakta.food) baris.push(`- Makanan: ${fakta.food}`);
  if (fakta.purpose) baris.push(`- Karakter perjalanan: ${fakta.purpose}`);
  if (fakta.companions) baris.push(`- Pendamping: ${fakta.companions}`);
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

function konteksTujuan(history = [], message = "") {
  const gabung = [...history.map((h) => h.text || ""), String(message || "")]
    .join(" ")
    .toLowerCase();
  // Kota luar negeri (kunci worldKnowledge) lebih dulu.
  const luar = Object.keys(WORLD_CITIES).find((k) => gabung.includes(k));
  if (luar) return { key: luar, luarNegeri: !KOTA_LOKAL.includes(luar) };
  const negeri = NEGERI_LUAR.find((k) => gabung.includes(k));
  if (negeri) return { key: negeri, luarNegeri: true };
  const lokal = KOTA_LOKAL.find((k) => gabung.includes(k));
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
    waktu: new RegExp(`\\d+\\s*(hari|malam|minggu)|${BULAN}|tanggal|kapan|mulai|durasi`).test(teks),
    tema: /santai|keluarga|petualangan|kuliner|budaya|romantis|berdua|istri|suami|pasangan|tema|menikmati/.test(teks),
  };
  if (!fakta) return dariTeks;

  const known = new Set(fakta.knownKeys || []);
  return {
    budget: dariTeks.budget || known.has("budget"),
    waktu: dariTeks.waktu || Boolean(fakta.days || fakta.startDate) || known.has("durasi"),
    tema: dariTeks.tema || known.has("tema"),
    makanan: known.has("makanan"),
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
  const tujuan = konteksTujuan(history, "");
  const sudah = infoSudahDijawab(history, fakta);
  const dipakai = new Set([
    ...yangAda.map((f) => f.module?.id),
    ...(fakta?.knownModules || []),
  ]);
  const knownKeys = fakta?.knownKeys || [];
  const calon = [
    {
      key: "akomodasi",
      module: infoModul("accommodation"),
      label: tujuan.luarNegeri
        ? `Mau menginap di area mana di ${tujuan.key}?`
        : "Mau menginap di hotel, guesthouse, atau tempat lain?",
      type: "select",
      options: ["Dekat pusat kota", "Dekat tempat wisata", "Area tenang", "Belum tentu"],
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
      label: "Ada makanan atau alergi yang harus dihindari?",
      type: "text",
      options: ["Tidak ada", "Alergi kacang", "Vegetarian", "Makanan ringan"],
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

/**
 * Cadangan kalau AI lupa mengirim penanda <<SIAP>>: obrolan dianggap cukup
 * ketika tujuan + durasi/tanggal + (budget atau minat) sudah disebut user.
 */
function siapDariObrolan(history, message, fakta = null) {
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
Ketika pesan user memuat "DATA TERVERIFIKASI SETAPAK", perlakukan data itu sebagai satu-satunya sumber kebenaran untuk nama tempat, area, dan lokasi:
- DILARANG menambah nama tempat, alamat, atau lokasi yang tidak ada di daftar itu.
- DILARANG mengganti destinasi yang ditanya (user cari Kuta, jawab Kuta — jangan Bali secara umum).
- Kalau user menyebut tempat yang tidak ada di daftar, jawab terus terang "tidak ada", lalu sebut alternatif dari daftar.
- Kalau ada catatan FAKTA LOKASI, ikuti itu apa adanya.
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
            rating: Number(item?.rating) || 4.5,
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
        .filter((item) => item.rating >= minRating && !NAMA_SAMPAH.test(item.name))
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

/** Fallback tanpa API: pakai data lokal SETAPAK untuk kunci kota ini. */
function localRecommendations(cityKey, areaMode, minRating = 0) {
  return recommendPlaces(areaMode, cityKey, minRating);
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
      const paramsPlanner = { cityKey, areaMode, minRating };
      const tersimpan = await getSavedRecommendations(env, paramsPlanner);

      // Tombol reload sengaja melewati hasil lama dan minta yang berbeda.
      if (tersimpan && !refresh) {
        // Planner data bersama (bukan cache AI): hasil pencarian yang sama
        // tetap identik untuk semua orang, sesuai permintaan SETAPAK.
        payload = { ...tersimpan, cached: true };
      } else {
        const daftarLokal = getRecommendationCandidates(
          areaMode,
          cityKey,
          minRating
        );

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

        const aiMessage = `Beri rekomendasi tempat ${
          areaMode === "in" ? "di dalam kota" : "di sekitar luar kota"
        } ${city}. Rating minimal ${minRating}. Isi tepat 4 tempat di dua kategori: Coffe And Snacks dan Outdoor parks & Trials. Urutkan dari rating tertinggi. Setiap tempat WAJIB punya "image" berupa URL langsung ke file gambar (.jpg/.png/.webp), jangan kosong. Balas JSON sesuai format.${aturanNama}`;

        const result = await askAI({
          message: aiMessage,
          history: [],
          env,
          systemPrompt: RECOMMEND_SYSTEM_PROMPT,
          // 800 token sering terpotong karena URL gambar panjang -> JSON rusak.
          maxTokens: 1600,
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
              return { ...item, image: null, _pool: pool[index % pool.length] };
            });
          }
        }

        // Foto dicari dari NAMA tempat (Wikipedia/Commons) supaya gambar = lokasi.
        if (groups) {
          for (const key of GROUP_KEYS) {
            groups[key] = await Promise.all(
              groups[key].map(async (item) => {
                if (item.image) return item;
                const foto = await fotoTempat(item.name, city);
                const { _pool, ...sisa } = item;
                return {
                  ...sisa,
                  image: foto?.image || _pool,
                  infoUrl: foto?.link || null,
                  mapsUrl: linkMaps(item.name, city),
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
        const fallback = tersimpan?.groups
          ? tersimpan.groups
          : localRecommendations(cityKey, areaMode, minRating);

        payload = groups
          ? { groups, source: result.source }
          : { groups: fallback, source: tersimpan ? "planner" : "engine" };

        // Simpan hasil baru. Kota dengan data lokal tidak perlu disimpan,
        // kecuali memang tombol reload yang minta variasi baru.
        if (groups && (!daftarLokal.length || refresh)) {
          await saveRecommendations(env, {
            ...paramsPlanner,
            cityLabel: city,
            groups,
            source: result.source,
          });
        }
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
      const tujuan = konteksTujuan(history, message);
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
      // Rencana 10–14 hari + modul butuh output JSON panjang: Gemini duluan.
      const result = await askAI({
        message,
        history: [],
        env,
        systemPrompt: CREATE_PLAN_SYSTEM_PROMPT + profil,
        maxTokens: 2600,
        providerOrder: ["gemini", "groq", "openrouter"],
      });
      payload = {
        plan: parsePlanJson(result?.reply, fakta),
        source: result?.source || "template",
      };
    } else if (mode === "search" || mode === "plan") {
      const normalized = normalizeText(message);
      const butuhRisetDetail = mode === "search" && butuhRiset(normalized, fakta);
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

      // Data kurasi -> KONTEKS. AI yang tetap menulis jawabannya.
      const konteks = jawabanLokal
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

      const tambahanPeta = showMap
        ? "\n\nUser mengaktifkan peta. Jika kamu menyebut nama tempat, WAJIB akhiri jawaban dengan satu baris: LOKASI: Nama 1 | Nama 2 | Nama 3 (maksimal 4 nama, dipisah ' | '). Nama itu harus berasal dari data terverifikasi di atas."
        : "";

      const systemPrompt =
        (mode === "search"
          ? butuhRisetDetail
            ? SEARCH_DETAIL_SYSTEM_PROMPT
            : SEARCH_SYSTEM_PROMPT
          : PLAN_SYSTEM_PROMPT) +
        GROUND_ATURAN +
        profil +
        tambahanPeta;

      const result = await askAI({
        message: `${message}${konteks}`,
        history,
        env,
        systemPrompt,
        // Riset panjang butuh ruang lebih besar: 1000 token sering habis
        // tepat di bagian terakhir karena token berpikir Gemini ikut dihitung.
        maxTokens: butuhRisetDetail ? 2000 : mode === "search" ? 500 : 400,
        providerOrder: butuhRisetDetail ? ["gemini", "groq", "openrouter"] : undefined,
        allowContinue: butuhRisetDetail,
      });

      let reply =
        result?.reply ||
        // Jaring pengaman terakhir kalau semua provider AI sedang gagal.
        (jawabanLokal
          ? balasanKotaTerverifikasi(kotaKey, normalized)
          : jawabanDunia?.reply) ||
        fallbackReply();

      const detail = { source: result?.source || "engine" };
      if (butuhRisetDetail) detail.handoff = true;

      // Pilihan jawaban juga harus dari AI, bukan contoh hardcoded di browser.
      // Baris PILIHAN: disembunyikan dari teks, dikirim sebagai chip pilihan.
      const barisPilihan = reply.match(/^PILIHAN:\s*(.+)$/im);
      if (barisPilihan) {
        reply = reply.replace(/^PILIHAN:\s*.+$/im, "").trim();
        detail.options = verifikasiOpsi(
          barisPilihan[1].split("|").map((item) => item.trim()).filter(Boolean),
          konteksTujuan(history, message)
        );
      }

      if (mode === "plan") {
        detail.ready = /<<\s*SIAP\s*>>/.test(reply);
        reply = reply.replace(/<<\s*SIAP\s*>>/g, "").trim();
        if (!detail.ready) detail.ready = siapDariObrolan(history, message, fakta);
      }

      if (showMap) {
        const diperbolehkan = jawabanLokal
          ? kandidat.map((item) => item.name)
          : jawabanDunia?.places.map((item) => item.name) || null;

        // Destinasi di luar data kurasi (mis. USA, Palestina, Makkah) tidak
        // punya nama tempat terverifikasi. Jangan ever bikin kartu "Lihat
        // tempat" dari kalimat/opsi jawaban — itu bukan tempat, hasilnya
        // kartu palsu seperti "USA: wisata sejarah".
        if (diperbolehkan?.length) {
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
          if (!nama.length) nama = namaTempatFallback(reply, kotaPeta, diperbolehkan);
          nama = nama.filter((n) => diperbolehkan.includes(n));
          if (!nama.length) nama = diperbolehkan.slice(0, 4);

          if (nama.length) {
            detail.mapPlaces = await Promise.all(
              [...new Set(nama)]
                .slice(0, Math.min(4, batasJumlah(normalized, 4)))
                .map((n) => petaUntuk(n, labelPeta, pusat))
            );
          }
        }
      }

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
