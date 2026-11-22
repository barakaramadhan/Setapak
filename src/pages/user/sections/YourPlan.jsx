import { Link, useNavigate } from "react-router-dom";
import FillButton from "../../../components/ui/FillButton";
import { useTrips } from "../../../store/useTrips";
import { formatRangeId, fromDateKey } from "../../../utils/tripDate";
import { durasiHari, getItinerary, formatRupiah } from "../../../utils/tripModules";

const FALLBACK_IMAGES = [
  "https://i.pinimg.com/1200x/2c/6e/47/2c6e47da70dd05bebe32fb04a1225ea0.jpg",
  "https://i.pinimg.com/1200x/ea/c8/d6/eac8d6651afd6db5f79fc06e7bc08fd2.jpg",
  "https://i.pinimg.com/1200x/92/ac/41/92ac411789973a80c8ea6aba9acccd5f.jpg",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
];

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
  const used = actual > 0 ? actual : fromItems;
  return { planned, used };
}

export default function YourPlan() {
  const navigate = useNavigate();
  const { trips, loading, error } = useTrips();

  const cards = [...trips]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .map((trip) => {
      const status = statusTrip(trip);
      const days = durasiHari(trip.date, trip.endDate) || getItinerary(trip).length || 0;
      const { planned, used } = budgetInfo(trip);
      const percentUsed = planned > 0 ? Math.min((used / planned) * 100, 100) : 0;
      const location =
        trip.city || trip.plan?.city || trip.plan?.destination?.city || "Belum ditentukan";
      return {
        ...trip,
        status,
        days,
        planned,
        used,
        percentUsed,
        location,
        dateLabel: trip.date ? formatRangeId(trip.date, trip.endDate) : "Date not set",
        image: FALLBACK_IMAGES[hashIndex(trip.id || trip.title, FALLBACK_IMAGES.length)],
      };
    });

  return (
    <section className="min-h-screen font-jakarta bg-bright-white pb-20">
      <div className="flex flex-col pt-14 px-32 max-xl:px-10 max-sm:px-6">
        <h2 className="font-jakarta font-bold text-3xl text-grey-light">Your Trip</h2>
        <div className="flex justify-between items-center mt-2 max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <p className="font-jakarta font-normal text-base text-grey-light">
            All your trip plans in one place
          </p>
          <div className="flex gap-3 max-sm:w-full">
            <FillButton
              onClick={() => navigate("/chats")}
              className="text-base px-7 py-2.5 max-sm:flex-1"
            >
              Plan with AI
            </FillButton>
            <FillButton
              onClick={() => navigate("/dashboard")}
              className="text-base px-7 py-2.5 max-sm:flex-1"
              baseClassName="ring-1 ring-inset ring-[#83ADD0] text-[#83ADD0]"
              fillClassName="bg-[#83ADD0] text-white"
            >
              Add from Schedule
            </FillButton>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading && <p className="mt-10 text-sm text-grey-light/70">Memuat perjalanan...</p>}

        {!loading && cards.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-grey-label/50 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-grey-light">Belum ada trip</p>
            <p className="mt-2 text-sm text-grey-light/70">
              Mulai dari chat AI atau tambah jadwal dari dashboard, nanti trip kamu akan muncul di
              sini.
            </p>
            <div className="mt-5 flex justify-center gap-3 max-sm:flex-col">
              <FillButton onClick={() => navigate("/chats")} className="px-6 py-2.5">
                Mulai di Chat
              </FillButton>
              <FillButton
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2.5"
                baseClassName="ring-1 ring-inset ring-[#83ADD0] text-[#83ADD0]"
                fillClassName="bg-[#83ADD0] text-white"
              >
                Buka Dashboard
              </FillButton>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mt-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {cards.map((trip) => {
            const isPast = trip.status === "Past";
            const isDraft = trip.status === "Draft";

            return (
              <div
                key={trip.id}
                className={`relative flex flex-col rounded-3xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-grey-label/20 transition-transform hover:-translate-y-1 duration-300 ${
                  isPast ? "bg-[#EAEAEA]" : "bg-white"
                }`}
              >
                <div className="p-3 pb-0 relative">
                  <img
                    src={trip.image}
                    alt={trip.location}
                    className={`w-full h-48 object-cover rounded-2xl ${
                      isPast ? "grayscale opacity-90" : ""
                    }`}
                  />
                  <div
                    className={`absolute top-6 right-6 font-jakarta text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-sm ${
                      isPast ? "bg-[#D1D1D1] text-grey-light" : "bg-white text-grey-light"
                    }`}
                  >
                    {trip.status}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-jakarta font-bold text-lg text-grey-light mb-3">
                    {trip.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-medium text-grey-light/70 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <i className="fi fi-rr-marker text-sm leading-none"></i>
                      <span className="truncate">{trip.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <i className="fi fi-rr-calendar text-sm leading-none"></i>
                      <span className="truncate">{trip.dateLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-grey-light/70 mb-6">
                    <div className="flex items-center gap-1.5">
                      <i className="fi fi-rr-clock-three text-sm leading-none"></i>
                      <span>{trip.days > 0 ? `${trip.days} days` : "Duration TBD"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <i className="fi fi-rr-list-check text-sm leading-none"></i>
                      <span>{getItinerary(trip).length} day plans</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2 gap-3">
                      <span className="text-[11px] font-medium text-grey-light/70">
                        {trip.planned > 0 ? "Budget used" : "Budget"}
                      </span>
                      <span className="text-[11px] font-bold text-grey-light text-right">
                        {trip.planned > 0
                          ? `${formatRupiah(trip.used)} / ${formatRupiah(trip.planned)}`
                          : "Belum diatur"}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-grey-label/20 rounded-full mb-6 overflow-hidden">
                      <div
                        className="h-full bg-[#83ADD0] rounded-full"
                        style={{ width: `${isDraft ? 0 : trip.percentUsed}%` }}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/trip/${trip.id}`}
                        className="flex-1 border border-grey-brown-new rounded-full py-2.5 font-jakarta text-dark-brown-new text-sm font-medium flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        View Plan
                      </Link>

                      <button
                        type="button"
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        className={`flex-1 rounded-full py-2.5 font-jakarta text-sm font-medium transition-colors ${
                          isPast
                            ? "bg-[#83ADD0] text-white hover:bg-[#7299B9]"
                            : "bg-[#D1D1D1] text-white/90 hover:bg-[#bcbcbc]"
                        }`}
                        title={isPast ? "Lihat ringkasan trip" : "Buka detail trip"}
                      >
                        {isPast ? "View Recap" : "Open Trip"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
