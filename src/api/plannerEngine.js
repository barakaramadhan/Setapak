
import {
  places,
  placeAreas,
  cityAliases,
  cityLabels,
  categoryLabels,
  searchCityAliases,
} from "../data/plannerData.js";

const MAX_PLACES_PER_DAY = 2;

export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectCity(normalized) {
  for (const [city, aliases] of Object.entries(cityAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) return city;
  }
  return null;
}

export function resolveCity(input) {
  return detectCity(normalizeText(input));
}

const TYPO_KOTA = { makasar: "makassar", ujung: "makassar", jakata: "jakarta", yogya: "yogyakarta", jogjakarta: "yogyakarta" };

export function searchCityKey(input) {
  const clean = TYPO_KOTA[normalizeText(input)] || normalizeText(input);
  return searchCityAliases[clean] || clean || "kota";
}

function extractDays(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/\b(\d{1,2})\s*(?:hari|days?)\b/);
  if (match) return Math.min(Math.max(parseInt(match[1], 10), 1), 7);
  if (/\bweekend\b|\bminggu\b/.test(normalized)) return 2;
  return 1;
}

function extractBudget(text) {
  const clean = String(text || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "");

  const ribu = clean.match(/\b(\d+)\s*(?:rb|ribu|k)\b/);
  if (ribu) return parseInt(ribu[1], 10) * 1000;

  const juta = clean.match(/\b(\d+)\s*(?:juta|jt)\b/);
  if (juta) return parseInt(juta[1], 10) * 1000000;

  const angka = clean.match(/\b(\d{5,9})\b/);
  if (angka) return parseInt(angka[1], 10);

  return null;
}

function detectInterests(normalized) {
  const rules = [
    {
      category: "food",
      words: ["kuliner", "makan", "food", "kopi", "coffee", "cafe", "resto", "gudeg", "snack", "makanan"],
    },
    {
      category: "culture",
      words: ["budaya", "culture", "candi", "sejarah", "museum", "temple", "keraton", "pura", "tradisi"],
    },
    {
      category: "nature",
      words: ["alam", "nature", "outdoor", "hutan", "taman", "gunung", "air terjun", "hidden gems", "hidden", "park", "sawah", "tebing", "pinus", "kebun"],
    },
    {
      category: "beach",
      words: ["pantai", "beach", "laut", "snorkeling", "sunset"],
    },
    {
      category: "adventure",
      words: ["adventure", "petualangan", "cave", "gua", "trek", "hiking", "safari", "penida", "batur"],
    },
  ];

  return rules
    .filter((rule) => rule.words.some((word) => normalized.includes(word)))
    .map((rule) => rule.category);
}

function formatRupiah(value) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(value);
}

function pickPlaces(candidates, budget, maxItems, preserveOrder = false) {
  const sorted = preserveOrder
    ? [...candidates]
    : [...candidates].sort((a, b) => b.rating - a.rating);
  const picked = [];
  let total = 0;

  for (const place of sorted) {
    if (picked.length >= maxItems) break;
    if (budget && total + place.cost > budget) continue;
    picked.push(place);
    total += place.cost;
  }

  if (picked.length === 0) {
    const cheapest = [...sorted].sort((a, b) => a.cost - b.cost).slice(0, maxItems);
    return {
      picked: cheapest,
      total: cheapest.reduce((sum, place) => sum + place.cost, 0),
      overBudget: true,
    };
  }

  return { picked, total, overBudget: false };
}

export function planTrip(message) {
  const normalized = normalizeText(message);
  const city = detectCity(normalized);

  if (!city) return { handled: false, reason: "Kota belum dikenal" };

  let candidates = places.filter((place) => place.city === city);
  if (candidates.length === 0) return { handled: false, reason: "Data kota belum ada" };

  const interests = detectInterests(normalized);
  const matched = interests.length
    ? candidates.filter((place) => interests.includes(place.category))
    : [];

  if (matched.length > 0) {
    const sortedMatched = [...matched].sort((a, b) => b.rating - a.rating);
    const others = candidates
      .filter((place) => !matched.includes(place))
      .sort((a, b) => b.rating - a.rating);
    candidates = [...sortedMatched, ...others];
  }

  const wantHidden = /hidden gems|hidden|tersembunyi/.test(normalized);
  if (wantHidden) {
    candidates = [...candidates].sort((a, b) => {
      const aHidden = a.tags.includes("hidden gems") ? 1 : 0;
      const bHidden = b.tags.includes("hidden gems") ? 1 : 0;
      return bHidden - aHidden || b.rating - a.rating;
    });
  }

  let days = extractDays(message);

  if (matched.length > 0 && matched.length < days * MAX_PLACES_PER_DAY) {
    days = Math.max(1, Math.ceil(matched.length / MAX_PLACES_PER_DAY));
  }

  const budget = extractBudget(message);
  const needed = Math.min(days * MAX_PLACES_PER_DAY, candidates.length);
  const { picked, total, overBudget } = pickPlaces(
    candidates,
    budget,
    needed,
    wantHidden || matched.length > 0
  );

  if (picked.length === 0) return { handled: false, reason: "Tidak ada tempat cocok" };

  const dayPlan = [];
  for (let day = 0; day < days; day++) {
    const items = picked.slice(
      day * MAX_PLACES_PER_DAY,
      (day + 1) * MAX_PLACES_PER_DAY
    );
    if (items.length === 0) break;

    dayPlan.push({
      title: `Hari ${day + 1}`,
      places: items.map((place) => ({
        name: place.name,
        category: place.category,
        cost: place.cost,
        durationHours: place.durationHours,
        address: place.address,
        image: place.image,
      })),
    });
  }

  const lines = [
    `Rencana ${days} hari di ${cityLabels[city]}${budget ? ` · budget ${formatRupiah(budget)}` : ""}`,
    "",
  ];

  dayPlan.forEach((day) => {
    lines.push(`${day.title}:`);
    day.places.forEach((place) => {
      lines.push(
        `- ${place.name} (${categoryLabels[place.category]}, ±${place.durationHours} jam, ${
          place.cost === 0 ? "gratis" : formatRupiah(place.cost)
        })`
      );
    });
    lines.push("");
  });

  lines.push(`Estimasi total: ${formatRupiah(total)}`);
  if (overBudget) {
    lines.push("Catatan: budget terbatas, saya utamakan tempat termurah dulu.");
  }
  lines.push("Tips: cek jam buka dan pesan tiket lebih awal ya.");

  return {
    handled: true,
    reply: lines.join("\n").trim(),
    plan: {
      city,
      days: dayPlan,
      totalCost: total,
      createdAt: new Date().toISOString(),
    },
  };
}

export function mapsLinkFor(name, address = "") {
  const query = [name, address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const toPlaceCard = (place) => ({
  id: place.id,
  name: place.name,
  category: place.category,
  rating: place.rating,
  address: place.address,
  image: place.image,
  mapsUrl: mapsLinkFor(place.name, place.address),
});

export function getRecommendationCandidates(
  mode = "near",
  city = "bogor",
  minRating = 0
) {
  return places
    .filter(
      (place) =>
        place.city === city &&
        (placeAreas[place.id] || "in") === mode &&
        place.rating >= minRating
    )
    .sort((a, b) => b.rating - a.rating)
    .map(toPlaceCard);
}

export function recommendPlaces(mode = "near", city = "bogor", minRating = 0) {
  const candidates = getRecommendationCandidates(mode, city, minRating);

  return {
    "Coffe And Snacks": candidates
      .filter((place) => place.category === "food")
      .slice(0, 4),
    "Outdoor parks & Trials": candidates
      .filter((place) => place.category !== "food")
      .slice(0, 4),
  };
}

export function getAvailableCities() {
  return Object.keys(cityLabels);
}

export { cityLabels };
