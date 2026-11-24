export function bersihkanSitasi(teks) {
  if (typeof teks !== "string") return "";
  return teks
    .replace(/\s*【[^】]*】/g, "")
    .replace(/\s*\[\s*\d+\s*†[^\]]*\]/g, "")
    .replace(/\s*\d*†L\d+(?:-L\d+)?/g, "");
}
