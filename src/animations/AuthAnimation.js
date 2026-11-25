import gsap from "gsap";
import { gerakDikurangi } from "./introState";

// Animasi masuk halaman login / daftar: logo huruf demi huruf, form menyusul satu per satu,
// foto kota terbuka ke kanan lalu bergerak pelan (Ken Burns). Layout tidak berubah.
export const authIntro = (root) => {
  if (!root || gerakDikurangi()) return () => {};
  const kiri = root.children[0];
  const kanan = root.children[1];
  if (!kiri) return () => {};

  if (kanan) kanan.style.overflow = "hidden";
  const ctx = gsap.context(() => {
    const logo = kiri.querySelector("a");
    const isi = kiri.querySelectorAll("h2, h2 + p, form > *, form ~ h3");
    const footer = kiri.lastElementChild;
    const foto = kanan?.querySelector("img");

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (kanan && foto) {
      tl.fromTo(foto, { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.2, ease: "power2.out" }, 0);
      tl.to(foto, { scale: 1.07, duration: 18, ease: "sine.inOut", yoyo: true, repeat: -1 }, 2.4);
    }
    if (logo) tl.from(logo, { opacity: 0, duration: 1.2, ease: "power1.out" }, 0.2);
    if (isi.length) tl.from(isi, { y: 14, opacity: 0, filter: "blur(6px)", duration: 1.1, stagger: 0.08, ease: "power2.out", clearProps: "transform,opacity,filter" }, 0.3);
    if (footer && footer !== logo) tl.from(footer, { opacity: 0, duration: 1 }, 1);
  }, root);
  return () => ctx.revert();
};
