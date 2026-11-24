
const UA = { "User-Agent": "SETAPAK/1.0 (travel planner)" };
const memo = new Map();

async function getJson(url, ms = 4500) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const KATA_UMUM = new Set([
  "taman", "kota", "wisata", "tempat", "pusat", "jalan", "daerah",
  "indonesia", "sekitar", "tempat", "tempatnya", "object", "file",
]);

const JUDUL_ORANG =
  /(anies|baswedan|gubernur|menteri|presiden|wakil|wali kota|bupati|politikus|tokoh|aktivis|pemilihan|pilpres|pilkada|kampanye|demo|kunjungan|rapat|wawancara|biografi|lahir|meninggal|portrait|potret|foto bersama)/i;

function tokenTempat(nama) {
  return String(nama || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((kata) => kata.length >= 4 && !KATA_UMUM.has(kata));
}

function fotoLayak(hit, nama, kota = "") {
  if (!hit?.image) return false;
  const judul = String(hit.title || "");
  if (JUDUL_ORANG.test(judul)) return false;
  const kotaToken = String(kota || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const token = tokenTempat(nama).filter((kata) => kata !== kotaToken);
  if (!token.length) return false; // nama terlalu umum -> pakai gambar cadangan
  const gabungan = judul.toLowerCase();
  return token.some((kata) => gabungan.includes(kata));
}

async function wikiImage(host, query, nama, kota) {
  const url =
    `https://${host}/w/api.php?action=query&format=json&origin=*&generator=search` +
    `&gsrlimit=5&gsrsearch=${encodeURIComponent(query)}&prop=pageimages|info` +
    `&piprop=thumbnail&pithumbsize=800&inprop=url`;
  const data = await getJson(url);
  const pages = Object.values(data?.query?.pages || {}).sort(
    (a, b) => (a.index || 0) - (b.index || 0)
  );
  const hit = pages.find((p) =>
    fotoLayak({ image: p.thumbnail?.source, title: p.title }, nama, kota)
  );
  return hit
    ? { image: hit.thumbnail.source, link: hit.fullurl, title: hit.title }
    : null;
}

async function commonsImage(query, nama, kota) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=${encodeURIComponent(query)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=800`;
  const data = await getJson(url);
  const pages = Object.values(data?.query?.pages || {}).sort(
    (a, b) => (a.index || 0) - (b.index || 0)
  );
  const page = pages.find((p) =>
    fotoLayak({ image: p.imageinfo?.[0]?.thumburl, title: p.title }, nama, kota)
  );
  const info = page?.imageinfo?.[0];
  return info?.thumburl
    ? { image: info.thumburl, link: info.descriptionurl, title: page.title }
    : null;
}

export async function fotoTempat(nama, kota = "") {
  const kunci = `${nama}|${kota}`.toLowerCase();
  if (memo.has(kunci)) return memo.get(kunci);

  const percobaan = [
    () => wikiImage("id.wikipedia.org", `${nama} ${kota}`, nama),
    () => wikiImage("en.wikipedia.org", `${nama} ${kota}`, nama),
    () => wikiImage("id.wikipedia.org", nama, nama),
    () => commonsImage(`${nama} ${kota}`, nama, kota),
  ];
  let hasil = null;
  for (const coba of percobaan) {
    try {
      hasil = await coba();
      if (hasil) break;
    } catch {
    }
  }
  memo.set(kunci, hasil);
  return hasil;
}

export function linkMaps(nama, kota = "") {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${nama} ${kota}`.trim()
  )}`;
}

export async function titikTempat(nama, kota = "", pusat = null) {
  const q = `${nama}${kota ? `, ${kota}` : ""}, Indonesia`;
  try {
    const data = await getJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
    );
    const lat = Number(data?.[0]?.lat);
    const lon = Number(data?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (pusat && (Math.abs(lat - pusat[0]) > 0.7 || Math.abs(lon - pusat[1]) > 0.7)) {
      return null;
    }
    return { lat, lon };
  } catch {
    return null;
  }
}

export async function lengkapiTempat(nama, kota = "", pusat = null, denganTitik = true) {
  const [foto, titik] = await Promise.all([
    fotoTempat(nama, kota),
    denganTitik ? titikTempat(nama, kota, pusat) : Promise.resolve(null),
  ]);
  return {
    name: nama,
    image: foto?.image || null,
    link: foto?.link || linkMaps(nama, kota),
    mapsUrl: linkMaps(nama, kota),
    ...(titik || {}),
  };
}
