/** Hapus penanda sitasi mesin pencari AI, mis. 【3†L6-L10】 atau 3†L6-L10. */
export function bersihkanSitasi(teks) {
  if (typeof teks !== "string") return "";
  return teks
    .replace(/\s*【[^】]*】/g, "")
    .replace(/\s*\[\s*\d+\s*†[^\]]*\]/g, "")
    .replace(/\s*\d*†L\d+(?:-L\d+)?/g, "");
}
