import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InputAll from "../../../components/ui/InputAll";
import {
  askSetapak,
  askPlanFields,
  askCreatePlan,
  saveLastPlan,
} from "../../../api/chat";
import { planTrip } from "../../../api/plannerEngine";
import {
  addDaysToKey,
  buildTripPrefill,
  parseTripDate,
  toDateKey,
} from "../../../utils/tripDate";
import { normalizePlan } from "../../../utils/tripModules";
import { useTrips } from "../../../store/useTrips";
import { useChats } from "../../../store/useChats";

const dummyUser = { name: "Fulan" };

const suggestions = [
  "3 hari di Yogyakarta budget 300rb",
  "Hidden gems di Bogor",
  "5 days in Japan",
];

const FIELD_DARURAT = [
  { key: "city", label: "Kota tujuan", type: "text", placeholder: "mis. Bogor" },
  { key: "date", label: "Tanggal berangkat", type: "date", placeholder: "" },
  { key: "days", label: "Berapa hari", type: "number", placeholder: "3" },
];

function teksInline(text) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((bagian, index) =>
      bagian.startsWith("**") && bagian.endsWith("**") ? (
        <strong key={index} className="font-bold">
          {bagian.slice(2, -2)}
        </strong>
      ) : (
        <span key={index}>{bagian}</span>
      )
    );
}

// Format teks AI tanpa library: judul "## ", daftar "- ", dan **tebal**.
function AiText({ text }) {
  return (
    <div className="text-sm leading-relaxed text-grey-light">
      {String(text || "")
        .split("\n")
        .map((baris, index) => {
          if (!baris.trim()) return <div key={index} className="h-1" />;
          if (baris.startsWith("## "))
            return (
              <p key={index} className="pt-1 font-bold">
                {teksInline(baris.slice(3))}
              </p>
            );
          if (/^\s*-\s+/.test(baris))
            return (
              <div key={index} className="flex gap-2 pl-1">
                <span>•</span>
                <span>{teksInline(baris.replace(/^\s*-\s+/, ""))}</span>
              </div>
            );
          if (/^\s*\d+\.\s+/.test(baris))
            return (
              <div key={index} className="flex gap-2 pl-1">
                <span>{baris.trim().match(/^\d+/)?.[0]}.</span>
                <span>{teksInline(baris.replace(/^\s*\d+\.\s+/, ""))}</span>
              </div>
            );
          return <p key={index}>{teksInline(baris)}</p>;
        })}
    </div>
  );
}

// Peta OpenStreetMap: gratis, tanpa API key, dan detail.
function PetaCard({ places }) {
  const bergambar = places.find((item) => item.embedUrl);
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-grey-label/60 bg-white">
      <div className="flex items-center gap-2 border-b border-grey-label/40 px-3 py-2">
        <i className="fi fi-rr-map-marker text-sm leading-none text-[#6f9abf]"></i>
        <span className="text-[11px] font-semibold text-grey-light">
          Peta lokasi · OpenStreetMap
        </span>
      </div>
      {bergambar && (
        <iframe
          title="Peta lokasi"
          src={bergambar.embedUrl}
          className="h-44 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      <div className="flex flex-wrap gap-2 p-3">
        {places.map((item, index) => (
          <a
            key={index}
            href={item.osmUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#83ADD0] px-2.5 py-1 text-[11px] font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
          >
            {item.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function AiChat() {
  const [mode, setMode] = useState("search"); // "search" = cari info, "plan" = susun rencana
  const [showMap, setShowMap] = useState(false); // peta only di mode Searching
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readyForPlan, setReadyForPlan] = useState(false);
  const [form, setForm] = useState(null); // { fields, values }
  const [formError, setFormError] = useState("");
  const bottomRef = useRef(null);
  const loadingRef = useRef(false); // mencegah double-submit sebelum state sempat update
  const prefillRef = useRef(false); // prompt dari Home/Dashboard hanya diisi sekali
  const location = useLocation();
  const navigate = useNavigate();
  const { trips, addTrip } = useTrips();
  const { activeChat, activeId, togglePin, setChatTrip, appendMessage } =
    useChats();

  // Pesan diambil langsung dari chat aktif, jadi otomatis tersimpan & pulih saat reload.
  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  // Scroll mengikuti halaman (bukan panel tersendiri).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, form]);

  const riwayatObrolan = useCallback(
    () =>
      messages
        .filter((item) => item.role === "user" || item.role === "ai")
        .slice(-8)
        .map(({ role, text }) => ({ role, text })),
    [messages]
  );

  const sendMessage = useCallback(
    async (text) => {
      const clean = text.trim();
      const chatId = activeId;
      if (!clean || !chatId || loadingRef.current) return;

      loadingRef.current = true;
      setIsLoading(true);

      const history = riwayatObrolan();
      await appendMessage(chatId, {
        id: crypto.randomUUID(),
        role: "user",
        text: clean,
      });
      setInput("");

      try {
        const result = await askSetapak(clean, history, { mode, showMap });

        // Tombol "Simpan ke Schedule" tetap seperti sebelumnya untuk obrolan biasa.
        const prefill = mode === "plan" ? null : buildTripPrefill(clean, result.plan);
        if (prefill && result.plan) {
          prefill.plan = normalizePlan(result.plan, prefill);
        }

        if (mode === "plan" && result.ready) setReadyForPlan(true);

        await appendMessage(chatId, {
          id: crypto.randomUUID(),
          role: "ai",
          text: result.reply,
          source: result.source,
          prefill,
          mapPlaces: result.mapPlaces,
        });
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [activeId, appendMessage, mode, showMap, riwayatObrolan]
  );

  // Prompt dari kotak Travel Interests (atau dashboard) diisi ke kolom input,
  // bukan langsung dikirim. User mengganti "[lokasi]" lalu kirim sendiri.
  useEffect(() => {
    const prompt = location.state?.prompt;
    if (!prompt || prefillRef.current) return;
    prefillRef.current = true;
    setInput(prompt);
  }, [location.state]);

  const gantiMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setReadyForPlan(false);
    setForm(null);
    setFormError("");
    if (activeId && messages.length) {
      appendMessage(activeId, {
        id: crypto.randomUUID(),
        role: "system",
        text:
          next === "plan"
            ? "Mode Planning aktif — ayo susun perjalananmu."
            : "Mode Searching aktif — mau cari tahu apa?",
      });
    }
  };

  const handleInput = (e) => {
    const value = e.target.value;
    const perintah = value.trim().toLowerCase();

    // "/" dipakai dari chat mana pun untuk masuk ke Mode Planning.
    if (perintah === "/") {
      gantiMode("plan");
      setInput("");
      return;
    }
    if (perintah === "/search" || perintah === "/cari") {
      gantiMode("search");
      setInput("");
      return;
    }
    setInput(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Tombol muncul setelah obrolan Planning cukup matang. AI yang diminta
  // menyebutkan data apa saja yang kurang lewat askPlanFields().
  const bukaFormPlan = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setFormError("");

    try {
      const { fields } = await askPlanFields(riwayatObrolan());
      const daftar = fields.length ? fields : FIELD_DARURAT;
      setForm({
        fields: daftar,
        values: Object.fromEntries(daftar.map((item) => [item.key, ""])),
      });
      setReadyForPlan(false);
      if (activeId) {
        await appendMessage(activeId, {
          id: crypto.randomUUID(),
          role: "ai",
          source: "sistem",
          text: "Siap! Isi dulu data yang masih kurang supaya rencananya benar-benar pas.",
        });
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const isiField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      values: { ...prev.values, [key]: value },
    }));
  };

  const buatPlan = async () => {
    if (!form || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setFormError("");

    try {
      const history = riwayatObrolan();
      const ringkasanField = Object.entries(form.values)
        .map(([key, value]) => `${key}: ${value || "-"}`)
        .join(", ");
      const obrolan = history.map((item) => `${item.role}: ${item.text}`).join(" | ");
      const ringkasan = `Buat rencana perjalanan. Data terakhir dari user: ${ringkasanField}. Obrolan: ${obrolan}`.slice(
        0,
        2000
      );

      // Mesin lokal dulu (gratis), AI hanya kalau kotanya belum ada di data.
      const lokal = planTrip(ringkasan);
      let plan = lokal.handled ? lokal.plan : null;
      let sumber = lokal.handled ? "engine" : null;
      if (!plan) {
        const hasilAI = await askCreatePlan(ringkasan);
        plan = hasilAI.plan;
        sumber = hasilAI.source;
      }

      if (!plan || !Array.isArray(plan.days) || !plan.days.length) {
        setFormError(
          "AI belum bisa menyusun plan. Tambahkan kota dan durasi, lalu coba lagi ya."
        );
        return;
      }

      const semuanya = `${obrolan} ${ringkasanField}`;
      const cocokHari = semuanya.match(/\b(\d{1,2})\s*hari\b/);
      const hari = Math.min(
        7,
        Math.max(1, Number(form.values.days) || Number(cocokHari?.[1]) || plan.days.length)
      );
      const tanggal =
        form.values.date || parseTripDate(semuanya) || toDateKey(new Date());
      const endDate = addDaysToKey(tanggal, hari - 1);
      const kota = form.values.city || plan.city || "";
      const judul = `Trip ke ${kota || "perjalanan"} · ${hari} hari`;
      const prefill = { title: judul, date: tanggal, endDate, city: kota };

      const hasil = await addTrip({
        title: judul,
        date: tanggal,
        endDate,
        city: kota,
        place: "",
        notes: "",
        plan: normalizePlan(plan, prefill),
      });

      if (hasil.error) {
        setFormError(hasil.error);
        return;
      }

      saveLastPlan(plan);
      setForm(null);
      if (activeId) {
        await appendMessage(activeId, {
          id: crypto.randomUUID(),
          role: "ai",
          source: sumber || "ai",
          text: `Planning selesai! Rencana ${hari} hari${kota ? ` ke ${kota}` : ""} sudah tersimpan. Buka halaman Trip untuk melihat dan mengeditnya.`,
          tripCreated: true,
        });
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <section className="font-jakarta mx-auto w-full max-w-4xl px-10 pb-10 pt-4 max-sm:px-4">
      {/* header chat: judul, toggle peta, tanda trip, dan pin */}
      <div className="flex items-center justify-between gap-2 border-b border-grey-label/40 pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-grey-light">
            {activeChat?.title || "Chat baru"}
          </h2>
          <p className="text-[11px] text-grey-light/50">{messages.length} pesan</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "search" && (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-grey-light/80">
              <input
                type="checkbox"
                checked={showMap}
                onChange={(e) => setShowMap(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#6f9abf]"
              />
              Peta
            </label>
          )}
          <select
            value={activeChat?.tripId || ""}
            onChange={(e) => setChatTrip(activeId, e.target.value || null)}
            title="Tandai chat ini ke perjalanan"
            className="max-w-[130px] rounded-full border border-grey-label/70 bg-white px-2 py-1.5 text-[11px] font-medium text-grey-light"
          >
            <option value="">Tanpa trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            title={activeChat?.pinned ? "Lepaskan pin" : "Pin chat"}
            onClick={() => activeId && togglePin(activeId)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border hover:bg-grey-label/15 ${
              activeChat?.pinned
                ? "border-[#83ADD0] text-[#6f9abf]"
                : "border-grey-label/70 text-grey-light"
            }`}
          >
            <i className="fi fi-rr-pin text-sm leading-none"></i>
          </button>
        </div>
      </div>

      {/* area pesan — scroll mengikuti halaman, bukan panel tersendiri */}
      <div className="pt-6">
        {isEmpty ? (
          <div className="flex h-full flex-col justify-center pb-24">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light text-white">
              <i className="fi fi-rr-sparkles leading-none pt-1"></i>
            </span>

            <h1 className="mt-4 text-2xl font-bold text-grey-light max-sm:text-xl">
              Good morning, {dummyUser.name}! Where are we heading next?
            </h1>

            <p className="mt-2 text-sm text-grey-light/60">
              Saya hanya membahas perjalanan. Ketik <b>/</b> untuk langsung masuk
              ke mode Planning.
            </p>

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
            {messages.map((msg) => {
              if (msg.role === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="rounded-full bg-grey-label/20 px-3 py-1 text-[11px] font-medium text-grey-light/70">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return msg.role === "user" ? (
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
                  <div className="max-w-[75%] max-sm:max-w-[90%]">
                    <div className="rounded-2xl rounded-tl-sm border border-grey-label/50 bg-white px-4 py-3">
                      <AiText text={msg.text} />
                    </div>
                    {msg.source && (
                      <span className="mt-1 block pl-1 text-[11px] text-grey-light/60">
                        {msg.source === "sistem"
                          ? "Sistem"
                          : msg.source === "engine"
                            ? "Setapak Planner"
                            : msg.source === "template" || msg.source === "offline"
                              ? "Mode lokal"
                              : "AI"}
                        {msg.cached ? " · cached" : ""}
                      </span>
                    )}
                    {msg.mapPlaces?.length ? <PetaCard places={msg.mapPlaces} /> : null}
                    {msg.prefill && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/dashboard", {
                            state: { prefillSchedule: msg.prefill },
                          })
                        }
                        className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#83ADD0] px-3 py-1.5 text-xs font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
                      >
                        <i className="fi fi-rr-calendar text-sm leading-none"></i>
                        Simpan ke Schedule · {msg.prefill.date}
                      </button>
                    )}
                    {msg.tripCreated && (
                      <button
                        type="button"
                        onClick={() => navigate("/trip")}
                        className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#83ADD0] px-3 py-1.5 text-xs font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
                      >
                        <i className="fi fi-rr-suitcase text-sm leading-none"></i>
                        Lihat planning
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* tombol ini baru muncul setelah obrolan Planning cukup jelas */}
            {readyForPlan && !form && (
              <div className="flex pl-11">
                <button
                  type="button"
                  onClick={bukaFormPlan}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[#83ADD0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <i className="fi fi-rr-list-check text-sm leading-none"></i>
                  Lanjut buat plan
                </button>
              </div>
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

      {/* form pelengkap: AI yang menentukan field-nya, user yang mengisi */}
      {form && (
        <div className="mb-3 rounded-2xl border border-[#83ADD0]/60 bg-white p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#83ADD0]/15 text-[#6f9abf]">
              <i className="fi fi-rr-list-check text-sm leading-none"></i>
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-grey-light">Lengkapi planningmu</p>
              <p className="text-[11px] text-grey-light/60">
                AI membutuhkan data ini supaya rencananya benar-benar pas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="text-lg leading-none text-grey-light/50 hover:text-grey-light"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {form.fields.map((field) => (
              <label key={field.key} className="block text-xs font-semibold text-grey-light">
                {field.label}
                {field.type === "select" ? (
                  <select
                    value={form.values[field.key] || ""}
                    onChange={(e) => isiField(field.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-grey-label/60 bg-white px-3 py-2 text-sm font-normal text-grey-light"
                  >
                    <option value="">Pilih...</option>
                    {(field.options || []).map((opsi) => (
                      <option key={opsi} value={opsi}>
                        {opsi}
                      </option>
                    ))}
                  </select>
                ) : (
                  <InputAll
                    type={field.type}
                    value={form.values[field.key] || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => isiField(field.key, e.target.value)}
                    className="mt-1 w-full border-grey-label/60 bg-white text-sm"
                  />
                )}
              </label>
            ))}
          </div>

          {formError && <p className="mt-2 text-xs text-red-500">{formError}</p>}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-grey-label/70 px-3 py-1.5 text-xs font-semibold text-grey-light"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={buatPlan}
              disabled={isLoading}
              className="rounded-full bg-grey-light px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Buat planning
            </button>
          </div>
        </div>
      )}

      {/* kolom input — tombol mode ada di samping tombol kirim */}
      <div className="sticky bottom-0 z-10 rounded-2xl bg-grey-light px-3 pb-12 pt-2 shadow-lg">
        <InputAll
          type="text"
          value={input}
          maxLength={500}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={mode === "plan" ? "Ceritakan rencanamu..." : "Ask Setapak"}
          className="w-full border-none text-white placeholder:font-jakarta placeholder:text-white/80 placeholder:text-base placeholder:font-medium focus:border-none focus:ring-0"
        />

        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => gantiMode("search")}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
              mode === "search"
                ? "bg-white text-grey-light"
                : "bg-white/20 text-white/90 hover:bg-white/30"
            }`}
          >
            Searching
          </button>
          <button
            type="button"
            onClick={() => gantiMode("plan")}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
              mode === "plan"
                ? "bg-white text-grey-light"
                : "bg-white/20 text-white/90 hover:bg-white/30"
            }`}
          >
            Planning
          </button>
        </div>

        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="absolute bottom-2.5 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#83ADD0] text-white disabled:opacity-50"
        >
          <i className="fi fi-rr-arrow-small-up text-xl leading-none pt-1"></i>
        </button>
      </div>
    </section>
  );
}

export default AiChat;
