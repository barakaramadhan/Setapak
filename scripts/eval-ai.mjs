// Alat ukur mutu AI SETAPAK: menjalankan skenario nyata ke handler yang sama
// dengan website, memeriksa tiap jawaban secara otomatis, lalu mencetak SKOR %.
//
// Cara jalan (butuh .env berisi API key AI + internet):
//   npm run eval:ai
//   npm run eval:ai -- --only=plan      (hanya skenario yang id/kategorinya memuat "plan")
//   npm run eval:ai -- --min=85         (ubah ambang lulus, default 80)
//
// Hasil rinci (jawaban yang gagal) disimpan di eval-report.json supaya mudah
// dikirim/dibaca saat memperbaiki prompt.

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pertanyaanDobel, terpotong } from "../server/qualityGuard.js";

// ------------------------------------------------------------------ pemeriksaan umum

const KAKU = /(saya hanya bisa bantu soal perjalanan|kuota (penuh|habis)|belum ada data terverifikasi|AI SETAPAK sedang sibuk)/i;
const KADALUARSA = /(vaksin(asi)?\s*covid|tes\s*pcr|karantina\s*wajib|sertifikat\s*vaksin)/i;
const SAMPAH = /\b(pegadaian|atm|spbu|pom bensin|kantor pos)\b/i;

function periksaTeks(reply, { batas = 1800, minPanjang = 25 } = {}) {
  return [
    ["tidak kosong/kaku", !!reply && reply.length >= minPanjang && !KAKU.test(reply)],
    ["tidak terpotong", !terpotong(reply || "")],
    ["tidak melebihi batas panjang", (reply || "").length <= batas],
    ["tanpa info kadaluarsa/sampah", !KADALUARSA.test(reply || "") && !SAMPAH.test(reply || "")],
  ];
}

// ------------------------------------------------------------------ skenario

const f = (o) => ({ knownKeys: [], knownModules: [], ...o });

export const SKENARIO = [
  {
    id: "search-keluarga-bogor",
    kategori: "search",
    pesan: "Mau ke Bogor bareng anak kecil dan orang tua, enaknya ke mana?",
    facts: f({ destinations: ["Bogor"], companions: "anak", knownKeys: ["kota", "tema"] }),
    showMap: true,
    cek: (r) => [
      ["menyebut tujuan (Bogor)", /bogor/i.test(r.reply)],
      ["paham kebutuhan (anak/lansia/santai/dekat)", /(anak|lansia|orang tua|santai|dekat|teduh|istirahat)/i.test(r.reply)],
      ["peta nyata muncul", (r.mapPlaces || []).length > 0],
      ["berbasis data lapangan", (r.grounding?.tempat || 0) > 0],
    ],
  },
  {
    id: "search-koreksi-lokasi",
    kategori: "search",
    pesan: "Aku mau ke Bekasi, ada taman safari gak?",
    facts: f({ destinations: ["Bekasi"], knownKeys: ["kota"] }),
    cek: (r) => [
      ["mengoreksi lokasi (Cisarua/Bogor)", /(cisarua|bogor)/i.test(r.reply)],
      ["tidak mengklaim ada di Bekasi", !/(ada|terdapat)\s+taman safari\s+(di|in)\s+bekasi/i.test(r.reply)],
    ],
  },
  {
    id: "search-riset-jepang",
    kategori: "search-detail",
    pesan: "15 hari ke Jepang bareng istri, budget 40 juta, makanan harus halal",
    facts: f({ destinations: ["Jepang"], days: 15, budget: "40 juta", companions: "istri", knownKeys: ["kota", "durasi", "budget", "tema"] }),
    batas: 3600,
    cek: (r) => [
      ["memuat biaya (Rp)", /rp|juta/i.test(r.reply)],
      ["memuat halal", /halal/i.test(r.reply)],
      ["jawaban cukup lengkap (>700 huruf)", (r.reply || "").length > 700],
      ["menawarkan lanjut ke Planning", /(planning|rencana harian|jadwal)/i.test(r.reply)],
    ],
  },
  {
    id: "search-umroh",
    kategori: "search-detail",
    pesan: "10 hari umroh Makkah dan Madinah, budget cukup, makanan Indonesia",
    facts: f({ destinations: ["Makkah", "Madinah"], days: 10, food: "makanan Indonesia", purpose: "ibadah", knownKeys: ["kota", "durasi", "makanan", "tema"] }),
    batas: 3600,
    cek: (r) => [
      ["menyebut Makkah & Madinah", /makkah|mekah/i.test(r.reply) && /madinah/i.test(r.reply)],
      ["tidak mengarang restoran beralamat", !/(sari rasa|jl\.\s*al-madinah)/i.test(r.reply)],
      ["bahasa menghormati (tanpa 'main/bermain')", !/\b(bermain|liburan main)\b/i.test(r.reply)],
    ],
  },
  {
    id: "search-umroh-multi-city-per-person",
    kategori: "search-detail",
    pesan: "Saya mau ke Mekkah 4 hari, dan Madinah 3 hari bersama istri dengan budget 20jt/org, tapi fokus ibadah.",
    facts: f({
      destinations: ["Makkah", "Madinah"],
      days: 7,
      daysByDestination: { Makkah: 4, Madinah: 3 },
      budget: "20jt/org",
      budgetScope: "per orang",
      purpose: "ibadah",
      companions: "istri",
      knownKeys: ["kota", "durasi", "budget", "tema"],
    }),
    batas: 3600,
    cek: (r) => [
      ["menjaga total 7 hari", /\b7 hari\b|tujuh hari/i.test(r.reply)],
      ["menjaga pembagian Makkah 4 + Madinah 3", /makkah.{0,50}4 hari|4 hari.{0,50}makkah/i.test(r.reply) && /madinah.{0,50}3 hari|3 hari.{0,50}madinah/i.test(r.reply)],
      ["budget dibahas per orang", /per orang/i.test(r.reply)],
      ["tidak menjanjikan budget pasti cukup", /(belum bisa dipastikan|belum bisa dianggap cukup|perlu (dicek|cek harga)|sangat ketat|cek harga terbaru)/i.test(r.reply)],
    ],
  },
  {
    id: "search-conjuring-film-location",
    kategori: "search-fact",
    pesan: "Film The Conjuring itu dimana ya? Saya mau ke negaranya nih.",
    facts: f({}),
    batas: 1200,
    cek: (r) => [
      ["menyebut lokasi produksi yang terverifikasi", /wilmington.{0,40}north carolina/i.test(r.reply)],
      ["menautkan sumber Wikipedia", /en\.wikipedia\.org\/wiki\/The_Conjuring/i.test(r.reply)],
      ["tidak mengulang alamat rumah/tautan palsu", !/(1085|goo\.gl\/maps\/xyz)/i.test(r.reply)],
    ],
  },
  {
    id: "search-kota-kecil",
    kategori: "search",
    pesan: "Weekend di Kuningan ada wisata apa ya?",
    facts: f({ destinations: ["Kuningan"], knownKeys: ["kota"] }),
    cek: (r) => [
      ["menyebut Kuningan", /kuningan/i.test(r.reply)],
      ["memberi sedikitnya satu saran konkret", /(curug|waduk|telaga|linggarjati|gunung|ciremai|sangkanurip|darma)/i.test(r.reply) || (r.grounding?.tempat || 0) > 0],
    ],
  },
  {
    id: "search-obrolan-ringan",
    kategori: "search",
    pesan: "Menurutmu film Doraemon itu bagus nggak sih?",
    facts: null,
    cek: (r) => [
      ["tidak menolak kaku", !/hanya bisa bantu/i.test(r.reply)],
      ["tidak memaksa jadi daftar wisata", !/^##\s/m.test(r.reply)],
    ],
  },
  {
    id: "search-hemat-jogja",
    kategori: "search",
    pesan: "Mahasiswa ke Jogja 3 hari, budget mepet banget, enaknya ngapain?",
    facts: f({ destinations: ["Yogyakarta"], days: 3, budget: "mepet", knownKeys: ["kota", "durasi"] }),
    showMap: true,
    cek: (r) => [
      ["menyebut Jogja/Yogyakarta", /(jogja|yogya)/i.test(r.reply)],
      ["sadar budget (gratis/murah/hemat/Rp)", /(gratis|murah|hemat|rp|ribu)/i.test(r.reply)],
      ["peta nyata muncul", (r.mapPlaces || []).length > 0],
    ],
  },
  {
    id: "search-lansia-bandung",
    kategori: "search",
    pesan: "Ajak orang tua yang sudah lansia ke Bandung, tempat yang nggak capek apa?",
    facts: f({ destinations: ["Bandung"], companions: "orang tua", knownKeys: ["kota", "tema"] }),
    cek: (r) => [
      ["paham kebutuhan lansia (minim jalan/santai/duduk)", /(lansia|tidak capek|nggak capek|santai|duduk|minim|landai|mobil|dekat)/i.test(r.reply)],
      ["menyebut Bandung", /bandung/i.test(r.reply)],
    ],
  },
  {
    id: "plan-jepang-tidak-dobel",
    kategori: "plan",
    giliran: [
      {
        pesan: "15 hari ke Jepang",
        facts: f({ destinations: ["Jepang"], days: 15, knownKeys: ["kota", "durasi"] }),
      },
      {
        pesan: "Berdua sama istri, budget 30 juta",
        facts: f({ destinations: ["Jepang"], days: 15, budget: "30 juta", companions: "istri", knownKeys: ["kota", "durasi", "budget", "tema"] }),
        riwayatDariGiliranSebelumnya: true,
      },
    ],
    cek: (r, { giliran }) => {
      const hasil = [["tidak menanyakan hal yang sudah diketahui", r.dobel.length === 0]];
      if (giliran === 1) hasil.push(["siap membuat plan setelah info cukup", r.ready === true]);
      return hasil;
    },
  },
  {
    id: "plan-bogor-singkat",
    kategori: "plan",
    giliran: [
      {
        pesan: "3 hari di Bogor budget 200rb berdua",
        facts: f({ destinations: ["Bogor"], days: 3, budget: "200 rb", companions: "berdua", knownKeys: ["kota", "durasi", "budget", "tema"] }),
      },
    ],
    cek: (r) => [
      ["tidak menanyakan kota/durasi/budget lagi", r.dobel.length === 0],
      ["siap membuat plan", r.ready === true],
    ],
  },
  {
    id: "createplan-bogor",
    kategori: "createplan",
    plan: { ringkasan: "Trip 3 hari ke Bogor bareng anak kecil, budget hemat, suka alam dan kuliner lokal.", facts: f({ destinations: ["Bogor"], days: 3, budget: "hemat", companions: "anak", knownKeys: ["kota", "durasi", "budget", "tema"] }), hari: 3 },
  },
  {
    id: "createplan-jogja-hemat",
    kategori: "createplan",
    plan: { ringkasan: "2 hari di Yogyakarta, mahasiswa, budget 300 ribu, suka budaya dan makanan murah.", facts: f({ destinations: ["Yogyakarta"], days: 2, budget: "300 rb", knownKeys: ["kota", "durasi", "budget"] }), hari: 2 },
  },
  {
    id: "createplan-jepang",
    kategori: "createplan",
    plan: { ringkasan: "7 hari ke Jepang berdua dengan istri, budget 30 juta, Tokyo dan Kyoto, makanan halal.", facts: f({ destinations: ["Jepang"], days: 7, budget: "30 juta", companions: "istri", knownKeys: ["kota", "durasi", "budget", "tema"] }), hari: 7, minTerverifikasi: 0.4 },
  },
  {
    id: "createplan-umroh",
    kategori: "createplan",
    plan: { ringkasan: "10 hari umroh Makkah dan Madinah bareng istri, makanan Indonesia, budget 30 juta.", facts: f({ destinations: ["Makkah", "Madinah"], days: 10, budget: "30 juta", food: "makanan Indonesia", purpose: "ibadah", companions: "istri", knownKeys: ["kota", "durasi", "budget", "makanan", "tema"] }), hari: 10, minTerverifikasi: 0.4 },
  },
  {
    id: "createplan-malaysia-thailand",
    kategori: "createplan",
    plan: {
      ringkasan: "Bulan madu keluarga 5 hari di Malaysia lalu 2 hari di Thailand, bareng istri dan satu anak. Seimbangkan waktu romantis dengan aktivitas ramah anak.",
      facts: f({
        destinations: ["Malaysia", "Thailand"],
        days: 7,
        daysByDestination: { Malaysia: 5, Thailand: 2 },
        companions: "istri dan satu anak",
        tema: "romantis",
        knownKeys: ["kota", "durasi", "tema"],
      }),
      hari: 7,
      minTerverifikasi: 0.4,
      destinationDays: { Malaysia: 5, Thailand: 2 },
    },
  },
  {
    id: "foryou-makassar",
    kategori: "foryou",
    foryou: { city: "Makassar" },
  },
  {
    id: "foryou-bogor",
    kategori: "foryou",
    foryou: { city: "Bogor" },
  },
];

// ------------------------------------------------------------------ pelaksana

function buatHandlerCaller(handler, env) {
  let nomor = 0;
  return async (body) => {
    nomor += 1;
    let keluar = null;
    const req = {
      method: "POST",
      body,
      headers: { "x-forwarded-for": `10.9.${Math.floor(nomor / 250)}.${nomor % 250}` },
      socket: {},
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      end(teks) {
        keluar = JSON.parse(teks);
      },
    };
    await handler(req, res, env);
    return keluar || {};
  };
}

function periksaPlan(skenario, data) {
  const plan = data.plan;
  const hasil = [["plan berhasil dibuat (JSON utuh)", !!plan && Array.isArray(plan.days) && plan.days.length > 0]];
  if (!plan) return hasil;
  const semua = plan.days.flatMap((d) => d.places || []);
  const nama = semua.map((p) => String(p.name).toLowerCase());
  const terverifikasi = semua.filter((p) => p.verified).length;
  const minV = skenario.plan.minTerverifikasi ?? 0.7;

  hasil.push(
    [`jumlah hari sesuai (${skenario.plan.hari})`, plan.days.length === skenario.plan.hari],
    ["tiap hari punya tempat", plan.days.every((d) => (d.places || []).length >= 1)],
    [`>= ${Math.round(minV * 100)}% tempat terbukti ada di peta`, semua.length > 0 && terverifikasi / semua.length >= minV],
    ["tidak ada tempat dobel antar hari", new Set(nama).size === nama.length],
    ["ada jam mulai & alasan", semua.length > 0 && semua.filter((p) => p.startTime && p.why).length / semua.length >= 0.7],
    ["biaya terisi", Number(plan.totalCost) > 0 || semua.some((p) => p.cost > 0)],
    ["tanpa info kadaluarsa/sampah", !KADALUARSA.test(JSON.stringify(plan)) && !SAMPAH.test(JSON.stringify(plan))],
    ["jarak antar tempat wajar (<= 120 km/hari)", plan.days.every((d) => !Number.isFinite(d.jarakKm) || d.jarakKm <= 120)],
  );
  Object.entries(skenario.plan.destinationDays || {}).forEach(([destination, days]) => {
    hasil.push([
      `durasi ${destination} sesuai (${days} hari)`,
      plan.days.filter((day) => String(day.title || "").toLowerCase().includes(destination.toLowerCase())).length === days,
    ]);
  });
  return hasil;
}

function periksaForYou(data) {
  const groups = data.groups || {};
  const kunci = Object.keys(groups);
  const item = kunci.flatMap((k) => groups[k] || []);
  const nama = item.map((i) => String(i.name).toLowerCase());
  return [
    ["dua kategori terisi", kunci.length >= 2 && kunci.every((k) => (groups[k] || []).length >= 3)],
    ["tiap kartu punya foto URL", item.length > 0 && item.every((i) => /^https?:\/\//.test(i.image || ""))],
    ["nama unik", new Set(nama).size === nama.length],
    ["tanpa tempat sampah", !item.some((i) => SAMPAH.test(i.name))],
  ];
}

/**
 * @param {{handler: Function, env: object, tidur?: (ms:number)=>Promise<void>, only?: string, jeda?: number}} opsi
 */
export async function jalankanEval({ handler, env, tidur = (ms) => new Promise((r) => setTimeout(r, ms)), only = "", jeda = 1500, log = console.log }) {
  const panggil = buatHandlerCaller(handler, env);
  const laporan = [];
  const daftar = SKENARIO.filter((s) => !only || s.id.includes(only) || s.kategori.includes(only));

  for (const skenario of daftar) {
    const mulai = Date.now();
    let pemeriksaan = [];
    let cuplikan = "";
    try {
      if (skenario.kategori === "createplan") {
        const data = await panggil({
          mode: "createPlan",
          message: skenario.plan.ringkasan,
          history: [],
          facts: skenario.plan.facts,
        });
        pemeriksaan = periksaPlan(skenario, data);
        cuplikan = JSON.stringify(data.plan?.days?.slice(0, 2) || data).slice(0, 600);
      } else if (skenario.kategori === "foryou") {
        const data = await panggil({
          mode: "recommend",
          message: `Rekomendasi tempat di dalam kota ${skenario.foryou.city}, rating minimal 0`,
          city: skenario.foryou.city,
          areaMode: "in",
          minRating: 0,
          refresh: true,
        });
        pemeriksaan = periksaForYou(data);
        cuplikan = JSON.stringify(data.groups || data).slice(0, 600);
      } else if (skenario.giliran) {
        let riwayat = [];
        for (let i = 0; i < skenario.giliran.length; i += 1) {
          const g = skenario.giliran[i];
          const data = await panggil({
            mode: "plan",
            message: g.pesan,
            history: riwayat,
            facts: g.facts,
            showMap: false,
          });
          const dobel = pertanyaanDobel(data.reply || "", g.facts, riwayat);
          const r = { ...data, dobel };
          pemeriksaan.push(...periksaTeks(data.reply, { batas: 1200 }), ...skenario.cek(r, { giliran: i }));
          cuplikan += `[${g.pesan}] -> ${(data.reply || "").slice(0, 300)}\n`;
          riwayat = [...riwayat, { role: "user", text: g.pesan }, { role: "ai", text: data.reply || "" }];
          await tidur(jeda);
        }
      } else {
        const data = await panggil({
          mode: "search",
          message: skenario.pesan,
          history: [],
          facts: skenario.facts,
          showMap: !!skenario.showMap,
        });
        pemeriksaan = [
          ...periksaTeks(data.reply, { batas: skenario.batas || 1800 }),
          ...skenario.cek(data),
        ];
        cuplikan = (data.reply || "").slice(0, 700);
      }
    } catch (error) {
      pemeriksaan = [["skenario berjalan tanpa error", false]];
      cuplikan = `ERROR: ${error.message}`;
    }

    const lulus = pemeriksaan.filter(([, ok]) => ok).length;
    laporan.push({
      id: skenario.id,
      kategori: skenario.kategori,
      lulus,
      total: pemeriksaan.length,
      detik: Math.round((Date.now() - mulai) / 100) / 10,
      gagal: pemeriksaan.filter(([, ok]) => !ok).map(([nama]) => nama),
      cuplikan,
    });
    log(
      `${lulus === pemeriksaan.length ? "✅" : "⚠️ "} ${skenario.id.padEnd(28)} ${lulus}/${pemeriksaan.length}` +
        (pemeriksaan.length - lulus ? `  gagal: ${laporan.at(-1).gagal.join("; ")}` : "")
    );
    await tidur(jeda);
  }

  const total = laporan.reduce((a, l) => a + l.total, 0);
  const lulus = laporan.reduce((a, l) => a + l.lulus, 0);
  const perKategori = {};
  laporan.forEach((l) => {
    perKategori[l.kategori] ||= { lulus: 0, total: 0 };
    perKategori[l.kategori].lulus += l.lulus;
    perKategori[l.kategori].total += l.total;
  });
  return { skor: total ? Math.round((lulus / total) * 1000) / 10 : 0, lulus, total, perKategori, laporan };
}

// ------------------------------------------------------------------ CLI

const dipanggilLangsung =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (dipanggilLangsung) {
  const arg = (nama, bawaan = "") =>
    (process.argv.find((a) => a.startsWith(`--${nama}=`)) || "").split("=")[1] || bawaan;
  const ambang = Number(arg("min", "80"));

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.log("Isi minimal satu API key AI di .env (GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY) lalu jalankan lagi.");
    process.exit(1);
  }

  const { handleChatRequest } = await import("../server/chatHandler.js");
  console.log("Menjalankan evaluasi AI SETAPAK (butuh beberapa menit, ada jeda agar kuota gratis aman)...\n");
  const hasil = await jalankanEval({ handler: handleChatRequest, env: process.env, only: arg("only") });

  console.log("\n--- per kategori ---");
  Object.entries(hasil.perKategori).forEach(([k, v]) =>
    console.log(`${k.padEnd(14)} ${Math.round((v.lulus / v.total) * 100)}%  (${v.lulus}/${v.total})`)
  );
  console.log(`\nSKOR TOTAL: ${hasil.skor}%  (${hasil.lulus}/${hasil.total} pemeriksaan)  — ambang ${ambang}%`);
  writeFileSync("eval-report.json", JSON.stringify(hasil, null, 2));
  console.log("Detail jawaban yang gagal ada di eval-report.json");
  process.exit(hasil.skor >= ambang ? 0 : 1);
}
