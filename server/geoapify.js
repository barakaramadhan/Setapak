
const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const PLACES_URL = "https://api.geoapify.com/v2/places";
const JAM = 60 * 60 * 1000;

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

export function kunciGeoapify(env = process.env) {
  return String(env?.GEOAPIFY_API_KEY || "").trim();
}

export function geoapifyAktif(env = process.env) {
  return kunciGeoapify(env).length > 10;
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

function bboxDariHasil(r) {
  const b = r?.bbox;
  if (b && Number.isFinite(Number(b.lat1)) && Number.isFinite(Number(b.lon1))) {
    const lat1 = Number(b.lat1);
    const lat2 = Number(b.lat2);
    const lon1 = Number(b.lon1);
    const lon2 = Number(b.lon2);
    return { s: Math.min(lat1, lat2), n: Math.max(lat1, lat2), w: Math.min(lon1, lon2), e: Math.max(lon1, lon2) };
  }
  if (Array.isArray(b) && b.length === 4 && b.every((v) => Number.isFinite(Number(v)))) {
    return { s: Number(b[1]), n: Number(b[3]), w: Number(b[0]), e: Number(b[2]) };
  }
  return null;
}

function skalaDariHasil(r, spanKm) {
  const t = String(r?.result_type || r?.type || "").toLowerCase();
  if (t === "country") return "negara";
  if (["state", "province", "region", "county", "district"].includes(t)) return spanKm <= 600 ? "wilayah" : "negara";
  if (["city", "town", "village", "municipality", "suburb", "locality", "postcode"].includes(t)) return "kota";
  if (["amenity", "building", "street", "address"].includes(t)) return "poi";
  if (spanKm <= 120) return "kota";
  if (spanKm <= 600) return "wilayah";
  return "negara";
}

export async function geocodeGeoapify(query, { env = process.env, fetchFn = globalThis.fetch, ms = 5000, lang = "id" } = {}) {
  const q = String(query || "").trim().slice(0, 80);
  const key = kunciGeoapify(env);
  if (q.length < 3 || !key) return null;

  return ingat(`ggeo:${q.toLowerCase()}`, 24 * JAM, async () => {
    const url = `${GEOCODE_URL}?text=${encodeURIComponent(q)}&format=json&limit=3&lang=${encodeURIComponent(lang)}&apiKey=${encodeURIComponent(key)}`;
    const res = await fetchFn(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error(`Geoapify geocode HTTP ${res.status}`);
    const data = await res.json();
    const hasil = Array.isArray(data?.results) ? data.results : [];
    if (!hasil.length) return null;

    const hit =
      hasil.find((r) => ["city", "state", "country", "county", "district", "island"].includes(String(r.result_type || ""))) ||
      hasil.find((r) => Number(r.rank?.importance) >= 0.3) ||
      hasil[0];
    const lat = Number(hit.lat ?? hit?.lat);
    const lon = Number(hit.lon ?? hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    let bb = bboxDariHasil(hit);
    if (!bb) {
      const d = 0.08;
      bb = { s: lat - d, n: lat + d, w: lon - d, e: lon + d };
    }
    const spanKm = Math.max((bb.n - bb.s) * 111, (bb.e - bb.w) * 111 * Math.cos(rad(lat)));
    const skala = skalaDariHasil(hit, spanKm);
    const name = hit.name || hit.city || hit.state || hit.country || q;
    const nameEn = hit.name || hit.city || hit.state || hit.country || q;

    return {
      query: q,
      name,
      nameEn,
      display: String(hit.formatted || [hit.city, hit.state, hit.country].filter(Boolean).join(", ") || q)
        .split(",")
        .slice(0, 3)
        .join(",")
        .trim(),
      lat,
      lon,
      bbox: bb,
      country: hit.country || "",
      cc: String(hit.country_code || "").toLowerCase(),
      spanKm,
      skala,
      sumberGeo: "geoapify",
    };
  }).catch(() => null);
}

export function jenisDariGeoapify(categories = []) {
  const c = (Array.isArray(categories) ? categories : []).map((x) => String(x).toLowerCase());
  const ada = (...subs) => c.some((x) => subs.some((s) => x.includes(s)));
  if (ada("catering", "commercial.food_and_drink")) return "kuliner";
  if (ada("religion", "tourism.sights.place_of_worship")) return "ibadah";
  if (ada("entertainment", "leisure")) {
    if (ada("park", "garden", "nature_reserve")) return "alam";
    return "hiburan";
  }
  if (ada("natural", "beach", "national_park", "protected_area", "camping", "tourism.sights.natural")) return "alam";
  if (ada("heritage", "museum", "tourism.sights", "building.historic")) return "budaya";
  if (ada("accommodation")) return "penginapan";
  if (ada("commercial.shopping_mall", "commercial.marketplace", "commercial.supermarket")) return "belanja";
  if (ada("tourism.attraction", "tourism")) return "wisata";
  return "wisata";
}

function subjenisGeoapify(categories = []) {
  const c = (Array.isArray(categories) ? categories : []).join(" ").toLowerCase();
  if (c.includes("theme_park") || c.includes("amusement")) return "taman hiburan";
  if (c.includes("water_park")) return "taman air";
  if (c.includes("zoo")) return "kebun binatang";
  if (c.includes("aquarium")) return "akuarium";
  return "";
}

function fotoDariGeoapify(p) {
  const ds = p?.datasource?.raw || {};
  const img = ds.image || p?.wiki_and_media?.image;
  if (typeof img === "string" && /^https?:\/\/.+/i.test(img)) return img;
  const commons = ds.wikimedia_commons;
  if (commons && /^File:/i.test(String(commons))) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(String(commons).replace(/^File:/i, ""))}?width=800`;
  }
  return null;
}

function normQuery(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenQuery(s) {
  const stop = new Set([
    "di", "ke", "dan", "yang", "untuk", "dengan", "ada", "apa", "cari", "carikan",
    "tolong", "rekomendasi", "tempat", "paling", "bagus", "enak", "dekat", "sekitar",
    "near", "me", "saya", "aku", "dong", "ya", "kasih", "tahu", "tau", "info", "detail",
    "tentang", "minta", "mohon", "bisa", "dimana", "mana", "itu", "ini", "ada", "apa",
    "the", "please", "show",
  ]);
  return normQuery(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function kategoriDariKueri(kueri = "") {
  const q = normQuery(kueri);
  const set = new Set();
  const tambah = (...cats) => cats.forEach((c) => set.add(c));
  if (/\b(restoran|restaurant|rumah makan|warung|kedai|cafe|kafe|kopi|coffee|kuliner|makan|makanan|minum|bakso|sate|soto|nasi|mie|padang|minang|halal|seafood|steak|burger|pizza|dessert|roti|sarapan|brunch|dinner|lunch)\b/.test(q)) {
    tambah("catering", "commercial.food_and_drink");
  }
  if (/\b(masjid|mosque|mushola|musholla|surau|ibadah|gereja|church|vihara|pura|temple)\b/.test(q)) {
    tambah("religion.place_of_worship");
  }
  if (/\b(hotel|penginapan|villa|hostel|resort|menginap|stay|akomodasi|accommodation)\b/.test(q)) {
    tambah("accommodation");
  }
  if (/\b(mall|belanja|shopping|pasar|market|toko|oleh oleh|souvenir|supermarket|minimarket)\b/.test(q)) {
    tambah("commercial.shopping_mall", "commercial.marketplace", "commercial.supermarket", "commercial");
  }
  if (/\b(pantai|beach|gunung|air terjun|waterfall|danau|lake|taman nasional|nature|alam|hiking|camping)\b/.test(q)) {
    tambah("natural", "tourism.sights.natural", "leisure.park", "leisure.park.garden");
  }
  if (/\b(museum|sejarah|heritage|candi|istana|monumen|landmark|budaya|galeri|gallery)\b/.test(q)) {
    tambah("tourism.sights", "heritage", "entertainment.museum", "entertainment.culture");
  }
  if (/\b(taman|park|kebun|garden|zoo|kebun binatang|aquarium|dufan|theme park|hiburan|rekreasi|playground)\b/.test(q)) {
    tambah("leisure", "entertainment", "tourism.attraction");
  }
  if (/\b(wisata|attraction|tempat menarik|things to do|landmark)\b/.test(q)) {
    tambah("tourism", "tourism.attraction", "tourism.sights");
  }
  if (!set.size) {
    tambah("tourism", "catering", "entertainment", "leisure", "natural", "religion.place_of_worship", "heritage", "commercial.marketplace");
  }
  return [...set];
}

function kategoriJenisDariProps(p = {}) {
  const cats = Array.isArray(p.categories) ? p.categories : [];
  if (cats.length) return jenisDariGeoapify(cats);
  const rt = String(p.result_type || p.category || "").toLowerCase();
  if (/amenity|catering|restaurant|cafe|food/.test(rt)) return "kuliner";
  if (/tourism|attraction|sights/.test(rt)) return "wisata";
  if (/accommodation|hotel/.test(rt)) return "penginapan";
  if (/religion|worship/.test(rt)) return "ibadah";
  if (/leisure|entertainment/.test(rt)) return "hiburan";
  if (/natural|beach|park/.test(rt)) return "alam";
  if (/heritage|museum|historic/.test(rt)) return "budaya";
  if (/commercial|shop|market/.test(rt)) return "belanja";
  return "wisata";
}

function cocokQuery(p, kueri = "") {
  const tokens = tokenQuery(kueri);
  if (!tokens.length) return 0;
  const nama = normQuery(p.name || "");
  const hay = normQuery(
    [p.name, p.alamat, p.jenis, p.subjenis, p.masakan, p.halal, Array.isArray(p._cats) ? p._cats.join(" ") : "", p._rawText || ""].join(" ")
  );
  let skor = 0;
  let cocokNama = 0;
  for (const t of tokens) {
    if (nama.includes(t)) {
      skor += 2.2;
      cocokNama += 1;
    } else if (hay.includes(t)) {
      skor += 0.9;
    }
  }
  if (tokens.length >= 2 && cocokNama >= Math.min(2, tokens.length)) skor += 3;
  if (/\bhalal\b/.test(normQuery(kueri)) && /\bhalal\b/.test(hay)) skor += 3;
  return skor;
}

function placeDariGeoapifyProps(p, f, dest, pusat, kueri = "") {
  const name = String(p.name || p.address_line1 || "").trim();
  const plat = Number(p.lat ?? f?.geometry?.coordinates?.[1]);
  const plon = Number(p.lon ?? f?.geometry?.coordinates?.[0]);
  if (name.length < 2 || !Number.isFinite(plat) || !Number.isFinite(plon)) return null;

  const cats = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);
  const jenis = kategoriJenisDariProps(p);
  const jarak = pusat ? jarakKm(pusat, { lat: plat, lon: plon }) : 0;
  const ds = p?.datasource?.raw || {};
  const masakan = String(p.catering?.cuisine || ds.cuisine || "").replace(/;/g, ", ").slice(0, 48);
  const dietHalal = /yes|only/i.test(String(ds["diet:halal"] || ds.diet_halal || ds.halal || ""));
  const halal = dietHalal
    ? "halal"
    : /\bhalal\b/i.test([name, p.formatted, masakan, ds.name].filter(Boolean).join(" "))
      ? "kemungkinan halal (cek label)"
      : "";
  const website =
    typeof p.website === "string" && /^https?:\/\//i.test(p.website)
      ? p.website
      : typeof ds.website === "string" && /^https?:\/\//i.test(ds.website)
        ? ds.website
        : "";
  const phone = String(p.contact?.phone || ds.phone || ds["contact:phone"] || "").slice(0, 40);
  const rawText = [ds.amenity, ds.shop, ds.tourism, ds.cuisine, ds["diet:halal"], ds.description, p.result_type].filter(Boolean).join(" ");

  let skor = 0;
  if (p.website || website) skor += 1;
  if (p.opening_hours) skor += 1;
  if (fotoDariGeoapify(p)) skor += 1;
  if (cats.some((c) => /tourism\.attraction|tourism\.sights|heritage/.test(String(c)))) skor += 2;
  if (name && p.formatted) skor += 0.5;
  if (jenis === "kuliner" && /\b(restoran|restaurant|rumah makan|kuliner|makan|halal|cafe|warung)\b/.test(normQuery(kueri))) skor += 0.8;
  if (pusat) skor -= Math.min(3, jarak / 8);
  skor += cocokQuery({ name, alamat: p.formatted, jenis, subjenis: subjenisGeoapify(cats), masakan, halal, _cats: cats, _rawText: rawText }, kueri);

  const alamat = String(
    p.formatted || p.address_line2 || [p.street, p.suburb, p.city, p.state].filter(Boolean).join(", ") || ""
  ).slice(0, 140);
  const placeId = p.place_id ? String(p.place_id) : "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name} ${alamat || dest?.name || ""}`.trim()
  )}`;

  return {
    name,
    jenis,
    subjenis: subjenisGeoapify(cats),
    lat: plat,
    lon: plon,
    skor,
    jarak,
    jam: p.opening_hours ? String(p.opening_hours).slice(0, 48) : "",
    biaya: "",
    masakan,
    halal,
    alamat,
    foto: fotoDariGeoapify(p),
    website,
    phone,
    osmUrl: placeId ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(name)}` : null,
    mapsUrl,
    sumber: "geoapify",
    _cats: cats,
    _rawText: rawText,
    _id: placeId || `${plat.toFixed(5)},${plon.toFixed(5)}:${normQuery(name)}`,
  };
}

function variasiKueriTeks(kueri = "", dest = null) {
  const q = String(kueri || "").trim().replace(/\s+/g, " ");
  if (q.length < 3) return [];
  const out = [q];
  const nq = normQuery(q);
  const namaDest = String(dest?.name || dest?.display || "").trim();
  const adaDest = namaDest && nq.includes(normQuery(namaDest));

  const tambah = (s) => {
    const v = String(s || "").trim().replace(/\s+/g, " ");
    if (v.length < 3) return;
    if (!out.some((x) => normQuery(x) === normQuery(v))) out.push(v);
  };

  if (/\bhalal\b/.test(nq)) {
    tambah(q.replace(/\bhalal\b/ig, "halal restaurant").trim());
    tambah(`halal restaurant ${namaDest}`.trim());
    tambah(`restoran halal ${namaDest}`.trim());
    tambah(`rumah makan halal ${namaDest}`.trim());
  }
  if (/\b(masjid|mosque|mushola|musholla|surau)\b/.test(nq)) {
    tambah(`masjid ${namaDest}`.trim());
    tambah(`mosque ${namaDest}`.trim());
  }
  if (/\b(restoran|restaurant|rumah makan|kuliner|makan|cafe|kafe|warung)\b/.test(nq) && !adaDest && namaDest) {
    tambah(`${q} ${namaDest}`.trim());
  }

  if (tokenQuery(q).length >= 2 && namaDest && !adaDest) {
    tambah(`${q} ${namaDest}`.trim());
  }

  return out.slice(0, 4);
}

async function cariTempatGeoapifyTeks(dest, { env = process.env, fetchFn = globalThis.fetch, ms = 7000, limit = 20, kueri = "" } = {}) {
  const key = kunciGeoapify(env);
  const q = String(kueri || "").trim().slice(0, 120);
  if (!key || q.length < 3) return [];
  const lat = Number(dest?.lat);
  const lon = Number(dest?.lon);
  const punyaTitik = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const radius = punyaTitik
    ? (dest?.skala === "kota" || dest?.skala === "poi"
      ? Math.round(Math.min(30000, Math.max(5000, ((dest?.spanKm || 10) / 2) * 1000)))
      : 40000)
    : 0;

  const queries = variasiKueriTeks(q, dest);
  const groups = await Promise.all(
    queries.map((text, idx) =>
      ingat(
        `gplacest:${text.toLowerCase()}:${punyaTitik ? `${lat.toFixed(2)},${lon.toFixed(2)},${radius}` : "global"}`,
        6 * JAM,
        async () => {
          const params = new URLSearchParams({
            text,
            format: "json",
            limit: String(Math.min(20, Math.max(1, limit))),
            lang: "id",
            apiKey: key,
          });
          if (punyaTitik) {
            params.set("filter", `circle:${lon},${lat},${radius}`);
            params.set("bias", `proximity:${lon},${lat}`);
          }
          const res = await fetchFn(`${GEOCODE_URL}?${params.toString()}`, { signal: AbortSignal.timeout(ms) });
          if (!res.ok) throw new Error(`Geoapify geocode-text HTTP ${res.status}`);
          const data = await res.json();
          return Array.isArray(data?.results) ? data.results : [];
        }
      )
        .then((results) =>
          results
            .map((r) => {
              const place = placeDariGeoapifyProps(r, null, dest, punyaTitik ? { lat, lon } : null, q);
              if (!place) return null;
              place.skor += idx === 0 ? 2.2 : 1.2;
              if (idx > 0) place.skor += 0.2; // sedikit bonus keberadaan dari variasi
              return place;
            })
            .filter(Boolean)
        )
        .catch(() => [])
    )
  );

  const merged = groups.flat();
  const byId = new Map();
  for (const p of merged) {
    const k = p._id || `${normQuery(p.name)}:${p.lat?.toFixed?.(4)},${p.lon?.toFixed?.(4)}`;
    const prev = byId.get(k);
    if (!prev || p.skor > prev.skor) byId.set(k, p);
  }
  return [...byId.values()];
}

export async function cariTempatGeoapify(dest, { env = process.env, fetchFn = globalThis.fetch, ms = 7000, limit = 40, kueri = "" } = {}) {
  const key = kunciGeoapify(env);
  if (!key || !dest) return [];
  const lat = Number(dest.lat);
  const lon = Number(dest.lon);
  const punyaTitik = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);

  const q = String(kueri || "").trim();
  const tasks = [];
  if (q) {
    tasks.push(
      cariTempatGeoapifyTeks(dest, { env, fetchFn, ms, limit: Math.min(20, limit), kueri: q }).catch(() => [])
    );
  }
  if (punyaTitik) {
    const radius = dest.skala === "kota" || dest.skala === "poi"
      ? Math.round(Math.min(20000, Math.max(4000, ((dest.spanKm || 10) / 2) * 1000)))
      : 30000;
    const categoriesArr = kategoriDariKueri(kueri);
    const categories = categoriesArr.join(",");
    const kMemo = `gplaces:${lat.toFixed(2)},${lon.toFixed(2)}:${radius}:${limit}:${normQuery(kueri).slice(0, 40)}`;
    tasks.push(
      ingat(kMemo, 12 * JAM, async () => {
        const ambil = async (cats, lim) => {
          const url =
            `${PLACES_URL}?categories=${encodeURIComponent(cats)}` +
            `&filter=circle:${lon},${lat},${radius}` +
            `&bias=proximity:${lon},${lat}` +
            `&limit=${Math.min(100, Math.max(1, lim))}` +
            `&apiKey=${encodeURIComponent(key)}`;
          const res = await fetchFn(url, { signal: AbortSignal.timeout(ms) });
          if (!res.ok) throw new Error(`Geoapify places HTTP ${res.status}`);
          const data = await res.json();
          return Array.isArray(data?.features) ? data.features : [];
        };
        let hasil = await ambil(categories, Math.max(limit, kueri ? 40 : limit));
        if (kueri && hasil.length < 8) {
          const luas = ["tourism", "catering", "entertainment", "leisure", "natural", "religion.place_of_worship", "heritage", "commercial"].join(",");
          const tambahan = await ambil(luas, 60).catch(() => []);
          const ids = new Set(hasil.map((f) => f?.properties?.place_id).filter(Boolean));
          for (const f of tambahan) {
            const id = f?.properties?.place_id;
            if (id && ids.has(id)) continue;
            if (id) ids.add(id);
            hasil.push(f);
          }
        }
        return hasil;
      }).catch(() => [])
    );
  } else {
    if (!q) return [];
  }

  const groups = await Promise.all(tasks);
  const features = groups.flat();
  const pusat = punyaTitik ? { lat, lon } : null;

  const mapped = features
    .map((item) => {
      if (item && item.sumber === "geoapify" && item.name) return item;
      const f = item;
      const p = f?.properties || {};
      return placeDariGeoapifyProps(p, f, dest, pusat, kueri);
    })
    .filter(Boolean);

  const byId = new Map();
  for (const p of mapped) {
    const k = p._id || `${normQuery(p.name)}:${p.lat?.toFixed?.(4)},${p.lon?.toFixed?.(4)}`;
    const prev = byId.get(k);
    if (!prev || p.skor > prev.skor) byId.set(k, p);
  }

  return [...byId.values()]
    .sort((a, b) => b.skor - a.skor)
    .map((place) => {
      const clean = { ...place };
      delete clean._cats;
      delete clean._rawText;
      delete clean._id;
      return clean;
    });
}
