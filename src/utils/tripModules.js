// Struktur Universal Trip Planner — 15 modul untuk satu perjalanan.
//
// Semua modul disimpan di satu kolom `plan` (jsonb) pada tabel `trips`.
// Alasannya: RLS tetap sederhana (satu baris = satu trip milik auth.uid()),
// tidak perlu migrasi 15 tabel, dan rencana lama hasil chat tetap bisa dibaca.
// Rencana lama { city, days:[{title, places:[{name,cost}]}], totalCost }
// dinormalisasi ke modul yang sesuai tanpa kehilangan data.

import { addDaysToKey, fromDateKey } from "./tripDate.js";

const PILIHAN = {
  tema: ["Santai", "Keluarga", "Petualangan", "Kuliner", "Budaya", "Romantis", "Bisnis"],
  skala: ["Solo", "Pasangan", "Keluarga kecil", "Kelompok", "Rombongan besar"],
  moda: ["Pesawat", "Kereta", "Mobil", "Bus", "Kapal", "Motor", "Lainnya"],
  peran: ["Pergi", "Pulang", "Transport lokal"],
  akomodasi: ["Hotel", "Villa", "Hostel", "Guesthouse", "Camping", "Lainnya"],
  kategoriBiaya: ["Transport", "Akomodasi", "Makan", "Aktivitas", "Tiket", "Lainnya"],
  waktuMakan: ["Sarapan", "Makan siang", "Makan malam", "Camilan"],
  kategoriAktivitas: ["Wisata", "Hiburan", "Petualangan", "Budaya", "Belanja", "Lainnya"],
  jenisDokumen: ["KTP", "Paspor", "Visa", "Tiket", "Asuransi", "Lainnya"],
  kategoriBarang: ["Pakaian", "Toiletries", "Elektronik", "Dokumen", "Obat", "Lainnya"],
  statusBooking: ["Belum dipesan", "Terkonfirmasi", "Lunas", "Dibatalkan"],
  modaLogistik: ["Jalan kaki", "Angkot", "Ojek", "Taksi", "Sewa mobil", "Kapal", "Lainnya"],
};

const teks = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const area = (key, label, extra = {}) => ({ key, label, type: "textarea", ...extra });
const angka = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });
const tanggal = (key, label, extra = {}) => ({ key, label, type: "date", ...extra });
const pilih = (key, label, options, extra = {}) => ({ key, label, type: "select", options, ...extra });
const cek = (key, label, extra = {}) => ({ key, label, type: "checkbox", ...extra });
const daftar = (key, label, fields, extra = {}) => ({ key, label, fields, ...extra });

export const MODULES = [
  {
    id: "overview",
    no: 1,
    name: "Trip Overview",
    label: "Ringkasan Trip",
    icon: "fi-rr-layout-fluid",
    desc: "Nama, tujuan, tema, dan skala perjalanan. Nama & tujuan juga dipakai kalender dan Schedule.",
    fields: [
      teks("name", "Nama perjalanan", { top: "title", placeholder: "Liburan keluarga ke Bogor" }),
      teks("destination", "Tujuan utama", { placeholder: "Bogor, Jawa Barat" }),
      pilih("theme", "Tema", PILIHAN.tema),
      pilih("scale", "Skala perjalanan", PILIHAN.skala),
      teks("companions", "Teman perjalanan", { placeholder: "Ayah, Ibu, dan anak-anak" }),
    ],
  },
  {
    id: "destination",
    no: 2,
    name: "Destination Planning",
    label: "Destinasi",
    icon: "fi-rr-globe",
    desc: "Negara, provinsi, kota, dan daftar tempat wisata yang mau dikunjungi.",
    fields: [
      teks("country", "Negara", { placeholder: "Indonesia" }),
      teks("province", "Provinsi", { placeholder: "Jawa Barat" }),
      teks("city", "Kota", { top: "city", placeholder: "Bogor" }),
      teks("area", "Area / kawasan", { placeholder: "Puncak, Cisarua" }),
    ],
    collections: [
      daftar("places", "Tempat wisata", [
        teks("name", "Nama tempat"),
        teks("type", "Jenis", { placeholder: "Air terjun, museum, taman" }),
        teks("note", "Catatan"),
      ]),
    ],
  },
  {
    id: "dates",
    no: 3,
    name: "Date & Duration",
    label: "Tanggal & Durasi",
    icon: "fi-rr-calendar",
    desc: "Tanggal mulai, tanggal selesai, durasi, dan lama tinggal. Tanggal dipakai untuk penanda kalender.",
    fields: [
      tanggal("startDate", "Tanggal mulai", { top: "date" }),
      tanggal("endDate", "Tanggal selesai", { top: "endDate" }),
      angka("nights", "Lama tinggal (malam)", { min: 0 }),
      area("notes", "Catatan tanggal", { placeholder: "Misalnya: hindari akhir pekan" }),
    ],
  },
  {
    id: "itinerary",
    no: 4,
    name: "Itinerary",
    label: "Jadwal Harian",
    icon: "fi-rr-list-check",
    desc: "Jadwal per hari dan aktivitasnya. Pisahkan aktivitas dengan koma.",
    collections: [
      daftar("days", "Hari perjalanan", [
        tanggal("date", "Tanggal"),
        teks("title", "Judul hari", { placeholder: "Hari 1 · Tiba di Bogor" }),
        area("activities", "Aktivitas", { placeholder: "Curug, Pemandian, Makan siang" }),
      ]),
    ],
  },
  {
    id: "transportation",
    no: 5,
    name: "Transportation",
    label: "Transportasi",
    icon: "fi-rr-plane",
    desc: "Pesawat, kereta, mobil, atau kapal — termasuk kode tiket dan jadwal berangkat.",
    collections: [
      daftar("items", "Moda transportasi", [
        pilih("type", "Peran", PILIHAN.peran),
        pilih("mode", "Moda", PILIHAN.moda),
        teks("from", "Dari"),
        teks("to", "Ke"),
        teks("provider", "Operator / maskapai"),
        teks("code", "Kode tiket / booking"),
        teks("depart", "Berangkat", { placeholder: "08.30, 5 Des" }),
        teks("arrive", "Tiba"),
        angka("cost", "Biaya (Rp)"),
      ]),
    ],
  },
  {
    id: "accommodation",
    no: 6,
    name: "Accommodation",
    label: "Akomodasi",
    icon: "fi-rr-bed",
    desc: "Hotel, villa, hostel, atau tempat menginap lain lengkap dengan check-in dan konfirmasi.",
    collections: [
      daftar("items", "Tempat menginap", [
        teks("name", "Nama tempat"),
        pilih("type", "Jenis", PILIHAN.akomodasi),
        tanggal("checkIn", "Check-in"),
        tanggal("checkOut", "Check-out"),
        teks("address", "Alamat"),
        angka("cost", "Biaya (Rp)"),
        teks("confirmation", "Kode konfirmasi"),
      ]),
    ],
  },
  {
    id: "budget",
    no: 7,
    name: "Budget Management",
    label: "Anggaran",
    icon: "fi-rr-wallet",
    desc: "Anggaran dan pengeluaran per kategori. Total & sisa anggaran dihitung otomatis.",
    fields: [
      pilih("currency", "Mata uang", ["IDR", "USD"]),
      angka("planned", "Anggaran direncanakan"),
    ],
    collections: [
      daftar("items", "Rincian biaya", [
        teks("label", "Keterangan"),
        pilih("category", "Kategori", PILIHAN.kategoriBiaya),
        angka("amount", "Jumlah"),
        cek("paid", "Sudah dibayar"),
      ]),
    ],
  },
  {
    id: "food",
    no: 8,
    name: "Food Planning",
    label: "Makan & Kuliner",
    icon: "fi-rr-utensils",
    desc: "Restoran, kuliner wajib, dan perkiraan biaya makan per hari.",
    collections: [
      daftar("items", "Rencana makan", [
        teks("name", "Nama masakan / tempat"),
        teks("place", "Restoran / warung"),
        pilih("meal", "Waktu", PILIHAN.waktuMakan),
        teks("time", "Jam"),
        angka("cost", "Perkiraan biaya (Rp)"),
        teks("note", "Catatan"),
      ]),
    ],
  },
  {
    id: "activities",
    no: 9,
    name: "Activities",
    label: "Aktivitas",
    icon: "fi-rr-hiking",
    desc: "Wisata, hiburan, dan petualangan yang masuk ke jadwal.",
    collections: [
      daftar("items", "Daftar aktivitas", [
        teks("name", "Nama aktivitas"),
        pilih("category", "Kategori", PILIHAN.kategoriAktivitas),
        teks("day", "Hari / tanggal"),
        angka("cost", "Biaya (Rp)"),
        teks("note", "Catatan"),
      ]),
    ],
  },
  {
    id: "documents",
    no: 10,
    name: "Documents",
    label: "Dokumen",
    icon: "fi-rr-file-user",
    desc: "Paspor, visa, tiket, dan identitas penting — plus nomor serta masa berlaku.",
    collections: [
      daftar("items", "Dokumen", [
        teks("name", "Nama dokumen"),
        pilih("type", "Jenis", PILIHAN.jenisDokumen),
        teks("number", "Nomor"),
        tanggal("expiry", "Berlaku sampai"),
        teks("note", "Catatan"),
      ]),
    ],
  },
  {
    id: "packing",
    no: 11,
    name: "Packing List",
    label: "Barang Bawaan",
    icon: "fi-rr-suitcase",
    desc: "Checklist barang bawaan. Centang yang sudah siap — progresnya otomatis.",
    collections: [
      daftar("items", "Barang", [
        teks("name", "Nama barang"),
        pilih("category", "Kategori", PILIHAN.kategoriBarang),
        angka("qty", "Jumlah", { min: 1 }),
        cek("packed", "Sudah disiapkan"),
      ]),
    ],
  },
  {
    id: "safety",
    no: 12,
    name: "Safety & Emergency",
    label: "Keamanan",
    icon: "fi-rr-shield-check",
    desc: "Kontak darurat, alergi/riwayat medis, dan rencana kalau ada masalah.",
    fields: [
      teks("emergencyName", "Kontak darurat utama"),
      teks("emergencyPhone", "No. telepon darurat"),
      pilih("bloodType", "Golongan darah", ["Tidak tahu", "A", "B", "AB", "O"]),
      teks("allergies", "Alergi"),
      area("medicalNote", "Catatan medis"),
      area("plan", "Rencana darurat"),
    ],
    collections: [
      daftar("contacts", "Kontak penting", [
        teks("name", "Nama"),
        teks("relation", "Hubungan"),
        teks("phone", "No. telepon"),
      ]),
    ],
  },
  {
    id: "booking",
    no: 13,
    name: "Booking Management",
    label: "Reservasi",
    icon: "fi-rr-ticket",
    desc: "Semua reservasi dan konfirmasi: hotel, tiket, aktivitas, dan transportasi.",
    collections: [
      daftar("items", "Reservasi", [
        teks("name", "Nama reservasi"),
        pilih("type", "Jenis", ["Hotel", "Tiket", "Aktivitas", "Transport", "Lainnya"]),
        teks("reference", "Kode booking"),
        pilih("status", "Status", PILIHAN.statusBooking),
        tanggal("date", "Tanggal"),
        angka("cost", "Biaya (Rp)"),
      ]),
    ],
  },
  {
    id: "logistics",
    no: 14,
    name: "Travel Logistics",
    label: "Logistik Perjalanan",
    icon: "fi-rr-route",
    desc: "Rute perpindahan dan konektivitas antar titik, beda dari moda transportasinya.",
    collections: [
      daftar("items", "Rute & koneksi", [
        teks("from", "Dari"),
        teks("to", "Ke"),
        pilih("mode", "Cara", PILIHAN.modaLogistik),
        teks("depart", "Berangkat"),
        teks("arrive", "Tiba"),
        teks("note", "Catatan"),
      ]),
    ],
  },
  {
    id: "documentation",
    no: 15,
    name: "Trip Documentation",
    label: "Dokumentasi",
    icon: "fi-rr-camera",
    desc: "Foto, tautan album, jurnal, dan kenangan perjalanan.",
    fields: [
      teks("albumLink", "Tautan album foto"),
      area("journal", "Jurnal perjalanan"),
    ],
    collections: [
      daftar("memories", "Kenangan", [
        teks("title", "Judul"),
        tanggal("date", "Tanggal"),
        teks("photoUrl", "Tautan foto"),
        area("note", "Catatan"),
      ]),
    ],
  },
];

export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(nilai) {
  const angka = Number(nilai) || 0;
  return angka > 0 ? rupiah.format(angka) : "-";
}

export function durasiHari(start, end) {
  const a = fromDateKey(start);
  const b = fromDateKey(end) || a;
  if (!a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export function listDariTeks(nilai) {
  if (Array.isArray(nilai)) {
    return nilai.map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean);
  }
  return String(nilai || "")
    .split(/[,;\n•]/)
    .map((bagian) => bagian.trim())
    .filter(Boolean);
}

function itemAwal(field) {
  if (field.type === "checkbox") return false;
  if (field.type === "number") return "";
  return "";
}

export function barisAwal(collection) {
  return collection.fields.reduce((acc, field) => {
    acc[field.key] = itemAwal(field);
    return acc;
  }, {});
}

/** Nilai awal sebuah modul, termasuk field yang tersimpan di kolom trip. */
export function bagianAwal(modul, trip = {}) {
  const bagian = {};
  (modul.fields || []).forEach((field) => {
    bagian[field.key] = "";
  });
  (modul.collections || []).forEach((collection) => {
    bagian[collection.key] = [];
  });

  if (modul.id === "overview") {
    bagian.name = trip.title || "";
    bagian.destination = trip.city || "";
  }
  if (modul.id === "destination") {
    bagian.city = trip.city || "";
  }
  if (modul.id === "dates") {
    bagian.startDate = trip.date || "";
    bagian.endDate = trip.endDate || trip.date || "";
  }
  if (modul.id === "budget") bagian.currency = "IDR";

  return bagian;
}

function adaIsi(bagian) {
  return Object.entries(bagian || {}).some(([key, value]) => {
    if (key === "currency") return false;
    if (Array.isArray(value)) {
      return value.some((baris) =>
        Object.entries(baris || {}).some(
          ([k, v]) =>
            k !== "packed" &&
            k !== "paid" &&
            v !== "" &&
            v !== false &&
            v !== 0 &&
            v != null
        )
      );
    }
    return value !== "" && value != null;
  });
}

export function modulTerisi(modul, trip) {
  // Normalisasi dulu supaya itinerary dari format chat lama ikut terhitung.
  const plan = trip?.plan?.[modul.id] ? trip.plan : ensureUniversalPlan(trip);
  const bagian = plan?.[modul.id] || bagianAwal(modul, trip);
  return Boolean(adaIsi(bagian));
}

export function progresModul(trip) {
  return MODULES.filter((modul) => modulTerisi(modul, trip)).length;
}

export function ringkasanBagian(modul, bagian) {
  if (!bagian) return "";
  if (modul.id === "dates") {
    const hari = durasiHari(bagian.startDate, bagian.endDate);
    return hari > 0 ? `${hari} hari` : "";
  }
  if (modul.id === "budget") {
    const total = (bagian.items || []).reduce(
      (jumlah, item) => jumlah + (Number(item.amount) || 0),
      0
    );
    return total > 0 ? formatRupiah(total) : "";
  }
  if (modul.id === "packing") {
    const barang = bagian.items || [];
    if (!barang.length) return "";
    return `${barang.filter((item) => item.packed).length}/${barang.length} siap`;
  }
  const jumlah = (modul.collections || []).reduce(
    (total, collection) => total + (bagian[collection.key] || []).length,
    0
  );
  return jumlah ? `${jumlah} item` : "";
}

/** Pastikan semua 15 modul ada, dan data lama hasil chat tidak hilang. */
export function ensureUniversalPlan(trip) {
  const asli = trip?.plan && typeof trip.plan === "object" ? trip.plan : {};
  const plan = { ...asli };

  MODULES.forEach((modul) => {
    if (!plan[modul.id] || typeof plan[modul.id] !== "object") {
      plan[modul.id] = bagianAwal(modul, trip);
    } else {
      // Pastikan field utama tetap ada walau modul sudah sebagian terisi.
      plan[modul.id] = { ...bagianAwal(modul, trip), ...plan[modul.id] };
    }
  });

  // Prefill dari jawaban wizard/answers yang mungkin belum terpetakan ke field.
  const answers = Array.isArray(asli.answers) ? asli.answers : [];
  answers.forEach((a) => {
    const moduleId = a?.module;
    const key = String(a?.key || "").toLowerCase();
    const val = String(a?.value || "").trim();
    if (!val) return;
    if (moduleId === "budget" && !plan.budget.planned) {
      const raw = val.toLowerCase().replace(/\./g,"").replace(/,/g,".");
      const jt = raw.match(/([\d.]+)\s*(jt|juta)/);
      const rb = raw.match(/([\d.]+)\s*(rb|ribu|k)\b/);
      const n = jt ? Math.round(parseFloat(jt[1]) * 1000000) : rb ? Math.round(parseFloat(rb[1]) * 1000) : Number(val.replace(/[^0-9]/g, ""));
      if (n > 0) plan.budget.planned = n;
    }
    if (moduleId === "transportation" && !(plan.transportation.items || []).length) {
      plan.transportation.items = [{ type: "Pergi", mode: val, from: trip.city || "", to: trip.city || "", cost: "" }];
    }
    if (moduleId === "accommodation" && !(plan.accommodation.items || []).length) {
      plan.accommodation.items = [{ name: val, type: /hotel|villa|guest|hostel|homestay/i.test(val) ? val : "Hotel", area: trip.city || plan.destination.city || "", checkIn: trip.date || plan.dates.startDate || "", checkOut: trip.endDate || plan.dates.endDate || trip.date || "", cost: "", note: "Preferensi dari user" }];
    }
    if (moduleId === "safety") {
      if (/alergi/.test(key) && !plan.safety.allergies) plan.safety.allergies = val;
      else if (/darurat|kontak|phone|telepon/.test(key) && !plan.safety.emergencyPhone) plan.safety.emergencyPhone = val;
      else if (!plan.safety.medicalNote && val.toLowerCase() !== "tidak ada") plan.safety.medicalNote = val;
    }
  });

  const days = Array.isArray(asli.days) ? asli.days : [];
  if (!(plan.itinerary.days || []).length && days.length) {
    plan.itinerary.days = days.map((hari, index) => {
      const places = Array.isArray(hari.places) ? hari.places : [];
      const acts = listDariTeks(hari.activities || places);
      return {
        date: hari.date || addDaysToKey(trip.date, index),
        title: hari.title || `Hari ${index + 1}`,
        activities: acts.length ? acts.join(", ") : "",
      };
    });
  }

  // Selaraskan dates & overview dari trip utama
  if (!plan.destination.city && trip.city) plan.destination.city = trip.city;
  if (!plan.overview.name && trip.title) plan.overview.name = trip.title;
  if (!plan.overview.destination && (trip.city || plan.destination.city)) plan.overview.destination = trip.city || plan.destination.city;
  if (trip.date) plan.dates.startDate = trip.date;
  if (trip.endDate || trip.date) plan.dates.endDate = trip.endDate || trip.date;
  const dur = durasiHari(plan.dates.startDate, plan.dates.endDate);
  if (dur > 0 && !plan.dates.nights) plan.dates.nights = Math.max(0, dur - 1);

  if (!plan.budget.currency) plan.budget.currency = "IDR";
  if (!plan.budget.planned && Number(asli.totalCost) > 0) plan.budget.planned = Number(asli.totalCost);

  // Jika ada itinerary tapi food/accommodation kosong, isi draft minimal agar modul tidak kosong.
  const hasItin = (plan.itinerary.days || []).some((d) => String(d.activities || "").trim());
  if (hasItin && !(plan.food.items || []).length) {
    plan.food.items = [
      { name: "Kuliner lokal rekomendasi", place: trip.city || plan.destination.city || "", meal: "Makan siang", cost: "", note: "Sesuaikan dengan preferensi/alergi" },
      { name: "Makan malam santai", place: trip.city || plan.destination.city || "", meal: "Makan malam", cost: "", note: "" },
    ];
  }
  if (hasItin && !(plan.accommodation.items || []).length) {
    plan.accommodation.items = [{
      name: "Akomodasi (pilih sesuai preferensi)",
      type: "Hotel",
      area: trip.city || plan.destination.city || "",
      checkIn: plan.dates.startDate || trip.date || "",
      checkOut: plan.dates.endDate || trip.endDate || trip.date || "",
      cost: "",
      note: "Lengkapi nama hotel/penginapan pilihanmu",
    }];
  }
  if ((plan.transportation.items || []).length === 0 && (trip.city || plan.destination.city)) {
    plan.transportation.items = [{
      type: "Pergi",
      mode: "Transportasi",
      from: "Kota asal",
      to: trip.city || plan.destination.city,
      cost: "",
      note: "Lengkapi detail transportasi",
    }];
  }

  // Budget planned dari facts/answers: jika budget items ada tapi planned kosong, jumlahkan.
  if (!plan.budget.planned && (plan.budget.items || []).length) {
    const sum = plan.budget.items.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    if (sum > 0) plan.budget.planned = sum;
  }

  return plan;
}

/** Gabungkan rencana AI/chat ke 15 modul (dipakai tombol "Isi dari AI"). */
export function normalizePlan(aiPlan, trip) {
  const plan = ensureUniversalPlan(trip);
  if (!aiPlan || typeof aiPlan !== "object") return plan;

  const city = aiPlan.city || trip.city || plan.destination.city || "";
  if (city) {
    plan.destination.city = plan.destination.city || city;
    plan.overview.destination = plan.overview.destination || city;
  }

  const hari = Array.isArray(aiPlan.days) ? aiPlan.days : [];
  // Selalu sinkronkan itinerary dari plan AI terbaru bila ada, supaya tidak terpotong.
  if (hari.length) {
    plan.itinerary.days = hari.map((item, index) => {
      const places = Array.isArray(item.places) ? item.places : [];
      const acts = listDariTeks(item.activities || places);
      return {
        date: item.date || addDaysToKey(trip.date, index),
        title: item.title || `Hari ${index + 1}`,
        activities: acts.join(", "),
      };
    });
    // Simpan bentuk lama juga agar komponen lama/ekspor tetap kompatibel.
    plan.days = hari;
  }

  if (Number(aiPlan.totalCost) > 0 && !Number(plan.budget.planned)) plan.budget.planned = Number(aiPlan.totalCost);

  const semuaTempat = [...new Set(hari.flatMap((item) => listDariTeks(item.places || item.activities)))];
  if (semuaTempat.length) {
    plan.destination.places = semuaTempat.slice(0, 20).map((name) => ({ name, type: "", note: "" }));
    plan.activities.items = semuaTempat.slice(0, 20).map((name, idx) => ({
      name,
      category: "Wisata",
      day: `Hari ${Math.floor(idx / 3) + 1}`,
      cost: "",
      note: "",
    }));
    const biaya = hari.flatMap((item) => (Array.isArray(item.places) ? item.places : [])).filter((p) => Number(p.cost) > 0);
    if (biaya.length) {
      plan.budget.items = biaya.slice(0, 30).map((place) => ({
        label: place.name,
        category: "Tiket",
        amount: Number(place.cost),
        paid: false,
      }));
    }
  }

  if (aiPlan.modules && typeof aiPlan.modules === "object") {
    MODULES.forEach((modul) => {
      const bagian = aiPlan.modules[modul.id];
      if (bagian && typeof bagian === "object") {
        // Gabungkan koleksi secara cerdas: kalau AI memberi items, pakai jika modul kosong/kurang.
        const merged = { ...plan[modul.id], ...bagian };
        (modul.collections || []).forEach((col) => {
          const lama = plan[modul.id]?.[col.key] || [];
          const baru = bagian[col.key];
          if (Array.isArray(baru) && baru.length && (!lama.length || baru.length >= lama.length)) {
            merged[col.key] = baru;
          }
        });
        plan[modul.id] = merged;
      }
    });
  }

  // Pastikan Date & Duration konsisten dengan trip.
  if (trip.date) plan.dates.startDate = trip.date;
  if (trip.endDate || trip.date) plan.dates.endDate = trip.endDate || trip.date;
  const dur = durasiHari(plan.dates.startDate, plan.dates.endDate);
  if (dur > 0) plan.dates.nights = Math.max(0, dur - 1);

  // Pastikan budget planned terisi.
  if (!Number(plan.budget.planned)) {
    const sum = (plan.budget.items || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    if (sum > 0) plan.budget.planned = sum;
    else if (Number(aiPlan.totalCost) > 0) plan.budget.planned = Number(aiPlan.totalCost);
  }

  return ensureUniversalPlan({ ...trip, plan, city: city || trip.city });
}

/** Jadwal harian dari modul itinerary, dengan fallback ke format lama chat. */
export function getItinerary(trip) {
  const modern = trip?.plan?.itinerary?.days;
  if (Array.isArray(modern) && modern.length) {
    return modern.map((hari, index) => {
      const activities = listDariTeks(hari.activities);
      return {
        date: hari.date || addDaysToKey(trip.date, index),
        title: hari.title || `Hari ${index + 1}`,
        activities,
        places: activities.map((name) => ({ name })),
      };
    });
  }

  const lama = trip?.plan?.days;
  if (Array.isArray(lama) && lama.length) {
    return lama.map((hari, index) => {
      const places = (Array.isArray(hari.places) ? hari.places : []).filter(Boolean);
      return {
        date: hari.date || addDaysToKey(trip.date, index),
        title: hari.title || `Hari ${index + 1}`,
        activities: places.map((place) => place.name).filter(Boolean),
        places,
      };
    });
  }

  if (!trip?.place) return [];
  return [
    {
      date: trip.date,
      title: "Agenda",
      activities: listDariTeks(trip.place),
      places: listDariTeks(trip.place).map((name) => ({ name })),
    },
  ];
}


const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Masukkan jawaban form di chat (wizard) ke modul Trip yang sesuai.
 * Jawaban yang cocok dengan kolom modul (kunci/label sama, pilihan valid) diisi langsung;
 * semuanya juga disimpan di plan.answers supaya tetap terlihat di Trip.
 */
export function terapkanJawabanForm(plan, fields = [], values = {}) {
  const hasil = { ...plan, answers: [] };
  (fields || []).forEach((f) => {
    const nilai = String(values?.[f.key] ?? "").trim();
    if (!nilai) return;
    hasil.answers.push({ key: f.key, label: f.label, value: nilai, module: f.module?.id || "" });

    const modul = MODULES.find((m) => m.id === f.module?.id);
    if (!modul) return;
    let kolom = (modul?.fields || []).find(
      (k) => norm(k.key) === norm(f.key) || norm(k.label) === norm(f.key) || norm(k.label) === norm(f.label)
    );
    // Pemetaan cerdas untuk pertanyaan umum yang tidak persis sama dengan nama kolom.
    if (!kolom && modul.id === "safety") {
      const nkey = norm(f.key + " " + f.label);
      if (/alergi/.test(nkey)) kolom = modul.fields.find((k) => k.key === "allergies");
      else if (/darurat|kontak/.test(nkey)) kolom = modul.fields.find((k) => k.key === "emergencyPhone");
      else kolom = modul.fields.find((k) => k.key === "medicalNote" || k.key === "plan");
    }
    // Budget: "500 ribu"/"1jt" -> planned
    if (!kolom && modul.id === "budget") {
      const raw = String(nilai).toLowerCase().replace(/\./g, "").replace(/,/g, ".");
      const jt = raw.match(/([\d.]+)\s*(jt|juta)/);
      const rb = raw.match(/([\d.]+)\s*(rb|ribu|k)\b/);
      let n = jt ? Math.round(parseFloat(jt[1]) * 1000000) : rb ? Math.round(parseFloat(rb[1]) * 1000) : Number(String(nilai).replace(/[^0-9]/g, ""));
      if (n > 0) { hasil.budget = { ...(hasil.budget || {}), planned: n, currency: "IDR" }; return; }
    }
    // Transport/accommodation/food: jawaban user harus masuk sebagai item draft.
    if (!kolom && ["transportation","accommodation","food"].includes(modul.id)) {
      const planRef = hasil[modul.id] || {};
      if (modul.id === "transportation" && !(planRef.items || []).length) {
        hasil.transportation = { ...planRef, items: [{ type: "Pergi", mode: nilai, from: "Kota asal", to: hasil.destination?.city || hasil.overview?.destination || "", depart: "", arrive: "", cost: "", note: "" }] };
      } else if (modul.id === "accommodation" && !(planRef.items || []).length) {
        hasil.accommodation = { ...planRef, items: [{ name: nilai, type: /hotel|villa|guest|hostel|homestay/i.test(nilai) ? nilai : "Hotel", area: hasil.destination?.city || "", checkIn: hasil.dates?.startDate || "", checkOut: hasil.dates?.endDate || "", cost: "", note: "Preferensi dari user" }] };
      } else if (modul.id === "food" && !(planRef.items || []).length) {
        const noPref = /tidak ada|tidak|no/i.test(nilai);
        hasil.food = { ...planRef, items: [{ name: noPref ? "Kuliner lokal rekomendasi" : nilai, place: hasil.destination?.city || "", meal: "Makan siang", cost: "", note: noPref ? "Tidak ada alergi/preferensi khusus" : "Preferensi dari user" }] };
      }
      return;
    }
    if (!kolom) return;
    let isi = nilai;
    if (kolom.type === "select") {
      isi = (kolom.options || []).find((o) => norm(o) === norm(nilai));
      if (!isi) return;
    } else if (kolom.type === "number") {
      const raw = String(nilai).toLowerCase().replace(/\./g, "").replace(/,/g, ".");
      const jt = raw.match(/([\d.]+)\s*(jt|juta)/);
      const rb = raw.match(/([\d.]+)\s*(rb|ribu|k)\b/);
      const n = jt ? Math.round(parseFloat(jt[1]) * 1000000) : rb ? Math.round(parseFloat(rb[1]) * 1000) : Number(String(nilai).replace(/[^0-9]/g, ""));
      if (!n) return;
      isi = n;
    } else if (kolom.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return;
    }
    hasil[modul.id] = { ...(hasil[modul.id] || {}), [kolom.key]: isi };
  });
  return hasil;
}
