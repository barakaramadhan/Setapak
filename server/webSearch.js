// Pencarian web real-time untuk provider yang TIDAK punya internet bawaan
// (100milionseek, OpenRouter, Ollama). Gemini & Groq memakai tool bawaan mereka
// sendiri (lihat aiProviders.js), jadi file ini hanya cadangan.
//
// - Kalau TAVILY_API_KEY diisi -> pakai Tavily (https://tavily.com, ada free tier).
// - Kalau tidak -> pakai DuckDuckGo HTML TANPA API key (gratis, cukup untuk daftar tempat).
// Hasilnya diselipkan ke prompt sebagai blok "HASIL PENCARIAN WEB".

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export function webSearchAktif(env = {}) {
  return String(env.AI_WEB_SEARCH || "").toLowerCase() !== "off";
}

const teksBersih = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Parser hasil html.duckduckgo.com (dipisah supaya bisa dites tanpa internet). */
export function parseDuckDuckGo(html, maks = 6) {
  const hasil = [];
  const blok = String(html || "").split(/class="result__a"/).slice(1);
  for (const potong of blok) {
    const href = potong.match(/href="([^"]+)"/)?.[1] || "";
    const judul = teksBersih(potong.match(/>([\s\S]*?)<\/a>/)?.[1]);
    const snip = teksBersih(potong.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)?.[1]);
    let url = href.replace(/&amp;/g, "&");
    const uddg = url.match(/[?&]uddg=([^&]+)/)?.[1];
    if (uddg) {
      try {
        url = decodeURIComponent(uddg);
      } catch {
        /* biarkan */
      }
    }
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^https?:\/\//.test(url) || /duckduckgo\.com\/y\.js/.test(url)) continue; // iklan
    if (judul && snip) hasil.push({ title: judul.slice(0, 120), url, snippet: snip.slice(0, 400) });
    if (hasil.length >= maks) break;
  }
  return hasil;
}

async function cariDuckDuckGo(q, maks, timeoutMs, fetchFn) {
  const res = await fetchFn("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; SetapakBot/1.0)",
      "Accept-Language": "id,en;q=0.8",
    },
    body: new URLSearchParams({ q }).toString(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  return parseDuckDuckGo(await res.text(), maks);
}

/** Parser hasil Bing (cadangan kalau DuckDuckGo memblokir/kosong). */
export function parseBing(html, maks = 6) {
  const hasil = [];
  for (const potong of String(html || "").split(/<li class="b_algo"/).slice(1)) {
    let url = (potong.match(/<h2[^>]*><a[^>]*href="([^"]+)"/) || [])[1] || "";
    url = url.replace(/&amp;/g, "&");
    const u = url.match(/[?&]u=a1([A-Za-z0-9_-]+)/)?.[1];
    if (u) {
      try {
        url = Buffer.from(u.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      } catch {
        /* biarkan */
      }
    }
    const judul = teksBersih((potong.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]);
    const snip = teksBersih((potong.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
    if (/^https?:\/\//.test(url) && judul && snip) {
      hasil.push({ title: judul.slice(0, 120), url, snippet: snip.slice(0, 400) });
    }
    if (hasil.length >= maks) break;
  }
  return hasil;
}

async function cariBing(q, maks, timeoutMs, fetchFn) {
  const res = await fetchFn(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=id`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "id,en;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Bing ${res.status}`);
  return parseBing(await res.text(), maks);
}

async function cariTavily(q, key, maks, timeoutMs, fetchFn) {
  const res = await fetchFn("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: q, max_results: maks, search_depth: "basic", include_answer: false }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return (data.results || [])
    .slice(0, maks)
    .map((r) => ({
      title: String(r.title || "").slice(0, 120),
      url: String(r.url || ""),
      snippet: String(r.content || "").replace(/\s+/g, " ").slice(0, 400),
    }))
    .filter((r) => r.url && r.snippet);
}

export async function cariWeb(query, env = {}, { maks = 5, timeoutMs = 7000, fetchFn = fetch } = {}) {
  const q = String(query || "").trim().slice(0, 300);
  if (!q) return null;

  const hit = cache.get(q);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.v;

  try {
    let hasil = [];
    if (env.TAVILY_API_KEY) {
      try {
        hasil = await cariTavily(q, env.TAVILY_API_KEY, maks, timeoutMs, fetchFn);
      } catch (error) {
        console.warn(`[setapak] Tavily gagal: ${error.message}`);
      }
    }
    if (!hasil.length) {
      try {
        hasil = await cariDuckDuckGo(q, maks, timeoutMs, fetchFn);
      } catch (error) {
        console.warn(`[setapak] DuckDuckGo gagal: ${error.message}`);
      }
      if (!hasil.length) console.warn("[setapak] DuckDuckGo kosong/diblokir, coba Bing");
    }
    if (!hasil.length) {
      try {
        hasil = await cariBing(q, maks, timeoutMs, fetchFn);
      } catch (error) {
        console.warn(`[setapak] Bing gagal: ${error.message}`);
      }
    }
    if (!hasil.length) console.warn(`[setapak] cariWeb: semua mesin cari kosong untuk "${q.slice(0, 60)}"`);
    const blok = hasil.length
      ? `\n\n=== HASIL PENCARIAN WEB (real-time) ===\n${hasil
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSumber: ${r.url}`)
          .join("\n\n")}\n=== AKHIR HASIL WEB ===\nGunakan hasil web ini untuk fakta terkini (harga, jadwal, berita, cuaca). Jika tidak relevan, abaikan.`
      : null;
    if (cache.size > 100) cache.clear();
    if (blok) cache.set(q, { t: Date.now(), v: blok }); // hasil kosong tidak di-cache
    return blok;
  } catch (error) {
    console.warn(`[setapak] cariWeb gagal: ${error.message}`);
    return null;
  }
}
