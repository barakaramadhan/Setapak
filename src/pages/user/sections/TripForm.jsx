import { useState } from "react";
import InputAll from "../../../components/ui/InputAll";
import { toDateKey } from "../../../utils/tripDate";

const isiAwal = (initial) => {
  const hariIni = toDateKey(new Date());
  return {
    title: initial?.title || "",
    date: initial?.date || hariIni,
    endDate: initial?.endDate || initial?.date || hariIni,
    city: initial?.city || "",
    place: initial?.place || "",
    notes: initial?.notes || "",
  };
};

// Form bersama untuk tambah & edit perjalanan. Dipakai Schedule, popover
// kalender, dan halaman Trip supaya perilakunya identik di semua tempat.
export default function TripForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Simpan trip",
  busy = false,
}) {
  const [form, setForm] = useState(() => isiAwal(initial));
  const [pesan, setPesan] = useState("");

  const ubah = (kunci) => (event) =>
    setForm((prev) => ({ ...prev, [kunci]: event.target.value }));

  const kirim = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.title.trim() || !form.date) {
      setPesan("Judul dan tanggal mulai wajib diisi.");
      return;
    }
    if (form.endDate && form.endDate < form.date) {
      setPesan("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setPesan("");
    const hasil = await onSubmit({
      ...form,
      title: form.title.trim(),
      plan: initial?.plan || null,
    });
    if (hasil?.error) setPesan(hasil.error);
  };

  return (
    <form onSubmit={kirim} className="flex flex-col gap-3">
      <label className="block text-xs font-semibold text-grey-light/70">
        Judul perjalanan
        <InputAll
          autoFocus
          value={form.title}
          onChange={ubah("title")}
          placeholder="Mis. Jalan-jalan keluarga"
          maxLength={100}
          aria-label="Judul perjalanan"
          className="mt-1 w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold text-grey-light/70">
          Mulai
          <InputAll
            type="date"
            value={form.date}
            onChange={ubah("date")}
            aria-label="Tanggal mulai"
            className="mt-1 w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-grey-light/70">
          Selesai
          <InputAll
            type="date"
            value={form.endDate}
            onChange={ubah("endDate")}
            aria-label="Tanggal selesai"
            className="mt-1 w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
          />
        </label>
      </div>

      <InputAll
        value={form.city}
        onChange={ubah("city")}
        placeholder="Kota (opsional)"
        maxLength={60}
        aria-label="Kota"
        className="w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
      />
      <InputAll
        value={form.place}
        onChange={ubah("place")}
        placeholder="Agenda: Curug, Pemandian, Makan siang"
        maxLength={240}
        aria-label="Agenda perjalanan"
        className="w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
      />
      <p className="-mt-1 text-[11px] text-grey-light/50">
        Pisahkan agenda dengan koma. Kalau rencana berasal dari chat, agenda
        harian otomatis ikut tersimpan.
      </p>
      <InputAll
        value={form.notes}
        onChange={ubah("notes")}
        placeholder="Catatan (opsional)"
        maxLength={240}
        aria-label="Catatan"
        className="w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-2 text-sm"
      />

      {pesan && (
        <p role="alert" className="text-xs text-red-600">
          {pesan}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-grey-label/60 py-2 text-sm font-semibold text-grey-light hover:bg-grey-label/15"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-[#83ADD0] py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
