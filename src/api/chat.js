// Gerbang AI untuk frontend.
// Setiap prompt SELALU lewat API /api/chat. Tidak ada cache jawaban dan tidak
// ada jawaban lokal yang menggantikan AI. Data terverifikasi dikirim server
// sebagai KONTEKS supaya AI tetap paham dunia tanpa mengarang lokasi.
// API key tidak pernah masuk browser.

import { recommendPlaces, searchCityKey } from "./plannerEngine";
import { parseTripDate, parseTripDateRange } from "../utils/tripDate";

// Rencana terakhir masih disimpan lokal supaya halaman Schedule/Trip bisa
// menampilkannya. Ini bukan cache jawaban AI.
const PLAN_KEY = "setapak:last-plan";

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan kalau localStorage penuh / tidak tersedia.
  }
}

/**
 * Profil trip diekstrak dari SEMUA pesan user, bukan 6–8 pesan terakhir.
 * Setiap request AI membawa profil ini supaya kota, durasi, budget, dan
 * preferensi makanan tidak ditanyakan ulang oleh prompt Planning/planFields.
 */
const LABEL_DESTINASI = {
  makkah: "Makkah", mekah: "Makkah", mecca: "Makkah",
  madinah: "Madinah", medina: "Madinah",
  jeddah: "Jeddah", jedda: "Jeddah",
  jepang: "Jepang", japan: "Jepang", singapura: "Singapura", singapore: "Singapura",
  korea: "Korea", thailand: "Thailand", malaysia: "Malaysia", vietnam: "Vietnam",
  turki: "Turki", mesir: "Mesir", palestina: "Palestina",
  amerika: "Amerika", australia: "Australia",
  bogor: "Bogor", yogyakarta: "Yogyakarta", jogja: "Yogyakarta", bandung: "Bandung",
  jakarta: "Jakarta", malang: "Malang", surabaya: "Surabaya", semarang: "Semarang",
  bekasi: "Bekasi", depok: "Depok", tangerang: "Tangerang", solo: "Solo",
  makassar: "Makassar", bali: "Bali", lombok: "Lombok",
};

export function extractTripFacts(history = []) {
  const teks = (Array.isArray(history) ? history : [])
    .filter((item) => (item?.role || "user") === "user")
    .map((item) => String(item?.text || ""))
    .filter((item) => !/^\[Konteks dari chat/i.test(item))
    .join(" ")
    .trim();
  const lower = teks.toLowerCase();

  const destinations = [];
  Object.entries(LABEL_DESTINASI).forEach(([kunci, label]) => {
    const pola = new RegExp(`(^|[^a-z])${kunci}([^a-z]|$)`);
    if (pola.test(lower) && !destinations.includes(label)) destinations.push(label);
  });

  const cocokDurasi =
    lower.match(/\b(\d{1,2})\s*(hari|malam|days?|minggu)\b/) ||
    lower.match(/\b(\d{1,2})\s*weeks?\b/);
  let days = cocokDurasi ? Number(cocokDurasi[1]) : null;
  if (days !== null && /minggu|week/.test(cocokDurasi[2] || "")) days *= 7;
  if (days === null && /\b(seminggu|sepekan)\b/.test(lower)) days = 7;

  const rentang = parseTripDateRange(teks);
  const startDate = rentang?.start || parseTripDate(teks) || null;

  const angkaBudget = lower.match(/(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|rb|ribu)\b/);
  const budget = angkaBudget ? angkaBudget[0].replace(/\s+/g, " ").trim() : null;

  const food = /\b(makanan indonesia|masakan indonesia|kuliner indonesia|makan indonesia|resto indonesia|nasi goreng|rendang|sate|gado-?gado)\b/.test(lower)
    ? "makanan Indonesia"
    : null;
  const purpose = /\b(umroh|haji|ibadah|ziarah|makkah|madinah|masjidil haram|masjid nabawi)\b/.test(lower)
    ? "ibadah"
    : null;
  const tema = purpose || (lower.match(/\b(santai|keluarga|petualangan|kuliner|budaya|romantis)\b/) || [])[0] || null;
  const companions = (lower.match(/\b(istri|suami|pasangan|berdua|keluarga|anak-anak|anak|teman)\b/) || [])[0] || null;
  const dokumen = /\b(paspor|visa|dokumen|izin)\b/.test(lower);
  const transport = /\b(pesawat|kereta|bus|transport|penerbangan|flight)\b/.test(lower);
  const akomodasi = /\b(hotel|villa|hostel|menginap|akomodasi|penginapan)\b/.test(lower);

  const knownKeys = [];
  const knownModules = [];
  if (destinations.length) {
    knownKeys.push("kota");
    knownModules.push("destination");
  }
  if (days !== null || startDate) {
    knownKeys.push("durasi");
    knownModules.push("dates");
  }
  if (budget) {
    knownKeys.push("budget");
    knownModules.push("budget");
  }
  if (food) {
    knownKeys.push("makanan");
    knownModules.push("food");
  }
  if (tema || companions) {
    knownKeys.push("tema");
    knownModules.push("overview");
  }
  if (dokumen) {
    knownKeys.push("dokumen");
    knownModules.push("documents");
  }
  if (transport) {
    knownKeys.push("transport");
    knownModules.push("transportation");
  }
  if (akomodasi) {
    knownKeys.push("akomodasi");
    knownModules.push("accommodation");
  }

  return {
    destinations: destinations.slice(0, 6),
    destinationLabel: destinations.slice(0, 6).join(" + "),
    days: days !== null ? Math.min(30, Math.max(1, days)) : null,
    startDate,
    budget,
    food,
    purpose,
    tema,
    companions,
    knownKeys,
    knownModules,
  };
}

/** Simpan rencana terakhir supaya dashboard bisa menampilkannya. */
export function saveLastPlan(plan) {
  if (plan) writeStorage(PLAN_KEY, plan);
}

/** Dipakai dashboard untuk mengisi bagian Schedule. */
export function getLastPlan() {
  return readStorage(PLAN_KEY, null);
}

/**
 * Tanya SETAPAK. Selalu memanggil AI lewat server.
 * @param {string} message
 * @param {Array<{role:string,text:string}>} history
 * @param {{mode?: "chat"|"search"|"plan", showMap?: boolean}} options
 * @returns {Promise<{reply: string, source: string, plan?: object, ready?: boolean, mapPlaces?: Array}>}
 */
export async function askSetapak(
  message,
  history = [],
  { mode = "chat", showMap = false } = {}
) {
  try {
    const facts = extractTripFacts([...history, { role: "user", text: message }]);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, mode, showMap, facts }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const result = {
      reply:
        data.reply ||
        "Maaf, AI belum mengembalikan jawaban. Coba ulangi pertanyaanmu ya.",
      source: data.source || "ai",
      ...(Array.isArray(data.options) ? { options: data.options } : {}),
      ...(data.plan ? { plan: data.plan } : {}),
      ...(typeof data.ready === "boolean" ? { ready: data.ready } : {}),
      ...(Array.isArray(data.mapPlaces) ? { mapPlaces: data.mapPlaces } : {}),
      ...(data.handoff === true ? { handoff: true } : {}),
      ...(data.grounding ? { grounding: data.grounding } : {}),
    };
    if (data.plan) saveLastPlan(data.plan);
    return result;
  } catch (error) {
    console.warn("[setapak] AI API gagal:", error.message);
    return {
      reply:
        "Koneksi ke server SETAPAK sedang terputus. Coba lagi sebentar ya — pertanyaanmu belum sempat dijawab AI.",
      source: "offline",
    };
  }
}

/** AI menentukan field yang masih dibutuhkan sebelum plan dibuat. */
export async function askPlanFields(history = []) {
  try {
    const facts = extractTripFacts(history);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "planFields",
        message: "Data apa saja yang masih dibutuhkan untuk melengkapi rencana ini?",
        history,
        facts,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { fields: data.fields || [], source: data.source || "ai" };
  } catch (error) {
    console.warn("[setapak] field plan gagal:", error.message);
    return { fields: [], source: "offline" };
  }
}

/** AI menyusun plan final dari obrolan + jawaban field. */
export async function askCreatePlan(ringkasan, facts = null) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "createPlan",
        message: ringkasan,
        history: [],
        facts,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { plan: data.plan || null, source: data.source || "ai" };
  } catch (error) {
    console.warn("[setapak] buat plan gagal:", error.message);
    return { plan: null, source: "offline" };
  }
}

/**
 * Rekomendasi kartu "For you" lewat AI (mode = "in" / "near").
 * Kota/area baru disimpan di planner data bersama di server, jadi pencarian
 * yang sama selalu menghasilkan kartu yang sama untuk semua orang.
 * Tidak ada cache browser: tombol reload selalu meminta variasi baru ke AI.
 * @returns {Promise<{groups: object, source: string}>}
 */
export async function askRecommendations(
  city,
  mode = "near",
  minRating = 0,
  { refresh = false, excludeNames = [] } = {}
) {
  const cleanCity = String(city || "").trim().slice(0, 60);
  if (!cleanCity) return { groups: {}, source: "engine" };

  const batas = Number(minRating) || 0;
  const kunciKota = searchCityKey(cleanCity);
  const pakaiDataLokal = () => ({
    groups: recommendPlaces(mode, kunciKota, batas),
    source: "engine",
  });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "recommend",
        message: `Rekomendasi tempat ${mode === "in" ? "di dalam" : "di sekitar"} kota ${cleanCity}, rating minimal ${batas}`,
        city: cleanCity,
        areaMode: mode,
        minRating: batas,
        refresh,
        excludeNames,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.groups) return pakaiDataLokal();
    return { groups: data.groups, source: data.source || "ai" };
  } catch (error) {
    console.warn("[setapak] rekomendasi AI gagal:", error.message);
    return pakaiDataLokal();
  }
}
