import { useState } from "react";
import TripForm from "./TripForm";

// Modal edit perjalanan. Dipakai dari kalender, Schedule, dan halaman Trip.
export default function TripModal({ trip, onClose, onSave }) {
  const [busy, setBusy] = useState(false);

  if (!trip) return null;

  const simpan = async (data) => {
    setBusy(true);
    const hasil = await onSave(data);
    setBusy(false);
    if (!hasil?.error) onClose();
    return hasil;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-grey-light">
              Edit perjalanan
            </h2>
            <p className="text-xs text-grey-light/60">{trip.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-grey-label/20"
          >
            <i className="fi fi-rr-cross-small text-xl leading-none"></i>
          </button>
        </div>

        <TripForm
          key={trip.id}
          initial={trip}
          onSubmit={simpan}
          onCancel={onClose}
          submitLabel="Simpan perubahan"
          busy={busy}
        />
      </div>
    </div>
  );
}
