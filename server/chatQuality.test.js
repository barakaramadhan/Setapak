import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleChatRequest,
  konteksTujuan,
  namaTempatTidakAdaDiPeta,
  rencanaSesuaiPembagian,
} from "./chatHandler.js";
import {
  cariFaktaLokasiFilm,
  jawabanTempatRekreasi,
  perluCekLokasiFilm,
} from "./liveKnowledge.js";
import {
  extractBudgetScope,
  extractTripDestinations,
  extractTripDurations,
} from "../src/utils/tripFacts.js";
import { mapMarkersFromPlan } from "../src/utils/planSummary.js";

test("adds city-specific trip durations and preserves their breakdown", () => {
  const trip = extractTripDurations(
    "Mau ke Mekkah 4 hari, Madinah 3 hari bersama istri"
  );

  assert.equal(trip.days, 7);
  assert.deepEqual(trip.daysByDestination, { Makkah: 4, Madinah: 3 });
});

test("recognizes English duration order and budget per person", () => {
  const trip = extractTripDurations("4 days in Mecca and 3 days in Medina");

  assert.equal(trip.days, 7);
  assert.deepEqual(trip.daysByDestination, { Makkah: 4, Madinah: 3 });
  assert.equal(extractBudgetScope("budget 20jt/org"), "per orang");
});

test("keeps country order and sums Malaysia plus Thailand durations", () => {
  const message =
    "Baraka mau ke malaysia 5 hari bareng istrinya dan 1 anaknya, dan 2 hari ke thailand.";
  const trip = extractTripDurations(message);

  assert.deepEqual(extractTripDestinations(message), ["Malaysia", "Thailand"]);
  assert.equal(trip.days, 7);
  assert.deepEqual(trip.daysByDestination, { Malaysia: 5, Thailand: 2 });
});

test("builds map markers only from locations present in the AI plan", () => {
  const markers = mapMarkersFromPlan({
    days: [
      {
        title: "Hari 1 · Malaysia",
        places: [
          { name: "KLCC", lat: 3.1579, lon: 101.7116, verified: true },
          { name: "Unverified", lat: 3, lon: 101, verified: false },
        ],
      },
      {
        title: "Hari 6 · Thailand",
        places: [
          { name: "Bangkok", lat: 13.7563, lon: 100.5018, verified: true },
          { name: "Missing coordinates", verified: true },
        ],
      },
    ],
  });

  assert.deepEqual(
    markers.map(({ name, day }) => [name, day]),
    [
      ["KLCC", "Hari 1 · Malaysia"],
      ["Bangkok", "Hari 6 · Thailand"],
    ]
  );
});

test("rejects AI plans that omit a destination or use a mismatched place", () => {
  const facts = { daysByDestination: { Malaysia: 1, Thailand: 1 } };
  const lapangan = {
    byId: new Map([
      ["P1", { kota: "Malaysia" }],
      ["P2", { kota: "Thailand" }],
    ]),
  };
  const validPlan = {
    days: [{ places: [{ ref: "P1" }] }, { places: [{ ref: "P2" }] }],
  };
  const wrongDestinationPlan = {
    days: [{ places: [{ ref: "P1" }] }, { places: [{ ref: "P1" }] }],
  };

  assert.equal(rencanaSesuaiPembagian(validPlan, facts, lapangan), true);
  assert.equal(rencanaSesuaiPembagian(wrongDestinationPlan, facts, lapangan), false);
  assert.equal(
    rencanaSesuaiPembagian({ days: [{ places: [{ ref: "P1" }] }] }, facts, lapangan),
    false
  );
});

test("does not invent amusement parks when map data has no verified matches", () => {
  const reply = jawabanTempatRekreasi(
    "Di Madinah ada tempat wisata mirip Dufan?",
    { dests: [{ display: "Madinah" }], places: [] }
  );

  assert.match(reply, /belum menemukan.*bisa diverifikasi/i);
  assert.match(reply, /tidak mau mengarang nama/i);
  assert.doesNotMatch(reply, /Al-Hamad|Madinah Theme Waterpark|Al-Baqi Park/i);
});

test("names only verified theme parks and water parks for recreation queries", () => {
  const reply = jawabanTempatRekreasi("Ada water park seperti Dufan?", {
    dests: [{ display: "Madinah" }],
    places: [
      { name: "Verified Water Park", subjenis: "taman air" },
      { name: "Nearby Zoo", subjenis: "kebun binatang" },
    ],
  });

  assert.match(reply, /Verified Water Park/);
  assert.doesNotMatch(reply, /Nearby Zoo/);
  assert.equal(jawabanTempatRekreasi("Tempat makan enak di Madinah?", null), null);
});

test("flags named place recommendations that are absent from map results", () => {
  const reply = [
    "- **Madinah** — destination.",
    "- **Verified Park** — family activities.",
    "- **Madinah Theme Waterpark** — water slides.",
  ].join("\n");
  const unsupported = namaTempatTidakAdaDiPeta(reply, {
    dests: [{ name: "Madinah" }],
    places: [{ name: "Verified Park" }],
  }, { destinations: ["Madinah"] });

  assert.deepEqual(unsupported, ["Madinah Theme Waterpark"]);
});

test("does not mistake assistant suggestions for the user's destination", () => {
  assert.deepEqual(
    konteksTujuan(
      [
        { role: "user", text: "Saya mau ibadah ke Makkah dan Madinah." },
        { role: "ai", text: "Mau menginap di area mana di USA?" },
      ],
      "",
      { destinations: ["Makkah", "Madinah"] }
    ),
    { key: "makkah", luarNegeri: true }
  );
});

test("asks a worship-focused accommodation question for Makkah and Madinah", async () => {
  const fetchAsli = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        { message: { content: "[]" }, finish_reason: "stop" },
      ],
    }),
  });
  let payload;

  try {
    await handleChatRequest(
      {
        method: "POST",
        body: {
          mode: "planFields",
          message: "Data apa saja yang masih dibutuhkan?",
          history: [
            {
              role: "user",
              text: "Mau ke Mekkah 4 hari dan Madinah 3 hari, fokus ibadah.",
            },
            { role: "ai", text: "Mau menginap di area mana di USA?" },
          ],
          facts: {
            destinations: ["Makkah", "Madinah"],
            days: 7,
            daysByDestination: { Makkah: 4, Madinah: 3 },
            budget: "20 juta",
            budgetScope: "per orang",
            purpose: "ibadah",
            knownKeys: ["kota", "durasi", "budget", "tema"],
            knownModules: ["destination", "dates", "budget", "overview"],
          },
        },
        headers: { "x-forwarded-for": "198.51.100.33" },
        socket: {},
      },
      {
        setHeader() {},
        end(text) {
          payload = JSON.parse(text);
        },
      },
      { GROQ_API_KEY: "test-key", AI_PROVIDER_ORDER: "groq" }
    );

    assert.equal(payload.fields[0].module.id, "accommodation");
    assert.match(payload.fields[0].label, /fokus ibadah/);
    assert.doesNotMatch(payload.fields[0].label, /USA/i);
  } finally {
    globalThis.fetch = fetchAsli;
  }
});

test("detects film-location questions and cites a matching source", async () => {
  const fetchAsli = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("list=search")) {
      return {
        ok: true,
        json: async () => ({
          query: { search: [{ title: "The Conjuring" }] },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        query: {
          pages: {
            1: {
              title: "The Conjuring",
              fullurl: "https://en.wikipedia.org/wiki/The_Conjuring",
              extract:
                "The Conjuring is a 2013 film. Production began in Wilmington, North Carolina, in February 2012.",
            },
          },
        },
      }),
    };
  };

  try {
    const prompt =
      "Film The Conjuring itu dimana ya? Saya mau ke negaranya nih.";
    assert.equal(perluCekLokasiFilm(prompt), true);

    const fact = await cariFaktaLokasiFilm(prompt);
    assert.equal(fact.title, "The Conjuring");
    assert.match(fact.evidence, /Wilmington, North Carolina/);
    assert.equal(fact.url, "https://en.wikipedia.org/wiki/The_Conjuring");
  } finally {
    globalThis.fetch = fetchAsli;
  }
});

test("returns only a sourced film answer and removes invented links", async () => {
  const fetchAsli = globalThis.fetch;
  let promptSent = "";
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    promptSent = body.messages.map((message) => message.content).join("\n");
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "Produksi dimulai di Wilmington, North Carolina. [Maps](https://goo.gl/maps/XYZ)",
            },
            finish_reason: "stop",
          },
        ],
      }),
    };
  };
  let payload;

  try {
    await handleChatRequest(
      {
        method: "POST",
        body: {
          mode: "search",
          message: "Film The Conjuring itu dimana ya? Saya mau ke negaranya nih.",
          history: [],
        },
        headers: { "x-forwarded-for": "198.51.100.31" },
        socket: {},
      },
      {
        setHeader() {},
        end(text) {
          payload = JSON.parse(text);
        },
      },
      { GROQ_API_KEY: "test-key", AI_PROVIDER_ORDER: "groq" }
    );

    assert.match(promptSent, /Pernyataan sumber/);
    assert.match(payload.reply, /Wilmington, North Carolina/);
    assert.match(payload.reply, /en\.wikipedia\.org\/wiki\/The_Conjuring/);
    assert.doesNotMatch(payload.reply, /goo\.gl\/maps\/XYZ/);
  } finally {
    globalThis.fetch = fetchAsli;
  }
});

test("does not repeat an unsupported film location when no source is found", async () => {
  const fetchAsli = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("list=search")) {
      return { ok: true, json: async () => ({ query: { search: [] } }) };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: "Film itu diproduksi di Harrisville, Rhode Island." },
            finish_reason: "stop",
          },
        ],
      }),
    };
  };
  let payload;

  try {
    await handleChatRequest(
      {
        method: "POST",
        body: {
          mode: "search",
          message: "Film UnknownFilmXYZ itu dimana? Saya mau ke negaranya.",
          history: [],
        },
        headers: { "x-forwarded-for": "198.51.100.32" },
        socket: {},
      },
      {
        setHeader() {},
        end(text) {
          payload = JSON.parse(text);
        },
      },
      { GROQ_API_KEY: "test-key", AI_PROVIDER_ORDER: "groq" }
    );

    assert.doesNotMatch(payload.reply, /Harrisville/);
    assert.match(payload.reply, /belum menemukan sumber tepercaya/);
  } finally {
    globalThis.fetch = fetchAsli;
  }
});

