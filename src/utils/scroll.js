// Posisi atas sebuah section di dalam dokumen (px).
// Elemen "sticky" (mis. Recomendations) dihitung dari posisi aslinya,
// yaitu tepat di bawah elemen sebelumnya, bukan posisi saat sedang menempel.
export function getSectionTop(el) {
  if (!el) return 0;

  const isSticky = window.getComputedStyle(el).position === "sticky";
  const prev = el.previousElementSibling;

  if (isSticky && prev) {
    return prev.getBoundingClientRect().bottom + window.scrollY;
  }

  return el.getBoundingClientRect().top + window.scrollY;
}
