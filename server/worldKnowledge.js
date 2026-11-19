// Pengetahuan dunia SETAPAK yang dikurasi manual.
//
// Kenapa tidak cuma bergantung pada AI? Karena model bisa "berhalusinasi":
// Pondok Indah Mall disebut di Bekasi, Kebun Raya Cibodas disebut di Depok,
// Taman Safari disebut di Bekasi. Untuk kota-kota populer, jawaban diambil
// dari daftar ini sehingga tetap konkret, tapi lokasinya pasti benar.
// AI tetap dipakai untuk pertanyaan di luar daftar ini (harga, cuaca, dll).

export const WORLD_CITIES = {
  bekasi: {
    label: "Bekasi",
    pusat: [-6.23, 107.0],
    intro: "Bekasi punya taman, situs sejarah, dan wisata alam yang cocok untuk liburan singkat.",
    places: [
      { name: "Hutan Mangrove Muara Gembong", area: "Muara Gembong", category: "nature" },
      { name: "Taman Buaya Indonesia Jaya", area: "Bekasi Selatan", category: "adventure" },
      { name: "Gedung Juang Tambun", area: "Tambun", category: "culture" },
      { name: "Taman Kota Bekasi", area: "Jl. Jenderal Sudirman", category: "nature" },
      { name: "Grand Galaxy Park", area: "Bekasi Selatan", category: "food" },
    ],
  },
  depok: {
    label: "Depok",
    pusat: [-6.4, 106.82],
    intro: "Depok punya ruang hijau, tempat bersejarah, dan pusat kuliner yang enak untuk jalan-jalan santai.",
    places: [
      { name: "Taman Wisata Kota Depok", area: "Jl. R. Soekarno", category: "nature" },
      { name: "Alun-alun Depok", area: "Jl. R. Soekarno", category: "nature" },
      { name: "Masjid Agung At-Tin", area: "Jl. R. Soekarno", category: "culture" },
      { name: "Depok Town Square", area: "Jl. Margonda Raya", category: "food" },
      { name: "Taman Bunderan Margonda", area: "Jl. Margonda Raya", category: "nature" },
    ],
  },
  jakarta: {
    label: "Jakarta",
    pusat: [-6.2, 106.82],
    intro: "Jakarta punya campuran sejarah, museum, taman, dan kuliner yang lengkap.",
    places: [
      { name: "Monumen Nasional", area: "Gambir", category: "culture" },
      { name: "Kota Tua Jakarta", area: "Fatahillah", category: "culture" },
      { name: "Taman Mini Indonesia Indah", area: "Jakarta Timur", category: "nature" },
      { name: "Kebun Binatang Ragunan", area: "Jakarta Selatan", category: "nature" },
      { name: "Pondok Indah Mall", area: "Jakarta Selatan", category: "food" },
    ],
  },
  tangerang: {
    label: "Tangerang",
    pusat: [-6.18, 106.63],
    intro: "Tangerang menawarkan taman modern dan situs sejarah yang mudah dijangkau dari Jakarta.",
    places: [
      { name: "Scientia Square Park", area: "BSD City", category: "nature" },
      { name: "Kota Tua Tangerang", area: "Tangerang Pusat", category: "culture" },
      { name: "Benteng Tangerang", area: "Tangerang Pusat", category: "culture" },
    ],
  },
  semarang: {
    label: "Semarang",
    pusat: [-6.97, 110.42],
    intro: "Semarang terkenal dengan Kota Lama, bangunan kolonial, dan kuliner khasnya.",
    places: [
      { name: "Lawang Sewu", area: "Jl. Pemuda", category: "culture" },
      { name: "Kota Lama Semarang", area: "Jl. Letjen Suprapto", category: "culture" },
      { name: "Gedung Banteng", area: "Jl. Pemuda", category: "culture" },
      { name: "Pantai Marina Semarang", area: "Maron", category: "nature" },
      { name: "Simpang Lima", area: "Pusat Kota", category: "food" },
    ],
  },
  surabaya: {
    label: "Surabaya",
    pusat: [-7.25, 112.75],
    intro: "Surabaya punya monumen bersejarah, museum, dan wisata tepi laut.",
    places: [
      { name: "Tugu Pahlawan", area: "Jl. Pahlawan", category: "culture" },
      { name: "House of Sampoerna", area: "Jl. Taman Sampoerna", category: "culture" },
      { name: "Kebun Binatang Surabaya", area: "Jl. Setail", category: "nature" },
      { name: "Jembatan Suramadu", area: "Suramadu", category: "adventure" },
      { name: "Pantai Kenjeran", area: "Kenjeran", category: "nature" },
    ],
  },
  malang: {
    label: "Malang",
    pusat: [-7.98, 112.63],
    intro: "Malang adalah basis wisata gunung, candi, pantai selatan, dan kuliner enak.",
    places: [
      { name: "Gunung Bromo", area: "Malang / Probolinggo", category: "adventure" },
      { name: "Candi Singosari", area: "Singosari", category: "culture" },
      { name: "Kota Tua Malang", area: "Jl. Ijen", category: "culture" },
      { name: "Pantai Sendang Biru", area: "Malang Selatan", category: "nature" },
      { name: "Taman Indie River View", area: "Malang", category: "food" },
    ],
  },
  solo: {
    label: "Solo",
    pusat: [-7.57, 110.82],
    intro: "Solo menawarkan keraton, batik, dan kuliner tradisional dengan suasana yang tenang.",
    places: [
      { name: "Keraton Surakarta", area: "Jl. Silwangi", category: "culture" },
      { name: "Pasar Klewer", area: "Pusat Kota", category: "food" },
      { name: "Museum Danar Hadi", area: "Jl. Slamet Riyadi", category: "culture" },
      { name: "Taman Sriwedari", area: "Jl. Slamet Riyadi", category: "nature" },
    ],
  },
  makassar: {
    label: "Makassar",
    pusat: [-5.14, 119.43],
    intro: "Makassar terkenal dengan pantai, benteng bersejarah, dan kuliner lautnya.",
    places: [
      { name: "Pantai Losari", area: "Jl. Penghibur", category: "nature" },
      { name: "Fort Rotterdam", area: "Jl. Ujung Pandang", category: "culture" },
      { name: "Taman Nasional Bantimurung Bulusaraung", area: "Maros", category: "nature" },
      { name: "Pulau Samalona", area: "Kepulauan Spermonde", category: "adventure" },
      { name: "Museum La Galigo", area: "Jl. Thamrin", category: "culture" },
    ],
  },
  singapura: {
    label: "Singapura",
    pusat: [1.28, 103.85],
    intro: "Singapura punya ikon kota modern, taman, dan tempat wisata keluarga yang terkenal di dunia.",
    places: [
      { name: "Marina Bay Sands", area: "Marina Bay", category: "adventure" },
      { name: "Gardens by the Bay", area: "Marina Bay", category: "nature" },
      { name: "Merlion Park", area: "Marina Bay", category: "culture" },
      { name: "Universal Studios Sentosa", area: "Sentosa", category: "adventure" },
      { name: "Singapore Botanic Gardens", area: "Tanglin", category: "nature" },
    ],
  },
  jepang: {
    label: "Jepang",
    pusat: [35.68, 139.69],
    intro: "Jepang memadukan kuil bersejarah, kota besar, dan kuliner yang terkenal di seluruh dunia.",
    places: [
      { name: "Senso-ji", area: "Asakusa, Tokyo", category: "culture" },
      { name: "Shibuya Crossing", area: "Shibuya, Tokyo", category: "culture" },
      { name: "Fushimi Inari Taisha", area: "Kyoto", category: "culture" },
      { name: "Kiyomizu-dera", area: "Kyoto", category: "culture" },
      { name: "Dotonbori", area: "Osaka", category: "food" },
    ],
  },
  malaysia: {
    label: "Malaysia",
    pusat: [3.14, 101.69],
    intro: "Malaysia menawarkan kota modern, gua bersejarah, dan pulau tropis.",
    places: [
      { name: "Petronas Twin Towers", area: "Kuala Lumpur", category: "adventure" },
      { name: "Batu Caves", area: "Selangor", category: "culture" },
      { name: "George Town", area: "Penang", category: "culture" },
      { name: "Langkawi", area: "Kedah", category: "nature" },
    ],
  },
  thailand: {
    label: "Thailand",
    pusat: [13.75, 100.5],
    intro: "Thailand punya kuil megah, pasar malam, dan pantai tropis.",
    places: [
      { name: "Grand Palace", area: "Bangkok", category: "culture" },
      { name: "Wat Arun", area: "Bangkok", category: "culture" },
      { name: "Chatuchak Weekend Market", area: "Bangkok", category: "food" },
      { name: "Doi Suthep", area: "Chiang Mai", category: "nature" },
      { name: "Phuket", area: "Phuket", category: "nature" },
    ],
  },
  korea: {
    label: "Korea",
    pusat: [37.57, 126.98],
    intro: "Korea Selatan memadukan istana kuno, kota modern, dan kuliner khas.",
    places: [
      { name: "Gyeongbokgung", area: "Seoul", category: "culture" },
      { name: "N Seoul Tower", area: "Seoul", category: "adventure" },
      { name: "Bukchon Hanok Village", area: "Seoul", category: "culture" },
      { name: "Myeongdong", area: "Seoul", category: "food" },
      { name: "Gamcheon Culture Village", area: "Busan", category: "culture" },
    ],
  },
  jerman: {
    label: "Jerman",
    pusat: [52.52, 13.4],
    intro: "Jerman punya kota bersejarah, kastil, dan arsitektur ikonik.",
    places: [
      { name: "Brandenburg Gate", area: "Berlin", category: "culture" },
      { name: "Reichstag Building", area: "Berlin", category: "culture" },
      { name: "Neuschwanstein Castle", area: "Bavaria", category: "adventure" },
    ],
  },
  prancis: {
    label: "Prancis",
    pusat: [48.86, 2.35],
    intro: "Prancis terkenal dengan seni, arsitektur, dan kuliner kelas dunia.",
    places: [
      { name: "Eiffel Tower", area: "Paris", category: "adventure" },
      { name: "Louvre Museum", area: "Paris", category: "culture" },
      { name: "Notre-Dame Cathedral", area: "Paris", category: "culture" },
    ],
  },
  italia: {
    label: "Italia",
    pusat: [41.9, 12.5],
    intro: "Italia punya peninggalan Romawi, kota seni, dan kuliner yang legendaris.",
    places: [
      { name: "Colosseum", area: "Rome", category: "culture" },
      { name: "Leaning Tower of Pisa", area: "Pisa", category: "culture" },
      { name: "Venice Canals", area: "Venice", category: "culture" },
    ],
  },
  amerika: {
    label: "Amerika",
    pusat: [40.71, -74.0],
    intro: "Amerika Serikat punya kota besar, taman nasional, dan ikon terkenal dunia.",
    places: [
      { name: "Statue of Liberty", area: "New York", category: "culture" },
      { name: "Central Park", area: "New York", category: "nature" },
      { name: "Golden Gate Bridge", area: "San Francisco", category: "adventure" },
    ],
  },
  australia: {
    label: "Australia",
    pusat: [-33.87, 151.21],
    intro: "Australia menawarkan kota pantai, terumbu karang, dan formasi batu ikonik.",
    places: [
      { name: "Sydney Opera House", area: "Sydney", category: "culture" },
      { name: "Great Barrier Reef", area: "Queensland", category: "nature" },
      { name: "Uluru", area: "Northern Territory", category: "adventure" },
    ],
  },
};

const ALIAS_KOTA = {
  japan: "jepang",
  singapore: "singapura",
  singapur: "singapura",
  korea_selatan: "korea",
  malaysia: "malaysia",
  banten: "tangerang",
};

/**
 * Fakta lokasi yang sering salah disebut AI. Dipakai untuk menjawab terus
 * terang kalau user menanyakan sebuah tempat di kota yang salah.
 */
export const WORLD_FACTS = [
  {
    kata: "taman safari",
    nama: "Taman Safari Indonesia",
    lokasi: "Cisarua, Bogor",
    kota: ["bogor", "cisarua"],
    jarak: "sekitar 1–1,5 jam dari Bekasi",
  },
  {
    kata: "pondok indah mall",
    nama: "Pondok Indah Mall",
    lokasi: "Jakarta Selatan",
    kota: ["jakarta"],
  },
  {
    kata: "trans jogja",
    nama: "Trans Jogja",
    lokasi: "Yogyakarta",
    kota: ["yogyakarta", "jogja"],
  },
  {
    kata: "malioboro",
    nama: "Malioboro",
    lokasi: "Yogyakarta",
    kota: ["yogyakarta", "jogja"],
  },
  {
    kata: "pantai kuta",
    nama: "Pantai Kuta",
    lokasi: "Bali",
    kota: ["bali", "kuta"],
  },
  {
    kata: "gunung bromo",
    nama: "Gunung Bromo",
    lokasi: "Malang / Probolinggo",
    kota: ["malang"],
  },
  {
    kata: "cibodas",
    nama: "Kebun Raya Cibodas",
    lokasi: "Cianjur, dekat Bogor",
    kota: ["bogor", "cianjur"],
  },
  {
    kata: "serpong",
    nama: "Serpong",
    lokasi: "Tangerang Selatan",
    kota: ["tangerang"],
  },
  {
    kata: "candi borobudur",
    nama: "Candi Borobudur",
    lokasi: "Magelang, Jawa Tengah",
    kota: ["magelang", "yogyakarta", "jogja"],
  },
];

export function pusatDunia() {
  return Object.fromEntries(
    Object.entries(WORLD_CITIES)
      .filter(([, kota]) => Array.isArray(kota.pusat))
      .map(([key, kota]) => [key, kota.pusat])
  );
}

function temukanKota(normalized) {
  for (const [alias, key] of Object.entries(ALIAS_KOTA)) {
    if (new RegExp(`(^|\\s)${alias}(\\s|$)`).test(normalized)) return key;
  }
  return Object.keys(WORLD_CITIES).find((key) =>
    new RegExp(`(^|\\s)${key}(\\s|$)`).test(normalized)
  ) || null;
}

/** Hormati jumlah yang diminta, mis. "3 tempat alam". */
export function batasJumlah(teks, maks = 5) {
  const cocok = String(teks || "").match(
    /\b([1-9]|10)\s+(tempat|wisata|rekomendasi|pilihan|tempatnya)\b/
  );
  if (!cocok) return maks;
  return Math.max(1, Math.min(maks, Number(cocok[1])));
}

function daftarSesuai(places, normalized, batas = 5) {
  let hasil = places;
  let minat = null;
  if (/\b(kuliner|makan|food|resto|warung|makanan)\b/.test(normalized)) minat = "food";
  else if (/\b(alam|nature|taman|gunung|hutan|pantai|beach)\b/.test(normalized)) minat = "nature";
  else if (/\b(budaya|culture|sejarah|keraton|museum)\b/.test(normalized)) minat = "culture";

  if (minat) {
    const cocok = hasil.filter((item) =>
      minat === "nature"
        ? ["nature", "adventure", "beach"].includes(item.category)
        : item.category === minat
    );
    if (cocok.length >= 2) hasil = [...cocok, ...hasil.filter((item) => !cocok.includes(item))];
  }
  return hasil.slice(0, batas);
}

function barisTempat(places) {
  return places
    .map((item) => `- **${item.name}** — ${item.area}.`)
    .join("\n");
}

/**
 * Jawaban deterministik untuk kota/negara yang tidak ada di data planner lokal.
 * Mengembalikan null kalau pesan bukan soal destinasi yang dikenal, supaya
 * handler bisa memanggil AI untuk pertanyaan umum.
 */
export function jawabanDuniaDariPesan(normalized) {
  const teks = String(normalized || "");
  const kotaKey = temukanKota(teks);
  if (!kotaKey) return null;

  const kota = WORLD_CITIES[kotaKey];
  const label = kota.label;
  const batas = batasJumlah(teks);
  const daftar = daftarSesuai(kota.places, teks, batas);
  const fakta = WORLD_FACTS.find((item) => teks.includes(item.kata));

  if (fakta && !fakta.kota.some((k) => kotaKey === k || ALIAS_KOTA[k] === kotaKey)) {
    const alternatif = daftar.slice(0, Math.min(4, batas));
    return {
      kotaKey,
      label,
      places: alternatif,
      reply:
        `## ${fakta.nama} tidak ada di ${label}\n\n` +
        `Tidak ada. **${fakta.nama}** ada di **${fakta.lokasi}**` +
        `${fakta.jarak ? `, ${fakta.jarak}` : ""}. ` +
        `Jangan sampai tertukar, ya.\n\n` +
        `## Alternatif di ${label}\n${barisTempat(alternatif)}\n\n` +
        `## Tips\n- Cek lokasi di Google Maps sebelum berangkat.`,
    };
  }

  if (fakta) {
    return {
      kotaKey,
      label,
      places: daftar,
      reply:
        `## ${fakta.nama}\n\n` +
        `Ya, **${fakta.nama}** ada di **${fakta.lokasi}**.\n\n` +
        `## Tempat lain di ${label}\n${barisTempat(daftar.slice(0, 4))}`,
    };
  }

  return {
    kotaKey,
    label,
    places: daftar,
    reply:
      `## Tempat di ${label}\n\n${barisTempat(daftar)}\n\n` +
      `## Kenapa ini?\n${kota.intro}\n\n` +
      `## Tips\n- Cek jam buka dan harga tiket sebelum berangkat.`,
  };
}
