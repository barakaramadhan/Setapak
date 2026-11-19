// Handler HTTP yang dipakai dua tempat:
// 1. Vercel Function -> api/chat.js
// 2. Vite dev server  -> vite.config.js
// Jadi logic-nya cuma satu, mudah dibaca dan diubah.

import { createHash } from "node:crypto";
import {
  askAI,
  RECOMMEND_SYSTEM_PROMPT,
  SEARCH_SYSTEM_PROMPT,
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
import {
  getSavedRecommendations,
  saveRecommendations,
} from "./plannerStore.js";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 hari
const RATE_WINDOW = 60 * 1000; // 1 menit
const RATE_LIMIT = 10; // maksimal 10 request/menit per IP

const cache = new Map(); // prompt -> { reply, source, at }
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
  return "Maaf, semua kuota AI sedang penuh. Coba lagi sebentar, atau tanya dengan format \"3 hari di Bogor budget 200rb\" supaya saya bisa bantu dari data lokal SETAPAK.";
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

const FIELD_DEFAULT = [
  { key: "people", label: "Seru! Berapa orang yang ikut, dan kira-kira budget kamu berapa?", type: "text", placeholder: "" },
  { key: "dates", label: "Oke! Mau berapa hari, atau dari tanggal berapa sampai tanggal berapa?", type: "text", placeholder: "" },
  { key: "interests", label: "Terakhir, kamu lebih suka suasana yang seperti apa?", type: "select", options: ["Nature", "Culture", "Food"], placeholder: "" },
];

function parsePlanFields(text) {
  const raw = bacaJsonArrayAI(text);
  if (!raw) return FIELD_DEFAULT;
  const bersih = raw
    .slice(0, 5)
    .map((item) => ({
      key: String(item?.key || "").trim().slice(0, 30),
      label: String(item?.label || "").trim().slice(0, 60),
      type: ["text", "number", "date", "select"].includes(item?.type)
        ? item.type
        : "text",
      placeholder: String(item?.placeholder || "").trim().slice(0, 60),
      ...(item?.type === "select" && Array.isArray(item.options)
        ? { options: item.options.slice(0, 6).map((o) => String(o).slice(0, 40)) }
        : {}),
    }))
    .filter((item) => item.key && item.label);
  return bersih.length ? bersih : FIELD_DEFAULT;
}

function parsePlanJson(text) {
  try {
    const raw = bacaJsonAI(text);
    if (!raw || !Array.isArray(raw.days) || raw.days.length === 0) return null;
    return {
      city: String(raw.city || "").slice(0, 80),
      days: raw.days.slice(0, 7).map((hari, index) => ({
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
function siapDariObrolan(history, message) {
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
  const dariJawaban = String(reply || "")
    .split("\n")
    .map((baris) =>
      baris
        .replace(/^[\s>*\-\d.]+/, "")
        .replace(/\*\*/g, "")
        .replace(/^[^:]+:\s*/, "")
        .split(/[—–,]/)[0]
        .trim()
    )
    .filter(
      (nama) =>
        nama.length >= 4 &&
        nama.length <= 60 &&
        !NAMA_SAMPAH.test(nama) &&
        !/^(LOKASI|Catatan|Tips|Kesimpulan)$/i.test(nama) &&
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

    // Cache server: prompt yang sama tidak dipanggil ke AI dua kali.
    // Mode Planning tidak di-cache karena jawabannya bergantung pada obrolan.
    const bisaCache = ["recommend", "chat", "search"].includes(mode);
    const key =
      mode === "recommend"
        ? `recommend:${areaMode}:${cityKey}:${minRating}`
        : `${mode}:${showMap ? "map" : "teks"}:${message
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()}`;
    const cached = refresh || !bisaCache ? null : cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      send(res, 200, { ...cached, cached: true });
      return;
    }

    let payload;
    let pakaiPlannerData = false;

    if (mode === "recommend") {
      // Mode ini dipakai tombol panah di "For you". AI balas JSON kartu.
      // Kota/area baru hasil AI disimpan di planner data bersama, supaya orang
      // lain yang mencari hal yang sama mendapat kartu yang identik.
      const paramsPlanner = { cityKey, areaMode, minRating };
      const tersimpan = await getSavedRecommendations(env, paramsPlanner);

      // Tombol reload sengaja melewati hasil lama dan minta yang berbeda.
      if (tersimpan && !refresh) {
        payload = { ...tersimpan, cached: true };
        pakaiPlannerData = true;
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
          pakaiPlannerData = true;
          cache.delete(key); // hasil lama di memory tidak boleh dipakai lagi
        }
      }
    } else if (mode === "planFields") {
      // AI yang menentukan data apa saja yang masih kurang untuk membuat plan.
      const result = await askAI({
        message,
        history,
        env,
        systemPrompt: PLAN_FIELDS_SYSTEM_PROMPT,
        maxTokens: 500,
      });
      payload = {
        fields: parsePlanFields(result?.reply),
        source: result?.source || "template",
      };
    } else if (mode === "createPlan") {
      const result = await askAI({
        message,
        history: [],
        env,
        systemPrompt: CREATE_PLAN_SYSTEM_PROMPT,
        maxTokens: 1600,
      });
      payload = {
        plan: parsePlanJson(result?.reply),
        source: result?.source || "template",
      };
    } else if (mode === "search" || mode === "plan") {
      const normalized = normalizeText(message);
      const kotaKey = mode === "search" ? resolveCity(normalized) : null;
      const kandidat = kotaKey
        ? kandidatTerverifikasi(kotaKey, normalized).daftar
        : [];
      const jawabanLokal = mode === "search" && kotaKey && kandidat.length >= 2;
      const jawabanDunia =
        mode === "search" && !jawabanLokal
          ? jawabanDuniaDariPesan(normalized)
          : null;

      let reply;
      const detail = {};

      if (jawabanLokal) {
        // Kota yang datanya sudah dicek: jawabannya murni dari data SETAPAK.
        reply = balasanKotaTerverifikasi(kotaKey, normalized);
        detail.source = "engine";

        if (showMap && kotaKey) {
          const label = cityLabels[kotaKey] || kotaKey;
          detail.mapPlaces = await Promise.all(
            kandidat
              .slice(0, Math.min(4, batasJumlah(normalized, 4)))
              .map((item) =>
                petaUntuk(item.name, label, PUSAT_KOTA[kotaKey] || null)
              )
          );
        }
      } else if (jawabanDunia) {
        // Kota/negara di luar data planner: jawab dari pengetahuan dunia yang
        // sudah dikurasi. Tetap konkret, tapi tidak bisa salah menyebut lokasi.
        reply = jawabanDunia.reply;
        detail.source = "dunia";

        if (showMap && jawabanDunia.places.length) {
          detail.mapPlaces = await Promise.all(
            jawabanDunia.places.slice(0, 4).map((item) =>
              petaUntuk(
                item.name,
                jawabanDunia.label,
                PUSAT_KOTA[jawabanDunia.kotaKey] || null
              )
            )
          );
        }
      } else {
        // Pertanyaan travel lain (harga, cuaca, perbandingan) dan mode
        // Planning tetap pakai AI dengan prompt anti-halusinasi.
        const tambahan = showMap
          ? "\n\nUser mengaktifkan peta. Jika kamu menyebut nama tempat, WAJIB akhiri jawaban dengan satu baris: LOKASI: Nama 1 | Nama 2 | Nama 3 (maksimal 4 nama, dipisah ' | ')."
          : "";
        const result = await askAI({
          message,
          history,
          env,
          systemPrompt:
            (mode === "search" ? SEARCH_SYSTEM_PROMPT : PLAN_SYSTEM_PROMPT) +
            tambahan,
          maxTokens: mode === "search" ? 500 : 400,
        });

        reply = result?.reply || fallbackReply();
        detail.source = result?.source || "template";

        if (mode === "plan") {
          detail.ready = /<<\s*SIAP\s*>>/.test(reply);
          reply = reply.replace(/<<\s*SIAP\s*>>/g, "").trim();
          if (!detail.ready) detail.ready = siapDariObrolan(history, message);
        }

        if (showMap) {
          const kota = kotaKey || searchCityKey(normalized);
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
          const diperbolehkan = kotaKey ? kandidat.map((item) => item.name) : null;
          if (!nama.length) nama = namaTempatFallback(reply, kota, diperbolehkan);
          if (diperbolehkan) nama = nama.filter((n) => diperbolehkan.includes(n));
          if (nama.length) {
            const label = cityLabels[kotaKey] || "";
            detail.mapPlaces = await Promise.all(
              nama.slice(0, 4).map((n) =>
                petaUntuk(n, label, PUSAT_KOTA[kotaKey] || null)
              )
            );
          }
        }
      }

      payload = { reply, ...detail };
    } else {
      const result = await askAI({ message, history, env, maxTokens: 400 });
      payload = result || { reply: fallbackReply(), source: "template" };
    }

    // Planner data sudah jadi sumber kebenaran; cache lokal tidak dipakai.
    if (!pakaiPlannerData && bisaCache) cache.set(key, { ...payload, at: Date.now() });
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
