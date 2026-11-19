import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatDateId,
  formatRangeId,
  toDateKey,
} from "../../../utils/tripDate";
import { getItinerary } from "../../../utils/tripModules";

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const JEDA_TUTUP = 1600; // ms — beri waktu pindah dari tanggal ke kartu

function agendaSingkat(trip) {
  return getItinerary(trip)
    .flatMap((hari) => hari.activities)
    .slice(0, 3);
}

// Kalender dashboard: hari ini diberi ring, tanggal bertanda jika punya trip.
// Popover bertahan saat kursor pindah ke kartu, dan kartu perjalanan (bukan
// baris agenda) yang diklik → /trip/:id. Edit bisa dari sini maupun detail.
export default function CalendarCard({
  tripsByDate,
  selectedDate,
  onSelectDate,
  onAddForDate,
  onEditTrip,
}) {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => {
    const sekarang = new Date();
    return new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
  });
  const [hovered, setHovered] = useState(null);
  const timerTutup = useRef(null);

  useEffect(() => () => clearTimeout(timerTutup.current), []);

  const buka = (key) => {
    clearTimeout(timerTutup.current);
    setHovered(key);
  };

  const tutup = () => {
    clearTimeout(timerTutup.current);
    timerTutup.current = setTimeout(() => setHovered(null), JEDA_TUTUP);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const selectedKey = selectedDate ? toDateKey(selectedDate) : "";

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(new Date(year, month, day));
  }

  const gantiBulan = (selisih) => {
    clearTimeout(timerTutup.current);
    setHovered(null);
    setViewDate(new Date(year, month + selisih, 1));
  };

  return (
    <div className="rounded-4xl border-2 border-grey-label/50 bg-white p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => gantiBulan(-1)}
          aria-label="Bulan sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-full pt-1 hover:bg-grey-label/50"
        >
          <i className="fi fi-rr-angle-small-left text-lg"></i>
        </button>

        <h3 className="font-jakarta text-base font-semibold text-grey-light">
          {monthNames[month]} {year}
        </h3>

        <button
          type="button"
          onClick={() => gantiBulan(1)}
          aria-label="Bulan berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-full pt-1 hover:bg-grey-label/50"
        >
          <i className="fi fi-rr-angle-small-right text-lg"></i>
        </button>
      </div>

      <div className="my-3 border-t border-grey-label/50"></div>

      <div className="grid grid-cols-7 text-center">
        {dayNames.map((name) => (
          <p
            key={name}
            className="py-2 text-sm font-jakarta font-semibold text-grey-light/50"
          >
            {name}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((date, index) => {
          if (!date) return <div key={`kosong-${index}`}></div>;

          const key = toDateKey(date);
          const items = tripsByDate[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const kolom = (firstDay + date.getDate() - 1) % 7;
          const posisi =
            kolom <= 1
              ? "left-0"
              : kolom >= 5
                ? "right-0"
                : "left-1/2 -translate-x-1/2";

          return (
            <div
              key={key}
              className="relative flex justify-center"
              onMouseEnter={() => buka(key)}
              onMouseLeave={tutup}
            >
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                onFocus={() => buka(key)}
                onBlur={tutup}
                title={
                  items.length
                    ? `${items.length} perjalanan di ${formatDateId(key)}`
                    : isToday
                      ? "Hari ini"
                      : formatDateId(key)
                }
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-base font-jakarta font-medium transition-colors ${
                  isSelected
                    ? "bg-[#83ADD0] text-white"
                    : "text-grey-light/80 hover:bg-grey-label/30"
                } ${
                  isToday && !isSelected
                    ? "ring-1 ring-inset ring-[#83ADD0]"
                    : ""
                } ${
                  isToday && isSelected
                    ? "ring-2 ring-offset-1 ring-[#6f9abf]"
                    : ""
                }`}
              >
                {date.getDate()}
                {items.length > 0 && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full ${
                      isSelected ? "bg-white" : "bg-[#83ADD0]"
                    }`}
                  />
                )}
              </button>

              {hovered === key && items.length > 0 && (
                <>
                  {/* jembatan transparan menutup jarak 8px ke popover */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-full left-0 right-0 h-2"
                  />
                  <div
                    onMouseEnter={() => buka(key)}
                    onMouseLeave={tutup}
                    className={`absolute bottom-full z-30 mb-2 w-60 rounded-2xl border border-grey-label/40 bg-white p-3 text-left shadow-xl ${posisi}`}
                  >
                    <p className="mb-2 text-xs font-semibold text-grey-light/60">
                      {formatDateId(key)} · {items.length} perjalanan
                    </p>

                    <div className="flex flex-col gap-2">
                      {items.map((trip) => {
                        const agenda = agendaSingkat(trip);
                        return (
                          <div
                            key={trip.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/trip/${trip.id}`)}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                navigate(`/trip/${trip.id}`);
                              }
                            }}
                            className="cursor-pointer rounded-xl border border-grey-label/40 p-2 transition-colors hover:border-[#83ADD0] hover:bg-grey-label/10"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-grey-light">
                                  {trip.title}
                                </p>
                                <p className="text-[11px] text-grey-light/60">
                                  {formatRangeId(trip.date, trip.endDate)}
                                </p>
                              </div>
                              {onEditTrip && (
                                <button
                                  type="button"
                                  title="Edit perjalanan"
                                  aria-label={`Edit ${trip.title}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    clearTimeout(timerTutup.current);
                                    setHovered(null);
                                    onEditTrip(trip);
                                  }}
                                  className="shrink-0 rounded-lg p-1 text-grey-light/60 hover:bg-[#83ADD0]/15 hover:text-[#6f9abf]"
                                >
                                  <i className="fi fi-rr-pencil text-sm leading-none"></i>
                                </button>
                              )}
                            </div>

                            {agenda.length > 0 && (
                              <p className="mt-1 truncate text-[11px] text-grey-light/70">
                                Agenda: {agenda.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {onAddForDate && (
                      <button
                        type="button"
                        onClick={() => {
                          clearTimeout(timerTutup.current);
                          setHovered(null);
                          onAddForDate(date);
                        }}
                        className="mt-2 w-full border-t border-grey-label/30 pt-2 text-left text-xs font-semibold text-[#6f9abf] hover:underline"
                      >
                        + Tambah perjalanan di tanggal ini
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-2 text-[11px] text-grey-light/50">
        <span className="h-1 w-3 rounded-full bg-[#83ADD0]"></span>
        Ada perjalanan
        <span className="ml-2 h-2 w-2 rounded-full ring-1 ring-[#83ADD0]"></span>
        Hari ini
      </p>
    </div>
  );
}
