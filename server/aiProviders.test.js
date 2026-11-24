import assert from "node:assert/strict";
import test from "node:test";
import { askAISequential } from "./aiProviders.js";

test("tries the next provider only after the higher-priority provider fails", async () => {
  const fetchAsli = globalThis.fetch;
  const urutanPanggilan = [];
  let lanjutkanGroq;
  const groqTertahan = new Promise((resolve) => {
    lanjutkanGroq = resolve;
  });

  globalThis.fetch = async (url) => {
    if (String(url).includes("api.groq.com")) {
      urutanPanggilan.push("groq");
      await groqTertahan;
      return new Response(JSON.stringify({ error: "limit" }), { status: 429 });
    }

    urutanPanggilan.push("gemini");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const request = askAISequential({
    message: "test",
    history: [],
    env: {
      GROQ_API_KEY: "groq-test",
      GEMINI_API_KEY: "gemini-test",
      AI_PROVIDER_ORDER: "groq,gemini",
    },
    systemPrompt: "test",
    maxTokens: 20,
    batasMs: 20000,
    valid: () => true,
  });

  let hasil;
  try {
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(urutanPanggilan, ["groq"]);
    lanjutkanGroq();
    hasil = await request;
  } finally {
    lanjutkanGroq();
    if (!hasil) await request;
    globalThis.fetch = fetchAsli;
  }

  assert.deepEqual(urutanPanggilan, ["groq", "gemini"]);
  assert.equal(hasil?.source, "gemini");
});
