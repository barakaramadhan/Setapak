import assert from "node:assert/strict";
import { test } from "node:test";
import { handleChatRequest, kueriGoogle } from "./chatHandler.js";
import {
  balasanDariGoogle,
  cariGoogle,
  googleAktif,
  jenisDariGoogle,
  normalisasiGoogle,
} from "./googlePlaces.js";

const KEY = "TESTKEY-1234567890-abcdef";
const ENV = { GOOGLE_MAPS_API_KEY: KEY, GROQ_API_KEY: "test-key", AI_PROVIDER_ORDER: "groq" };

const tempatGoogle = (id, nama, ekstra = {}) => ({
  id,
  displayName: { text: nama, languageCode: "id" },
  formattedAddress: `Jalan ${nama}, Kuala Lumpur, Malaysia`,
  location: { latitude: 3.15, longitude: 101.71 },
  rating: 4.5,
  userRatingCount: 1500,
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  primaryType: "indonesian_restaurant",
  primaryTypeDisplayName: { text: "Restoran Indonesia" },
  types: ["indonesian_restaurant", "restaurant", "food"],
  businessStatus: "OPERATIONAL",
  regularOpeningHours: { openNow: true },
  photos: [{ name: `places/${id}/photos/FOTO1` }],
  ...ekstra,
});

const MALAYSIA_NOMINATIM = [
  {
    category: "boundary",
    importance: 0.8,
    lat: "4.2",
    lon: "102.0",
    boundingbox: ["0.8", "7.4", "99.6", "119.3"],
    name: "Malaysia",
    display_name: "Malaysia",
    namedetails: { name: "Malaysia", "name:en": "Malaysia" },
    address: { country: "Malaysia", country_code: "my" },
  },
];

/** Fetch palsu: Google, Nominatim, dan AI (Groq). Mengembalikan catatan panggilan. */
function pasangFetch({ places = [], googleStatus = 200, balasanAI = [] }) {
  const catatan = { google: [], foto: [], ai: [] };
  const asli = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes("places.googleapis.com/v1/places:searchText")) {
      catatan.google.push({ headers: init.headers, body: JSON.parse(init.body) });
      if (googleStatus !== 200) {
        return { ok: false, status: googleStatus, json: async () => ({ error: { message: "ditolak" } }) };
      }
      return { ok: true, json: async () => ({ places }) };
    }
    if (u.includes("places.googleapis.com/v1/places/") && u.includes("/media")) {
      catatan.foto.push(u);
      return { ok: true, json: async () => ({ photoUri: "https://lh3.googleusercontent.com/p/FOTO-PUBLIK" }) };
    }
    if (u.includes("nominatim.openstreetmap.org")) {
      return { ok: true, json: async () => MALAYSIA_NOMINATIM };
    }
    if (u.includes("api.groq.com")) {
      const body = JSON.parse(init.body);
      catatan.ai.push(body);
      const isi = balasanAI[Math.min(catatan.ai.length - 1, balasanAI.length - 1)] || "ok";
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: isi }, finish_reason: "stop" }] }),
      };
    }
    if (u.includes("overpass")) {
      return { ok: true, json: async () => ({ elements: [] }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { catatan, pulihkan: () => (globalThis.fetch = asli) };
}

async function tanya(message, ip, env = ENV, extra = {}) {
  let payload;
  await handleChatRequest(
    {
      method: "POST",
      body: { mode: "search", message, history: [], ...extra },
      headers: { "x-forwarded-for": ip },
      socket: {},
    },
    {
      setHeader() {},
      end(text) {
        payload = JSON.parse(text);
      },
    },
    env
  );
  return payload;
}

test("googleAktif hanya menyala bila key terisi", () => {
  assert.equal(googleAktif({}), false);
  assert.equal(googleAktif({ GOOGLE_MAPS_API_KEY: "" }), false);
  assert.equal(googleAktif({ GOOGLE_PLACES_API_KEY: KEY }), true);
});

test("memetakan tipe Google ke jenis SETAPAK dan membuang tempat yang sudah tutup", () => {
  assert.equal(jenisDariGoogle(["indonesian_restaurant", "food"], "indonesian_restaurant"), "kuliner");
  assert.equal(jenisDariGoogle(["mosque", "place_of_worship"], "mosque"), "ibadah");
  assert.equal(jenisDariGoogle(["amusement_park"], "amusement_park"), "hiburan");
  assert.equal(jenisDariGoogle(["museum"], "museum"), "budaya");
  assert.equal(jenisDariGoogle(["national_park"], "national_park"), "alam");

  assert.equal(normalisasiGoogle(tempatGoogle("X1", "Tutup", { businessStatus: "CLOSED_PERMANENTLY" })), null);
  const ok = normalisasiGoogle(tempatGoogle("X2", "Buka"));
  assert.equal(ok.sumber, "google");
  assert.equal(ok.rating, 4.5);
  assert.equal(ok.bukaSekarang, true);
});

test("cariGoogle mengirim field mask + key lewat header dan mengembalikan [] bila kosong", async () => {
  const f = pasangFetch({ places: [] });
  try {
    const kosong = await cariGoogle({ query: "tempat tidak ada xyz", env: ENV });
    assert.deepEqual(kosong, []);
    const [panggilan] = f.catatan.google;
    assert.equal(panggilan.headers["X-Goog-Api-Key"], KEY);
    assert.match(panggilan.headers["X-Goog-FieldMask"], /places\.rating/);
    assert.equal(panggilan.body.textQuery, "tempat tidak ada xyz");
    assert.equal(panggilan.body.languageCode, "id");
  } finally {
    f.pulihkan();
  }
});

test("cariGoogle melempar error saat Google menolak (supaya ada cadangan), tanpa membocorkan key", async () => {
  const f = pasangFetch({ googleStatus: 403 });
  try {
    await assert.rejects(
      () => cariGoogle({ query: "kueri ditolak 403", env: ENV }),
      (error) => /HTTP 403/.test(error.message) && !error.message.includes(KEY)
    );
  } finally {
    f.pulihkan();
  }
});

test("kueriGoogle membuang basa-basi dan menempelkan tujuan trip bila lokasi tidak disebut", () => {
  assert.equal(
    kueriGoogle("bro kasih tau restoran terkenal di malaysia buatan indonesia?"),
    "restoran terkenal di malaysia buatan indonesia"
  );
  assert.equal(
    kueriGoogle("cariin warung padang dong", { destinations: ["Kuala Lumpur"] }),
    "warung padang di Kuala Lumpur"
  );
});

test("pertanyaan restoran di Malaysia dijawab hanya dari hasil Google + kartu Google muncul", async () => {
  const f = pasangFetch({
    places: [
      tempatGoogle("ChIJaaa", "Restoran Sederhana Bukit Bintang"),
      tempatGoogle("ChIJbbb", "Ayam Penyet Ria", { rating: 4.3, userRatingCount: 900 }),
      tempatGoogle("ChIJccc", "Warung Sudah Tutup", { businessStatus: "CLOSED_PERMANENTLY" }),
    ],
    balasanAI: [
      // AI mencoba menyelipkan nama dari ingatannya -> harus ditolak dan diulang.
      "- **Warung Fiktif KL** — katanya terkenal.\n- **Restoran Sederhana Bukit Bintang** — masakan Padang.\nLOKASI: Warung Fiktif KL",
      "Ini yang cocok dari Google Maps:\n- **Restoran Sederhana Bukit Bintang** — masakan Padang, rating 4,5.\n- **Ayam Penyet Ria** — ayam penyet.\nLOKASI: Restoran Sederhana Bukit Bintang | Ayam Penyet Ria",
    ],
  });
  try {
    const hasil = await tanya("bro restoran terkenal di malaysia buatan indonesia?", "203.0.113.11");

    // Pencarian Google memakai pertanyaan user.
    assert.match(f.catatan.google[0].body.textQuery, /restoran terkenal di malaysia/i);
    // Prompt AI memuat data Google (bukan OSM) dan larangan menambah nama.
    const promptPertama = JSON.stringify(f.catatan.ai[0].messages);
    assert.match(promptPertama, /Google Maps/);
    assert.match(promptPertama, /Restoran Sederhana Bukit Bintang/);
    assert.doesNotMatch(promptPertama, /Warung Sudah Tutup/);

    assert.doesNotMatch(hasil.reply, /Warung Fiktif/);
    assert.match(hasil.reply, /Restoran Sederhana Bukit Bintang/);
    assert.match(hasil.reply, /Ayam Penyet Ria/);
    assert.doesNotMatch(hasil.reply, /LOKASI:/);

    assert.equal(hasil.mapPlaces.length, 2);
    const kartu = hasil.mapPlaces[0];
    assert.equal(kartu.sumber, "google");
    assert.equal(kartu.rating, 4.5);
    assert.equal(kartu.ulasan, 1500);
    assert.match(kartu.mapsUrl, /^https:\/\/maps\.google\.com\//);
    assert.match(kartu.image, /googleusercontent\.com/);
    assert.match(kartu.address, /Kuala Lumpur/);

    // API key tidak boleh ikut ke browser.
    assert.ok(!JSON.stringify(hasil).includes(KEY));
    assert.ok(!f.catatan.foto.some((url) => url.includes(`key=${KEY}`)));
  } finally {
    f.pulihkan();
  }
});

test("kalau AI terus menyebut nama di luar Google, jawaban disusun langsung dari data Google", async () => {
  const f = pasangFetch({
    places: [tempatGoogle("ChIJddd", "Nasi Kandar Pelita"), tempatGoogle("ChIJeee", "Restoran Pagi Sore")],
    balasanAI: ["- **Rumah Makan Karangan** — enak banget."],
  });
  try {
    const hasil = await tanya("rekomendasi restoran halal di Kuala Lumpur", "203.0.113.12");
    assert.equal(hasil.source, "google-maps");
    assert.doesNotMatch(hasil.reply, /Karangan/);
    assert.match(hasil.reply, /Nasi Kandar Pelita/);
    assert.match(hasil.reply, /Rating \*\*4\.5\/5\*\*/);
    assert.ok(hasil.mapPlaces.every((k) => k.sumber === "google"));
  } finally {
    f.pulihkan();
  }
});

test("Google tidak menemukan apa pun: jatuh ke pencarian web, bukan menolak", async () => {
  const f = pasangFetch({
    places: [],
    balasanAI: ["- **Restoran Padang Nyata** — Kuala Lumpur; ditemukan di hasil web.\n- **Warung Contoh** — Cheras; cek lagi di Maps."],
  });
  try {
    const hasil = await tanya("restoran padang di Malaysia yang super langka", "203.0.113.13");
    assert.ok(f.catatan.ai.length >= 1);
    assert.match(hasil.source, /\+web$/);
    assert.match(hasil.reply, /Restoran Padang Nyata/);
    assert.match(hasil.reply, /Cari di Google Maps/);
    assert.doesNotMatch(hasil.reply, /tidak mengembalikan hasil/);
  } finally {
    f.pulihkan();
  }
});

test("Google menolak key (403): tidak crash, jatuh ke data peta lama", async () => {
  const f = pasangFetch({ googleStatus: 403, balasanAI: ["Belum ada data peta untuk itu."] });
  try {
    const hasil = await tanya("restoran padang di Malaysia kena 403", "203.0.113.14");
    assert.ok(typeof hasil.reply === "string" && hasil.reply.length > 0);
    assert.notEqual(hasil.source, "template");
  } finally {
    f.pulihkan();
  }
});

test("balasanDariGoogle: daftar kosong dan terisi", () => {
  assert.match(balasanDariGoogle([], { kueri: "x" }), /tidak mengembalikan hasil/);
  const p = normalisasiGoogle(tempatGoogle("Z1", "Satu Tempat"));
  assert.match(balasanDariGoogle([p]), /\*\*Satu Tempat\*\*/);
});

test("kartu For you untuk kota di luar data kurasi: hanya tempat Google, nama karangan AI dibuang", async () => {
  const makan = ["Coto Nusantara", "Pallubasa Serigala", "Kopi Daeng", "Mie Titi Asli", "Es Pisang Ijo Elo"].map(
    (n, i) =>
      tempatGoogle(`MK${i}`, n, {
        primaryType: "restaurant",
        types: ["restaurant", "food"],
        rating: 4.8 - i * 0.1,
      })
  );
  const alam = ["Pantai Losari", "Benteng Rotterdam", "Taman Maccini", "Bantimurung", "Pulau Samalona"].map(
    (n, i) =>
      tempatGoogle(`AL${i}`, n, {
        primaryType: "tourist_attraction",
        types: ["tourist_attraction", "point_of_interest"],
        rating: 4.7 - i * 0.1,
      })
  );
  const json = JSON.stringify({
    "Coffe And Snacks": [
      { name: "Coto Nusantara", rating: 5, address: "x", image: "" },
      { name: "Kafe Karangan AI", rating: 5, address: "x", image: "" },
    ],
    "Outdoor parks & Trials": [
      { name: "Pantai Losari", rating: 5, address: "x", image: "" },
      { name: "Taman Hantu Karangan", rating: 5, address: "x", image: "" },
    ],
  });
  const f = pasangFetch({ places: [...makan, ...alam], balasanAI: [json] });
  try {
    let payload;
    await handleChatRequest(
      {
        method: "POST",
        body: { mode: "recommend", message: "rekomendasi", city: "Makassar", areaMode: "in", minRating: 0 },
        headers: { "x-forwarded-for": "203.0.113.15" },
        socket: {},
      },
      { setHeader() {}, end: (t) => (payload = JSON.parse(t)) },
      ENV
    );
    const namaGoogle = new Set([...makan, ...alam].map((p) => p.displayName.text));
    for (const key of ["Coffe And Snacks", "Outdoor parks & Trials"]) {
      const grup = payload.groups[key];
      assert.ok(grup.length >= 2, `${key} terisi`);
      assert.ok(grup.every((item) => namaGoogle.has(item.name)), `${key} hanya nama Google`);
      assert.ok(grup.every((item) => !/Karangan/.test(item.name)));
      assert.ok(grup.every((item) => /^https:\/\/maps\.google\.com\//.test(item.mapsUrl)));
      assert.ok(grup.every((item) => /googleusercontent\.com/.test(item.image)));
    }
    assert.ok(!JSON.stringify(payload).includes(KEY));
  } finally {
    f.pulihkan();
  }
});
