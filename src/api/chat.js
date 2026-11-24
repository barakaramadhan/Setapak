
import { parseTripDate, parseTripDateRange } from "../utils/tripDate";
import {
  extractBudgetScope,
  extractBudgetTicket,
  extractTripDestinations,
  extractTripDurations,
} from "../utils/tripFacts.js";

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
  }
}

export function extractTripFacts(history = []) {
  const teks = (Array.isArray(history) ? history : [])
    .filter((item) => (item?.role || "user") === "user")
    .map((item) => String(item?.text || ""))
    .filter((item) => !/^\[Konteks dari chat/i.test(item))
    .join(" ")
    .trim();
  const lower = teks.toLowerCase();

  const destinations = extractTripDestinations(teks);

  const { days, daysByDestination } = extractTripDurations(teks);

  const rentang = parseTripDateRange(teks);
  const startDate = rentang?.start || parseTripDate(teks) || null;

  const angkaBudget = lower.match(/(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|rb|ribu)\b/);
  const budget = angkaBudget ? angkaBudget[0].replace(/\s+/g, " ").trim() : null;
  const budgetScope = extractBudgetScope(lower);
  const budgetTicket = extractBudgetTicket(lower);

  const food = /\b(makanan indonesia|masakan indonesia|kuliner indonesia|makan indonesia|resto indonesia|nasi goreng|rendang|sate|gado-?gado)\b/.test(lower)
    ? "makanan Indonesia"
    : null;
  const purpose = /\b(umroh|haji|ibadah|ziarah|makkah|madinah|masjidil haram|masjid nabawi)\b/.test(lower)
    ? "ibadah"
    : null;
  const honeymoon = /\b(bulan madu|honeymoon|anniversary|ulang tahun pernikahan)\b/.test(lower);
  const tema = purpose || (honeymoon ? "romantis" : (lower.match(/\b(santai|keluarga|petualangan|kuliner|budaya|romantis)\b/) || [])[0] || null);
  const companions = (lower.match(/\b(istri|suami|pasangan|berdua|keluarga|anak-anak|anak|teman)\b/) || [])[0] || null;
  const occasion =
    (lower.match(/\b(akhir tahun|liburan akhir tahun|tahun baru|natal|lebaran|idul fitri|libur sekolah|weekend|akhir pekan)\b/) || [])[0] || null;
  let inferredStart = startDate;
  if (!inferredStart && occasion) {
    const y = new Date().getFullYear();
    if (/akhir tahun|liburan akhir tahun/.test(occasion)) inferredStart = `${y}-12-28`;
    else if (/tahun baru/.test(occasion)) inferredStart = `${y}-12-31`;
    else if (/natal/.test(occasion)) inferredStart = `${y}-12-24`;
  }
  const specialNeeds = /\b(kebutuhan khusus|kondisi kesehatan|alergi|hamil|disabilitas|kursi roda|lansia|penyakit|medis|asthma|asma|diabetes)\b/.test(lower)
    ? (lower.match(/[^.?!]*(kebutuhan khusus|kondisi kesehatan|alergi|hamil|disabilitas|kursi roda|lansia|penyakit|medis|asthma|asma|diabetes)[^.?!]*/i)?.[0] || "ada kebutuhan khusus/kesehatan")
        .trim()
        .slice(0, 120)
    : null;
  const dokumen = /\b(paspor|visa|dokumen|izin)\b/.test(lower);
  const transport = /\b(pesawat|kereta|bus|transport|penerbangan|flight)\b/.test(lower);
  const akomodasi = /\b(hotel|villa|hostel|menginap|akomodasi|penginapan)\b/.test(lower);

  const knownKeys = [];
  const knownModules = [];
  if (destinations.length) {
    knownKeys.push("kota");
    knownModules.push("destination");
  }
  if (days !== null || startDate || occasion) {
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
  if (tema || companions || occasion) {
    knownKeys.push("tema");
    knownModules.push("overview");
  }
  if (specialNeeds) {
    knownKeys.push("safety");
    knownModules.push("safety");
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
    daysByDestination,
    startDate: inferredStart,
    occasion,
    budget,
    budgetScope,
    budgetTicket,
    food,
    purpose,
    tema,
    companions,
    specialNeeds,
    knownKeys,
    knownModules,
  };
}

export function saveLastPlan(plan) {
  if (plan) writeStorage(PLAN_KEY, plan);
}

export function getLastPlan() {
  return readStorage(PLAN_KEY, null);
}

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
    return {
      plan: data.plan || null,
      source: data.source || "ai",
      error: typeof data.error === "string" ? data.error : "",
    };
  } catch (error) {
    console.warn("[setapak] buat plan gagal:", error.message);
    return {
      plan: null,
      source: "offline",
      error: "Server terlalu lama merespons atau sedang bermasalah. Tekan Create Planning sekali lagi ya.",
    };
  }
}

export async function askRecommendations(
  city,
  mode = "near",
  minRating = 0,
  { refresh = false, excludeNames = [] } = {}
) {
  const cleanCity = String(city || "").trim().slice(0, 60);
  if (!cleanCity) return { groups: {}, source: "engine" };

  const batas = Number(minRating) || 0;
  const gagal = () => ({ groups: {}, source: "error" });

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
    if (!data.groups || data.error) return gagal();
    return { groups: data.groups, source: data.source || "ai" };
  } catch (error) {
    console.warn("[setapak] rekomendasi AI gagal:", error.message);
    return gagal();
  }
}
