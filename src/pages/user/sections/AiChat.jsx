
import React, { useState, useRef, useEffect } from "react";
import InputAll from "../../../components/ui/InputAll";

const dummyUser = { name: "Fulan" };

const suggestions = [
  "Plan a trip to Japan",
  "Explore hidden gems in Bali",
  "7 days in Europe",
];

// DAFTAR TEMPAT (dummy)
// Kalau pesan user mengandung salah satu nama di bawah, peta akan menampilkan tempat itu
// dan pop up "Looks like you're headed to ..." akan muncul.
// Silakan tambah nama kota lain di sini.
const places = [
  "Jakarta", "Bandung", "Bogor", "Bali", "Yogyakarta", "Surabaya",
  "Malang", "Semarang", "Lombok", "Japan", "Tokyo", "Paris", "London", "Europe",
];

// FUNGSI AI SEMENTARA (dummy)
// NANTI kalau API AI sudah jadi, ganti isi fungsi ini dengan fetch, misalnya:
//   const res = await fetch("/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ message: text }),
//   });
//   const data = await res.json();
//   return data.reply;
async function getAiReply(text) {
  await new Promise((resolve) => setTimeout(resolve, 1200)); // pura-pura loading
  return `Ini jawaban contoh untuk: "${text}". Nanti bagian ini diisi hasil dari AI planning.`;
}

function AiChat() {
  const [messages, setMessages] = useState([]); // { id, role: "user" | "ai", text }
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [destination, setDestination] = useState(""); // tempat tujuan yang terdeteksi, contoh: "Jakarta"
  const [isChatOpen, setIsChatOpen] = useState(true); // true = panel chat terbuka, false = di-minimize
  const bottomRef = useRef(null);

  // otomatis scroll ke pesan terbaru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const clean = text.trim();
    if (!clean || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: clean },
    ]);
    setInput("");
    setIsLoading(true);

    // cari apakah ada nama tempat di pesan user
    const found = places.find((p) => clean.toLowerCase().includes(p.toLowerCase()));
    if (found) setDestination(found);

    const reply = await getAiReply(clean);

    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: "ai", text: reply },
    ]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    // Enter = kirim
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  // alamat peta Google (embed biasa, tidak perlu API key)
  // kalau belum ada tempat terdeteksi, peta menampilkan Indonesia
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    destination || "Indonesia"
  )}&z=11&output=embed`;

  return (
    // pembungkus: chat di kiri, peta di kanan (di tablet/mobile jadi atas-bawah)
    <div className="flex h-screen w-full max-md:flex-col">
      {/* ===== PANEL CHAT ===== */}
      {isChatOpen && (
        <section
          className={`font-jakarta relative flex flex-col px-10 pb-6 max-sm:px-4 ${
            isEmpty
              ? "mx-auto h-screen w-full max-w-4xl" // belum ada chat: tampilan awal
              : "h-screen w-[45%] max-md:h-1/2 max-md:w-full" // sudah ada chat: setengah layar
          }`}
        >
          {/* tombol panah untuk minimize chat (muncul setelah ada chat) */}
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              title="Minimize chat"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full hover:bg-grey-label/15"
            >
              <i className="fi fi-rr-angle-small-left text-2xl leading-none pt-1 text-grey-light"></i>
            </button>
          )}

      {/* area pesan / sapaan awal */}
      <div className="flex-1 overflow-y-auto pt-10">
        {isEmpty ? (
          <div className="flex h-full flex-col justify-center pb-24">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light text-white">
              <i className="fi fi-rr-sparkles leading-none pt-1"></i>
            </span>

            <h1 className="mt-4 text-2xl  font-bold text-grey-light max-sm:text-xl">
              Good morning, {dummyUser.name}! Where are we heading next?
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendMessage(item)}
                  className="rounded-2xl border border-grey-label/80 px-3 py-2 text-sm font-medium text-grey-light hover:bg-grey-label/15"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <p className="max-w-[75%] rounded-2xl rounded-br-sm bg-grey-light px-4 py-3 text-base text-white max-sm:max-w-[90%]">
                    {msg.text}
                  </p>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grey-light text-white">
                    <i className="fi fi-rr-sparkles text-sm leading-none pt-1"></i>
                  </span>
                  <p className="max-w-[75%] rounded-2xl rounded-tl-sm border border-grey-label/50 bg-white px-4 py-3 text-base text-grey-light max-sm:max-w-[90%]">
                    {msg.text}
                  </p>
                </div>
              )
            )}

            {/* indikator "AI sedang mengetik" */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grey-light text-white">
                  <i className="fi fi-rr-sparkles text-sm leading-none pt-1"></i>
                </span>
                <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-grey-label/50 bg-white px-4 py-4">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-grey-label"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-grey-label [animation-delay:150ms]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-grey-label [animation-delay:300ms]"></span>
                </div>
              </div>
            )}

            <div ref={bottomRef}></div>
          </div>
        )}
      </div>

      {/* POP UP: selalu muncul setelah ada chat (sesuai mockup) */}
      {!isEmpty && (
        <div className="mb-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-lg max-sm:flex-col max-sm:items-start">
          <div>
            <h2 className="font-bold text-grey-light">
              {destination
                ? `Looks like you’re headed to ${destination}.`
                : "Looks like you’re planning a trip."}
            </h2>
            <p className="text-sm text-grey-light">
              Create a trip to keep all your travel plans in one place, stash your
              ideas and customize how Setapak helps you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {}} // NANTI: arahkan ke halaman planning
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#D9B573] px-5 py-4 text-base font-medium text-grey-light hover:bg-[#D9B573]/90 max-sm:w-full max-sm:justify-center"
          >
            <i className="fi fi-sr-briefcase-blank leading-none pt-1"></i>
            Creat Planning
          </button>
        </div>
      )}

      {/* kolom input */}
      <div className="relative rounded-2xl bg-grey-light px-3 pb-12 pt-2">
        <InputAll
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Setapak"
          className="w-full border-none text-white placeholder:font-jakarta placeholder:text-white/80 placeholder:text-base placeholder:font-medium focus:border-none focus:ring-0"
        />

        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#83ADD0] text-white disabled:opacity-50"
        >
          <i className="fi fi-rr-arrow-small-up text-xl leading-none pt-1"></i>
        </button>
      </div>
        </section>
      )}

      {/* ===== PANEL PETA (muncul setelah ada chat) ===== */}
      {!isEmpty && (
        <div
          className={`relative flex-1 ${
            // chat ditutup: peta digeser ke kiri 24px supaya masuk ke belakang sidebar (tidak ada celah)
            isChatOpen ? "border-l border-grey-label/50" : "-ml-6"
          }`}
        >
          <iframe
            title="Peta"
            src={mapUrl}
            className="h-full w-full border-0"
            loading="lazy"
          ></iframe>

          {isChatOpen ? (
            // chat terbuka: tombol untuk memperbesar peta (menyembunyikan chat)
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              title="Perbesar peta"
              className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-grey-light text-white shadow-lg hover:bg-grey-light/90"
            >
              <i className="fi fi-rr-expand leading-none pt-1"></i>
            </button>
          ) : (
            // chat ditutup: tombol untuk membuka chat kembali
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              title="Buka chat"
              className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-grey-light px-4 py-2.5 font-jakarta text-sm font-medium text-white shadow-lg hover:bg-grey-light/90"
            >
              <i className="fi fi-rr-comment leading-none pt-1"></i>
              Open chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AiChat;
