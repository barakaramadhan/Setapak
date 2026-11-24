import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OutlineButton from "../../../components/ui/OutlineButton";
import FillButton from "../../../components/ui/FillButton";
import { useTrips } from "../../../store/useTrips";
import { formatRangeId, fromDateKey } from "../../../utils/tripDate";
import { durasiHari, getItinerary } from "../../../utils/tripModules";

const FALLBACK_IMAGES = [
  "https://i.pinimg.com/1200x/2c/6e/47/2c6e47da70dd05bebe32fb04a1225ea0.jpg",
  "https://i.pinimg.com/1200x/ea/c8/d6/eac8d6651afd6db5f79fc06e7bc08fd2.jpg",
  "https://i.pinimg.com/1200x/92/ac/41/92ac411789973a80c8ea6aba9acccd5f.jpg",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
];

const FILTERS = ["All", "Upcoming", "Past", "Draft"];

function hashIndex(text, mod) {
  const s = String(text || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return mod ? h % mod : h;
}

function statusTrip(trip) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = fromDateKey(trip.date);
  const end = fromDateKey(trip.endDate || trip.date);
  if (end && end < today) return "Past";
  const hasPlan = Boolean(trip.plan && (trip.plan.days?.length || getItinerary(trip).length));
  if (!hasPlan || !start) return "Draft";
  return "Planned";
}

function budgetInfo(trip) {
  const planned = Number(trip.plan?.budget?.planned || trip.plan?.totalCost || 0);
  const actual = Number(trip.plan?.budget?.actual || 0);
  const fromItems = (trip.plan?.budget?.items || []).reduce(
    (sum, it) => sum + Number(it.amount || 0),
    0
  );
  const fromPlaces = (trip.plan?.days || [])
    .flatMap((d) => d.places || [])
    .reduce((sum, p) => sum + Number(p.cost || 0), 0);
  const used = actual || fromItems || fromPlaces;
  return { planned, used };
}

// 1650000 -> "1.65", 2000000 -> "2" (dalam juta, sesuai desain)
const juta = (n) => String(Math.round((Number(n) / 1_000_000) * 100) / 100);

function travelersLabel(trip) {
  const n = Number(trip.travelers || trip.plan?.overview?.travelers || 0);
  return n > 0 ? `${n} Traveler${n > 1 ? "s" : ""}` : "";
}

const pillBase =
  "border-grey-label text-grey-light/80 px-3 py-1 text-sm font-jakarta font-semibold min-w-0";

export default function YourPlan() {
  const navigate = useNavigate();
  const { trips, loading, error } = useTrips();
  const [filter, setFilter] = useState("All");

  const cards = [...trips]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .map((trip) => {
      const status = statusTrip(trip);
      const days = durasiHari(trip.date, trip.endDate) || getItinerary(trip).length || 0;
      const { planned, used } = budgetInfo(trip);
      return {
        ...trip,
        status,
        days,
        planned,
        used,
        percent: planned > 0 ? Math.min((used / planned) * 100, 100) : 0,
        location: trip.city || trip.plan?.city || trip.plan?.destination?.city || "Belum ditentukan",
        dateLabel: trip.date ? formatRangeId(trip.date, trip.endDate) : "Date not set",
        travelers: travelersLabel(trip),
        image: FALLBACK_IMAGES[hashIndex(trip.id || trip.title, FALLBACK_IMAGES.length)],
      };
    })
    .filter((trip) => {
      if (filter === "All") return true;
      if (filter === "Upcoming") return trip.status === "Planned";
      return trip.status === filter;
    });

  return (
    <div className="min-h-screen w-full px-5 py-6 sm:px-10 sm:py-9">
      <h1 className="font-jakarta text-3xl font-bold text-grey-light sm:text-4xl">Your Plan</h1>
      <p className="mt-1 font-jakarta text-base font-normal text-grey-light">
        All your travel ideas and itineraries, organized in one place.
      </p>

      <div className="flex flex-wrap gap-3 pt-7">
        {FILTERS.map((name) => (
          <OutlineButton
            key={name}
            title={name}
            onClick={() => setFilter(name)}
            className={
              filter === name
                ? "border-grey-light bg-grey-light px-5 py-2 sm:px-8 text-base font-semibold text-white"
                : "border-2 border-grey-light px-5 py-2 sm:px-8 text-base font-semibold text-grey-light"
            }
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p className="mt-10 text-sm text-grey-light/70">Memuat perjalanan...</p>}

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((trip) => {
          const isDraft = trip.status === "Draft";
          return (
            <Link
              to={`/trip/${trip.id}`}
              key={trip.id}
              className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-grey-label/60 font-jakarta transition-shadow duration-200 hover:shadow-md"
            >
              <div className="relative h-40 w-full">
                <img
                  src={trip.image}
                  alt={trip.title}
                  className={`h-full w-full object-cover ${trip.status === "Past" ? "grayscale" : ""}`}
                />
                <span className="absolute right-3 top-3 rounded-full bg-bright-white px-3 py-1 font-jakarta text-xs font-bold text-grey-light">
                  {trip.status}
                </span>
              </div>

              <div className="flex flex-1 flex-col bg-white p-5">
                <h3 className="font-jakarta text-xl font-bold text-grey-light">{trip.title}</h3>
                <p className="mb-4 font-jakarta text-sm font-normal text-grey-light/80">
                  {trip.location} - {trip.dateLabel}
                </p>

                <div className="mb-8 flex flex-wrap gap-2">
                  {trip.days > 0 && <OutlineButton title={`${trip.days} days`} className={pillBase} />}
                  {trip.travelers && <OutlineButton title={trip.travelers} className={pillBase} />}
                </div>

                <div className="mt-auto">
                  {isDraft ? (
                    <FillButton className="w-full">Continue Planing</FillButton>
                  ) : (
                    <div>
                      <div className="mb-2 flex justify-between text-xs font-medium text-gray-500">
                        <span>Planed</span>
                        <span>
                          Rp. {juta(trip.used)} / {trip.planned > 0 ? juta(trip.planned) : "-"} jt
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-400"
                          style={{ width: `${trip.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => navigate("/chats")}
          className="flex min-h-[350px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-grey-label/70 p-6 text-center font-jakarta transition-colors hover:bg-grey-label/20"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-arctic-blue/30">
            <i className="fi fi-rr-plus-small flex items-center justify-center text-2xl"></i>
          </div>
          <h3 className="mb-1 font-jakarta text-xl font-bold text-grey-light">Start a new trip</h3>
          <p className="w-44 font-jakarta text-sm font-normal text-grey-light/70">
            Tell Setapak where you want to go.
          </p>
        </button>
      </div>
    </div>
  );
}
