
import React, { useState, useRef, useEffect } from "react";
import InputAll from "../../../components/ui/InputAll";
import OutlineButton from "../../../components/ui/OutlineButton";

const dummyUser = { name: "Fulan" };

const suggestions = [
  "Plan a trip to Japan",
  "Explore hidden gems in Bali",
  "7 days in Europe",
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

  return (
    <section className="font-jakarta mx-auto flex h-screen w-full max-w-4xl flex-col px-10 pb-6 max-sm:px-4 bg-bright-white">
      {/* area pesan / sapaan awal */}
      <div className="flex-1 overflow-y-auto pt-10">
        {isEmpty ? (
          <div className="flex h-full flex-col justify-center pb-24">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light text-white">
              <i className="fi fi-rr-sparkles leading-[70%]"></i>
            </span>

            <h1 className="mt-4 text-2xl  font-bold text-grey-light max-sm:text-xl">
              Good morning, {dummyUser.name}! Where are we heading next?
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <OutlineButton
                  key={item}
                  title={item}
                  onClick={() => sendMessage(item)}
                  className="rounded-2xl border-grey-label/80 px-3 py-2 text-sm font-medium text-grey-light hover:bg-grey-label/15"
                />
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
                    <i className="fi fi-rr-sparkles text-sm leading-[70%]"></i>
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
                  <i className="fi fi-rr-sparkles text-sm leading-[70%]"></i>
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
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-arctic-blue text-white disabled:opacity-50"
        >
          <i className="fi fi-rr-arrow-small-up text-xl leading-[70%]"></i>
        </button>
      </div>
    </section>
  );
}

export default AiChat;
