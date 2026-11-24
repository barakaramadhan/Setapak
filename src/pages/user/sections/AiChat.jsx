import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { bersihkanSitasi } from "../../../utils/bersihkanSitasi";
import { useLocation, useNavigate } from "react-router-dom";
import InputAll from "../../../components/ui/InputAll";
import {
  askSetapak,
  askPlanFields,
  askCreatePlan,
  saveLastPlan,
  extractTripFacts,
} from "../../../api/chat";
import { planTrip, resolveCity, cityLabels } from "../../../api/plannerEngine";
import MapPane from "../../../components/ui/MapPane";
import { mapMarkersFromPlan, ringkasPlan } from "../../../utils/planSummary";
import { useAuth, displayName } from "../../../store/useAuth";
import {
  addDaysToKey,
  buildTripPrefill,
  parseTripDate,
  parseTripDateRange,
  toDateKey,
} from "../../../utils/tripDate";
import { normalizePlan, terapkanJawabanForm } from "../../../utils/tripModules";
import { useTrips } from "../../../store/useTrips";
import { useChats } from "../../../store/useChats";
import { placeImages } from "../../../data/placeImages";

const FOTO_TERVERIFIKASI = new Set(Object.values(placeImages));
function gambarBolehTampil(url) {
  const s = String(url || "");
  return (
    FOTO_TERVERIFIKASI.has(s) ||
    s.startsWith("https://images.unsplash.com/") ||
    /^https:\/\/[a-z0-9-]+\.(?:googleusercontent|ggpht)\.com\//i.test(s)
  );
}

function salam() {
  const jam = new Date().getHours();
  if (jam < 11) return "Good morning";
  if (jam < 15) return "Good afternoon";
  if (jam < 19) return "Good evening";
  return "Good night";
}

function kotaDariObrolan(pesan) {
  const teksUser = pesan.filter((m) => m.role === "user").map((m) => m.text);
  for (const t of [...teksUser].reverse()) {
    const key = resolveCity(t);
    if (key && cityLabels[key]) return cityLabels[key];
    const m = String(t).match(/\b(?:ke|di|to|in)\s+([A-Za-z][A-Za-z]+(?:\s[A-Za-z]+)?)/i);
    if (m) return m[1].replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "";
}

function tempatPetaTerbaru(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (!Array.isArray(messages[i].mapPlaces)) continue;
    return messages[i].mapPlaces.filter(
      (item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)
    );
  }
  return [];
}

const suggestions = [
  "3 hari di Yogyakarta budget 300rb",
  "Hidden gems di Bogor",
  "5 days in Japan",
];

function teksInline(text) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
    .map((bagian, index) => {
      if (bagian.startsWith("**") && bagian.endsWith("**"))
        return (
          <strong key={index} className="font-bold">
            {bagian.slice(2, -2)}
          </strong>
        );
      if (bagian.startsWith("`") && bagian.endsWith("`"))
        return (
          <code key={index} className="rounded bg-grey-label/25 px-1 py-0.5 text-xs">
            {bagian.slice(1, -1)}
          </code>
        );
      const tautan = bagian.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (tautan)
        return (
          <a
            key={index}
            href={tautan[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#6f9abf] underline"
          >
            {tautan[1]}
          </a>
        );
      if (bagian.startsWith("*") && bagian.endsWith("*") && bagian.length > 2)
        return (
          <em key={index} className="italic">
            {bagian.slice(1, -1)}
          </em>
        );
      return <span key={index}>{bagian}</span>;
    });
}

// Format markdown ringan sesuai aturan .md, tanpa library:
// # / ## / ### / #### = judul bertingkat, - / * = poin, 1. = angka,
// > = kutipan, --- = garis, | ... | = tabel sederhana.
function AiText({ text }) {
  return (
    <div className="text-sm leading-relaxed text-grey-light">
      {String(text || "")
        .split("\n")
        .map((baris, index) => {
          if (!baris.trim()) return <div key={index} className="h-1" />;
          if (/^\s*---+\s*$/.test(baris))
            return <hr key={index} className="my-2 border-grey-label/40" />;

          const judul = baris.match(/^\s*(#{1,6})\s*(.+)$/);
          if (judul) {
            const level = judul[1].length;
            const gaya =
              level === 1
                ? "pt-2 text-lg font-bold"
                : level === 2
                  ? "pt-1.5 text-base font-bold"
                  : level === 3
                    ? "pt-1 text-sm font-bold"
                    : "pt-1 text-xs font-semibold uppercase tracking-wide";
            return (
              <p key={index} className={gaya}>
                {teksInline(judul[2])}
              </p>
            );
          }

          if (/^\s*>\s?/.test(baris))
            return (
              <blockquote
                key={index}
                className="my-1 border-l-2 border-[#83ADD0] pl-2 text-grey-light/80"
              >
                {teksInline(baris.replace(/^\s*>\s?/, ""))}
              </blockquote>
            );

          if (/^\s*\|.*\|\s*$/.test(baris)) {
            const sel = baris.trim().slice(1, -1).split("|").map((s) => s.trim());
            if (sel.every((s) => /^:?-{2,}:?$/.test(s)))
              return <div key={index} className="h-0" />;
            return (
              <div key={index} className="flex flex-wrap gap-x-4 border-b border-grey-label/30 py-0.5 text-xs">
                {sel.map((sel2, i) => (
                  <span key={i} className="min-w-[70px] flex-1">
                    {teksInline(sel2)}
                  </span>
                ))}
              </div>
            );
          }

          if (/^\s*[-*+]\s+/.test(baris))
            return (
              <div key={index} className="flex gap-2 pl-1">
                <span>•</span>
                <span>{teksInline(baris.replace(/^\s*[-*+]\s+/, ""))}</span>
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

// Kartu tempat di dalam chat: foto sesuai nama + tautan.
function TempatCards({ places }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
      {places.map((item, index) => (
        <a
          key={index}
          href={item.link || item.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-2xl border border-grey-label/40 bg-white"
        >
          {gambarBolehTampil(item.image) ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : null}
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-grey-light">{item.name}</p>
            {item.sumber === "google" ? (
              <>
                {Number.isFinite(item.rating) ? (
                  <p className="mt-0.5 text-xs text-grey-light/80">
                    <span className="font-semibold">★ {item.rating.toFixed(1)}</span>
                    {item.ulasan > 0
                      ? ` (${item.ulasan.toLocaleString("id-ID")} ulasan)`
                      : ""}
                    {typeof item.bukaSekarang === "boolean" ? (
                      <span
                        className={`ml-2 font-semibold ${item.bukaSekarang ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {item.bukaSekarang ? "Buka sekarang" : "Tutup"}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {item.address ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-grey-light/70">
                    {item.address}
                  </p>
                ) : null}
              </>
            ) : null}
            <span className="mt-0.5 block text-[11px] font-medium text-[#6f9abf] group-hover:underline">
              <i className="fi fi-rr-marker mr-1 text-[10px] leading-none"></i>
              {item.sumber === "google" ? "Buka di Google Maps" : "Lihat tempat"}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function Avatar({ ai, src }) {
  return ai ? (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grey-light text-white">
      <i className="fi fi-rr-sparkles text-sm leading-none pt-1"></i>
    </span>
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grey-label/40 text-xs font-bold text-grey-light">
      {src}
    </span>
  );
}

// Semua pilihan cepat berasal dari AI (field "options" / baris PILIHAN:).
// Tidak ada contoh hardcoded — supaya trip ke Jepang tidak ditawari Bogor.
function opsiAi(field) {
  return Array.isArray(field?.options) ? field.options : [];
}

function WizardForm({ field, index, total, modules = [], onSubmit, ringkas = false }) {
  const [value, setValue] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const opsi = opsiAi(field);

  const kirim = (teks) => {
    const bersih = String(teks ?? value).trim();
    if (!bersih || terkirim) return;
    setTerkirim(true);
    setValue("");
    onSubmit(bersih);
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#83ADD0]/40 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6f9abf]">
          <i className="fi fi-rr-list-check text-[11px] leading-none"></i>
          {ringkas
            ? "Jawab pertanyaan AI"
            : field?.module?.name
              ? `Modul ${field.module.no} · ${field.module.name}`
              : "Isi untuk lanjut"}
        </span>
        {!ringkas ? (
          <span className="text-[10px] font-semibold text-grey-light/60">
            {index + 1} / {total}
          </span>
        ) : null}
      </div>
      {!ringkas && index === 0 && modules.length > 1 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {modules.map((m, i) => (
            <span
              key={`${m?.id || m?.name || "modul"}-${i}`}
              className="rounded-full bg-grey-label/20 px-2 py-0.5 text-[9px] font-semibold text-grey-light/70"
            >
              {m?.no ? `${m.no}. ` : ""}{m?.name || "Modul"}
            </span>
          ))}
        </div>
      ) : null}
      {!ringkas ? (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-grey-label/25">
          <div
            className="h-full rounded-full bg-[#83ADD0] transition-all"
            style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }}
          />
        </div>
      ) : null}
      {!ringkas && field?.label ? (
        <p className="mb-2 text-sm font-semibold text-grey-light">{field.label}</p>
      ) : null}
      {!ringkas && field?.reason ? (
        <p className="mb-2 text-[11px] text-grey-light/60">
          <span className="font-medium text-[#6f9abf]">Kenapa ditanya:</span> {field.reason}
        </p>
      ) : null}
      {opsi.length ? (
        <div className="flex flex-wrap gap-2">
          {opsi.map((item) => (
            <button
              key={item}
              type="button"
              disabled={terkirim}
              onClick={() => kirim(item)}
              className="rounded-xl border border-[#83ADD0] bg-[#83ADD0]/5 px-3 py-2 text-xs font-semibold text-[#6f9abf] transition-colors hover:bg-[#83ADD0]/15 disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim();
        }}
        className={`flex items-center gap-2 ${opsi.length ? "mt-3 border-t border-grey-label/30 pt-3" : ""}`}
      >
        <InputAll
          type="text"
          value={value}
          maxLength={120}
          disabled={terkirim}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Atau ketik jawabanmu..."
          className="min-w-0 flex-1 !px-2 !py-1.5 text-sm text-grey-light placeholder:text-grey-light/60"
        />
        <button
          type="submit"
          disabled={terkirim || !value.trim()}
          aria-label="Kirim jawaban"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#83ADD0] text-white disabled:opacity-40"
        >
          <i className="fi fi-rr-arrow-small-up text-lg leading-none pt-0.5"></i>
        </button>
      </form>
    </div>
  );
}

function AiChatInner() {
  const [mode, setMode] = useState("search"); // "search" = cari info, "plan" = susun rencana
  const [showMap, setShowMap] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readyForPlan, setReadyForPlan] = useState(false);
  // wiz: pertanyaan satu per satu -> ringkasan -> Create Planning
  const [wiz, setWiz] = useState(null); // { fields, idx, values, stage: "ask" | "summary" }
  const bottomRef = useRef(null);
  const loadingRef = useRef(false);
  const prefillRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trips, addTrip, updateTrip } = useTrips();
  const { chats, activeChat, activeId, togglePin, setChatTrip, appendMessage, renameChat, deleteChat } =
    useChats();
  const [ctxIds, setCtxIds] = useState([]); // chat lain yang dipakai sebagai konteks plan
  const [slashQuery, setSlashQuery] = useState(null); // teks setelah "/" saat memilih chat

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
  const kota = useMemo(() => kotaDariObrolan(messages), [messages]);
  // Profil trip dibaca dari SEMUA pesan user. Fakta ini yang dikirim ke AI
  // supaya kota/durasi/budget/makanan tidak ditanyakan ulang.
  const facts = useMemo(() => extractTripFacts(messages), [messages]);
  const inisial = (displayName(user) || "U").slice(0, 1).toUpperCase();

  // Tempat terakhir yang punya koordinat -> ditampilkan di peta kanan.
  const titikPeta = useMemo(() => tempatPetaTerbaru(messages), [messages]);

  // Scroll mengikuti HALAMAN (window), tidak ada panel yang discroll sendiri.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading, wiz]);

  const riwayatObrolan = useCallback(() => {
    const konteks = ctxIds
      .map((id) => chats.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => ({
        role: "user",
        text: `[Konteks dari chat "${c.title}"] ${c.messages
          .filter((m) => m.role === "user" || m.role === "ai")
          .slice(-6)
          .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
          .join(" | ")}`.slice(0, 900),
      }));
    const sendiri = messages
      .filter((item) => item.role === "user" || item.role === "ai")
      .slice(-6)
      .map(({ role, text }) => ({ role, text }));
    return [...konteks, ...sendiri];
  }, [messages, ctxIds, chats]);

  const kirimAi = useCallback(
    (extra) =>
      appendMessage(activeId, { id: crypto.randomUUID(), role: "ai", source: "sistem", ...extra }),
    [activeId, appendMessage]
  );

  const tanyaField = useCallback(
    (field) =>
      kirimAi({
        text: field.label,
        wizardKey: field.key,
      }),
    [kirimAi]
  );

  // ---------- jawaban wizard ----------
  const jawabWizard = useCallback(
    async (text) => {
      const field = wiz.fields[wiz.idx];
      await appendMessage(activeId, { id: crypto.randomUUID(), role: "user", text });
      setInput("");
      const values = { ...wiz.values, [field.key]: text };
      const next = wiz.idx + 1;
      if (next < wiz.fields.length) {
        setWiz({ ...wiz, idx: next, values });
        await tanyaField(wiz.fields[next]);
      } else {
        setWiz({ ...wiz, values, stage: "summary" });
        await kirimAi({
          text: "Siap, semua yang aku butuhkan sudah lengkap. Cek ringkasannya dulu ya.",
          summary: wiz.fields.map((f) => ({
            label: f.label,
            value: values[f.key] || "-",
            modul: f.module?.name || "",
          })),
        });
      }
    },
    [wiz, activeId, appendMessage, tanyaField, kirimAi]
  );

  const sendMessage = useCallback(
    async (text) => {
      const clean = text.trim();
      const chatId = activeId;
      if (!clean || !chatId || loadingRef.current) return;

      if (wiz?.stage === "ask") return jawabWizard(clean);
      if (wiz?.stage === "summary") {
        await appendMessage(chatId, { id: crypto.randomUUID(), role: "user", text: clean });
        setInput("");
        setWiz({ ...wiz, values: { ...wiz.values, catatan: clean } });
        await kirimAi({ text: "Oke, sudah dicatat. Klik Create Planning kalau sudah siap." });
        return undefined;
      }

      loadingRef.current = true;
      setIsLoading(true);

      const history = riwayatObrolan();
      await appendMessage(chatId, { id: crypto.randomUUID(), role: "user", text: clean });
      setInput("");
      // Judul otomatis dari pesan pertama (masih bisa diganti lewat sidebar).
      if (activeChat?.title === "Chat baru" && !messages.length) {
        {
          // Judul ringkas: ambil klausa pertama, kapital di awal, maks 36 huruf.
          const awal = clean.split(/[,.!?\n]/)[0].trim() || clean;
          const judul = awal.charAt(0).toUpperCase() + awal.slice(1);
          renameChat(chatId, judul.length > 36 ? `${judul.slice(0, 36).trim()}…` : judul);
        }
      }

      try {
        const linkedTrip = activeChat?.tripId ? trips.find((t) => t.id === activeChat.tripId) : null;
        const intentUpdate = /\b(tambah|tambahkan|tambahin|masukkan|masukin|ubah|ganti|hapus|pindah|update|edit|masuk ke itinerary|jadwalin|jadwalkan|mau ke|mau pergi|juga mau|kunjungi|singgah|sertakan)\b/i.test(clean)
          && /\b(hari|day|itinerary|rencana|plan|jadwal|pagi|siang|sore|malam|jam|kraton|candi|museum|pantai|tempat|wisata|makan|hotel|transport|budget)\b/i.test(clean + " " + (linkedTrip?.city || ""));
        if (linkedTrip && mode === "plan" && !wiz && intentUpdate) {
          const currentPlan = normalizePlan(linkedTrip.plan || {}, linkedTrip);
          const daysCount = Math.max(1, (currentPlan.itinerary?.days||[]).length || extractTripFacts(history).days || 1);
          const ringkasanUpdate = [
            `UPDATE rencana trip yang sudah ada.`,
            `Tujuan: ${linkedTrip.city || linkedTrip.title || ""}. Durasi: ${daysCount} hari.`,
            `Tanggal: ${linkedTrip.date || ""} sampai ${linkedTrip.endDate || linkedTrip.date || ""}.`,
            `Permintaan perubahan user: ${clean}`,
            `PLAN SAAT INI (JSON): ${JSON.stringify({ city: linkedTrip.city, days: (currentPlan.itinerary?.days||[]).map((d,i)=>({title:d.title||`Hari ${i+1}`, places:String(d.activities||"").split(",").map(s=>s.trim()).filter(Boolean).map(name=>({name}))})), totalCost: currentPlan.budget?.planned || 0, modules: { transportation: currentPlan.transportation, accommodation: currentPlan.accommodation, food: currentPlan.food, budget: currentPlan.budget, safety: currentPlan.safety } }).slice(0, 3500)}`,
            `Instruksi: kembalikan JSON plan LENGKAP dengan jumlah hari yang sama, terapkan perubahan yang diminta, pertahankan item relevan, jangan hapus data penting lain tanpa alasan.`,
          ].join("\n");
          const hasilUpdate = await askCreatePlan(ringkasanUpdate, { ...extractTripFacts([...history, { role: "user", text: clean }]), days: daysCount });
          if (hasilUpdate?.plan) {
            let planBaru = normalizePlan(hasilUpdate.plan, linkedTrip);
            planBaru = normalizePlan({
              ...currentPlan, ...planBaru,
              dates: { ...currentPlan.dates, ...planBaru.dates, startDate: linkedTrip.date, endDate: linkedTrip.endDate || linkedTrip.date },
              budget: { ...currentPlan.budget, ...planBaru.budget, planned: currentPlan.budget?.planned || planBaru.budget?.planned || 0 },
            }, linkedTrip);
            const up = await updateTrip(linkedTrip.id, { plan: planBaru, city: planBaru.destination?.city || linkedTrip.city, endDate: linkedTrip.endDate || linkedTrip.date });
            if (!up.error) {
              await kirimAi({
                source: hasilUpdate.source || "ai",
                text: `Oke, rencana trip sudah aku perbarui sesuai permintaanmu: "${clean}".\n\n${ringkasPlan(planBaru)}\n\n> *Catatan: Ini hanyalah saran dari AI, periksa kembali kesalahan yang ada, benarkan trip bila perlu, dan selamat menikmati trip ini dengan penuh kebahagiaan!*`,
                tripCreated: true,
                tripId: linkedTrip.id,
                mapPlaces: mapMarkersFromPlan(planBaru),
              });
              return undefined;
            }
          }
        }

        const result = await askSetapak(clean, history, { mode, showMap });
        const prefill = mode === "plan" ? null : buildTripPrefill(clean, result.plan);
        if (prefill && result.plan) prefill.plan = normalizePlan(result.plan, prefill);
        // Minta dibuatkan plan secara eksplisit -> kartu Create Planning langsung muncul.
        const mintaBuatPlan =
          /\b(buat(?:kan|in)?|bikin(?:kan|in)?|susun(?:kan)?|rancang(?:kan)?|create|generate|make)\b[^.\n]{0,40}\b(plan(?:ning)?|rencana|itinerary|jadwal|trip)\b/i.test(clean);
        if (result.handoff || (mode === "plan" && (result.ready || mintaBuatPlan))) setReadyForPlan(true);

        await appendMessage(chatId, {
          id: crypto.randomUUID(),
          role: "ai",
          text: result.reply,
          source: result.source,
          options: result.options,
          prefill,
          mapPlaces: result.mapPlaces,
          grounding: result.grounding,
        });
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
      return undefined;
    },
    [activeId, activeChat, messages.length, renameChat, appendMessage, mode, showMap, riwayatObrolan, wiz, jawabWizard, kirimAi, trips, updateTrip]
  );

  useEffect(() => {
    const prompt = location.state?.prompt;
    if (!prompt || prefillRef.current) return;
    prefillRef.current = true;
    setInput(prompt);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const gantiMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setShowMap(next === "plan"); // Planning: peta tampil; Searching: bisa diaktifkan
    setReadyForPlan(false);
    setWiz(null);
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

  // Hasil pencarian chat saat user mengetik "/nama chat".
  const hasilSlash = useMemo(() => {
    if (slashQuery === null) return [];
    return chats
      .filter((c) => c.id !== activeId && c.messages.length)
      .filter((c) => c.title.toLowerCase().includes(slashQuery))
      .slice(0, 5);
  }, [slashQuery, chats, activeId]);

  const pilihChatKonteks = (id) => {
    setCtxIds((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-2)));
    setInput("");
    setSlashQuery(null);
    gantiMode("plan");
  };

  const handleInput = (e) => {
    const value = e.target.value;
    const perintah = value.trim().toLowerCase();
    if (perintah === "/search" || perintah === "/cari") {
      gantiMode("search");
      setInput("");
      setSlashQuery(null);
      return;
    }
    if (value.startsWith("/")) {
      // "/" -> mode Planning + daftar chat lain; "/bogor" -> filter nama chat.
      if (mode !== "plan") gantiMode("plan");
      setSlashQuery(perintah.slice(1));
    } else {
      setSlashQuery(null);
    }
    setInput(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setSlashQuery(null);
    if (e.key === "Enter") {
      e.preventDefault();
      if (slashQuery !== null) {
        if (hasilSlash[0]) pilihChatKonteks(hasilSlash[0].id);
        return;
      }
      sendMessage(input);
    }
  };

  // Tombol "Create Planning" di kartu: AI menentukan apa yang masih dibutuhkan,
  // lalu bertanya satu per satu di chat.
  const mulaiWizard = async () => {
    if (loadingRef.current || !activeId) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const { fields } = await askPlanFields(riwayatObrolan());
      const daftar = fields.slice(0, 5);
      if (!daftar.length) {
        await kirimAi({ text: "Aku belum bisa menentukan pertanyaan lanjutan. Coba lagi ya." });
        return;
      }
      setReadyForPlan(false);
      setWiz({ fields: daftar, idx: 0, values: {}, stage: "ask" });
      await tanyaField(daftar[0]);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const buatPlan = async () => {
    if (!wiz || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const history = riwayatObrolan();
      const ringkasanField = wiz.fields
        .map((f) => `${f.label}: ${wiz.values[f.key] || "-"}`)
        .join(", ");
      const obrolan = history.map((item) => `${item.role}: ${item.text}`).join(" | ");
      const ringkasan = `Buat rencana perjalanan. Data dari user: ${ringkasanField}. ${wiz.values.catatan ? `Catatan: ${wiz.values.catatan}. ` : ""}Obrolan: ${obrolan}`.slice(0, 2000);

      const lokal = planTrip(ringkasan);
      let plan = lokal.handled ? lokal.plan : null;
      let sumber = lokal.handled ? "engine" : null;
      let pesanGagalPlan = "";
      if (!plan) {
        const hasilAI = await askCreatePlan(ringkasan, facts);
        plan = hasilAI.plan;
        sumber = hasilAI.source;
        pesanGagalPlan = hasilAI.error;
      }

      if (!plan || !Array.isArray(plan.days) || !plan.days.length) {
        await kirimAi({
          text: pesanGagalPlan || "Aku belum bisa menyusun plan. Coba sebutkan kota dan durasinya lagi ya.",
        });
        return;
      }

      const semuanya = `${obrolan} ${ringkasanField}`;
      const rentang = parseTripDateRange(semuanya);
      const cocokHari = semuanya.match(/\b(\d{1,2})\s*(?:hari|days?)\b/);
      const tanggal = rentang?.start || parseTripDate(semuanya) || toDateKey(new Date());
      const hariDariRentang = rentang
        ? Math.round((new Date(rentang.end) - new Date(rentang.start)) / 86400000) + 1
        : 0;
      // Gunakan durasi dari profil trip: rencana 10 hari tidak boleh jadi 7 hari.
      const hari = Math.min(
        14,
        Math.max(1, facts.days || hariDariRentang || Number(cocokHari?.[1]) || (Array.isArray(plan?.days) ? plan.days.length : 1))
      );
      let endDate = rentang?.end || addDaysToKey(tanggal, hari - 1);
      if (plan && Array.isArray(plan.days)) {
        if (plan.days.length > hari) plan = { ...plan, days: plan.days.slice(0, hari) };
        while (plan.days.length < hari) {
          const i = plan.days.length;
          const base = plan.days[i % Math.max(1, plan.days.length)] || { places: [] };
          const used = new Set(plan.days.flatMap(d => (d.places||[]).map(pl=>String(pl.name||"").toLowerCase())));
          const pool = (base.places || []).filter(pl => !used.has(String(pl.name||"").toLowerCase()));
          const picks = (pool.length ? pool : [{ name: "Waktu bebas / eksplorasi sekitar", why: "Nikmati suasana kota dengan santai", startTime: "10:00" }]).slice(0,2);
          plan = { ...plan, days: [...plan.days, {
            title: `Hari ${i + 1}`,
            places: picks.map((pl, j) => ({
              ...pl,
              name: String(pl?.name || "Waktu bebas / eksplorasi sekitar").slice(0, 80),
              why: String(pl?.why || (j===0?"Waktu fleksibel untuk menikmati suasana":"Eksplorasi santai")).slice(0, 100),
              startTime: pl?.startTime || (j===0?"10:00":"14:00"),
            })),
          }] };
        }
      }
      const kotaTrip = plan.city || kota || "";
      const judul = `Trip ke ${kotaTrip || "perjalanan"} · ${hari} hari`;
      const prefill = { title: judul, date: tanggal, endDate, city: kotaTrip };

            let planBaru = terapkanJawabanForm(normalizePlan(plan, prefill), wiz.fields, wiz.values);
      const budgetRaw = String(wiz.values?.budget || wiz.values?.anggaran || facts.budget || "");
      const jt = budgetRaw.match(/([\d.,]+)\s*(jt|juta)/i);
      const rb = budgetRaw.match(/([\d.,]+)\s*(rb|ribu|k)/i);
      let budgetNum = 0;
      if (jt) budgetNum = Math.round(parseFloat(jt[1].replace(",", ".")) * 1000000);
      else if (rb) budgetNum = Math.round(parseFloat(rb[1].replace(",", ".")) * 1000);
      else budgetNum = Number(budgetRaw.replace(/[^0-9]/g, "")) || 0;
      // Normalize dulu, lalu paksa override data penting dari jawaban user/facts.
      planBaru = normalizePlan(planBaru, { date: tanggal, endDate, city: kotaTrip, title: judul });
      if (budgetNum > 0) planBaru.budget = { ...(planBaru.budget || {}), planned: budgetNum, currency: "IDR" };
      planBaru.dates = { ...(planBaru.dates || {}), startDate: tanggal, endDate, nights: Math.max(0, hari - 1) };
      planBaru.overview = { ...(planBaru.overview || {}), name: judul, destination: kotaTrip || planBaru.overview?.destination || "" };
      planBaru.destination = { ...(planBaru.destination || {}), city: kotaTrip || planBaru.destination?.city || "" };
      const transportVal = String(wiz.values?.transport || wiz.values?.transportasi || wiz.values?.transportation || wiz.values?.moda || "").trim();
      if (transportVal && !(planBaru.transportation?.items || []).length) {
        planBaru.transportation = { ...(planBaru.transportation || {}), items: [{ type: "Pergi", mode: transportVal, from: "Kota asal", to: kotaTrip || "Tujuan", depart: "", arrive: "", cost: "", note: "Dari jawaban user" }] };
      }
      const accomVal = String(wiz.values?.akomodasi || wiz.values?.accommodation || wiz.values?.hotel || "").trim();
      if (accomVal && !(planBaru.accommodation?.items || []).length) {
        planBaru.accommodation = { ...(planBaru.accommodation || {}), items: [{ name: accomVal, type: /hotel|villa|guest|hostel|homestay/i.test(accomVal) ? accomVal : "Hotel", area: kotaTrip || "", checkIn: tanggal, checkOut: endDate, cost: "", note: "Preferensi dari user" }] };
      }
      const foodVal = String(wiz.values?.makanan || wiz.values?.food || wiz.values?.kuliner || facts.food || "").trim();
      if (foodVal) {
        const noPref = /tidak ada|tidak|no$/i.test(foodVal);
        if (!(planBaru.food?.items || []).length) {
          planBaru.food = { ...(planBaru.food || {}), items: [{ name: noPref ? "Kuliner lokal rekomendasi" : foodVal, place: kotaTrip || "", meal: "Makan siang", cost: "", note: noPref ? "Tidak ada alergi/preferensi khusus" : "Preferensi dari user" }] };
        }
      }
      const hasil = await addTrip({
        title: judul,
        date: tanggal,
        endDate,
        city: kotaTrip,
        place: "",
        notes: "",
        plan: planBaru,
      });;
      if (hasil.error) {
        await kirimAi({ text: hasil.error });
        return;
      }

      // Tandai chat ini ke trip yang baru dibuat.
      if (hasil.data?.id) await setChatTrip(activeId, hasil.data.id);
      saveLastPlan(plan);
      setWiz(null);
      await kirimAi({
        source: sumber || "ai",
        text: `Planning selesai! Rencana ${hari} hari${kotaTrip ? ` ke ${kotaTrip}` : ""}${facts.occasion ? ` (${facts.occasion})` : ""} sudah tersimpan. Semua detailnya ada di Trip.\n\n${ringkasPlan(plan)}\n\n> *Catatan: Ini hanyalah saran dari AI, periksa kembali kesalahan yang ada, benarkan trip bila perlu, dan selamat menikmati trip ini dengan penuh kebahagiaan!*`.trim(),
        tripCreated: true,
        tripId: hasil.data?.id || null,
        mapPlaces: mapMarkersFromPlan(plan),
      });
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;
  const ringkasanFakta = [
    facts.destinationLabel || kota || null,
    facts.days ? `${facts.days} hari` : null,
    facts.food || null,
  ]
    .filter(Boolean)
    .join(" · ");
  const opsiAktif = wiz?.stage === "ask" ? wiz.fields[wiz.idx] : null;
  const terakhirId = messages[messages.length - 1]?.id;
  const petaTampil = showMap;

  return (
    <section className="font-jakarta flex min-h-screen w-full max-lg:flex-col">
      {/* ================= kolom chat (halaman yang discroll) ================= */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col px-4 pt-4 sm:px-8">
        {/* header: judul, tanda trip, pin */}
        <div className="flex items-center justify-between gap-2 border-b border-grey-label/40 pb-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-grey-light">
              {activeChat?.title || "Chat baru"}
            </h2>
            <p className="text-[11px] text-grey-light/50">
              {messages.length} pesan · {mode === "plan" ? "Planning" : "Searching"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeChat?.tripId || ""}
              onChange={(e) => setChatTrip(activeId, e.target.value || null)}
              title="Tandai chat ini ke perjalanan"
              className="max-w-[140px] rounded-full border border-grey-label/70 bg-white px-2 py-1.5 text-[11px] font-medium text-grey-light"
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
              title={activeChat?.pinned ? "Lepaskan pin" : "Pin chat ini di daftar teratas"}
              onClick={() => activeId && togglePin(activeId)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold hover:bg-grey-label/15 ${
                activeChat?.pinned
                  ? "border-[#83ADD0] bg-[#83ADD0]/10 text-[#6f9abf]"
                  : "border-grey-label/70 text-grey-light"
              }`}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill={activeChat?.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7z" /></svg>
              {activeChat?.pinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              title="Hapus chat ini"
              onClick={() => {
                if (activeId && window.confirm("Hapus chat ini?")) deleteChat(activeId);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
              Hapus
            </button>
          </div>
        </div>

        {/* pesan */}
        <div className="flex-1 pt-6">
          {isEmpty ? (
            <div className="flex flex-col pb-24 pt-10">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light text-white">
                <i className="fi fi-rr-sparkles leading-none pt-1"></i>
              </span>
              <h1 className="mt-4 text-2xl font-bold text-grey-light max-sm:text-xl">
                {salam()}, {displayName(user)}! Where are we heading next?
              </h1>
              <p className="mt-2 text-sm text-grey-light/60">
                Boleh ngobrol apa dulu juga. Kalau mau disusun jadi rencana, ketik <b>/</b> atau pilih mode Planning.
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
            <div className="flex flex-col gap-5 pb-4">
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
                const ai = msg.role !== "user";
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar ai={ai} src={inisial} />
                    <div className="min-w-0 flex-1 pt-1">
                      {ai ? <AiText text={bersihkanSitasi(msg.text)} /> : <p className="text-sm text-grey-light">{msg.text}</p>}

                      {msg.wizardKey && msg.id === terakhirId && opsiAktif ? (
                        <WizardForm
                          field={opsiAktif}
                          index={wiz.idx}
                          total={wiz.fields.length}
                          modules={wiz.fields.map((f) => f.module).filter(Boolean)}
                          onSubmit={jawabWizard}
                        />
                      ) : null}

                      {ai &&
                      msg.id === terakhirId &&
                      !wiz &&
                      !isLoading &&
                      Array.isArray(msg.options) &&
                      msg.options.length ? (
                        <WizardForm
                          ringkas
                          field={{ options: msg.options }}
                          onSubmit={sendMessage}
                        />
                      ) : null}

                      {msg.summary ? (
                        <div className="mt-3 rounded-2xl border border-grey-label/40 bg-white p-4 shadow-sm">
                          <p className="text-sm font-bold text-grey-light">Trip summary</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                            {msg.summary.map((row) => (
                              <div key={row.label} className="rounded-xl border border-grey-label/50 px-3 py-2">
                                {row.modul ? (
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#6f9abf]">
                                    {row.modul}
                                  </p>
                                ) : null}
                                <p className="text-[10px] text-grey-light/60">{row.label}</p>
                                <p className="text-sm font-semibold text-grey-light">{row.value}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-grey-light/60">
                            Want to change something? Just tell Setapak.
                          </p>
                          {wiz?.stage === "summary" ? (
                            <button
                              type="button"
                              onClick={buatPlan}
                              disabled={isLoading}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-grey-light px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <i className="fi fi-rr-briefcase-blank text-sm leading-none"></i>
                              Create Planning
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {ai && msg.source && msg.source !== "sistem" && (
                        <span className="mt-1 block text-[11px] text-grey-light/50">
                          {msg.source === "engine"
                            ? "Setapak Planner"
                            : msg.source === "template" || msg.source === "offline"
                              ? "Mode lokal"
                              : "AI"}
                          {msg.cached ? " · cached" : ""}
                          {msg.grounding?.tempat ? ` · peta nyata (${msg.grounding.tempat} tempat)` : ""}
                        </span>
                      )}
                      {msg.mapPlaces?.length ? <TempatCards places={msg.mapPlaces} /> : null}
                      {msg.prefill && (
                        <button
                          type="button"
                          onClick={() => navigate("/dashboard", { state: { prefillSchedule: msg.prefill } })}
                          className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#83ADD0] px-3 py-1.5 text-xs font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
                        >
                          <i className="fi fi-rr-calendar text-sm leading-none"></i>
                          Simpan ke Schedule · {msg.prefill.date}
                        </button>
                      )}
                      {msg.tripCreated && (
                        <button
                          type="button"
                          onClick={() => navigate(msg.tripId || activeChat?.tripId ? `/trip/${msg.tripId || activeChat.tripId}` : "/trip")}
                          className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#83ADD0] px-3 py-1.5 text-xs font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
                        >
                          <i className="fi fi-rr-briefcase-blank text-sm leading-none"></i>
                          Buka di Trip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* kartu: muncul hanya di mode Planning saat obrolan sudah matang */}
              {readyForPlan && !wiz && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-grey-label/30 bg-white p-4 shadow-md">
                  <div>
                    <p className="text-sm font-bold text-grey-light">
                      {ringkasanFakta
                        ? `Siap lanjut: ${ringkasanFakta}.`
                        : `Looks like you’re headed to ${kota || "your destination"}.`}
                    </p>
                    <p className="text-xs text-grey-light/70">
                      Create a trip to keep all your travel plans in one place, stash your ideas and customize how Setapak helps you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={mulaiWizard}
                    disabled={isLoading}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-light-brown-new px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <i className="fi fi-sr-briefcase-blank text-sm leading-none"></i>
                    Create Planning
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar ai />
                  <div className="flex items-center gap-2 pt-2 text-sm text-grey-label">
                    <span>{mode === "search" ? "Sedang mencari jawaban..." : "Sedang menyusun rencana..."}</span>
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-label"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-label [animation-delay:150ms]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-label [animation-delay:300ms]"></span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef}></div>
            </div>
          )}
        </div>

        {/* kolom input: tombol Searching/Planning di samping tombol kirim */}
        <div className="sticky bottom-0 z-10 bg-bright-white pb-2 pt-2">
          {slashQuery !== null && (
            <div className="mb-2 overflow-hidden rounded-2xl border border-grey-label/40 bg-white shadow-lg">
              <p className="px-4 pt-2 text-[11px] font-semibold text-grey-light/60">
                Pakai chat lain sebagai konteks plan
              </p>
              {hasilSlash.length ? (
                hasilSlash.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pilihChatKonteks(c.id)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-grey-light hover:bg-grey-label/15"
                  >
                    <i className="fi fi-rr-comment text-xs leading-none text-grey-light/50"></i>
                    <span className="truncate">/{c.title}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 pb-3 pt-1 text-sm text-grey-light/60">Tidak ada chat yang cocok.</p>
              )}
            </div>
          )}
          {ctxIds.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {ctxIds.map((id) => {
                const c = chats.find((x) => x.id === id);
                return c ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#83ADD0]/15 px-3 py-1 text-[11px] font-semibold text-[#6f9abf]">
                    /{c.title}
                    <button type="button" aria-label="Lepas konteks" onClick={() => setCtxIds((p) => p.filter((i) => i !== id))}>×</button>
                  </span>
                ) : null;
              })}
            </div>
          )}
          <div className="rounded-2xl bg-grey-light px-4 pb-3 pt-2 shadow-lg">
            <InputAll
              type="text"
              value={input}
              maxLength={500}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                wiz?.stage === "ask"
                  ? "Ketik jawabanmu..."
                  : mode === "plan"
                    ? "Ceritakan rencanamu..."
                    : "Ask Setapak"
              }
              className="w-full !px-0 border-none text-white placeholder:font-jakarta placeholder:text-white/80 placeholder:text-base placeholder:font-medium focus:border-none focus:ring-0"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                title="Tampilkan / sembunyikan peta"
                onClick={() => setShowMap((v) => !v)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  showMap ? "bg-white text-grey-light" : "bg-white/20 text-white/90 hover:bg-white/30"
                }`}
              >
                <i className="fi fi-rr-map-marker leading-none pt-0.5"></i>
              </button>
              {[
                ["search", "Searching", "fi-rr-search"],
                ["plan", "Planning", "fi-rr-briefcase-blank"],
              ].map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => gantiMode(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    mode === key
                      ? "bg-white text-grey-light"
                      : "bg-white/20 text-white/90 hover:bg-white/30"
                  }`}
                >
                  <i className={`fi ${icon} text-xs leading-none`}></i>
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                aria-label="Kirim"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#83ADD0] text-white disabled:opacity-50"
              >
                <i className="fi fi-rr-arrow-small-up text-xl leading-none pt-1"></i>
              </button>
            </div>
          </div>
          <p className="pt-1 text-center text-[11px] text-grey-label">
            Semua ini dari AI, harap diperiksa dan diperbaiki.
          </p>
        </div>
      </div>

      {/* ================= peta (menempel di kanan, gratis & detail) ================= */}
      {petaTampil && (
        <aside className="border-l border-grey-label/30 lg:sticky lg:top-0 lg:h-screen lg:w-[46%] lg:shrink-0 max-lg:order-first max-lg:h-56 max-lg:w-full">
          <MapPane places={titikPeta} className="h-full w-full" />
        </aside>
      )}
    </section>
  );
}

// key = id chat: pindah chat -> state wizard/konteks/mode ikut bersih.
function AiChat() {
  const { activeId } = useChats();
  return <AiChatInner key={activeId || "none"} />;
}

export default AiChat;
