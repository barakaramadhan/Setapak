// Pemanggil provider AI. Ditaruh di SERVER supaya API key tidak bocok ke browser.
// Urutan fallback diatur di fungsi askAI() di bawah.
// Default: Groq lebih dulu karena cepat & tidak membuang token untuk "berpikir".
// Gemini tetap didukung sebagai cadangan (bisa diatur lewat AI_PROVIDER_ORDER).

const SYSTEM_PROMPT = `Kamu adalah asisten perencana perjalanan SETAPAK.
Jawab singkat, maksimal 120 kata, pakai bahasa yang sama dengan pertanyaan pengguna.
Berikan langkah praktis: nama tempat, perkiraan biaya, dan satu tips.
Jangan mengulang pertanyaan pengguna. Jika tidak tahu datanya, katakan terus terang.`;

// Prompt khusus untuk "For you": AI wajib mengembalikan JSON, bukan teks biasa.
export const RECOMMEND_SYSTEM_PROMPT = `Kamu adalah mesin rekomendasi tempat wisata SETAPAK.
Balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan.
Format persis:
{
  "Coffe And Snacks": [
    { "name": "Nama tempat", "rating": 4.5, "address": "Alamat singkat", "image": "https://contoh.com/foto-tempat.jpg" }
  ],
  "Outdoor parks & Trials": [
    { "name": "Nama tempat", "rating": 4.6, "address": "Alamat singkat", "image": "https://contoh.com/foto-tempat.jpg" }
  ]
}
Isi TEPAT 4 tempat di tiap kategori (jangan kurang). Urutkan dari rating TERTINGGI ke terendah.
Pakai NAMA TEMPAT yang benar-benar ada dan bisa dicari di Google Maps, bukan nama generik atau karangan.
Kalau pesan user mencantumkan daftar nama, pilih HANYA dari daftar itu (jangan mengarang nama lain), salin alamatnya apa adanya, dan ikuti kategori yang tertera (food masuk "Coffe And Snacks", sisanya masuk "Outdoor parks & Trials"). Jangan ulang tempat yang sama di dua kategori.
Sertakan alamat singkat yang sesuai lokasi. rating angka 0-5.
ATURAN FOTO (WAJIB): setiap tempat HARUS punya "image" berupa URL LANGSUNG ke file gambar yang berakhir .jpg / .jpeg / .png / .webp (boleh diikuti ?parameter). Boleh pakai URL gambar dari situs wisata, situs resmi tempat, atau Wikimedia. DILARANG mengosongkan "image", dilarang memakai tautan halaman web/artikel (misalnya URL halaman Google Maps atau halaman blog), dan dilarang mengarang URL yang tidak ada. Kalau ragu, pakai URL gambar dari situs Wikimedia yang paling sesuai dengan tempat itu.
Patuhi batas rating minimal yang disebut di pesan user. Gunakan bahasa yang sama dengan nama kota.`;

// Mode "Searching": mencari informasi yang dibutuhkan orang, masih sebatas trip.
export const SEARCH_SYSTEM_PROMPT = `Kamu adalah asisten SETAPAK yang ahli perjalanan dan wisata.
HANYA jawab hal yang berhubungan dengan trip, perjalanan, destinasi, wisata, transport, akomodasi, kuliner daerah, atau budget perjalanan. Kalau topiknya di luar itu, jawab tepat satu kalimat: "Saya hanya bisa bantu soal perjalanan. Mau cari tempat atau rencana ke mana?" lalu berhenti.
Tampilkan jawaban sebagai teks rapi dan enak dibaca:
- baris pendek, maksimal 140 kata,
- "## Judul" untuk setiap bagian,
- "- " untuk daftar poin,
- **tebal** untuk hal yang penting.
Pakai bahasa yang sama dengan pengguna. Kalau tidak tahu datanya, katakan terus terang.`;

// Mode "Planning": ngobrol santai sambil mengumpulkan info rencana perjalanan.
export const PLAN_SYSTEM_PROMPT = `Kamu adalah teman ngobrol sekaligus perencana perjalanan SETAPAK.
HANYA bahas perjalanan. Topik di luar trip dijawab satu kalimat: "Saya hanya bisa bantu soal perjalanan. Mau ke mana dan kapan?" lalu berhenti.
Tugasmu BUKAN memberi daftar tempat panjang, tapi mengumpulkan info lewat obrolan singkat. Tanyakan SATU hal yang paling kurang: kota/tujuan, tanggal atau durasi, budget, lalu minat (alam/kuliner/budaya/pantai).
Gunakan format teks rapi: baris pendek, "## Judul", "- " untuk daftar, **tebal** untuk penekanan. Maksimal 100 kata dan pakai bahasa yang sama dengan pengguna.
Ketika kamu sudah punya: (1) tujuan, (2) durasi atau tanggal, dan (3) budget ATAU minat, akhiri jawaban dengan satu baris tepat:
<<SIAP>>
Jangan pernah menulis <<SIAP>> sebelum ketiga hal itu jelas.`;

// Dipanggil setelah tombol "Lanjut Buat Plan": AI yang menentukan data yang kurang.
export const PLAN_FIELDS_SYSTEM_PROMPT = `Kamu diminta menentukan data yang MASIH DIBUTUHKAN untuk menyusun rencana perjalanan dari obrolan sebelumnya.
Balas HANYA JSON array valid, tanpa markdown dan tanpa kalimat lain. Format tiap item:
{"key":"city","label":"Kota tujuan","type":"text","placeholder":"mis. Bogor"}
Aturan:
- pilih 3 sampai 5 field yang benar-benar belum jelas,
- jangan minta data yang sudah disebut user,
- "type" hanya boleh: text, number, date, select,
- untuk "select" sertakan "options": ["Pilihan 1", "Pilihan 2"],
- gunakan bahasa yang sama dengan obrolan.`;

// Dipanggil setelah user mengisi field: AI menyusun plan terakhir.
export const CREATE_PLAN_SYSTEM_PROMPT = `Kamu adalah mesin penyusun rencana perjalanan SETAPAK.
Balas HANYA JSON valid, tanpa markdown dan tanpa penjelasan. Format persis:
{
  "city": "Nama kota",
  "days": [
    { "title": "Hari 1", "places": [
      { "name": "Nama tempat nyata", "category": "nature", "cost": 25000, "durationHours": 2, "address": "Alamat singkat" }
    ] }
  ],
  "totalCost": 123000
}
Aturan: 1 sampai 7 hari, maksimal 3 tempat per hari, kategori hanya nature|food|culture|beach|adventure|lainnya, cost angka Rupiah (0 kalau gratis), dan pakai nama tempat yang benar-benar ada.`;

const TIMEOUT_MS = 12000;
// gemini-2.5-flash sudah tidak tersedia untuk akun baru (404).
const MODEL_GEMINI = "gemini-3.8-flash";
const MODEL_GROQ = "openai/gpt-oss-20b";

// Gambar cadangan kalau AI tidak mengirim URL gambar yang sah.
// Dipilih per kategori supaya kartu tetap relevan (makanan vs. alam).
export const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600";
export const DEFAULT_IMAGE_FOOD =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600";
export const DEFAULT_IMAGE_OUTDOOR =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600";

function postJson(url, body, headers) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function toHistory(history) {
  // Gemini memakai role "model", bukan "assistant"/"ai".
  return history.slice(-8).map((item) => ({
    role: item.role === "user" ? "user" : "model",
    parts: [{ text: String(item.text || "").slice(0, 1000) }],
  }));
}

async function askGemini({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const model = env.GEMINI_MODEL || MODEL_GEMINI;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const response = await postJson(url, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...toHistory(history),
      { role: "user", parts: [{ text: message }] },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens, // batas ini yang bikin jawaban tidak "habis-habis"
      temperature: 0.7,
      // Gemini 3.x menghitung token berpikir sebagai bagian dari maxOutputTokens.
      // LOW mencegah jawaban kosong/error MAX_TOKENS pada prompt pendek.
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    },
  });

  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini balasan kosong");
  return text;
}

async function askGroq({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const response = await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: MODEL_GROQ,
      max_tokens: maxTokens,
      temperature: 0.7,
      // gpt-oss menyimpan sebagian besar token untuk "reasoning".
      // Tanpa ini, jawaban JSON bisa habis di reasoning dan content kosong.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: String(item.text || "").slice(0, 1000),
        })),
        { role: "user", content: message },
      ],
    },
    { Authorization: `Bearer ${env.GROQ_API_KEY}` }
  );

  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq balasan kosong");
  return text;
}

async function askOpenRouter({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const model = env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

  const response = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: String(item.text || "").slice(0, 1000),
        })),
        { role: "user", content: message },
      ],
    },
    { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` }
  );

  if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter balasan kosong");
  return text;
}

/**
 * Coba provider satu per satu. Kalau semua gagal / kuota habis, kembalikan null.
 */
export async function askAI({ message, history, env, systemPrompt, maxTokens }) {
  const daftar = {
    gemini: { key: env.GEMINI_API_KEY, call: askGemini },
    groq: { key: env.GROQ_API_KEY, call: askGroq },
    openrouter: { key: env.OPENROUTER_API_KEY, call: askOpenRouter },
  };

  // Urutan bisa diubah dari .env, misalnya AI_PROVIDER_ORDER=gemini,groq,openrouter
  const urutan = String(env.AI_PROVIDER_ORDER || "groq,gemini,openrouter")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => daftar[name]);

  const providers = urutan.map((name) => ({ name, ...daftar[name] }));

  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      const reply = await provider.call({
        message,
        history,
        env,
        systemPrompt,
        maxTokens,
      });
      return { reply, source: provider.name };
    } catch (error) {
      console.warn(`[setapak] ${provider.name} gagal: ${error.message}`);
    }
  }

  return null;
}
