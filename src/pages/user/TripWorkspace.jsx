import { useState } from "react";
import { Link } from "react-router-dom";
import { useTrips } from "../../store/useTrips";
import { askCreatePlan } from "../../api/chat";
import { formatRangeId } from "../../utils/tripDate";
import {
  MODULES,
  durasiHari,
  ensureUniversalPlan,
  formatRupiah,
  modulTerisi,
  normalizePlan,
  progresModul,
  ringkasanBagian,
} from "../../utils/tripModules";
import ModuleEditor from "./sections/ModuleEditor";
import TripModal from "./sections/TripModal";

const daftarAktivitas = (teks) =>
  String(teks || "")
    .split(/[,;\n•]/)
    .map((bagian) => bagian.trim())
    .filter(Boolean);

// Workspace 15 modul untuk satu perjalanan. Semua modul memakai satu store
// trip yang sama dengan kalender & Schedule, jadi perubahan langsung tampil
// di seluruh aplikasi.
export default function TripWorkspace({ trip }) {
  const { updateTrip } = useTrips();
  const [aktif, setAktif] = useState("overview");
  const [versi, setVersi] = useState(0);
  const [editTrip, setEditTrip] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPesan, setAiPesan] = useState("");

  const modulAktif = MODULES.find((modul) => modul.id === aktif) || MODULES[0];
  const plan = ensureUniversalPlan(trip);
  const progres = progresModul(trip);
  const persen = Math.round((progres / MODULES.length) * 100);
  const durasi = durasiHari(trip.date, trip.endDate) || 1;

  const simpanModul = async (moduleId, draft) => {
    const modul = MODULES.find((item) => item.id === moduleId);
    const planBaru = { ...plan, [moduleId]: draft };

    // Jaga kompatibilitas dengan format lama hasil chat.
    if (moduleId === "itinerary") {
      planBaru.days = (draft.days || []).map((hari) => ({
        title: hari.title || "Hari",
        places: daftarAktivitas(hari.activities).map((name) => ({ name })),
      }));
    }
    if (moduleId === "destination" && draft.city) planBaru.city = draft.city;
    if (moduleId === "budget" && Number(draft.planned) > 0) {
      planBaru.totalCost = Number(draft.planned);
    }

    const patch = { plan: planBaru };
    (modul?.fields || []).forEach((field) => {
      if (field.top === "title" && draft[field.key]) patch.title = draft[field.key];
      if (field.top === "city" && draft[field.key]) patch.city = draft[field.key];
      if (field.top === "date" && draft[field.key]) patch.date = draft[field.key];
      if (field.top === "endDate") patch.endDate = draft[field.key];
    });
    if (moduleId === "dates") {
      const mulai = draft.startDate || trip.date;
      const selesai = draft.endDate || mulai;
      patch.date = mulai;
      patch.endDate = selesai < mulai ? mulai : selesai;
    }

    return updateTrip(trip.id, patch);
  };

  const simpanEdit = async (data) => {
    if (!editTrip) return { error: "Perjalanan tidak ditemukan." };
    return updateTrip(editTrip.id, data);
  };

  const ekspor = () => {
    const isi = JSON.stringify(
      { exportedAt: new Date().toISOString(), trip: { ...trip, plan } },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([isi], { type: "application/json" }));
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = `setapak-${String(trip.title || "trip")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.json`;
    tautan.click();
    URL.revokeObjectURL(url);
  };

  const isiDenganAi = async () => {
    const anggaran = Number(plan.budget?.planned) || 0;
    const prompt = `Buatkan rencana perjalanan ${durasi} hari ke ${
      trip.city || trip.title
    }${anggaran > 0 ? ` dengan budget ${anggaran}` : ""}. Susun itinerary harian dan perkiraan biayanya.`;
    setAiBusy(true);
    setAiPesan("");
    try {
      const hasil = await askCreatePlan(prompt);
      if (!hasil?.plan) {
        setAiPesan(
          "AI belum mengembalikan rencana terstruktur. Isi modul manual atau coba lagi di halaman Chat."
        );
        return;
      }
      const hasilSimpan = await updateTrip(trip.id, {
        plan: normalizePlan(hasil.plan, trip),
      });
      if (hasilSimpan?.error) {
        setAiPesan(hasilSimpan.error);
        return;
      }
      setAktif("itinerary");
      setVersi((prev) => prev + 1);
      setAiPesan(
        "Rencana AI diterapkan ke modul terkait. Cek tiap modul lalu simpan penyesuaianmu."
      );
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 font-jakarta lg:px-10">
      <Link
        to="/trip"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#6f9abf] hover:underline"
      >
        <i className="fi fi-rr-angle-small-left text-lg leading-none"></i>
        Semua trip
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-grey-light/50">
            Universal Trip Planner · {formatRangeId(trip.date, trip.endDate)}
          </p>
          <h1 className="mt-1 font-clash text-3xl font-bold text-grey-light md:text-4xl">
            {trip.title}
          </h1>
          <p className="mt-1 text-sm text-grey-light/60">
            {trip.city || "Destinasi belum diisi"} · {durasi} hari · anggaran{" "}
            {formatRupiah(plan.budget?.planned)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={isiDenganAi}
            disabled={aiBusy}
            className="inline-flex items-center gap-2 rounded-full bg-[#83ADD0] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <i className="fi fi-rr-sparkles text-sm leading-none"></i>
            {aiBusy ? "Menyusun..." : "Isi dari AI"}
          </button>
          <button
            type="button"
            onClick={() => setEditTrip(trip)}
            className="inline-flex items-center gap-2 rounded-full border border-[#83ADD0] px-4 py-2 text-sm font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
          >
            <i className="fi fi-rr-pencil text-sm leading-none"></i>
            Edit dasar
          </button>
          <button
            type="button"
            onClick={ekspor}
            title="Unduh rencana sebagai JSON"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-grey-label/60 text-grey-light/70 hover:bg-grey-label/20"
          >
            <i className="fi fi-rr-download text-sm leading-none"></i>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Cetak / simpan PDF"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-grey-label/60 text-grey-light/70 hover:bg-grey-label/20"
          >
            <i className="fi fi-rr-print text-sm leading-none"></i>
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border-2 border-grey-label/50 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-grey-light">
              Kelengkapan rencana
            </h2>
            <p className="mt-1 text-xs text-grey-light/60">
              Isi modul mana pun, kunci langsung tersimpan di perjalanan ini.
            </p>
          </div>
          <p className="text-sm font-bold text-[#6f9abf]">
            {progres} / {MODULES.length} modul · {persen}%
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-grey-label/30">
          <div
            className="h-full rounded-full bg-[#83ADD0] transition-all"
            style={{ width: `${persen}%` }}
          />
        </div>
        {aiPesan && (
          <p className="mt-3 rounded-xl bg-[#83ADD0]/10 px-3 py-2 text-xs text-[#6f9abf]">
            {aiPesan}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav
          aria-label="Modul trip planner"
          className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:flex-col lg:overflow-y-auto lg:pb-0"
        >
          {MODULES.map((modul) => {
            const dipilih = modul.id === modulAktif.id;
            const terisi = modulTerisi(modul, trip);
            const ringkas = ringkasanBagian(modul, plan[modul.id]);
            return (
              <button
                key={modul.id}
                type="button"
                onClick={() => setAktif(modul.id)}
                className={`flex min-w-[210px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors lg:min-w-0 ${
                  dipilih
                    ? "border-[#83ADD0] bg-[#83ADD0]/10"
                    : "border-grey-label/50 bg-white hover:bg-grey-label/10"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    terisi ? "bg-[#83ADD0] text-white" : "bg-grey-label/30 text-grey-light/60"
                  }`}
                >
                  {terisi ? (
                    <i className="fi fi-rr-check text-[11px] leading-none"></i>
                  ) : (
                    modul.no
                  )}
                </span>
                <i
                  className={`fi ${modul.icon} shrink-0 text-sm leading-none ${
                    dipilih ? "text-[#6f9abf]" : "text-grey-light/50"
                  }`}
                ></i>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-grey-light">
                    {modul.name}
                  </span>
                  {ringkas && (
                    <span className="block truncate text-[10px] text-grey-light/50">
                      {ringkas}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <ModuleEditor
          key={`${trip.id}-${modulAktif.id}-${versi}`}
          modul={modulAktif}
          bagian={plan[modulAktif.id]}
          onSave={simpanModul}
        />
      </div>

      <TripModal
        key={editTrip?.id || "edit"}
        trip={editTrip}
        onClose={() => setEditTrip(null)}
        onSave={simpanEdit}
      />
    </section>
  );
}
