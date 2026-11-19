// "Planner data" bersama.
// Rekomendasi hasil AI untuk kota/area baru disimpan di sini, supaya dua orang
// yang mencari kota + mode + rating yang sama mendapat kartu yang identik.
//
// Supabase dipakai kalau env tersedia (shared untuk semua user & semua instance).
// Kalau belum ada Supabase, pakai Map di memory server sebagai cadangan.

const TABLE = "city_recommendations";
const memory = new Map(); // kunci -> { groups, source }

function supabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return {
    url: `${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${TABLE}`,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  };
}

function makeKey({ cityKey, areaMode, minRating }) {
  return `${cityKey}|${areaMode}|${Number(minRating) || 0}`;
}

/** Baca kartu yang pernah disimpan. Balik null kalau belum ada. */
export async function getSavedRecommendations(env, params) {
  const key = makeKey(params);
  const lokal = memory.get(key);
  if (lokal) return lokal;

  const db = supabase(env);
  if (!db) return null;

  try {
    const query = new URLSearchParams({
      city_key: `eq.${params.cityKey}`,
      area_mode: `eq.${params.areaMode}`,
      // PostgREST cuma menerima "eq.0", bukan "0".
      min_rating: `eq.${Number(params.minRating) || 0}`,
      select: "groups,source",
      order: "updated_at.desc", // kalau ada duplikat lama, yang terbaru yang dipakai
      limit: "1",
    });

    const res = await fetch(`${db.url}?${query}`, {
      headers: db.headers,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.groups) return null;

    const hasil = { groups: row.groups, source: "planner" };
    memory.set(key, hasil);
    return hasil;
  } catch (error) {
    console.warn("[setapak] gagal baca planner data:", error.message);
    return null;
  }
}

/** Simpan kartu hasil AI supaya pemakaian berikutnya tidak perlu AI lagi. */
export async function saveRecommendations(env, params) {
  const key = makeKey(params);
  memory.set(key, { groups: params.groups, source: "planner" });

  const db = supabase(env);
  if (!db) return;

  try {
    // on_conflict WAJIB disebut. Tanpa ini PostgREST menganggap konflik pada
    // primary key (id), jadi setiap reload jadi baris BARU, bukan menimpa.
    const upsertUrl = `${db.url}?on_conflict=city_key,area_mode,min_rating`;
    const res = await fetch(upsertUrl, {
      method: "POST",
      headers: {
        ...db.headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        city_key: params.cityKey,
        city_label: params.cityLabel || params.cityKey,
        area_mode: params.areaMode,
        min_rating: Number(params.minRating) || 0,
        groups: params.groups,
        source: params.source || "ai",
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.warn("[setapak] gagal simpan planner data: HTTP", res.status);
  } catch (error) {
    console.warn("[setapak] gagal simpan planner data:", error.message);
  }
}
