import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTrips } from "../../store/useTrips";
import { formatDateId, formatRangeId } from "../../utils/tripDate";
import { getItinerary } from "../../utils/tripModules";
import TripModal from "./sections/TripModal";
import TripDetail from "./sections/TripDetail";
import TripWorkspace from "./TripWorkspace";

// /trip = daftar perjalanan, /trip/:id = workspace 15 modul.
export default function TripPage() {
  const { id } = useParams();
  const { trips, loading, error, updateTrip } = useTrips();
  const [editTrip, setEditTrip] = useState(null);
  const [lihatForm, setLihatForm] = useState(false);

  const simpanEdit = async (data) => {
    if (!editTrip) return { error: "Perjalanan tidak ditemukan." };
    return updateTrip(editTrip.id, data);
  };

  if (loading) {
    return (
      <section className="px-10 pt-10 font-jakarta text-grey-light">
        Memuat trip...
      </section>
    );
  }

  if (id) {
    const trip = trips.find((item) => item.id === id);
    if (!trip) {
      return (
        <section className="px-10 pt-10 font-jakarta">
          <h1 className="text-3xl font-bold text-grey-light">
            Trip tidak ditemukan
          </h1>
          <p className="mt-2 text-grey-light/70">
            Trip mungkin sudah dihapus atau milik akun lain.
          </p>
          <Link
            to="/trip"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#83ADD0] px-4 py-2 text-sm font-semibold text-white"
          >
            <i className="fi fi-rr-angle-small-left text-lg leading-none"></i>
            Kembali ke daftar trip
          </Link>
        </section>
      );
    }
    if (lihatForm) {
      return (
        <div>
          <button
            type="button"
            onClick={() => setLihatForm(false)}
            className="ml-10 mt-6 inline-flex items-center gap-2 rounded-xl border border-grey-label/60 px-4 py-2 font-jakarta text-sm font-semibold text-grey-light hover:bg-grey-label/10 max-sm:ml-6"
          >
            <i className="fi fi-rr-angle-small-left text-lg leading-none"></i>
            Kembali ke ringkasan trip
          </button>
          <TripWorkspace trip={trip} />
        </div>
      );
    }
    return <TripDetail trip={trip} onOpenDetail={() => setLihatForm(true)} />;
  }

  const grupPerjalanan = trips.reduce((acc, trip) => {
    (acc[trip.date] ||= []).push(trip);
    return acc;
  }, {});
  const tanggal = Object.keys(grupPerjalanan).sort();

  return (
    <section className="mx-auto w-full max-w-4xl px-10 pb-16 pt-10 font-jakarta">
      <h1 className="font-clash text-4xl font-bold text-grey-light">My Trips</h1>
      <p className="mt-2 text-grey-light/70">
        Semua perjalanan dan plan-mu dalam satu tempat. Satu kartu = satu perjalanan, lengkap dengan itinerary & peta.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {tanggal.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-grey-label/60 p-8 text-center text-grey-light/60">
          Belum ada perjalanan. Tambahkan lewat Schedule di dashboard, atau buat plan lewat mode Planning di Chats — hasilnya langsung muncul di sini.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {tanggal.map((key) => (
            <div key={key}>
              <h2 className="text-lg font-bold text-grey-light">
                {formatDateId(key)}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {grupPerjalanan[key].map((trip) => {
                  const agenda = getItinerary(trip)
                    .flatMap((hari) => hari.activities)
                    .slice(0, 3);
                  return (
                    <div
                      key={trip.id}
                      className="rounded-2xl border-2 border-grey-label/60 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/trip/${trip.id}`}
                          className="min-w-0 truncate font-semibold text-grey-light hover:text-[#6f9abf]"
                        >
                          {trip.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditTrip(trip)}
                          title={`Edit ${trip.title}`}
                          className="shrink-0 rounded-lg p-1 text-grey-light/60 hover:bg-[#83ADD0]/15 hover:text-[#6f9abf]"
                        >
                          <i className="fi fi-rr-pencil text-sm leading-none"></i>
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-grey-light/60">
                        {formatRangeId(trip.date, trip.endDate)}
                      </p>
                      {agenda.length > 0 && (
                        <ul className="mt-2 ml-4 list-disc text-xs text-grey-light/70">
                          {agenda.map((item, index) => (
                            <li key={`${item}-${index}`} className="truncate">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TripModal
        key={editTrip?.id || "edit"}
        trip={editTrip}
        onClose={() => setEditTrip(null)}
        onSave={simpanEdit}
      />
    </section>
  );
}
