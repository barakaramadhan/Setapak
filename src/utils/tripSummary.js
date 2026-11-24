import { addDaysToKey, formatDateId, formatRangeId } from "./tripDate.js";
import {
  durasiHari,
  ensureUniversalPlan,
  formatRupiah,
  getItinerary,
  tebakKategori,
  tiketPesawat,
  BUDGET_TANPA_TIKET,
  BUDGET_DENGAN_TIKET,
} from "./tripModules.js";

const WARNA = {
  wisata: { label: "Wisata", bg: "#D9EBD6", fg: "#1F4A1B" },
  kuliner: { label: "Kuliner", bg: "#F4DCD3", fg: "#6B2A14" },
  penginapan: { label: "Penginapan", bg: "#DCE8F4", fg: "#1F3F66" },
  hiburan: { label: "Hiburan", bg: "#E6DDF3", fg: "#3F2A66" },
  petualangan: { label: "Petualangan", bg: "#F6E3C8", fg: "#6B3E0B" },
  budaya: { label: "Budaya", bg: "#EDE3D0", fg: "#5A4416" },
  belanja: { label: "Belanja", bg: "#F5D9E4", fg: "#6B1F40" },
  lainnya: { label: "Lainnya", bg: "#E8E8E8", fg: "#3A3A3A" },
};

export function kategoriInfo(kategori, nama = "") {
  const kunciKat = String(kategori || "").trim().toLowerCase();
  if (WARNA[kunciKat]) return WARNA[kunciKat];
  return WARNA[tebakKategori(kategori, nama).toLowerCase()] || WARNA.lainnya;
}

const pad = (n) => String(n).padStart(2, "0");
const kunci = (teks) => String(teks || "").trim().toLowerCase();

export function ambilHari(trip) {
  if (Array.isArray(trip.plan?.days) && trip.plan.days.length) {
    return trip.plan.days.map((h, i) => ({
      title: h.title || `Hari ${i + 1}`,
      places: (h.places || []).filter(Boolean),
    }));
  }
  return getItinerary(trip).map((h, i) => ({
    title: h.title || `Hari ${i + 1}`,
    places: (h.places || []).filter((p) => p?.name),
  }));
}

function beriJam(places) {
  let menit = 10 * 60;
  return places.map((p) => {
    const jam = /^\d{1,2}:\d{2}$/.test(p.startTime || "")
      ? p.startTime.padStart(5, "0")
      : `${pad(Math.floor(menit / 60) % 24)}:${pad(menit % 60)}`;
    const [h, m] = jam.split(":").map(Number);
    menit = h * 60 + m + Math.round((Number(p.durationHours) || 2) * 60) + 30;
    return jam;
  });
}

export function buildTripSummary(trip) {
  const plan = ensureUniversalPlan(trip);
  const aktivitas = Array.isArray(plan.activities?.items) ? plan.activities.items : [];
  const peta = new Map(aktivitas.map((a) => [kunci(a.name), a]));
  const dipakaiNama = new Set();

  const hari = ambilHari(trip).map((h, di) => {
    const jam = beriJam(h.places);
    const items = h.places.map((p, pi) => {
      const act = peta.get(kunci(p.name));
      dipakaiNama.add(kunci(p.name));
      const biayaForm = act && act.cost !== "" && act.cost != null ? Number(act.cost) : null;
      const cost = biayaForm != null && !Number.isNaN(biayaForm) ? biayaForm : Number(p.cost) || 0;
      const meta = [
        p.durationHours ? `${p.durationHours} ${p.durationHours > 1 ? "hrs" : "hr"}` : "",
        cost > 0 ? `Est. ${formatRupiah(cost)}` : p.durationHours ? "Free" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        index: pi,
        time: jam[pi],
        name: p.name,
        category: kategoriInfo(act?.category || p.category, p.name),
        cost,
        meta,
        address: act?.place || p.address || "",
        mapsUrl: p.mapsUrl || "",
        note: act?.note || p.why || p.note || "",
      };
    });
    return {
      index: di,
      dateLabel: trip.date ? formatDateId(addDaysToKey(trip.date, di)) : "",
      title: h.title,
      shortTitle: /^hari\s*\d+$/i.test(String(h.title).trim()) ? "" : h.title,
      items,
      cost: items.reduce((s, it) => s + it.cost, 0),
    };
  });

  const belumDijadwalkan = aktivitas
    .filter((a) => a?.name && !dipakaiNama.has(kunci(a.name)))
    .map((a) => ({
      name: a.name,
      place: a.place || "",
      day: a.day || "",
      category: kategoriInfo(a.category, a.name),
      cost: Number(a.cost) || 0,
      note: a.note || "",
    }));

  const semuaBiaya = [
    ...hari.flatMap((h) => h.items.map((it) => ({ cat: it.category.label, cost: it.cost }))),
    ...belumDijadwalkan.map((it) => ({ cat: it.category.label, cost: it.cost })),
  ];
  const lingkup = plan.budget?.scope || "";
  const tiket = (plan.transportation?.items || [])
    .filter(tiketPesawat)
    .reduce((s, it) => s + (Number(it.cost) || 0), 0);
  if (lingkup === BUDGET_DENGAN_TIKET && tiket > 0) semuaBiaya.push({ cat: "Tiket pesawat", cost: tiket });
  const used = semuaBiaya.reduce((s, x) => s + x.cost, 0);
  const planned = Number(plan.budget?.planned || trip.plan?.totalCost || 0);

  const perKategori = new Map();
  semuaBiaya.forEach((x) => {
    if (x.cost > 0) perKategori.set(x.cat, (perKategori.get(x.cat) || 0) + x.cost);
  });
  let rows = [...perKategori].map(([label, amount]) => ({ label, amount }));
  if (!rows.length) {
    rows = (plan.budget?.items || [])
      .filter((it) => Number(it.amount) > 0)
      .slice(0, 8)
      .map((it) => ({ label: it.label || it.category, amount: Number(it.amount) }));
  }

  const kota = trip.city || plan.destination?.city || trip.plan?.city || "";
  const lama = durasiHari(trip.date, trip.endDate) || hari.length || 0;
  const jumlahTempat = hari.reduce((s, h) => s + h.items.length, 0) + belumDijadwalkan.length;
  const total = used || rows.reduce((s, r) => s + r.amount, 0);

  const tags = [
    kota,
    trip.travelers ? `${trip.travelers} Travelers` : "",
    lama ? `${lama} days` : "",
    planned ? formatRupiah(planned) : "",
  ].filter(Boolean);

  return {
    id: trip.id,
    title: trip.title || "Trip",
    subtitle: `${lama ? `A ${lama}-day journey` : "A journey"}${kota ? ` to discover the best of ${kota}.` : "."}`,
    kota,
    tags,
    days: lama,
    dateLabel: trip.date ? formatRangeId(trip.date, trip.endDate) : "Date not set",
    hari,
    belumDijadwalkan,
    jumlahTempat,
    budget: {
      planned,
      scope: lingkup,
      scopeLabel: lingkup ? `Budget: ${lingkup.toLowerCase()}` : "",
      tiketTerpisah: lingkup === BUDGET_TANPA_TIKET ? tiket : 0,
      used: total,
      left: Math.max(planned - total, 0),
      percent: planned > 0 ? Math.min((total / planned) * 100, 100) : 0,
      rows,
    },
  };
}
