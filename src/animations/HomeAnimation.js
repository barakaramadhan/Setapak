import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Panjang scroll selama garis digambar (px).
export const HOME_PIN_DISTANCE = 1500;

export const svgHomeAnimation = (container) => {
  // 1. BYPASS KASAR: Jika layar adalah mobile (< 640px), jangan jalankan GSAP sama sekali
  if (!container || window.innerWidth < 640) return () => {};

  const section = container.closest("section");
  
  // 2. Gunakan matchMedia sebagai pengganti context
  const mm = gsap.matchMedia();

  // Animasi HANYA akan dibuat jika layar minimal 640px (Desktop/Tablet besar)
  mm.add("(min-width: 640px)", () => {
    const paths = gsap.utils.toArray(".garis");
    const ikon1 = container.querySelector("#ikon-1");
    const ikon2 = container.querySelector("#ikon-2");
    const melayang = gsap.utils.toArray(".melayang");

    paths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: `${length} ${length * 2}`,
        strokeDashoffset: length + 20,
      });
    });

    gsap.set([ikon1, ikon2], {
      scale: 0,
      transformOrigin: "50% 50%",
    });

    gsap.to(melayang, {
      y: -8,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: `+=${HOME_PIN_DISTANCE}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    const len1 = paths[0].getTotalLength();
    const len2 = paths[1].getTotalLength();
    const len3 = paths[2].getTotalLength();

    timeline.to(paths[0], { strokeDashoffset: 0, duration: len1 });
    timeline.to(ikon2, { scale: 1, duration: 120, ease: "back.out(1.7)" }, len1 * 0.9);
    
    timeline.to(paths[1], { strokeDashoffset: 0, duration: len2 });
    timeline.to(ikon1, { scale: 1, duration: 120, ease: "back.out(1.7)" }, len1 + len2 * 0.4);
    
    timeline.to(paths[2], { strokeDashoffset: 0, duration: len3 });
    
  }, container); // <--- Scope tetap dikunci di container

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  const imgs = Array.from(section.querySelectorAll("img"));
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener("load", refresh);
  });

  return () => {
    window.removeEventListener("load", refresh);
    imgs.forEach((img) => img.removeEventListener("load", refresh));
    // 3. Bersihkan memori matchMedia saat halaman berpindah
    mm.revert();
  };
};