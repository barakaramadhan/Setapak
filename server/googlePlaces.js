
const ENDPOINT = "https://places.googleapis.com/v1";
const JAM = 60 * 60 * 1000;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours.openNow",
  "places.photos.name",
].join(",");

const memo = new Map();
function ingat(kunci, ttl, loader) {
  const hit = memo.get(kunci);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = Promise.resolve()
    .then(loader)
    .catch((error) => {
      memo.delete(kunci);
      throw error;
    });
  memo.set(kunci, { t: Date.now(), p });
  if (memo.size > 400) memo.delete(memo.keys().next().value);
  return p;
}

export function kunciGoogle(env = process.env) {
  return String(env?.GOOGLE_MAPS_API_KEY || env?.GOOGLE_PLACES_API_KEY || "").trim();
}

export function googleAktif(env = process.env) {
  return kunciGoogle(env).length > 10;
}

/** Jenis versi SETAPAK dari tipe Google (urutan penting: yang paling spesifik dulu). */
export function jenisDariGoogle(types = [], primaryType = "") {
  const semua = [primaryType, ...(Array.isArray(types) ? types : [])].filter(Boolean);
  const ada = (...pola) => semua.some((t) => pola.some((p) => p.test(t)));
  if (ada(/^(mosque|church|hindu_temple|buddhist_temple|synagogue|place_of_worship)$/)) return "ibadah";
  if (ada(/(restaurant|cafe|coffee_shop|bakery|food|meal_takeaway|meal_delivery|bar|ice_cream|dessert|diner|steak_house|seafood)/))
    return "kuliner";
  if (ada(/^(amusement_park|theme_park|water_park|zoo|aquarium|amusement_center)$/)) return "hiburan";
  if (ada(/^(museum|art_gallery|historical_landmark|historical_place|monument|cultural_landmark|cultural_center|castle|palace)$/))
    return "budaya";
  if (ada(/^(park|national_park|nature_reserve|beach|hiking_area|botanical_garden|garden|natural_feature|campground|state_park|scenic_spot|waterfall|mountain_peak|lake|river)$/))
    return "alam";
  if (ada(/^(lodging|hotel|resort_hotel|guest_house|hostel|motel|bed_and_breakfast|inn|extended_stay_hotel)$/))
    return "penginapan";
  if (ada(/^(shopping_mall|market|supermarket|store|department_store|gift_shop)$/)) return "belanja";
  return "wisata";
}

const rad = (d) => (d * Math.PI) / 180;
function jarakKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function normalisasiGoogle(g, pusat = null) {
  const name = String(g?.displayName?.text || "").trim();
  const lat = Number(g?.location?.latitude);
  const lon = Number(g?.location?.longitude);
  if (name.length < 2 || !g?.id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (g.businessStatus && g.businessStatus !== "OPERATIONAL") return null;

  const rating = Number.isFinite(Number(g.rating)) ? Number(g.rating) : null;
  const ulasan = Number.isFinite(Number(g.userRatingCount)) ? Number(g.userRatingCount) : 0;
  const jenis = jenisDariGoogle(g.types, g.primaryType);
  const mapsUri =
    typeof g.googleMapsUri === "string" && /^https:\/\/(www\.)?(maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(g.googleMapsUri)
      ? g.googleMapsUri
      : `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(g.id)}`;

  const skor = rating ? rating * Math.log10(ulasan + 10) : 0;
  const buka = g.regularOpeningHours?.openNow;

  return {
    sumber: "google",
    placeId: String(g.id),
    name,
    jenis,
    subjenis: "",
    lat,
    lon,
    skor,
    jarak: pusat ? jarakKm(pusat, { lat, lon }) : 0,
    jam: buka === true ? "buka sekarang" : buka === false ? "sedang tutup" : "",
    biaya: "",
    masakan: String(g.primaryTypeDisplayName?.text || "").slice(0, 40),
    halal: "",
    alamat: String(g.formattedAddress || "").slice(0, 160),
    foto: null,
    photoName: g.photos?.[0]?.name ? String(g.photos[0].name) : null,
    rating,
    ulasan,
    bukaSekarang: typeof buka === "boolean" ? buka : null,
    mapsUrl: mapsUri,
  };
}

export async function cariGoogle({
  query,
  env = process.env,
  pusat = null, // { lat, lon }
  radiusM = 20000,
  maks = 10,
  bahasa = "id",
  wilayah = "",
  fetchFn = globalThis.fetch,
  ms = 6000,
} = {}) {
  const q = String(query || "").trim().slice(0, 200);
  const key = kunciGoogle(env);
  if (q.length < 2 || !key) return [];

  const body = {
    textQuery: q,
    languageCode: bahasa,
    pageSize: Math.min(20, Math.max(1, maks)),
    ...(wilayah ? { regionCode: wilayah.toUpperCase() } : {}),
    ...(pusat && Number.isFinite(pusat.lat) && Number.isFinite(pusat.lon)
      ? {
          locationBias: {
            circle: {
              center: { latitude: pusat.lat, longitude: pusat.lon },
              radius: Math.min(50000, Math.max(500, radiusM)),
            },
          },
        }
      : {}),
  };

  const kunciMemo = `g:${q.toLowerCase()}|${pusat ? `${pusat.lat.toFixed(2)},${pusat.lon.toFixed(2)}` : ""}|${maks}|${bahasa}|${wilayah}`;
  const mentah = await ingat(kunciMemo, 6 * JAM, async () => {
    const res = await fetchFn(`${ENDPOINT}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json())?.error?.message || "";
      } catch {
      }
      throw new Error(`Google Places HTTP ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
    }
    const data = await res.json();
    return Array.isArray(data?.places) ? data.places : [];
  });

  return mentah.map((g) => normalisasiGoogle(g, pusat)).filter(Boolean);
}

export async function fotoGoogle(photoName, env = process.env, { fetchFn = globalThis.fetch, lebar = 800, ms = 4000 } = {}) {
  const key = kunciGoogle(env);
  const nama = String(photoName || "");
  if (!key || !/^places\/[^/]+\/photos\/[^/]+$/.test(nama)) return null;
  try {
    return await ingat(`gp:${nama}:${lebar}`, 3 * JAM, async () => {
      const res = await fetchFn(
        `${ENDPOINT}/${nama}/media?maxWidthPx=${lebar}&skipHttpRedirect=true`,
        { headers: { "X-Goog-Api-Key": key }, signal: AbortSignal.timeout(ms) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const uri = (await res.json())?.photoUri;
      return typeof uri === "string" && /^https:\/\//.test(uri) ? uri : null;
    });
  } catch {
    return null;
  }
}

export function gabungGoogle(...daftar) {
  const unik = new Map();
  for (const p of daftar.flat()) {
    if (!p) continue;
    const ada = unik.get(p.placeId);
    if (!ada || p.skor > ada.skor) unik.set(p.placeId, p);
  }
  return [...unik.values()].sort((a, b) => b.skor - a.skor);
}

const ANGKA = new Intl.NumberFormat("id-ID");
export function teksUlasan(n) {
  return n > 0 ? `${ANGKA.format(n)} ulasan` : "belum ada ulasan";
}

export function barisGoogle(p) {
  const rating = p.rating ? `Rating **${p.rating.toFixed(1)}/5** (${teksUlasan(p.ulasan)})` : "Belum ada rating";
  const buka = p.jam ? `, ${p.jam}` : "";
  return `- **${p.name}** — ${p.alamat || "alamat ada di Google Maps"}. ${rating}${buka}.`;
}

export function balasanDariGoogle(places = [], { kueri = "", maks = 5 } = {}) {
  if (!places.length) {
    return `Google Maps tidak mengembalikan hasil untuk pencarian${kueri ? ` “${kueri}”` : ""}. Aku tidak mau menebak nama dari ingatan, jadi coba perjelas kota/areanya atau jenis tempatnya (misalnya “restoran Padang di Kuala Lumpur”).`;
  }
  const atas = places.slice(0, maks);
  return (
    `## Hasil dari Google Maps${kueri ? ` — ${kueri}` : ""}\n\n` +
    atas.map(barisGoogle).join("\n") +
    `\n\nNama, alamat, rating, dan status buka di atas diambil langsung dari Google Maps. Cek jam buka dan ulasan terbaru sebelum berangkat.`
  );
}
