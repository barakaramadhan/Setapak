import assert from "node:assert/strict";
import { test } from "node:test";
import { cariWeb, parseDuckDuckGo } from "./webSearch.js";

const HTML = `
<div class="result"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.booking.com%2Fhotel%2Fsa%2Fx.html&amp;rut=abc">Hotel <b>Murah</b> Makkah</a>
<a class="result__snippet" href="//x">Hotel 1 bintang di Makkah mulai SAR 90 &amp; sarapan.</a></div>
<div class="result"><a class="result__a" href="//duckduckgo.com/y.js?ad_provider=bing">Iklan</a><a class="result__snippet">iklan</a></div>
<div class="result"><a class="result__a" href="https://example.com/jeddah">Jeddah budget hotels</a><a class="result__snippet">Daftar hotel hemat Jeddah.</a></div>`;

test("parseDuckDuckGo membaca judul/url/snippet dan membuang iklan", () => {
  const r = parseDuckDuckGo(HTML);
  assert.equal(r.length, 2);
  assert.equal(r[0].url, "https://www.booking.com/hotel/sa/x.html");
  assert.equal(r[0].title, "Hotel Murah Makkah");
  assert.match(r[0].snippet, /SAR 90 & sarapan/);
});

test("cariWeb tanpa API key memakai DuckDuckGo", async () => {
  let dipanggil = "";
  const blok = await cariWeb("hotel bintang 1 arab saudi", {}, {
    fetchFn: async (url) => {
      dipanggil = String(url);
      return new Response(HTML);
    },
  });
  assert.match(dipanggil, /duckduckgo/);
  assert.match(blok, /HASIL PENCARIAN WEB/);
  assert.match(blok, /booking\.com/);
});

import { parseBing } from "./webSearch.js";
import { lapanganRelevan } from "./chatHandler.js";
import { askAI } from "./aiProviders.js";

test("parseBing membaca hasil dan men-decode tautan redirect", () => {
  const u = Buffer.from("https://www.booking.com/x").toString("base64").replace(/=+$/, "");
  const html = `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?!&amp;u=a1${u}&amp;ntb=1">Hotel Murah</a></h2><div class="b_caption"><p>Hotel 1 bintang SAR 90</p></div></li>`;
  const r = parseBing(html);
  assert.equal(r.length, 1);
  assert.equal(r[0].url, "https://www.booking.com/x");
});

test("data peta berisi masjid & jalan dianggap TIDAK relevan untuk pertanyaan hotel", () => {
  const masjid = { places: [{ name: "Masjid Uglat", jenis: "ibadah" }, { name: "Jalan X", jenis: "wisata" }] };
  assert.equal(lapanganRelevan("5 hotel bintang 1 di arab saudi", masjid), false);
  assert.equal(lapanganRelevan("5 hotel bintang 1", { places: [{ name: "Hotel A", jenis: "penginapan" }] }), true);
  assert.equal(lapanganRelevan("masjid terdekat", masjid), true);
  assert.equal(lapanganRelevan("hotel", null), false);
});

test("429 dari satu provider tidak diulang dan langsung pindah ke provider berikutnya", async () => {
  const fetchAsli = globalThis.fetch;
  const hit = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    hit.push(u.split("/")[2]);
    if (u.includes("groq")) return new Response("{}", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok dari hms" }, finish_reason: "stop" }] }));
  };
  try {
    const r = await askAI({
      message: "halo",
      history: [],
      env: { GROQ_API_KEY: "k", HUNDREDMILLIONSEEK_API_KEY: "k", AI_PROVIDER_ORDER: "groq,100milionseek" },
    });
    assert.equal(r.source, "100milionseek");
    assert.equal(hit.filter((h) => h.includes("groq")).length, 1);
  } finally {
    globalThis.fetch = fetchAsli;
  }
});
