export const DISCLAIMER_TEKS =
  "Harap dicek di situs resmi (jam buka, harga tiket, jadwal, dan ketersediaan) sebelum berangkat. AI dapat melakukan kesalahan.";

// Peringatan standar untuk semua halaman Trip yang isinya dibuat/dibantu AI.
export default function TripDisclaimer({ className = "" }) {
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-2xl border border-[#83ADD0]/40 bg-[#83ADD0]/10 px-4 py-3 font-jakarta text-xs font-medium text-grey-light/80 ${className}`}
    >
      <i className="fi fi-rr-info mt-0.5 text-sm leading-none text-[#6f9abf]"></i>
      <span>{DISCLAIMER_TEKS}</span>
    </p>
  );
}
