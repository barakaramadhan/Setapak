// "Mata & telinga" AI SETAPAK.
//
// Masalah lama: AI hanya menebak dari ingatannya + 4 kota kurasi, lalu ditambal
// aturan prompt satu per satu. Di sini AI diberi DATA NYATA tentang tujuan yang
// sedang dibahas — semuanya GRATIS dan TANPA API key:
//   - Nominatim (OSM)      : kota/negara -> koordinat + batas wilayah
//   - Overpass (OSM)       : tempat nyata (wisata, kuliner, ibadah) + koordinat + jam buka
//   - Wikivoyage/Wikipedia : panduan lokal (lihat, lakukan, makan, transport, keamanan)
//   - Open-Meteo           : prakiraan / pola cuaca sesuai tanggal trip
//
// Hasilnya: blok teks "DATA LAPANGAN" yang disuntik ke prompt, plus daftar tempat
// berkoordinat untuk memverifikasi jawaban AI (nama yang tidak ada = dibuang/ditandai).
// Semua kegagalan jaringan bersifat AMAN: fungsi mengembalikan null dan alur
// lama (data kurasi + AI) tetap jalan.

const UA = {
  "User-Agent": "SETAPAK/1.0 (travel planner)",
  "Accept-Language": "id,en;q=0.8",
};

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const JAM = 60 * 60 * 1000;

// Cache DATA (bukan cache jawaban AI): tempat/koordinat/cuaca jarang berubah.
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
  if (memo.size > 300) memo.delete(memo.keys().next().value);
  return p;
}

async function getJson(url, ms = 5000, init = {}) {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(ms),
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function denganBatas(promise, ms, cadangan = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(cadangan), ms)),
  ]);
}

const KATA_TANYA_FILM = /\b(film|movie)\b.*\b(?:di mana|dimana|where)\b.*\b(?:syuting|difilmkan|dibuat|filmed|shot|produksi|negara|mau ke|pergi ke)\b|\b(?:lokasi|tempat)\s+(?:syuting|filming)\b/i;
const KATA_JUDUL_FILM = /\b(?:itu|ini|dimana|di mana|syuting|difilmkan|dibuat|lokasi|negara|saya|aku|mau|ke|ya|nih|soalnya|where|was|were|filmed|shot|produced|location|in)\b/i;

export function perluCekLokasiFilm(teks = "") {
  return KATA_TANYA_FILM.test(String(teks || ""));
}

function judulFilmDariPesan(teks) {
  const pesan = String(teks || "").trim();
  const sesudahFilm = pesan.match(
    /\b(?:film|movie)\s+(.+?)(?=\s+(?:itu|ini|di mana|dimana|lokasi|syuting|difilmkan|dibuat|where|was|were|filmed|shot|produced)\b|[?!]|$)/i
  )?.[1];
  if (sesudahFilm) return sesudahFilm.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return pesan
    .replace(KATA_TANYA_FILM, " ")
    .split(/\s+/)
    .filter((kata) => kata.length > 2 && !KATA_JUDUL_FILM.test(kata))
    .slice(0, 8)
    .join(" ");
}

export async function cariFaktaLokasiFilm(teks = "") {
  if (!perluCekLokasiFilm(teks)) return null;
  const judul = judulFilmDariPesan(teks);
  if (!judul) return null;

  return ingat(`film-fact:${normNama(judul)}`, 24 * JAM, async () => {
    const api = "https://en.wikipedia.org/w/api.php";
    const cari = await getJson(
      `${api}?action=query&format=json&list=search&srnamespace=0&srlimit=3&srsearch=${encodeURIComponent(judul)}`,
      5000
    );
    const tokensJudul = normNama(judul).split(" ").filter((kata) => kata.length > 2);
    const halaman = (cari?.query?.search || []).find((item) => {
      const nama = normNama(item.title);
      return tokensJudul.some((kata) => nama.split(" ").includes(kata));
    });
    if (!halaman) return null;

    const data = await getJson(
      `${api}?action=query&format=json&prop=extracts%7Cinfo&explaintext=1&exchars=1200&inprop=url&titles=${encodeURIComponent(halaman.title)}`,
      5000
    );
    const page = Object.values(data?.query?.pages || {})[0];
    if (!page?.extract || !page.fullurl) return null;

    const evidence = String(page.extract)
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => /\b(?:filming|filmed|production began|principal photography|shot in|shot at)\b/i.test(sentence))
      .join(" ")
      .slice(0, 900);
    if (!evidence) return null;

    return {
      title: String(page.title),
      url: String(page.fullurl),
      evidence,
    };
  });
}

// ---------------------------------------------------------------- util umum

const rad = (d) => (d * Math.PI) / 180;

export function jarakKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function normNama(teks) {
  return String(teks || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KATA_LONGGAR = new Set([
  "the", "of", "kota", "wisata", "taman", "masjid", "pantai", "gunung",
  "museum", "cafe", "kafe", "restoran", "rumah", "makan", "warung", "di",
  "dan", "la", "el", "al", "an", "bukit", "pasar", "kebun", "danau", "candi",
]);

function tokenPenting(norm) {
  return norm
    .split(" ")
    .filter((kata) => kata.length >= 3 && !KATA_LONGGAR.has(kata));
}

/** Cari tempat di daftar yang namanya "sama" dengan nama dari AI (toleran). */
export function cocokkanNama(nama, places = []) {
  const n = normNama(nama);
  if (!n || !places.length) return null;

  const persis = places.find((p) => normNama(p.name) === n);
  if (persis) return persis;

  const tokenA = new Set(tokenPenting(n));
  let terbaik = null;
  let skorTerbaik = 0;
  for (const p of places) {
    const m = normNama(p.name);
    // salah satu nama memuat nama lain (mis. "Kebun Raya Bogor" vs "Kebun Raya")
    const pendek = n.length <= m.length ? n : m;
    const panjang = n.length <= m.length ? m : n;
    if (pendek.length >= 6 && panjang.includes(pendek)) {
      const skor = 0.8 + pendek.length / (panjang.length * 10);
      if (skor > skorTerbaik) {
        terbaik = p;
        skorTerbaik = skor;
      }
      continue;
    }
    const tokenB = new Set(tokenPenting(m));
    if (!tokenA.size || !tokenB.size) continue;
    let sama = 0;
    tokenA.forEach((kata) => {
      if (tokenB.has(kata)) sama += 1;
    });
    const skor = sama / Math.min(tokenA.size, tokenB.size);
    if (sama >= 1 && skor >= 0.75 && skor > skorTerbaik) {
      terbaik = p;
      skorTerbaik = skor;
    }
  }
  return terbaik;
}

/** Tempat dari daftar yang namanya muncul di teks (urut kemunculan). */
export function tempatDalamTeks(teks, places = [], maks = 4) {
  const t = ` ${normNama(teks)} `;
  const hasil = [];
  for (const p of places) {
    const n = normNama(p.name);
    if (n.length < 4) continue;
    const idx = t.indexOf(` ${n} `);
    if (idx >= 0) hasil.push({ p, idx });
  }
  hasil.sort((a, b) => a.idx - b.idx);
  return hasil.slice(0, maks).map((h) => h.p);
}

// ------------------------------------------------- membaca KEBUTUHAN pengguna

/**
 * Membaca apa yang sebenarnya dibutuhkan orang dari seluruh obrolan, lalu
 * menerjemahkannya jadi implikasi rencana. Ini yang bikin jawaban terasa
 * "mengerti aku", bukan sekadar daftar tempat.
 */
export function bacaKebutuhan(teks = "") {
  const t = normNama(teks);
  if (!t) return [];
  const hasil = [];
  const tambah = (pola, baris) => {
    if (pola.test(t)) hasil.push(baris);
  };

  tambah(
    /\b(anak|balita|bayi|kids?|toddler)\b/,
    "Membawa anak kecil -> ritme santai, tempat berdekatan, sisakan waktu istirahat/tidur siang, hindari medan berat, utamakan tempat ramah anak."
  );
  tambah(
    /\b(lansia|orang tua|ortu|nenek|kakek|mertua|manula|parents)\b/,
    "Membawa orang tua/lansia -> minim jalan kaki & tanjakan/tangga, banyak jeda duduk, transport nyaman, jangan terlalu pagi/terlalu panas."
  );
  tambah(/\b(hamil|pregnant)\b/, "Ada yang hamil -> santai, dekat fasilitas kesehatan, hindari aktivitas ekstrem.");
  tambah(
    /\b(kursi roda|disabilitas|difabel|wheelchair)\b/,
    "Perlu aksesibilitas -> pilih tempat ramah kursi roda, beri catatan akses, transport yang mudah."
  );
  tambah(
    /\b(halal|muslim|salat|sholat|solat|umroh|umrah|haji|ibadah|masjid|ziarah)\b/,
    "Konteks Muslim/ibadah -> makanan halal, waktu salat & masjid dekat rute, hormati dress code & waktu tutup saat salat (terutama Jumat siang)."
  );
  tambah(/\b(vegetarian|vegan)\b/, "Vegetarian/vegan -> pilih kuliner yang aman, jangan asumsikan ada menu sayur.");
  const alergi = t.match(/\balergi\s+([a-z]+)/);
  if (alergi) {
    hasil.push(`Alergi ${alergi[1]} -> ingatkan cek bahan makanan, hindari rekomendasi yang berisiko.`);
  }
  tambah(
    /\b(hemat|murah|backpacker?|irit|low budget|budget terbatas|mepet)\b/,
    "Budget hemat -> utamakan tempat gratis/murah, transport umum, makan lokal; beri perkiraan biaya realistis."
  );
  tambah(
    /\b(mewah|luxury|premium|honeymoon|bulan madu|romantis)\b/,
    "Pengalaman premium/romantis -> pilih suasana, privasi, dan momen (sunset, makan malam), bukan sekadar banyak tempat."
  );
  tambah(
    /\b(santai|relax|rileks|slow|healing|istirahat)\b/,
    "Ingin santai -> maksimal 2 kegiatan utama per hari, jangan padat."
  );
  tambah(
    /\b(padat|sebanyak mungkin|full day|maksimal)\b/,
    "Ingin padat -> isi hari efisien, kelompokkan tempat sedekat mungkin."
  );
  tambah(
    /\b(hiking|mendaki|trekking|naik gunung|camping|snorkeling?|diving|selam|surfing|rafting)\b/,
    "Suka petualangan -> aktivitas outdoor pagi, cek cuaca & keselamatan, beri catatan perlengkapan."
  );
  tambah(/\b(foto|fotografi|instagramable|spot foto|sunrise|sunset)\b/, "Suka foto -> atur waktu golden hour (pagi/sore) untuk tempat terbaiknya.");
  tambah(/\b(kuliner|foodie|makan enak|jajan)\b/, "Suka kuliner -> sisipkan makanan khas lokal tiap hari, bukan hanya restoran umum.");
  tambah(/\b(sejarah|budaya|museum|heritage)\b/, "Suka sejarah/budaya -> prioritaskan situs bersejarah & museum, cek jam buka.");
  tambah(/\b(belanja|shopping|oleh oleh)\b/, "Suka belanja -> sisipkan pasar/pusat oleh-oleh dengan waktu cukup.");
  tambah(/\b(pertama kali|first time|baru pertama)\b/, "Pertama kali ke sana -> pastikan ikon utama masuk, beri tips orientasi.");

  return hasil.slice(0, 8);
}

export function blokKebutuhan(teks) {
  const baris = bacaKebutuhan(teks);
  if (!baris.length) return "";
  return (
    `\n\n=== KEBUTUHAN YANG TERBACA DARI OBROLAN ===\n` +
    baris.map((b) => `- ${b}`).join("\n") +
    `\nJawabanmu HARUS tampak memahami hal-hal ini (sebut singkat kenapa sebuah pilihan cocok untuk mereka).\n=== AKHIR KEBUTUHAN ===`
  );
}

// ------------------------------------------------------- 1. tujuan -> koordinat

export function geocodeTujuan(query) {
  const q = String(query || "").trim().slice(0, 80);
  if (q.length < 3) return Promise.resolve(null);
  return ingat(`geo:${q.toLowerCase()}`, 24 * JAM, async () => {
    const data = await getJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&namedetails=1&accept-language=id&q=${encodeURIComponent(q)}`,
      5000
    );
    const hit =
      (data || []).find((d) => ["boundary", "place"].includes(d.category)) ||
      (data || []).find((d) => Number(d.importance) >= 0.35);
    if (!hit || !Array.isArray(hit.boundingbox)) return null;
    const [s, n, w, e] = hit.boundingbox.map(Number);
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (![s, n, w, e, lat, lon].every(Number.isFinite)) return null;

    const spanKm = Math.max(
      (n - s) * 111,
      (e - w) * 111 * Math.cos(rad(lat))
    );
    const area = ["boundary", "place"].includes(hit.category);
    return {
      query: q,
      name: hit.namedetails?.name || hit.name || q,
      nameEn: hit.namedetails?.["name:en"] || hit.namedetails?.name || hit.name || q,
      display: String(hit.display_name || "").split(",").slice(0, 3).join(",").trim(),
      lat,
      lon,
      bbox: { s, n, w, e },
      country: hit.address?.country || "",
      cc: String(hit.address?.country_code || "").toLowerCase(),
      spanKm,
      // kota: query sekitar titik; wilayah: hanya yang notable; negara: tanpa peta tempat
      skala: !area ? "poi" : spanKm <= 120 ? "kota" : spanKm <= 600 ? "wilayah" : "negara",
    };
  });
}

const BUKAN_TUJUAN = new Set([
  "sini", "sana", "situ", "mana", "sekitar", "dekat", "rumah", "kantor",
  "sekolah", "kampus", "hari", "minggu", "bulan", "tahun", "budget", "anggaran",
  "juta", "ribu", "saya", "aku", "kami", "kita", "dia", "kamu", "anda", "akhir",
  "pekan", "liburan", "jalan", "trip", "wisata", "tempat", "kota", "negara",
  "besok", "nanti", "tapi", "dan", "yang", "untuk", "dengan", "bareng", "sama",
  "selama", "lagi", "aja", "saja", "ini", "itu", "ada", "gak", "tidak", "bisa",
  "apa", "siapa", "kapan", "berapa", "mau", "ingin", "pengen", "the", "a",
  "pagi", "siang", "sore", "malam", "kedua", "pertama", "ketiga", "tengah",
]);

function kandidatDariPesan(pesan = "") {
  const hasil = [];
  const re =
    /\b(?:ke|di|dari|sekitar|around|to|in)\s+([\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,2})/giu;
  let m;
  while ((m = re.exec(String(pesan))) && hasil.length < 4) {
    const kata = m[1].trim().split(/\s+/);
    // buang kata penutup yang bukan bagian nama tempat
    while (kata.length && BUKAN_TUJUAN.has(kata[kata.length - 1].toLowerCase())) kata.pop();
    while (kata.length && BUKAN_TUJUAN.has(kata[0].toLowerCase())) kata.shift();
    if (!kata.length) continue;
    const dua = kata.slice(0, 2).join(" ");
    if (kata.length > 1 && !hasil.includes(dua)) hasil.push(dua);
    if (!hasil.includes(kata[0])) hasil.push(kata[0]);
  }
  return hasil.slice(0, 3);
}

/** Tujuan yang sedang dibahas (maks 2): dari pesan terbaru lalu profil trip. */
export async function tentukanTujuan({ message = "", fakta = null, pakaiPesan = true }) {
  const kandidat = [
    ...(pakaiPesan ? kandidatDariPesan(message) : []),
    ...(fakta?.destinations || []),
  ];
  const ditemukan = [];
  for (const nama of [...new Set(kandidat)].slice(0, 5)) {
    if (ditemukan.length >= 2) break;
    let dest = null;
    try {
      dest = await geocodeTujuan(nama);
    } catch {
      dest = null;
    }
    if (!dest) continue;
    const kembar = ditemukan.some((d) => jarakKm(d, dest) < 15);
    if (!kembar) ditemukan.push({ ...dest, label: nama });
  }
  return ditemukan;
}

// ------------------------------------------------------- 2. tempat nyata (OSM)

function kuerOverpass(dest, longgar) {
  const { s, n, w, e } = dest.bbox;
  let area;
  if (dest.skala === "kota") {
    const r = Math.round(Math.min(16000, Math.max(5000, (dest.spanKm / 2) * 1000)));
    area = `(around:${r},${dest.lat},${dest.lon})`;
  } else if (dest.skala === "poi") {
    area = `(around:3500,${dest.lat},${dest.lon})`;
  } else {
    area = `(${s},${w},${n},${e})`;
  }
  const notable = dest.skala === "wilayah";
  const wd = notable ? `["wikidata"]` : "";
  const baris = [
    `nwr${area}["tourism"~"^(attraction|museum|zoo|theme_park|aquarium|viewpoint|gallery)$"]["name"]${wd};`,
    `nwr${area}["historic"~"^(monument|castle|temple|ruins|archaeological_site|fort|palace|memorial)$"]["name"]${wd};`,
    `nwr${area}["natural"~"^(beach|waterfall|peak|volcano|hot_spring|cave_entrance)$"]["name"]${wd};`,
    `nwr${area}["leisure"~"^(park|nature_reserve|garden|water_park)$"]["name"]${longgar && !notable ? "" : `["wikidata"]`};`,
    `nwr${area}["amenity"="place_of_worship"]["name"]["wikidata"];`,
  ];
  if (!notable) {
    baris.push(
      `nwr${area}["amenity"~"^(restaurant|cafe|food_court|marketplace)$"]["name"]["wikidata"];`,
      longgar
        ? `nwr${area}["amenity"~"^(restaurant|cafe|food_court)$"]["name"]["cuisine"];`
        : `nwr${area}["amenity"~"^(restaurant|cafe)$"]["name"]["cuisine"]["opening_hours"];`
    );
  }
  return `[out:json][timeout:10];\n(\n${baris.join("\n")}\n);\nout center tags 220;`;
}

async function jalankanOverpass(kuer) {
  const body = `data=${encodeURIComponent(kuer)}`;
  const panggil = (url) =>
    fetch(url, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(9000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data?.elements) ? data.elements : [];
    });
  // Dua mirror sekaligus: yang tercepat menang.
  return Promise.any(OVERPASS_URLS.map(panggil));
}

function tentukanJenis(t) {
  if (/^(restaurant|cafe|food_court|marketplace)$/.test(t.amenity || "")) return "kuliner";
  if (t.amenity === "place_of_worship") return "ibadah";
  if (/^(zoo|theme_park|aquarium)$/.test(t.tourism || "") || t.leisure === "water_park")
    return "hiburan";
  if (
    t.natural ||
    t.waterway === "waterfall" ||
    t.tourism === "viewpoint" ||
    /^(park|nature_reserve|garden)$/.test(t.leisure || "")
  )
    return "alam";
  if (t.historic || /^(museum|gallery)$/.test(t.tourism || "")) return "budaya";
  if (t.tourism === "attraction") return "wisata";
  return null;
}

function subjenisHiburan(t) {
  if (t.tourism === "theme_park") return "taman hiburan";
  if (t.leisure === "water_park") return "taman air";
  if (t.tourism === "zoo") return "kebun binatang";
  if (t.tourism === "aquarium") return "akuarium";
  return "";
}

function fotoDariTag(t) {
  if (t.image && /^https?:\/\/.+\.(jpe?g|png|webp)(\?.*)?$/i.test(t.image)) return t.image;
  const commons = t.wikimedia_commons;
  if (commons && /^File:/i.test(commons)) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      commons.replace(/^File:/i, "")
    )}?width=800`;
  }
  return null;
}

function alamatDariTag(t) {
  const jalan = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
  const area = t["addr:suburb"] || t["addr:subdistrict"] || t["addr:city"] || "";
  return [jalan, area].filter(Boolean).join(", ").slice(0, 100);
}

function ubahElemen(el, pusat) {
  const t = el.tags || {};
  const name = String(t["name:id"] || t.name || "").trim();
  if (name.length < 3) return null;
  const jenis = tentukanJenis(t);
  if (!jenis) return null;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const jarak = jarakKm(pusat, { lat, lon });
  let skor = 0;
  if (t.wikidata) skor += 5;
  if (t.wikipedia) skor += 3;
  if (t.website || t["contact:website"]) skor += 1;
  if (t.opening_hours) skor += 1;
  if (t.image || t.wikimedia_commons) skor += 1;
  if (t.tourism === "attraction") skor += 1;
  skor -= Math.min(3, jarak / 8);

  return {
    name,
    jenis,
    subjenis: subjenisHiburan(t),
    lat,
    lon,
    skor,
    jarak,
    jam: t.opening_hours ? String(t.opening_hours).slice(0, 48) : "",
    biaya: t.fee === "no" ? "gratis" : t.fee === "yes" ? "berbayar" : "",
    masakan: t.cuisine ? String(t.cuisine).replace(/;/g, ", ").slice(0, 32) : "",
    halal: t["diet:halal"] === "yes" ? "halal" : "",
    alamat: alamatDariTag(t),
    foto: fotoDariTag(t),
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

function pilihTempat(daftar) {
  // dedupe nama
  const unik = new Map();
  for (const p of daftar) {
    const kunci = normNama(p.name);
    const ada = unik.get(kunci);
    if (!ada || p.skor > ada.skor) unik.set(kunci, p);
  }
  const semua = [...unik.values()].sort((a, b) => b.skor - a.skor);

  const kuliner = semua.filter((p) => p.jenis === "kuliner").slice(0, 16);
  const hitungJenis = {};
  const wisata = [];
  for (const p of semua) {
    if (p.jenis === "kuliner") continue;
    hitungJenis[p.jenis] = (hitungJenis[p.jenis] || 0) + 1;
    if (hitungJenis[p.jenis] > 14) continue; // jaga keberagaman
    wisata.push(p);
    if (wisata.length >= 40) break;
  }
  return [...wisata, ...kuliner];
}

/** Zona = kelompok tempat yang saling berdekatan (k-means kecil). */
function zonakan(places, k) {
  if (places.length < 4) return places.map(() => 0);
  const kk = Math.min(Math.max(2, k), 5, places.length);
  const pusat = [places[0]];
  while (pusat.length < kk) {
    let terjauh = 0;
    let jarakMaks = -1;
    places.forEach((p, i) => {
      const d = Math.min(...pusat.map((c) => jarakKm(p, c)));
      if (d > jarakMaks) {
        jarakMaks = d;
        terjauh = i;
      }
    });
    pusat.push(places[terjauh]);
  }
  let pusatBaru = pusat.map((c) => ({ lat: c.lat, lon: c.lon }));
  let tugas = new Array(places.length).fill(0);
  for (let putaran = 0; putaran < 12; putaran += 1) {
    tugas = places.map((p) => {
      let terbaik = 0;
      let jarakMin = Infinity;
      pusatBaru.forEach((c, i) => {
        const d = jarakKm(p, c);
        if (d < jarakMin) {
          jarakMin = d;
          terbaik = i;
        }
      });
      return terbaik;
    });
    pusatBaru = pusatBaru.map((c, i) => {
      const anggota = places.filter((_, idx) => tugas[idx] === i);
      if (!anggota.length) return c;
      return {
        lat: anggota.reduce((a, p) => a + p.lat, 0) / anggota.length,
        lon: anggota.reduce((a, p) => a + p.lon, 0) / anggota.length,
      };
    });
  }
  // zona terbesar = A
  const ukuran = pusatBaru.map((_, i) => tugas.filter((x) => x === i).length);
  const urut = ukuran.map((u, i) => ({ u, i })).sort((a, b) => b.u - a.u).map((x) => x.i);
  return tugas.map((t) => urut.indexOf(t));
}

const HURUF = "ABCDE";

async function ambilTempat(dest, hari) {
  if (dest.skala === "negara") return [];
  return ingat(`osm:${dest.lat.toFixed(2)},${dest.lon.toFixed(2)}:${dest.skala}`, 12 * JAM, async () => {
    let elemen = await jalankanOverpass(kuerOverpass(dest, false));
    let daftar = elemen.map((el) => ubahElemen(el, dest)).filter(Boolean);
    // Kota kecil / data OSM tipis: longgarkan syarat lalu coba lagi sekali.
    if (daftar.length < 10 && dest.skala !== "wilayah") {
      try {
        elemen = await jalankanOverpass(kuerOverpass(dest, true));
        daftar = elemen.map((el) => ubahElemen(el, dest)).filter(Boolean);
      } catch {
        // pakai hasil pertama
      }
    }
    const terpilih = pilihTempat(daftar);
    const zona = zonakan(terpilih, hari || 3);
    return terpilih.map((p, i) => ({ ...p, zona: HURUF[zona[i]] || "A" }));
  });
}

// ------------------------------------------- 3. panduan lokal (Wikivoyage/Wiki)

const BAGIAN_VOYAGE = [
  ["understand", "Gambaran", 420],
  ["see", "Yang dilihat", 520],
  ["do", "Yang dilakukan", 420],
  ["eat", "Makan", 380],
  ["get around", "Transportasi", 380],
  ["stay safe", "Keamanan", 300],
  ["cities", "Kota-kota", 420],
  ["regions", "Wilayah", 300],
  ["other destinations", "Destinasi lain", 300],
  ["climate", "Iklim", 220],
];

function potongBagian(teks) {
  const re = /^==\s*([^=\n][^\n]*?)\s*==\s*$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(teks))) {
    heads.push({ nama: m[1].trim().toLowerCase(), mulai: m.index, isi: m.index + m[0].length });
  }
  const hasil = { intro: teks.slice(0, heads[0]?.mulai ?? teks.length).trim() };
  heads.forEach((h, i) => {
    const akhir = heads[i + 1]?.mulai ?? teks.length;
    hasil[h.nama] = teks
      .slice(h.isi, akhir)
      .replace(/^=+\s*(.+?)\s*=+\s*$/gm, "$1:")
      .replace(/\s+/g, " ")
      .trim();
  });
  return hasil;
}

async function ambilVoyage(dest) {
  return ingat(`voyage:${dest.nameEn.toLowerCase()}`, 24 * JAM, async () => {
    const base = "https://en.wikivoyage.org/w/api.php";
    const ambil = async (judul) => {
      const data = await getJson(
        `${base}?action=query&format=json&origin=*&redirects=1&prop=extracts&explaintext=1&exsectionformat=wiki&titles=${encodeURIComponent(judul)}`,
        6000
      );
      const halaman = Object.values(data?.query?.pages || {})[0];
      return halaman && halaman.missing === undefined && halaman.extract ? halaman : null;
    };
    let halaman = await ambil(dest.nameEn);
    if (!halaman) {
      const cari = await getJson(
        `${base}?action=query&format=json&origin=*&list=search&srlimit=1&srsearch=${encodeURIComponent(dest.nameEn)}`,
        5000
      );
      const judul = cari?.query?.search?.[0]?.title;
      if (judul) halaman = await ambil(judul);
    }
    if (!halaman) return null;

    const bagian = potongBagian(halaman.extract);
    const ringkas = [];
    for (const [kunci, label, maks] of BAGIAN_VOYAGE) {
      const isi = bagian[kunci];
      if (isi && isi.length > 40) ringkas.push(`${label}: ${isi.slice(0, maks).trim()}…`);
    }
    return ringkas.length ? ringkas.join("\n") : null;
  });
}

async function ambilWikipedia(dest) {
  return ingat(`wiki:${dest.nameEn.toLowerCase()}`, 24 * JAM, async () => {
    const coba = async (host, judul) => {
      const data = await getJson(
        `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(judul)}`,
        5000
      );
      return data?.type === "standard" && data.extract ? String(data.extract) : null;
    };
    for (const [host, judul] of [
      ["id.wikipedia.org", dest.name],
      ["en.wikipedia.org", dest.nameEn],
    ]) {
      try {
        const teks = await coba(host, judul);
        if (teks) return teks.slice(0, 480);
      } catch {
        // coba sumber berikutnya
      }
    }
    return null;
  });
}

// ------------------------------------------------------------ 4. cuaca (Open-Meteo)

function ringkasCuaca(tmax, tmin, hujanMm, label) {
  if (!tmax.length) return null;
  const rata = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const hariHujan = hujanMm.filter((mm) => mm >= 1).length;
  const total = Math.round(hujanMm.reduce((a, b) => a + (b || 0), 0));
  return (
    `${label}: suhu ±${rata(tmin)}–${rata(tmax)}°C, hujan di ${hariHujan} dari ${tmax.length} hari (total ±${total} mm).`
  );
}

async function ambilCuaca(dest, fakta) {
  const hariIni = new Date();
  const mulai = fakta?.startDate ? new Date(`${fakta.startDate}T00:00:00Z`) : null;
  // Tanpa tanggal mulai: tampilkan sepekan ke depan (bukan durasi trip).
  const lama = mulai ? Math.min(14, Math.max(1, fakta?.days || 7)) : 7;
  const selisih = mulai ? Math.round((mulai - hariIni) / 86400000) : 0;
  const lat = dest.lat.toFixed(2);
  const lon = dest.lon.toFixed(2);

  if (mulai && selisih > 14) {
    const lalu = new Date(mulai);
    lalu.setUTCFullYear(lalu.getUTCFullYear() - 1);
    const akhir = new Date(lalu);
    akhir.setUTCDate(akhir.getUTCDate() + lama - 1);
    const f = (d) => d.toISOString().slice(0, 10);
    return ingat(`cuaca:${lat},${lon}:${f(lalu)}:${lama}`, 24 * JAM, async () => {
      const data = await getJson(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${f(lalu)}&end_date=${f(akhir)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
        6000
      );
      const d = data?.daily;
      if (!d) return null;
      return ringkasCuaca(
        d.temperature_2m_max || [],
        d.temperature_2m_min || [],
        d.precipitation_sum || [],
        "Pola cuaca di tanggal yang sama tahun lalu (BUKAN prakiraan — cek lagi mendekati hari H)"
      );
    });
  }

  return ingat(`cuaca:${lat},${lon}:f:${new Date().toISOString().slice(0, 13)}`, 3 * JAM, async () => {
    const data = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=16&timezone=auto`,
      6000
    );
    const d = data?.daily;
    if (!d) return null;
    const dari = mulai ? Math.max(0, selisih) : 0;
    const potong = (arr = []) => arr.slice(dari, dari + lama);
    return ringkasCuaca(
      potong(d.temperature_2m_max),
      potong(d.temperature_2m_min),
      potong(d.precipitation_sum),
      mulai ? "Prakiraan cuaca selama trip" : "Prakiraan cuaca 7 hari ke depan"
    );
  });
}

// --------------------------------------------------------------- 5. gabungan

function barisTempat(p, id) {
  const bagian = [
    id,
    p.name,
    p.jenis,
    ...(p.subjenis ? [p.subjenis] : []),
    `zona ${p.zona}`,
    `${p.jarak.toFixed(1)} km dari pusat`,
  ];
  if (p.jam) bagian.push(`jam ${p.jam}`);
  if (p.biaya) bagian.push(p.biaya);
  if (p.masakan) bagian.push(`masakan ${p.masakan}`);
  if (p.halal) bagian.push(p.halal);
  return bagian.join(" | ");
}

const ATURAN_PAKAI = `CARA PAKAI DATA LAPANGAN (WAJIB):
1. Daftar TEMPAT berasal dari peta nyata (OpenStreetMap). Rekomendasikan nama hanya dari daftar itu. Jika kategori yang diminta tidak ada di daftar, katakan belum bisa memverifikasi dan jangan mengarang alternatif.
2. DILARANG mengarang alamat, harga pasti, atau jam buka. Kalau jam buka tidak ada di data, tulis "cek jam buka terbaru".
3. Satu hari sebaiknya satu ZONA (atau zona bertetangga) supaya tidak bolak-balik. Jarak "km dari pusat" membantu memperkirakan waktu tempuh.
4. Sesuaikan dengan CUACA dan KEBUTUHAN yang terbaca. Kalau data terbatas / kota kecil, katakan terus terang — jangan dipaksakan.
5. Panduan Wikivoyage hanya latar kontekstual; jangan menyalin nama atau klaim yang kamu ragukan.`;

export function jawabanTempatRekreasi(teks, lapangan, fakta = null) {
  if (!/\b(dufan|taman hiburan|theme park|amusement park|water[\s-]?park|wahana|roller[\s-]?coaster|water slide|seluncuran air)\b/i.test(String(teks || ""))) {
    return null;
  }

  const tujuan =
    lapangan?.dests?.[0]?.display ||
    lapangan?.dests?.[0]?.name ||
    fakta?.destinations?.[0] ||
    "tujuan tersebut";
  const kandidat = (lapangan?.places || [])
    .filter((tempat) => ["taman hiburan", "taman air"].includes(tempat.subjenis))
    .slice(0, 4);

  if (!lapangan) {
    return `Aku belum bisa memeriksa data peta untuk ${tujuan} saat ini, jadi aku belum bisa memastikan ada taman hiburan atau taman air seperti Dufan. Aku tidak mau menebak nama tempat.`;
  }
  if (!kandidat.length) {
    return `Aku belum menemukan taman hiburan atau taman air yang bisa diverifikasi di data peta untuk ${tujuan}. Ini bukan bukti pasti bahwa tidak ada, tetapi aku tidak mau mengarang nama. Coba cek kata kunci “theme park” atau “water park” di Google Maps dan periksa situs resminya.`;
  }

  const daftar = kandidat
    .map((tempat) => `- **${tempat.name}** (${tempat.subjenis})`)
    .join("\n");
  return `Di data peta yang diperiksa untuk ${tujuan}, tercatat:\n${daftar}\n\nData ini mengonfirmasi lokasi dan kategorinya, bukan wahana, jam buka, atau apakah skalanya setara Dufan. Cek informasi resmi sebelum berkunjung.`;
}

/**
 * Kumpulkan data lapangan untuk tujuan yang sedang dibahas.
 * @returns {Promise<null | {blok:string, places:Array, dests:Array, byId:Map, cuaca:string|null}>}
 */
export async function kumpulkanLapangan({
  message = "",
  fakta = null,
  pakaiPesan = true,
  ringan = false, // true: lewati Wikivoyage & cuaca (mis. kartu For you)
  batasMs = 8000,
  teksKota = "", // teks tempat mencari nama kota di dalam negara (jawaban user)
  maksTempat = [18, 8], // [wisata, kuliner] per tujuan yang masuk prompt
} = {}) {
  const kerja = async () => {
    const dasar = await tentukanTujuan({ message, fakta, pakaiPesan });
    if (!dasar.length) return null;

    // "Jepang" saja tidak punya daftar tempat; kota yang disebut user (Tokyo, Kyoto)
    // ditambahkan sebagai tujuan sendiri supaya tetap berbasis peta nyata.
    const dests = [];
    for (const d of dasar) {
      dests.push(d);
      if (!ringan && (d.skala === "negara" || d.skala === "wilayah") && teksKota) {
        const kota = await kotaDalam(d, teksKota);
        kota.forEach((k) => dests.push({ ...k, indukNegara: d.name }));
      }
    }

    const hasil = await Promise.all(
      dests.map(async (dest, i) => {
        const [tempat, voyage, wiki, cuaca] = await Promise.allSettled([
          ambilTempat(dest, fakta?.days),
          ringan ? null : ambilVoyage(dest),
          ringan ? null : ambilWikipedia(dest),
          ringan || i > 0 ? null : ambilCuaca(dest, fakta),
        ]);
        const nilai = (r) => (r.status === "fulfilled" ? r.value : null);
        const semuaTempat = nilai(tempat) || [];
        // Banyak kota dalam satu negara: bagi kapasitas supaya prompt tidak membengkak.
        const bagi = Math.max(1, dests.filter((x) => x.indukNegara).length);
        const batasW = dest.indukNegara ? Math.ceil(maksTempat[0] / bagi) + 2 : maksTempat[0];
        const batasK = dest.indukNegara ? Math.ceil(maksTempat[1] / bagi) + 1 : maksTempat[1];
        const dipotong = [
          ...semuaTempat.filter((p) => p.jenis !== "kuliner").slice(0, batasW),
          ...semuaTempat.filter((p) => p.jenis === "kuliner").slice(0, batasK),
        ];
        return {
          dest,
          tempat: dipotong,
          voyage: nilai(voyage),
          wiki: nilai(wiki),
          cuaca: nilai(cuaca),
        };
      })
    );

    const places = [];
    const byId = new Map();
    const bagianBlok = [];
    let cuacaTeks = null;
    hasil.forEach(({ dest, tempat, voyage, wiki, cuaca }) => {
      const baris = [`Tujuan terbaca: ${dest.display || dest.name} (skala: ${dest.skala}, pusat ${dest.lat.toFixed(3)},${dest.lon.toFixed(3)})`];
      if (wiki) baris.push(`Ringkasan: ${wiki}`);
      if (voyage) baris.push(`Panduan Wikivoyage (ringkas):\n${voyage}`);
      if (cuaca) {
        baris.push(`Cuaca: ${cuaca}`);
        cuacaTeks = cuaca;
      }
      if (tempat.length) {
        const daftar = tempat.map((p) => {
          const id = `P${places.length + 1}`;
          const lengkap = { ...p, id, kota: dest.name };
          places.push(lengkap);
          byId.set(id, lengkap);
          return barisTempat(p, id);
        });
        baris.push(`TEMPAT (id | nama | jenis | zona | jarak | catatan):\n${daftar.join("\n")}`);
      } else if (dest.skala === "negara") {
        baris.push(
          "TEMPAT: tujuan ini setingkat negara, jadi tidak ada daftar tempat. Pilih kota/wilayah dari panduan di atas, lalu rekomendasikan secukupnya dan jujur soal ketidakpastian."
        );
      } else {
        baris.push("TEMPAT: data peta untuk tujuan ini sangat terbatas. Katakan terus terang dan beri cara mencari (kata kunci di Google Maps).");
      }
      bagianBlok.push(baris.join("\n"));
    });

    const blok =
      `\n\n=== DATA LAPANGAN (OpenStreetMap, Wikipedia, Wikivoyage, Open-Meteo — diambil sekarang) ===\n` +
      `${bagianBlok.join("\n\n")}\n\n${ATURAN_PAKAI}\n=== AKHIR DATA LAPANGAN ===`;

    return { blok, places, dests, byId, cuaca: cuacaTeks };
  };

  try {
    return await denganBatas(kerja(), batasMs, null);
  } catch (error) {
    console.warn("[setapak] data lapangan gagal:", error.message);
    return null;
  }
}

// ----------------------------- kota-kota di dalam negara/wilayah (mis. Tokyo, Kyoto)

const KAPITAL_BUKAN_KOTA = new Set([
  "trip", "hari", "berdua", "budget", "dari", "aku", "kami", "saya", "mau", "untuk",
  "suka", "makanan", "rencana", "jawab", "tujuan", "durasi", "tanggal", "minggu",
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "bareng", "istri", "suami",
  "anak", "keluarga", "halal", "indonesia", "rupiah", "juta", "ribu", "pilihan",
  "semua", "kota", "wilayah", "negara", "ibadah", "umroh", "umrah", "wisata", "tempat",
]);

function kandidatKotaDariTeks(teks = "", dest) {
  const label = new Set([normNama(dest.name), normNama(dest.nameEn), normNama(dest.label)]);
  const hasil = [];
  const re = /\b([A-Z][\p{L}'’-]{2,}(?:\s+[A-Z][\p{L}'’-]{2,})?)\b/gu;
  let m;
  while ((m = re.exec(String(teks))) && hasil.length < 6) {
    const n = normNama(m[1]);
    const pertama = n.split(" ")[0];
    if (label.has(n) || KAPITAL_BUKAN_KOTA.has(pertama) || n.length < 4) continue;
    if (!hasil.includes(m[1])) hasil.push(m[1]);
  }
  return hasil;
}

async function geocodeKotaDi(nama, dest) {
  const { s, n, w, e } = dest.bbox;
  const viewbox = `${w.toFixed(3)},${n.toFixed(3)},${e.toFixed(3)},${s.toFixed(3)}`;
  const cc = dest.cc ? `&countrycodes=${dest.cc}` : "";
  return ingat(`kota:${dest.cc}:${normNama(nama)}`, 24 * JAM, async () => {
    const data = await getJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=2&addressdetails=1&namedetails=1&accept-language=id&bounded=1&viewbox=${viewbox}${cc}&q=${encodeURIComponent(nama)}`,
      4000
    );
    const hit = (data || []).find(
      (d) => ["boundary", "place"].includes(d.category) && Array.isArray(d.boundingbox)
    );
    if (!hit) return null;
    const [bs, bn, bw, be] = hit.boundingbox.map(Number);
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    const spanKm = Math.max((bn - bs) * 111, (be - bw) * 111 * Math.cos(rad(lat)));
    if (![bs, bn, bw, be, lat, lon].every(Number.isFinite) || spanKm > 120) return null;
    return {
      query: nama,
      name: hit.namedetails?.name || hit.name || nama,
      nameEn: hit.namedetails?.["name:en"] || hit.name || nama,
      display: String(hit.display_name || "").split(",").slice(0, 3).join(",").trim(),
      lat,
      lon,
      bbox: { s: bs, n: bn, w: bw, e: be },
      country: dest.country,
      cc: dest.cc,
      spanKm,
      skala: "kota",
    };
  });
}

/** Untuk tujuan setingkat negara/wilayah: ambil kota yang disebut user (maks 3). */
async function kotaDalam(dest, teks) {
  const kota = [];
  for (const nama of kandidatKotaDariTeks(teks, dest)) {
    if (kota.length >= 3) break;
    try {
      const c = await geocodeKotaDi(nama, dest);
      if (c && !kota.some((k) => jarakKm(k, c) < 10)) kota.push({ ...c, label: nama });
    } catch {
      // lewati
    }
  }
  return kota;
}

// --------------------------------------------------- 6. verifikasi jawaban AI

export async function geocodeDalam(nama, dests = []) {
  for (const dest of dests) {
    const { s, n, w, e } = dest.bbox;
    const pad = dest.skala === "kota" || dest.skala === "poi" ? 0.08 : 0.5;
    const viewbox = `${(w - pad).toFixed(4)},${(n + pad).toFixed(4)},${(e + pad).toFixed(4)},${(s - pad).toFixed(4)}`;
    try {
      const data = await ingat(`gd:${viewbox}:${normNama(nama)}`, 24 * JAM, () =>
        getJson(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1&viewbox=${viewbox}&accept-language=id&q=${encodeURIComponent(nama)}`,
          3500
        )
      );
      const hit = data?.[0];
      const lat = Number(hit?.lat);
      const lon = Number(hit?.lon);
      // Nama hasil harus mirip nama yang dicari, kalau tidak itu tebakan asal Nominatim.
      const namaHasil = hit?.name || String(hit?.display_name || "").split(",")[0];
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        cocokkanNama(nama, [{ name: namaHasil }])
      ) {
        return { lat, lon, dest };
      }
    } catch {
      // tujuan berikutnya
    }
  }
  return null;
}

const mapsUrl = (nama, kota = "") =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nama} ${kota}`.trim())}`;

function urutkanDekat(tempat) {
  const ada = tempat.filter((t) => Number.isFinite(t.lat));
  if (ada.length < 3) return tempat;
  const tanpa = tempat.filter((t) => !Number.isFinite(t.lat));
  const sisa = [...ada];
  const urut = [sisa.shift()];
  while (sisa.length) {
    const akhir = urut[urut.length - 1];
    let idx = 0;
    let min = Infinity;
    sisa.forEach((t, i) => {
      const d = jarakKm(akhir, t);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    urut.push(sisa.splice(idx, 1)[0]);
  }
  return [...urut, ...tanpa];
}

/**
 * Setelah AI menyusun plan: cocokkan tiap tempat ke data nyata (ref / nama / geocode),
 * buang yang tidak bisa dibuktikan ada, urutkan dekat-ke-dekat, hitung jarak per hari.
 */
export async function perkuatRencana(plan, lapangan, { batasMs = 4500 } = {}) {
  if (!plan || !Array.isArray(plan.days) || !lapangan) return plan;
  const mulai = Date.now();
  let jatahGeocode = 8;
  let terverifikasi = 0;
  let dibuang = 0;
  const sudahDipakai = new Set();

  for (const hari of plan.days) {
    const hasil = [];
    for (const t of hari.places) {
      let hit = t.ref ? lapangan.byId.get(String(t.ref).toUpperCase()) : null;
      if (hit && !cocokkanNama(t.name, [hit])) hit = null; // ref tidak cocok nama -> abaikan
      if (!hit) hit = cocokkanNama(t.name, lapangan.places);

      if (hit) {
        hasil.push({
          ...t,
          name: hit.name,
          address: hit.alamat || t.address || hit.kota || "",
          lat: hit.lat,
          lon: hit.lon,
          verified: true,
          sumber: "osm",
          zona: hit.zona,
          jenisAsli: hit.jenis,
          openingHours: hit.jam || "",
          image: hit.foto || undefined,
          mapsUrl: mapsUrl(hit.name, hit.kota),
        });
        terverifikasi += 1;
        continue;
      }

      let titik = null;
      if (jatahGeocode > 0 && Date.now() - mulai < batasMs) {
        jatahGeocode -= 1;
        titik = await geocodeDalam(t.name, lapangan.dests);
      }
      if (titik) {
        hasil.push({
          ...t,
          lat: titik.lat,
          lon: titik.lon,
          verified: true,
          sumber: "geocode",
          mapsUrl: mapsUrl(t.name, titik.dest.name),
        });
        terverifikasi += 1;
      } else {
        hasil.push({ ...t, verified: false, mapsUrl: mapsUrl(t.name, lapangan.dests[0]?.name) });
      }
    }

    // Tempat yang tidak terbukti ada dibuang selama hari itu masih punya tempat valid.
    // Tempat yang sama di hari lain juga dibuang (kecuali tempat ibadah: boleh dikunjungi lagi).
    const valid = hasil.filter((t) => t.verified);
    const tanpaUlang = (daftar) =>
      daftar.filter((t) => {
        const kunci = normNama(t.name);
        const ulang = sudahDipakai.has(kunci) && t.jenisAsli !== "ibadah";
        return !ulang;
      });
    let pakai = valid.length ? valid : hasil;
    const baru = tanpaUlang(pakai);
    if (baru.length) pakai = baru;
    pakai.forEach((t) => sudahDipakai.add(normNama(t.name)));
    dibuang += hasil.length - pakai.length;

    // Kalau semua tempat punya jam mulai, ikuti jam itu (pagi dulu); kalau tidak, dekat-ke-dekat.
    const semuaPunyaJam = pakai.length > 1 && pakai.every((t) => t.startTime);
    const urut = semuaPunyaJam
      ? [...pakai].sort((a, b) => String(a.startTime).padStart(5, "0").localeCompare(String(b.startTime).padStart(5, "0")))
      : urutkanDekat(pakai);
    let km = 0;
    for (let i = 1; i < urut.length; i += 1) {
      if (Number.isFinite(urut[i].lat) && Number.isFinite(urut[i - 1].lat)) {
        km += jarakKm(urut[i - 1], urut[i]);
      }
    }
    hari.places = urut;
    hari.jarakKm = Math.round(km * 10) / 10;
  }

  plan.grounding = {
    sumber: ["OpenStreetMap", "Wikipedia/Wikivoyage", "Open-Meteo"],
    tujuan: lapangan.dests.map((d) => d.display || d.name),
    cuaca: lapangan.cuaca || null,
    tempatTerverifikasi: terverifikasi,
    tempatDibuang: dibuang,
    diambil: new Date().toISOString(),
  };
  return plan;
}

/** Satu tempat -> bentuk yang dipakai kartu peta di chat. */
export function keKartuPeta(p, embed) {
  return {
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    osmUrl: p.osmUrl,
    embedUrl: embed ? embed(p.lat, p.lon) : null,
    mapsUrl: mapsUrl(p.name, p.kota),
    ...(p.foto ? { image: p.foto } : {}),
  };
}
