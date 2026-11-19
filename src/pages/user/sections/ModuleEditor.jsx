import { useState } from "react";
import ModuleField from "./ModuleField";
import {
  barisAwal,
  durasiHari,
  formatRupiah,
} from "../../../utils/tripModules";

const salin = (nilai) => JSON.parse(JSON.stringify(nilai ?? {}));

function Ringkasan({ modul, draft }) {
  if (modul.id === "dates") {
    const hari = durasiHari(draft.startDate, draft.endDate);
    if (!hari) return null;
    return (
      <p className="rounded-xl bg-[#83ADD0]/10 px-3 py-2 text-xs font-semibold text-[#6f9abf]">
        {hari} hari · {Math.max(0, hari - 1)} malam
      </p>
    );
  }
  if (modul.id === "budget") {
    const total = (draft.items || []).reduce(
      (jumlah, item) => jumlah + (Number(item.amount) || 0),
      0
    );
    const sisa = (Number(draft.planned) || 0) - total;
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-xl bg-[#83ADD0]/10 px-3 py-2 font-semibold text-[#6f9abf]">
          Terpakai {formatRupiah(total)}
        </span>
        <span
          className={`rounded-xl px-3 py-2 font-semibold ${
            sisa < 0
              ? "bg-red-50 text-red-600"
              : "bg-grey-label/20 text-grey-light/70"
          }`}
        >
          {sisa < 0 ? "Lebih" : "Sisa"} {formatRupiah(Math.abs(sisa))}
        </span>
      </div>
    );
  }
  if (modul.id === "packing") {
    const barang = draft.items || [];
    if (!barang.length) return null;
    const siap = barang.filter((item) => item.packed).length;
    return (
      <p className="rounded-xl bg-[#83ADD0]/10 px-3 py-2 text-xs font-semibold text-[#6f9abf]">
        {siap} dari {barang.length} barang sudah disiapkan
      </p>
    );
  }
  return null;
}

// Editor generik untuk satu modul. State lokal berupa draf, jadi perubahan
// belum masuk ke store sampai tombol Simpan ditekan.
export default function ModuleEditor({ modul, bagian, onSave }) {
  const [draft, setDraft] = useState(() => salin(bagian));
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);

  const berubah = JSON.stringify(draft) !== JSON.stringify(bagian);

  const ubahDraf = (pembaharuan) => {
    setDraft((prev) => ({ ...prev, ...pembaharuan }));
    setPesan("");
  };

  const ubahField = (key, nilai) => ubahDraf({ [key]: nilai });

  const ubahBaris = (collectionKey, index, fieldKey, nilai) => {
    setDraft((prev) => ({
      ...prev,
      [collectionKey]: (prev[collectionKey] || []).map((baris, i) =>
        i === index ? { ...baris, [fieldKey]: nilai } : baris
      ),
    }));
    setPesan("");
  };

  const tambahBaris = (collection) => {
    setDraft((prev) => ({
      ...prev,
      [collection.key]: [...(prev[collection.key] || []), barisAwal(collection)],
    }));
    setPesan("");
  };

  const hapusBaris = (collectionKey, index) => {
    setDraft((prev) => ({
      ...prev,
      [collectionKey]: (prev[collectionKey] || []).filter((_, i) => i !== index),
    }));
    setPesan("");
  };

  const pindahBaris = (collectionKey, index, arah) => {
    const tujuan = index + arah;
    setDraft((prev) => {
      const baris = [...(prev[collectionKey] || [])];
      if (tujuan < 0 || tujuan >= baris.length) return prev;
      [baris[index], baris[tujuan]] = [baris[tujuan], baris[index]];
      return { ...prev, [collectionKey]: baris };
    });
    setPesan("");
  };

  const simpan = async () => {
    setBusy(true);
    const hasil = await onSave(modul.id, draft);
    setBusy(false);
    setPesan(hasil?.error ? hasil.error : "Tersimpan.");
    return hasil;
  };

  return (
    <div className="rounded-3xl border-2 border-grey-label/50 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6f9abf]">
            Modul {modul.no} dari 15
          </p>
          <h2 className="mt-1 font-clash text-2xl font-bold text-grey-light md:text-3xl">
            {modul.name}
          </h2>
          <p className="mt-1 text-xs font-semibold text-grey-light/50">
            {modul.label}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-grey-light/70">{modul.desc}</p>
        </div>
        <button
          type="button"
          onClick={simpan}
          disabled={busy || !berubah}
          className="inline-flex items-center gap-2 rounded-full bg-[#83ADD0] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="fi fi-rr-disk text-sm leading-none"></i>
          {busy ? "Menyimpan..." : berubah ? "Simpan modul" : "Tersimpan"}
        </button>
      </div>

      <div className="mt-5">
        <Ringkasan modul={modul} draft={draft} />
      </div>

      {(modul.fields || []).length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {modul.fields.map((field, index) => (
            <ModuleField
              key={field.key}
              id={`${modul.id}-${field.key}-${index}`}
              field={field}
              value={draft[field.key]}
              onChange={(nilai) => ubahField(field.key, nilai)}
            />
          ))}
        </div>
      )}

      {(modul.collections || []).map((collection) => {
        const baris = draft[collection.key] || [];
        return (
          <div key={collection.key} className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-grey-light">
                {collection.label}
                <span className="ml-2 text-xs font-medium text-grey-light/50">
                  {baris.length} entri
                </span>
              </h3>
              <button
                type="button"
                onClick={() => tambahBaris(collection)}
                className="inline-flex items-center gap-1 rounded-full border border-[#83ADD0] px-3 py-1.5 text-xs font-semibold text-[#6f9abf] hover:bg-[#83ADD0]/10"
              >
                <i className="fi fi-br-plus text-sm leading-none"></i>
                Tambah
              </button>
            </div>

            {baris.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-grey-label/60 px-3 py-4 text-center text-xs text-grey-light/50">
                Belum ada entri. Klik Tambah untuk mengisi modul ini.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {baris.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-grey-label/50 bg-grey-label/10 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-grey-light/60">
                        #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => pindahBaris(collection.key, index, -1)}
                          disabled={index === 0}
                          aria-label={`Naikkan entri ${index + 1}`}
                          className="rounded-lg p-1 text-grey-light/50 hover:bg-grey-label/30 disabled:opacity-20"
                        >
                          <i className="fi fi-rr-angle-small-up text-base leading-none"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => pindahBaris(collection.key, index, 1)}
                          disabled={index === baris.length - 1}
                          aria-label={`Turunkan entri ${index + 1}`}
                          className="rounded-lg p-1 text-grey-light/50 hover:bg-grey-label/30 disabled:opacity-20"
                        >
                          <i className="fi fi-rr-angle-small-down text-base leading-none"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => hapusBaris(collection.key, index)}
                          aria-label={`Hapus entri ${index + 1}`}
                          className="rounded-lg p-1 text-grey-light/50 hover:bg-red-50 hover:text-red-600"
                        >
                          <i className="fi fi-rr-trash text-sm leading-none"></i>
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {collection.fields.map((field, fieldIndex) => (
                        <ModuleField
                          key={field.key}
                          id={`${modul.id}-${collection.key}-${index}-${field.key}-${fieldIndex}`}
                          field={field}
                          value={item[field.key]}
                          onChange={(nilai) =>
                            ubahBaris(collection.key, index, field.key, nilai)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-grey-label/30 pt-4">
        <p
          role="status"
          className={`text-xs ${pesan && pesan !== "Tersimpan." ? "text-red-600" : "text-grey-light/50"}`}
        >
          {pesan ||
            (berubah
              ? "Ada perubahan yang belum disimpan."
              : "Perubahan tersimpan otomatis di perjalanan ini.")}
        </p>
        <button
          type="button"
          onClick={simpan}
          disabled={busy || !berubah}
          className="rounded-full bg-[#83ADD0] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Menyimpan..." : "Simpan modul"}
        </button>
      </div>
    </div>
  );
}
