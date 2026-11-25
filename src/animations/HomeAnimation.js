import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gerakDikurangi, introSelesai, pecahKata } from "./introState";

gsap.registerPlugin(ScrollTrigger);

export const HOME_PIN_DISTANCE = 1500;

export const svgHomeAnimation = (container) => {
  if (!container || window.innerWidth < 1024) return () => {};

  const section = container.closest("section");
  
  const mm = gsap.matchMedia();

  mm.add("(min-width: 1024px)", () => {
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
    mm.revert();
  };
};

// ---------------------------------------------------------------------------
// Animasi masuk hero (setelah tirai pembuka): langit zoom-out, foto depan
// "berjalan" membuka ke kanan, judul naik kata demi kata, tombol & garis menyusul,
// lalu parallax halus mengikuti mouse di desktop. Desain tidak berubah.
// ---------------------------------------------------------------------------
export const heroEntrance = (section) => {
  if (!section || gerakDikurangi()) return () => {};

  const sky = section.querySelector('[data-hero="sky"]');
  const front = section.querySelector('[data-hero="front"]');
  const text = section.querySelector('[data-hero="text"]');
  const title = section.querySelector('[data-hero="title"]');
  const sub = section.querySelector('[data-hero="sub"]');
  const cta = text?.querySelector("button");
  const garis = section.querySelector("#animasi-container");
  const headers = gsap.utils.toArray("header");

  const judul = title ? pecahKata(title) : null;
  const subKata = sub ? pecahKata(sub) : null;
  let batal = false;
  let tl;
  let stopMouse = () => {};

  const ctx = gsap.context(() => {
    if (sky) gsap.set(sky, { scale: 1.12, force3D: true });
    if (front) gsap.set(front, { opacity: 0, scale: 1.05, force3D: true });
    if (judul) gsap.set(judul.words, { yPercent: 105 });
    if (subKata) gsap.set(subKata.words, { yPercent: 125 });
    if (cta) gsap.set(cta, { y: 14, opacity: 0, scale: 0.97 });
    if (garis) gsap.set(garis, { opacity: 0 });
    if (headers.length) gsap.set(headers, { opacity: 0 });
  }, section);

  const siapGambar = Promise.all(
    [sky, front].filter(Boolean).map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
  );

  const pengaman = setTimeout(() => {
    gsap.set([sky, front, cta, garis, ...headers, ...(judul?.words || []), ...(subKata?.words || [])].filter(Boolean), {
      clearProps: "all",
    });
  }, 9000);

  Promise.all([introSelesai, siapGambar]).then(() => {
    clearTimeout(pengaman);
    if (batal) return;
    ctx.add(() => {
      tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        onComplete: () => {
          gsap.set([sky, front, cta, garis, ...headers].filter(Boolean), { clearProps: "transform,opacity" });
          if (text && garis && window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) {
            const tx = gsap.quickTo(text, "x", { duration: 1.2, ease: "power3.out" });
            const ty = gsap.quickTo(text, "y", { duration: 1.2, ease: "power3.out" });
            const gx = gsap.quickTo(garis, "x", { duration: 1.6, ease: "power3.out" });
            const gy = gsap.quickTo(garis, "y", { duration: 1.6, ease: "power3.out" });
            const move = (e) => {
              const nx = e.clientX / window.innerWidth - 0.5;
              const ny = e.clientY / window.innerHeight - 0.5;
              tx(nx * -14);
              ty(ny * -10);
              gx(nx * 26);
              gy(ny * 18);
            };
            window.addEventListener("pointermove", move);
            stopMouse = () => window.removeEventListener("pointermove", move);
          }
        },
      });
      if (sky) tl.to(sky, { scale: 1, duration: 3, ease: "power2.out" }, 0);
      if (front) tl.to(front, { opacity: 1, scale: 1, duration: 2, ease: "power2.out" }, 0.1);
      if (headers.length) tl.to(headers, { opacity: 1, duration: 1.2, stagger: 0.1, ease: "power1.out" }, 1);
      if (judul) tl.to(judul.words, { yPercent: 0, duration: 1.4, stagger: 0.07, ease: "power3.out" }, 0.8);
      if (subKata) tl.to(subKata.words, { yPercent: 0, duration: 1, stagger: 0.025 }, 1.2);
      if (garis) tl.to(garis, { opacity: 1, duration: 1.8, ease: "power1.out" }, 1.1);
      if (cta) tl.to(cta, { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "power3.out" }, 1.6);
    });
  });

  return () => {
    batal = true;
    clearTimeout(pengaman);
    stopMouse();
    tl?.kill();
    ctx.revert();
    judul?.restore();
    subKata?.restore();
  };
};

// ---------------------------------------------------------------------------
// Reveal saat scroll untuk section di bawah hero (teks naik, foto terbuka ke kanan).
// ---------------------------------------------------------------------------
export const scrollReveal = (root) => {
  if (!root || gerakDikurangi()) return () => {};
  const ctx = gsap.context(() => {
    const teks = gsap.utils.toArray(
      "#about h1, #about .flex.justify-center, #ordinary-travel h1, #find-your-place h1"
    );
    const kartu = gsap.utils.toArray("#ordinary-travel .overflow-hidden.rounded-2xl, #find-your-place img");

    [...teks, ...kartu].forEach((el, i) => {
      gsap.from(el, {
        y: 28,
        opacity: 0,
        filter: "blur(6px)",
        duration: 1.3,
        ease: "power3.out",
        delay: kartu.includes(el) ? (i % 4) * 0.08 : 0,
        clearProps: "transform,opacity,filter",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });
  }, root);
  // refresh sekali saja, setelah animasi masuk selesai (agar hero tidak tersendat)
  const t = setTimeout(() => ScrollTrigger.refresh(), 3500);
  return () => {
    clearTimeout(t);
    ctx.revert();
  };
};
