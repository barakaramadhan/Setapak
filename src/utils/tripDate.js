// Util tanggal trip. Semua tanggal disimpan sebagai "YYYY-MM-DD" (lokal),
// bukan UTC, supaya tanggal di kalender tidak bergeser satu hari.

const BULAN = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  mei: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  ags: 8,
  agu: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

const polaBulan = Object.keys(BULAN).join("|");
const pad = (n) => String(n).padStart(2, "0");

export function toDateKey(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key) {
  const [year, month, day] = String(key || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateId(key, { year = true } = {}) {
  const date = fromDateKey(key);
  if (!date) return String(key || "");
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
  }).format(date);
}

function validKey(year, month, day, punyaTahun) {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  // Tanggal lampau dianggap untuk tahun depan, kecuali tahun memang disebut.
  if (!punyaTahun) {
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    if (date < hariIni) date.setFullYear(year + 1);
  }
  return toDateKey(date);
}

/** Baca tanggal dari prompt chat. Mengembalikan "YYYY-MM-DD" atau null. */
export function parseTripDate(text) {
  if (!text) return null;
  const tulisan = String(text).toLowerCase();
  const tahunIni = new Date().getFullYear();
  let cocok;

  // 2026-12-12
  cocok = tulisan.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (cocok) return validKey(+cocok[1], +cocok[2], +cocok[3], true);

  // 12/12/2026, 12/12, 12-12-26
  cocok = tulisan.match(
    new RegExp(`\\b(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b`)
  );
  if (cocok) {
    const tahun = cocok[3]
      ? +cocok[3] < 100
        ? 2000 + +cocok[3]
        : +cocok[3]
      : tahunIni;
    return validKey(tahun, +cocok[2], +cocok[1], Boolean(cocok[3]));
  }

  // 12 desember (2026) / desember 12 (2026)
  cocok = tulisan.match(
    new RegExp(`\\b(\\d{1,2})\\s+(${polaBulan})\\b(?:[,\\s]+(\\d{4}))?`)
  );
  if (cocok) {
    const tahun = cocok[3] ? +cocok[3] : tahunIni;
    return validKey(tahun, BULAN[cocok[2]], +cocok[1], Boolean(cocok[3]));
  }
  cocok = tulisan.match(
    new RegExp(`\\b(${polaBulan})\\s+(\\d{1,2})\\b(?:[,\\s]+(\\d{4}))?`)
  );
  if (cocok) {
    const tahun = cocok[3] ? +cocok[3] : tahunIni;
    return validKey(tahun, BULAN[cocok[1]], +cocok[2], Boolean(cocok[3]));
  }

  // besok / lusa
  if (/\bbesok\b/.test(tulisan) || /\btomorrow\b/.test(tulisan)) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return toDateKey(date);
  }
  if (/\blusa\b/.test(tulisan)) {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return toDateKey(date);
  }

  return null;
}

/** Geser tanggal lokal (bukan UTC) tanpa riskan berubah hari. */
export function addDaysToKey(key, amount) {
  const date = fromDateKey(key);
  if (!date) return key;
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

/** Semua tanggal yang disentuh perjalanan (inklusif), maks. 62 hari. */
export function expandDateRange(start, end) {
  const awal = fromDateKey(start);
  if (!awal) return [];
  const akhir = fromDateKey(end) || awal;
  const hasil = [];
  const cursor = new Date(awal);
  while (cursor <= akhir && hasil.length < 62) {
    hasil.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return hasil;
}

/** "15–20 Des 2026" untuk rentang, atau tanggal biasa kalau satu hari. */
export function formatRangeId(start, end) {
  const awal = fromDateKey(start);
  if (!awal) return String(start || "");
  const akhir = fromDateKey(end) || awal;
  if (toDateKey(akhir) === toDateKey(awal)) return formatDateId(start);

  const hariBulan = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  });
  const tahun =
    awal.getFullYear() === akhir.getFullYear()
      ? ` ${awal.getFullYear()}`
      : ` ${awal.getFullYear()} – ${akhir.getFullYear()}`;
  return `${hariBulan.format(awal)} – ${hariBulan.format(akhir)}${tahun}`;
}

/** "15-20 desember" / "15 s/d 20 desember 2026" → { start, end }. */
export function parseTripDateRange(text) {
  const tulisan = String(text || "").toLowerCase();
  const tahunIni = new Date().getFullYear();
  const cocok = tulisan.match(
    new RegExp(
      `\\b(\\d{1,2})\\s*(?:-|–|—|sampai|s/d|sd|to)\\s*(\\d{1,2})\\s+(${polaBulan})\\b(?:[,\\s]+(\\d{4}))?`
    )
  );
  if (!cocok) return null;

  const tahun = cocok[4] ? +cocok[4] : tahunIni;
  const punyaTahun = Boolean(cocok[4]);
  const start = validKey(tahun, BULAN[cocok[3]], +cocok[1], punyaTahun);
  const end = validKey(tahun, BULAN[cocok[3]], +cocok[2], punyaTahun);
  if (!start || !end) return null;
  return { start, end: end < start ? start : end };
}

function judulDariPrompt(prompt) {
  return String(prompt || "")
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/gi, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ")
    .replace(
      new RegExp(`\\b\\d{1,2}\\s+(${polaBulan})\\b(?:[,\\s]+\\d{4})?`, "gi"),
      " "
    )
    .replace(
      new RegExp(`\\b(${polaBulan})\\s+\\d{1,2}\\b(?:[,\\s]+\\d{4})?`, "gi"),
      " "
    )
    .replace(
      /\b(tolong|bikinin|bikin|buatin|rencanain|rencana|tanggal|pada|ke|dari|trip|liburan|pergi|budget|rb|ribu|hari)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefill form Schedule dari prompt chat + rencana yang sudah dibuat AI. */
export function buildTripPrefill(prompt, plan) {
  const rentang = parseTripDateRange(prompt);
  const date = rentang?.start || parseTripDate(prompt);
  if (!date) return null;
  const endDate = rentang?.end || date;

  const hari = Array.isArray(plan?.days) ? plan.days : [];
  const semuaTempat = hari
    .flatMap((item) => (Array.isArray(item.places) ? item.places : []))
    .map((place) => place.name)
    .filter(Boolean);
  const tempatPertama = semuaTempat[0];
  const potongan = judulDariPrompt(prompt);

  return {
    title: String(
      tempatPertama
        ? `Trip ke ${tempatPertama}`
        : potongan
          ? potongan.charAt(0).toUpperCase() + potongan.slice(1)
          : `Trip ${formatRangeId(date, endDate)}`
    ).slice(0, 100),
    date,
    endDate,
    city: plan?.city || "",
    place: semuaTempat.join(" · ").slice(0, 240),
    notes: "",
    plan: plan || null,
  };
}
