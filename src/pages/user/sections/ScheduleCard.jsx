import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InputAll from "../../../components/ui/InputAll";
import TripForm from "./TripForm";
import {
  formatDateId,
  formatRangeId,
  toDateKey,
} from "../../../utils/tripDate";
import { getItinerary } from "../../../utils/tripModules";

// Satu kartu = satu perjalanan (bukan satu lokasi). Agenda per harinya tampil
// di dalam kartu. Form tambah memakai TripForm yang sama dengan edit.
export default function ScheduleCard({
  trips,
  prefill,
  onPrefillUsed,
  addTrip,
  deleteTrip,
  loading,
  error,
  onEditTrip,
}) {
  const [formInitial, setFormInitial] = useState(null);
  const [pesan, setPesan] = useState("");
  const [query, setQuery] = useState("");
  const [halaman, setHalaman] = useState(0);

  useEffect(() => {
    if (!prefill) return undefined;
    let aktif = true;
    queueMicrotask(() => {
      if (!aktif) return;
      setFormInitial(prefill);
      setPesan("");
      onPrefillUsed?.();
    });
    return () => {
      aktif = false;
    };
  }, [prefill, onPrefillUsed]);

  const simpan = async (data) => {
    const hasil = await addTrip(data);
    if (!hasil?.error) {
      setFormInitial(null);
      setPesan("");
      setQuery("");
      const baru = hasil.data;
      if (baru?.date) {
        const posisi = [...daftar, baru]
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .findIndex((item) => item.id === baru.id);
        if (posisi >= 0) setHalaman(posisi);
      }
    }
    return hasil;
  };

  const hapus = async (trip) => {
    if (!window.confirm(`Hapus perjalanan "${trip.title}"?`)) return;
    const hasil = await deleteTrip(trip.id);
    if (hasil?.error) setPesan(hasil.error);
    else setHalaman(0);
  };

  const bukaTambah = () => {
    const hariIni = toDateKey(new Date());
    setFormInitial({ date: hariIni, endDate: hariIni });
    setPesan("");
  };

  const daftar = [...trips].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const kata = query.trim().toLowerCase();
  const tersaring = kata
    ? daftar.filter((trip) =>
        [
          trip.title,
          trip.city,
          trip.place,
          trip.date,
          trip.endDate,
          formatRangeId(trip.date, trip.endDate),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(kata)
      )
    : daftar;
  const indexAman = Math.min(halaman, Math.max(0, tersaring.length - 1));
  const tampil = tersaring[indexAman] || null;

  // Agenda diambil dari modul Itinerary yang baru, dengan fallback ke format
  // lama chat. Jadi edit di workspace langsung terlihat di sini.
  const grupAgenda = tampil
    ? getItinerary(tampil)
        .map((hari) => ({
          label: `${hari.title} · ${formatDateId(hari.date)}`,
          items: hari.activities,
        }))
        .filter((grup) => grup.items.length > 0)
    : [];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-jakarta font-bold text-grey-light">
          Schedule
          {daftar.length > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#83ADD0] px-1.5 text-xs font-semibold text-white">
              {daftar.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => {
            if (formInitial) setFormInitial(null);
            else bukaTambah();
          }}
          title={formInitial ? "Tutup form" : "Tambah perjalanan"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-grey-label/60 text-grey-light hover:bg-grey-label/20"
        >
          <i
            className={`fi ${
              formInitial ? "fi-rr-cross-small" : "fi-br-plus"
            } text-base leading-none`}
          ></i>
        </button>
      </div>

      {daftar.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-full border border-grey-label/60 bg-white px-3 py-1">
            <i className="fi fi-rr-search text-sm leading-none text-grey-light/50"></i>
            <InputAll
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHalaman(0);
              }}
              placeholder="Cari perjalanan atau agenda"
              aria-label="Cari perjalanan atau agenda"
              className="w-full py-1 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setHalaman(0);
                }}
                title="Hapus pencarian"
                className="text-grey-light/50 hover:text-grey-light"
              >
                <i className="fi fi-rr-cross-small text-lg leading-none"></i>
              </button>
            )}
          </div>

          {!formInitial && tersaring.length > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-grey-light/60">
              <button
                type="button"
                onClick={() => setHalaman((prev) => Math.max(0, prev - 1))}
                disabled={indexAman === 0}
                aria-label="Perjalanan sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-grey-label/20 disabled:opacity-30"
              >
                <i className="fi fi-rr-angle-small-left text-lg leading-none"></i>
              </button>
              <span className="font-medium">
                {indexAman + 1} / {tersaring.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setHalaman((prev) =>
                    Math.min(tersaring.length - 1, prev + 1)
                  )
                }
                disabled={indexAman >= tersaring.length - 1}
                aria-label="Perjalanan berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-grey-label/20 disabled:opacity-30"
              >
                <i className="fi fi-rr-angle-small-right text-lg leading-none"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {formInitial && (
        <div className="mt-3 rounded-2xl border-2 border-grey-label/50 bg-white p-3">
          <p className="mb-3 text-sm font-semibold text-grey-light">
            {formInitial.id ? "Edit perjalanan" : "Perjalanan baru"}
          </p>
          <TripForm
            key={formInitial.id || formInitial.date || "baru"}
            initial={formInitial}
            onSubmit={simpan}
            onCancel={() => setFormInitial(null)}
          />
        </div>
      )}

      {(pesan || error) && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {pesan || error}
        </p>
      )}

      <div className="mt-3">
        {loading && daftar.length === 0 && (
          <p className="text-sm text-grey-light/60">Memuat jadwal...</p>
        )}
        {!loading && daftar.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-grey-label/60 bg-white px-3 py-4 text-sm text-grey-light/60">
            Belum ada perjalanan. Tambah jadwal atau minta AI menyusun rencana
            dulu.
          </p>
        )}
        {!loading && daftar.length > 0 && tersaring.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-grey-label/60 bg-white px-3 py-4 text-sm text-grey-light/60">
            Tidak ada perjalanan yang cocok dengan &ldquo;{query}&rdquo;.
          </p>
        )}

        {/* Hanya satu perjalanan yang tampil; yang lain lewat panah / search. */}
        {!loading && !formInitial && tampil && (
          <div className="rounded-2xl border-2 border-grey-label/80 bg-white px-3 py-3">
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#83ADD0] text-white">
                <i className="fi fi-rr-marker pt-1 text-sm leading-none"></i>
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/trip/${tampil.id}`}
                  className="block truncate text-base font-jakarta font-semibold leading-tight text-grey-light hover:text-[#6f9abf]"
                >
                  {tampil.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-grey-light/60">
                  {formatRangeId(tampil.date, tampil.endDate)}
                  {tampil.city ? ` · ${tampil.city}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {onEditTrip && (
                  <button
                    type="button"
                    onClick={() => onEditTrip(tampil)}
                    title={`Edit ${tampil.title}`}
                    className="rounded-lg p-1.5 text-grey-light/60 hover:bg-[#83ADD0]/15 hover:text-[#6f9abf]"
                  >
                    <i className="fi fi-rr-pencil text-sm leading-none"></i>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => hapus(tampil)}
                  title={`Hapus ${tampil.title}`}
                  className="rounded-lg p-1.5 text-grey-light/60 hover:bg-red-50 hover:text-red-600"
                >
                  <i className="fi fi-rr-trash text-sm leading-none"></i>
                </button>
              </div>
            </div>

            {grupAgenda.length > 0 && (
              <div className="mt-2 border-t border-grey-label/30 pt-2 pl-10">
                {grupAgenda.map((grup, index) => (
                  <div key={`${grup.label}-${index}`} className="mb-1 last:mb-0">
                    <p className="text-[11px] font-semibold text-grey-light/50">
                      {grup.label}
                    </p>
                    <ul className="ml-3 list-disc text-xs leading-snug text-grey-light/80">
                      {grup.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="truncate">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
