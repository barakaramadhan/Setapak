// Penanda "tirai pembuka selesai" supaya animasi hero menunggu giliran.
let selesai;
export const introSelesai = new Promise((resolve) => {
  selesai = resolve;
});
export const tandaiIntroSelesai = () => selesai();

export const gerakDikurangi = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pecah teks jadi kata-kata bertopeng (untuk reveal naik). Mengembalikan { words, restore }.
export function pecahKata(el) {
  const asli = el.innerHTML;
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
          const mask = document.createElement("span");
          mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em";
          const inner = document.createElement("span");
          inner.style.display = "inline-block";
          inner.textContent = part;
          mask.appendChild(inner);
          frag.appendChild(mask);
          words.push(inner);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    });
  };
  walk(el);
  return { words, restore: () => (el.innerHTML = asli) };
}
