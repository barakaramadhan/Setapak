import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const initHomeAnimation = (container) => {
  if (!container) return () => {};

  // yang di-pin = seluruh section, bukan container garis
  const section = container.closest("section");

  const ctx = gsap.context(() => {
    const paths = gsap.utils.toArray(".garis");
    const ikon1 = container.querySelector("#ikon-1");
    const ikon2 = container.querySelector("#ikon-2");
    const melayang = gsap.utils.toArray(".melayang");

    // Sembunyikan garis di awal
    paths.forEach((path) => {
      const length = path.getTotalLength();

      gsap.set(path, {
        strokeDasharray: `${length} ${length * 2}`,
        strokeDashoffset: length + 20,
      });
    });

    // Ikon mulai dari scale 0, membesar dari titik tengahnya sendiri
    gsap.set([ikon1, ikon2], {
      scale: 0,
      transformOrigin: "50% 50%",
    });

    // Efek melayang (jalan sendiri, tidak ikut scroll)
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
        end: "+=1500",
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    const len1 = paths[0].getTotalLength();
    const len2 = paths[1].getTotalLength();
    const len3 = paths[2].getTotalLength();

    // 1) Garis awal
    timeline.to(paths[0], { strokeDashoffset: 0, duration: len1 });
    // Ikon orang pop-in saat garis awal hampir selesai
    timeline.to(
      ikon2,
      { scale: 1, duration: 120, ease: "back.out(1.7)" },
      len1 * 0.9
    );

    // 2) Loop
    timeline.to(paths[1], { strokeDashoffset: 0, duration: len2 });
    // Ikon pin pop-in saat loop berjalan
    timeline.to(
      ikon1,
      { scale: 1, duration: 120, ease: "back.out(1.7)" },
      len1 + len2 * 0.4
    );

    // 3) Ekor garis
    timeline.to(paths[2], { strokeDashoffset: 0, duration: len3 });
  }, container);

  // Hitung ulang posisi scroll setelah gambar selesai dimuat
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  const imgs = Array.from(section.querySelectorAll("img"));
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener("load", refresh);
  });

  return () => {
    window.removeEventListener("load", refresh);
    imgs.forEach((img) => img.removeEventListener("load", refresh));
    ctx.revert();
  };
};