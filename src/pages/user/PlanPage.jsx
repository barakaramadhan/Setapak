import { Link } from "react-router-dom";
import { useTrips } from "../../store/useTrips";
import { useChats } from "../../store/useChats";
import { formatRangeId } from "../../utils/tripDate";
import { getItinerary } from "../../utils/tripModules";

// /plan = semua plan hasil mode Planning di chat (trip yang punya rencana).
export default function PlanPage() {
  const { trips, loading } = useTrips();
  const { chats, openChat } = useChats();
  const daftar = trips.filter((trip) => trip.plan);

  if (loading) {
    return <section className="px-10 pt-10 font-jakarta text-grey-light">Memuat plan...</section>;
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-10 pb-16 pt-10 font-jakarta">
      <h1 className="font-clash text-4xl font-bold text-grey-light">My Plans</h1>
      <p className="mt-2 text-grey-light/70">
        Plan yang kamu buat lewat mode Planning di chat tersimpan di sini.
      </p>

      {daftar.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-grey-label/60 p-8 text-center text-grey-light/60">
          Belum ada plan. Buka Chats, pilih mode Planning, lalu klik Create Planning.
        </p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {daftar.map((trip) => {
            const agenda = getItinerary(trip).flatMap((h) => h.activities).slice(0, 3);
            const chat = chats.find((c) => c.tripId === trip.id);
            return (
              <div key={trip.id} className="rounded-2xl border-2 border-grey-label/60 bg-white p-4">
                <Link to={`/trip/${trip.id}`} className="block truncate font-semibold text-grey-light hover:text-[#6f9abf]">
                  {trip.title}
                </Link>
                <p className="mt-1 text-xs text-grey-light/60">
                  {formatRangeId(trip.date, trip.endDate)}
                  {trip.city ? ` · ${trip.city}` : ""}
                </p>
                {agenda.length > 0 && (
                  <ul className="mt-2 ml-4 list-disc text-xs text-grey-light/70">
                    {agenda.map((item, i) => (
                      <li key={`${item}-${i}`} className="truncate">{item}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex gap-2">
                  <Link to={`/trip/${trip.id}`} className="rounded-full bg-[#83ADD0] px-3 py-1 text-xs font-semibold text-white">
                    Buka plan
                  </Link>
                  {chat && (
                    <Link
                      to="/chats"
                      onClick={() => openChat(chat.id)}
                      className="rounded-full border border-grey-label/70 px-3 py-1 text-xs font-semibold text-grey-light"
                    >
                      Chat asal
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
