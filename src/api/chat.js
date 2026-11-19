// Gerbang AI untuk frontend.
// Urutan: cache -> mesin lokal -> API /api/chat (server) -> jawaban darurat.
// Tujuan: sesedikit mungkin pemanggilan API supaya kuota awet.

import {
  planTrip,
  recommendPlaces,
  searchCityKey,
} from "./plannerEngine";

// Versi dinaikkan ke v3 supaya hasil lama otomatis terbuang saat reset planner.
const CACHE_KEY = "setapak:chat-cache:v4"; // ganti versi kalau format jawaban berubah
const REC_CACHE_KEY = "setapak:recommend-cache:v4"; // cache khusus "For you"
const PLAN_KEY = "setapak:last-plan";

const OFFLINE_REPLY =
  "Maaf, kuota AI lagi penuh. Saya masih bisa bantu rencana lokal, coba sebutkan kota dan durasi, misalnya: \"3 hari di Bogor budget 200rb\".";

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

function makeKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
 * Tanya SETAPAK.
 * @param {string} message
 * @param {Array<{role:string,text:string}>} history
 * @param {{mode?: "chat"|"search"|"plan", showMap?: boolean}} options
 * @returns {Promise<{reply: string, source: string, plan?: object, ready?: boolean, mapPlaces?: Array, cached?: boolean}>}
 */
export async function askSetapak(
  message,
  history = [],
  { mode = "chat", showMap = false } = {}
) {
  // Mode dan toggle peta ikut masuk kunci cache supaya jawaban tidak tertukar.
  const key = makeKey(`${mode}:${showMap ? "map" : "teks"}:${message}`);
  const cache = readStorage(CACHE_KEY, {});

  // 1. Pernah ditanya? Langsung jawab, tanpa API.
  if (cache[key]) return { ...cache[key], cached: true };

  // 2. Mesin lokal dulu (instan, gratis) — hanya untuk obrolan biasa.
  if (mode === "chat") {
    const local = planTrip(message);
    if (local.handled) {
      const result = { reply: local.reply, source: "engine", plan: local.plan };
      saveLastPlan(local.plan);
      cache[key] = result;
      writeStorage(CACHE_KEY, cache);
      return result;
    }
  }

  // 3. Baru panggil AI lewat server (API key tidak pernah masuk browser).
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, mode, showMap }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const result = {
      reply: data.reply || OFFLINE_REPLY,
      source: data.source || "ai",
      // Server belum selalu mengirim plan; kalau ada, simpan supaya Schedule
      // dan halaman Trip bisa memakainya.
      ...(data.plan ? { plan: data.plan } : {}),
      ...(typeof data.ready === "boolean" ? { ready: data.ready } : {}),
      ...(Array.isArray(data.mapPlaces) ? { mapPlaces: data.mapPlaces } : {}),
    };
    if (data.plan) saveLastPlan(data.plan);

    cache[key] = result;
    writeStorage(CACHE_KEY, cache);
    return result;
  } catch (error) {
    console.warn("[setapak] AI API gagal:", error.message);
    return {
      reply:
        mode === "plan"
          ? "Kuota AI sedang penuh. Coba singkat lagi ya, atau ketik / untuk mulai rencana baru."
          : OFFLINE_REPLY,
      source: "offline",
    };
  }
}

/** AI menentukan field yang masih dibutuhkan sebelum plan dibuat. */
export async function askPlanFields(history = []) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "planFields",
        message: "Data apa saja yang masih dibutuhkan untuk melengkapi rencana ini?",
        history,
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
export async function askCreatePlan(ringkasan) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "createPlan",
        message: ringkasan,
        history: [],
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
 * - Kota/area baru disimpan di planner data bersama di server, jadi pencarian
 *   yang sama selalu menghasilkan kartu yang sama untuk semua orang.
 * - refresh = true (tombol reload) melewati hasil lama dan minta variasi baru.
 * @returns {Promise<{groups: object, source: string, cached?: boolean}>}
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
  const key = makeKey(`rec:${mode}:${kunciKota}:${batas}`);
  const cache = readStorage(REC_CACHE_KEY, {});
  if (!refresh && cache[key]) return { ...cache[key], cached: true };

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
    if (!data.groups) return cache[key] || pakaiDataLokal();

    const result = { groups: data.groups, source: data.source || "ai" };
    cache[key] = result;
    writeStorage(REC_CACHE_KEY, cache);
    return result;
  } catch (error) {
    console.warn("[setapak] rekomendasi AI gagal:", error.message);
    return cache[key] || pakaiDataLokal();
  }
}
