import TripDisclaimer from "../../../components/ui/TripDisclaimer";
import { useMemo, useState } from "react";
import OutlineButton from "../../../components/ui/OutlineButton";
import FillButton from "../../../components/ui/FillButton";
import MapPane from "../../../components/ui/MapPane";
import { useTrips } from "../../../store/useTrips";
import { mapMarkersFromPlan } from "../../../utils/planSummary";
import { ensureUniversalPlan, formatRupiah, sinkronAktivitas } from "../../../utils/tripModules";
import { ambilHari, buildTripSummary } from "../../../utils/tripSummary";
import { printTripPdf } from "../../../utils/tripPdf";

// Ringkasan trip. Semua angka, kategori & catatan dibaca dari plan yang tersimpan
// (modul 4 Itinerary + modul 9 Activities), jadi perubahan di form langsung muncul di sini.
export default function TripDetail({ trip, onOpenDetail }) {
  const { updateTrip } = useTrips();
  const model = useMemo(() => buildTripSummary(trip), [trip]);
  const [aktif, setAktif] = useState(0);
  const [tambah, setTambah] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");
  const [pesan, setPesan] = useState("");

  const idx = Math.min(aktif, Math.max(model.hari.length - 1, 0));
  const hariAktif = model.hari[idx];
  const b = model.budget;
  const titikPeta = useMemo(() => mapMarkersFromPlan(trip.plan), [trip.plan]);
  const titikHari = titikPeta.filter((t) => t.day === hariAktif?.title);

  // Simpan ke plan.days + itinerary (modul 4), lalu sinkron ke modul 9 -> tersimpan di Supabase.
  const simpanHari = async (hariBaru) => {
    setPesan("");
    let plan = { ...ensureUniversalPlan(trip) };
    plan.days = hariBaru;
    const lama = plan.itinerary?.days || [];
    plan.itinerary = {
      ...(plan.itinerary || {}),
      days: hariBaru.map((h, i) => ({
        ...(lama[i] || {}),
        title: h.title,
        activities: h.places.map((p) => p.name).join(", "),
      })),
    };
    plan = sinkronAktivitas(plan);
    const res = await updateTrip(trip.id, { plan });
    if (res?.error) setPesan(res.error);
  };

  const ubahTempat = (fn) => simpanHari(ambilHari(trip).map((h, i) => (i === idx ? fn(h) : h)));
  const hapus = (pi) => ubahTempat((h) => ({ ...h, places: h.places.filter((_, j) => j !== pi) }));

  const tambahTempat = async (e) => {
    e.preventDefault();
    const nama = namaBaru.trim();
    if (!nama) return;
    await ubahTempat((h) => ({ ...h, places: [...h.places, { name: nama }] }));
    setNamaBaru("");
    setTambah(false);
  };

  return (
    <div className="min-h-screen w-full px-10 py-9 font-jakarta text-grey-light max-sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-jakarta text-4xl font-bold text-grey-light">{model.title}</h1>
          <p className="mt-1 font-jakarta text-base font-normal text-grey-light/80">{model.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OutlineButton
            title={
              <span className="inline-flex items-center gap-2">
                <i className="fi fi-rr-download flex items-center text-sm"></i>
                Download PDF
              </span>
            }
            onClick={() => printTripPdf(model)}
            className="cursor-pointer border-2 border-grey-light px-6 py-2.5 text-sm font-semibold text-grey-light hover:bg-grey-label/20"
          />
          <FillButton type="button" onClick={onOpenDetail} className="px-6 py-2.5 text-sm">
            Detail 15 pilar
          </FillButton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {model.tags.map((tag) => (
          <OutlineButton
            key={tag}
            title={tag}
            className="border border-grey-light/50 px-6 py-2 font-jakarta text-base font-semibold text-grey-light"
          />
        ))}
      </div>

      {model.hari.length > 0 && (
        <div className="mb-8 mt-6 flex flex-wrap gap-2.5">
          {model.hari.map((h, i) => (
            <OutlineButton
              key={i}
              title={`Day ${i + 1}`}
              onClick={() => setAktif(i)}
              className={`cursor-pointer px-6 py-2 font-jakarta text-base font-semibold transition-colors ${
                i === idx
                  ? "border border-grey-light bg-grey-light text-white"
                  : "border-2 border-dark-brown-new text-grey-light hover:bg-grey-label/20"
              }`}
            />
          ))}
        </div>
      )}

      {pesan && <p role="alert" className="mb-4 text-sm text-red-600">{pesan}</p>}

      {model.hari.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-grey-label p-8 text-center text-grey-light/60">
          Belum ada jadwal. Buat plan lewat Chats, atau isi itinerary di Detail 15 pilar.
        </div>
      ) : (
        <div className="flex flex-col items-start gap-8 lg:flex-row">
          <div className="w-full flex-1">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-jakarta text-2xl font-bold text-grey-light">
                  Day {idx + 1}
                  {hariAktif.shortTitle ? ` · ${hariAktif.shortTitle}` : ""}
                </h2>
                <p className="mt-0.5 font-jakarta text-base font-normal text-grey-label">
                  {[hariAktif.dateLabel, `${hariAktif.items.length} places planned`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {hariAktif.cost > 0 && (
                <span className="font-jakarta text-base font-bold text-grey-light">
                  Est. {formatRupiah(hariAktif.cost)}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              {hariAktif.items.length === 0 && (
                <div className="mb-4 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                  Belum ada jadwal untuk hari ini.
                </div>
              )}
              {hariAktif.items.map((it, n) => {
                const last = n === hariAktif.items.length - 1;
                return (
                  <div key={`${it.name}-${n}`} className="flex gap-5">
                    <div className="flex items-start gap-3.5 pt-4">
                      <span className="w-10 text-right font-jakarta text-sm font-bold text-grey-light">
                        {it.time}
                      </span>
                      <div className="flex h-full flex-col items-center">
                        <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-grey-light" />
                        {!last && <div className="my-1.5 w-[1.5px] flex-1 bg-grey-label/50" />}
                      </div>
                    </div>

                    <div className="mb-5 flex flex-1 items-center justify-center gap-4 rounded-2xl border border-grey-label/70 bg-white p-3.5">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-grey-label/40 max-sm:hidden" />
                      <div className="flex flex-1 flex-col justify-center">
                        <div>
                          <span
                            style={{ background: it.category.bg, color: it.category.fg }}
                            className="mb-1.5 inline-block rounded-full px-2.5 py-0.5 font-jakarta text-[11px] font-bold"
                          >
                            {it.category.label}
                          </span>
                        </div>
                        <h3 className="font-jakarta text-base font-bold leading-snug text-grey-light">
                          {it.mapsUrl ? (
                            <a href={it.mapsUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              {it.name}
                            </a>
                          ) : (
                            it.name
                          )}
                        </h3>
                        {(it.meta || it.address) && (
                          <p className="mt-0.5 font-jakarta text-xs font-normal text-grey-label">
                            {[it.address, it.meta].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {it.note && (
                          <p className="mt-2 font-jakarta text-xs font-medium leading-relaxed text-grey-light">
                            {it.note}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-center justify-center gap-2 pr-1">
                        <OutlineButton
                          title={<i className="fi fi-rr-pencil flex items-center justify-center text-xs"></i>}
                          onClick={onOpenDetail}
                          className="flex h-8 w-8 min-w-0 cursor-pointer items-center justify-center rounded-xl border border-grey-label/50 p-0 text-grey-light/70 hover:bg-grey-label/10"
                        />
                        <OutlineButton
                          title={<i className="fi fi-rr-trash flex items-center justify-center text-xs"></i>}
                          onClick={() => hapus(it.index)}
                          className="flex h-8 w-8 min-w-0 cursor-pointer items-center justify-center rounded-xl border border-grey-label/50 p-0 text-grey-light/70 hover:bg-red-50 hover:text-red-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-1 pl-[68px]">
                {tambah ? (
                  <form onSubmit={tambahTempat} className="flex flex-wrap gap-2">
                    <input
                      autoFocus
                      value={namaBaru}
                      onChange={(e) => setNamaBaru(e.target.value)}
                      placeholder="Nama tempat"
                      className="min-w-48 flex-1 rounded-2xl border border-grey-label px-4 py-2 text-sm outline-none focus:border-gray-400"
                    />
                    <FillButton type="submit" className="px-5 py-2 text-sm">
                      Add
                    </FillButton>
                    <OutlineButton title="Cancel" onClick={() => setTambah(false)} className="px-5 py-2 text-sm" />
                  </form>
                ) : (
                  <FillButton
                    type="button"
                    onClick={() => setTambah(true)}
                    baseClassName="ring-1 ring-inset ring-grey-label text-grey-light bg-white"
                    fillClassName="bg-grey-light text-white font-semibold"
                    className="rounded-2xl px-5 py-2 text-sm font-semibold"
                  >
                    + Add place
                  </FillButton>
                )}
              </div>

              {model.belumDijadwalkan.length > 0 && (
                <div className="mt-8 pl-[68px]">
                  <h3 className="mb-3 font-jakarta text-base font-bold text-grey-light">Other activities</h3>
                  <div className="flex flex-col gap-2">
                    {model.belumDijadwalkan.map((it, n) => (
                      <div
                        key={`${it.name}-${n}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-grey-label/70 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <span
                            style={{ background: it.category.bg, color: it.category.fg }}
                            className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          >
                            {it.category.label}
                          </span>
                          <p className="truncate text-sm font-bold">{it.name}</p>
                          {(it.place || it.day || it.note) && (
                            <p className="truncate text-xs text-grey-label">
                              {[it.place, it.day, it.note].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        {it.cost > 0 && (
                          <span className="shrink-0 text-sm font-bold">{formatRupiah(it.cost)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[360px]">
            <TripDisclaimer />
            <div className="relative h-60 overflow-hidden rounded-2xl border border-grey-label/60 bg-gray-100">
              <MapPane places={titikHari.length ? titikHari : titikPeta} className="h-full w-full" />
            </div>

            <div className="rounded-4xl border border-grey-label/70 bg-white p-6">
              <h3 className="mb-2 font-jakarta text-base font-bold text-grey-light">Budget</h3>
              <p className="font-jakarta text-2xl font-bold">{b.used > 0 ? formatRupiah(b.used) : "Rp 0"}</p>
              <p className="mt-1 font-jakarta text-sm font-normal text-grey-label">
                {b.planned > 0
                  ? `planned of ${formatRupiah(b.planned)} · ${formatRupiah(b.left)} left`
                  : "Budget belum diatur"}
              </p>
              <div className="my-4 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-arctic-blue" style={{ width: `${b.percent}%` }}></div>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 pt-2">
                {b.rows.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-jakarta font-normal text-grey-light/80">{r.label}</span>
                    <span className="font-jakarta font-bold text-grey-light">{formatRupiah(r.amount)}</span>
                  </div>
                ))}
              </div>
              {b.scopeLabel && (
                <p className="mt-3 inline-block rounded-full bg-[#83ADD0]/15 px-3 py-1 font-jakarta text-xs font-semibold text-[#6f9abf]">
                  {b.scopeLabel}
                </p>
              )}
              {b.tiketTerpisah > 0 && (
                <p className="mt-2 font-jakarta text-xs font-normal text-grey-label">
                  Perkiraan tiket pesawat (di luar budget): {formatRupiah(b.tiketTerpisah)}
                </p>
              )}
              <p className="mt-3 font-jakarta text-xs font-normal text-grey-label">
                Estimates only. Lodging is not included.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
