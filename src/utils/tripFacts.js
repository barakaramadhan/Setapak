export const LABEL_DESTINASI = {
  makkah: "Makkah", mekah: "Makkah", mekkah: "Makkah", mecca: "Makkah",
  madinah: "Madinah", medina: "Madinah",
  jeddah: "Jeddah", jedda: "Jeddah",
  jepang: "Jepang", japan: "Jepang", singapura: "Singapura", singapore: "Singapura",
  korea: "Korea", thailand: "Thailand", malaysia: "Malaysia", vietnam: "Vietnam",
  turki: "Turki", mesir: "Mesir", palestina: "Palestina",
  amerika: "Amerika", australia: "Australia",
  bogor: "Bogor", yogyakarta: "Yogyakarta", jogja: "Yogyakarta", bandung: "Bandung",
  jakarta: "Jakarta", malang: "Malang", surabaya: "Surabaya", semarang: "Semarang",
  bekasi: "Bekasi", depok: "Depok", tangerang: "Tangerang", solo: "Solo",
  makassar: "Makassar", bali: "Bali", lombok: "Lombok",
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function extractTripDestinations(text) {
  const lower = String(text || "").toLowerCase();
  const found = new Map();

  Object.entries(LABEL_DESTINASI).forEach(([alias, label]) => {
    const match = lower.match(
      new RegExp(`(^|[^a-z])${escapeRegex(alias)}([^a-z]|$)`)
    );
    if (!match) return;

    const position = match.index + match[1].length;
    const previous = found.get(label);
    if (previous === undefined || position < previous) found.set(label, position);
  });

  return [...found.entries()]
    .sort(([, a], [, b]) => a - b)
    .map(([label]) => label);
}

export function extractTripDaysByDestination(text) {
  const lower = String(text || "").toLowerCase();
  const found = new Map();
  const aliases = Object.keys(LABEL_DESTINASI).sort((a, b) => b.length - a.length);

  for (const alias of aliases) {
    const name = escapeRegex(alias);
    const pattern = new RegExp(
      `(?:\\b(\\d{1,2})\\s*(hari|malam|days?|nights?|minggu|weeks?)\\s*(?:(?:di|ke|in|to|at)\\s*)?${name}\\b|\\b${name}\\s*(?:selama\\s*)?(\\d{1,2})\\s*(hari|malam|days?|nights?|minggu|weeks?)\\b)`,
      "gi"
    );
    for (const match of lower.matchAll(pattern)) {
      let days = Number(match[1] || match[3]);
      if (/minggu|week/i.test(match[2] || match[4] || "")) days *= 7;
      if (days < 1 || days > 30) continue;

      const label = LABEL_DESTINASI[alias];
      const previous = found.get(label);
      if (!previous || match.index > previous.index) found.set(label, { days, index: match.index });
    }
  }

  return Object.fromEntries(
    [...found.entries()]
      .sort(([, a], [, b]) => a.index - b.index)
      .map(([label, value]) => [label, value.days])
  );
}

export function extractTripDurations(text) {
  const lower = String(text || "").toLowerCase();
  const daysByDestination = extractTripDaysByDestination(lower);
  const perDestination = Object.values(daysByDestination);
  const match =
    lower.match(/\b(\d{1,2})\s*(hari|malam|days?|nights?|minggu)\b/) ||
    lower.match(/\b(\d{1,2})\s*weeks?\b/);
  let days = perDestination.length
    ? perDestination.reduce((total, value) => total + value, 0)
    : match
      ? Number(match[1])
      : null;

  if (!perDestination.length && days !== null && /minggu|week/.test(match?.[2] || "")) {
    days *= 7;
  }
  if (days === null && /\b(seminggu|sepekan)\b/.test(lower)) days = 7;

  return {
    days: days !== null ? Math.min(30, Math.max(1, days)) : null,
    daysByDestination,
  };
}

export function extractBudgetScope(text) {
  const lower = String(text || "").toLowerCase();
  if (/(?:\/\s*(?:org|orang|person)\b|\bper\s+(?:orang|org|person)\b)/.test(lower)) {
    return "per orang";
  }
  if (/(?:\btotal\b|\buntuk\s+(?:berdua|semua|kami)\b)/.test(lower)) {
    return "total perjalanan";
  }
  return null;
}

/** "tanpa tiket" / "belum termasuk tiket" vs "sudah termasuk tiket pesawat". */
export function extractBudgetTicket(text) {
  const lower = String(text || "").toLowerCase();
  if (/(tanpa|belum\s+termasuk|di\s+luar|diluar|exclude|ga\s+termasuk|gak\s+termasuk|nggak\s+termasuk|tidak\s+termasuk)\s+(tiket|pesawat|ongkos\s+pesawat)/.test(lower)) return "tanpa tiket";
  if (/(sudah\s+termasuk|termasuk|include|plus|beserta|sama)\s+(tiket|pesawat)/.test(lower)) return "termasuk tiket";
  return null;
}
