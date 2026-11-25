import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gerakDikurangi } from "../../../animations/introState";
import ImageStep1 from "../../../assets/images/how-it-works/imagestep1.webp";
import ImageStep2 from "../../../assets/images/how-it-works/imagestep2.webp";
import ImageStep3 from "../../../assets/images/how-it-works/imagestep3.webp";
import ImageStep4 from "../../../assets/images/how-it-works/imagestep4.webp";
import ImageStep5 from "../../../assets/images/how-it-works/imagestep5.webp";
import ImageStep6 from "../../../assets/images/how-it-works/imagestep6.webp";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    id: 1,
    number: "01",
    title: "Set your preferences",
    description: "Destination, dates, budget, and travel style",
    imageLeft: ImageStep1,
    imageRight: ImageStep2,
  },
  {
    id: 2,
    number: "02",
    title: "AI builds your itinerary",
    description: "Destinations, timing, and transportation",
    imageLeft: ImageStep3,
    imageRight: ImageStep4,
  },
  {
    id: 3,
    number: "03",
    title: "Edit and save",
    description: "Review activities, rearrange, and share",
    imageLeft: ImageStep5,
    imageRight: ImageStep6,
  },
];

// Waktu (detik timeline) tiap perpindahan langkah; scroll di-scrub ke timeline ini.
const GESER = [0.7, 3.0];
const S2 = 2.25;
const TOTAL = 5.0;

function HowItWorks() {
  const root = useRef(null);
  const stRef = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || gerakDikurangi()) return undefined;
    const q = (s) => gsap.utils.toArray(s, el);
    const mm = gsap.matchMedia();

    // ===== DESKTOP: section di-pin, scroll membuka langkah 1 -> 2 -> 3 =====
    mm.add("(min-width: 1024px)", () => {
      const teks = q("[data-step]");
      const kiri = q("[data-kiri]");
      const kanan = q("[data-kanan]");
      const titik = q("[data-titik]");
      const judul = q("[data-judul] span");

      gsap.set(teks.slice(1), { opacity: 0, y: 24, scale: 0.94, filter: "blur(8px)" });
      gsap.set(teks[0], { scale: 1.05 });
      gsap.set([...kiri.slice(1), ...kanan.slice(1)], { opacity: 0 });
      gsap.set(kiri, { rotation: -12, transformOrigin: "50% 100%", force3D: true });
      gsap.set(kanan, { rotation: 12, transformOrigin: "50% 100%", force3D: true });
      gsap.set("[data-progres]", { scaleX: 0, transformOrigin: "0% 50%" });

      // judul SETAPAK naik huruf demi huruf saat section mulai terlihat
      gsap.from(judul, {
        yPercent: 110,
        duration: 1,
        ease: "expo.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.4}`,
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
          refreshPriority: -1,
          invalidateOnRefresh: true,
          onRefresh: (self) => (stRef.current = self),
        },
      });
      tl.addLabel("s1", 0);

      // gerak melayang halus sepanjang scroll (parallax)
      tl.fromTo([...new Set([...kiri, ...kanan].map((n) => n.parentElement))], { y: 14 }, { y: -14, duration: TOTAL }, 0);

      GESER.forEach((t, i) => {
        const dari = i;
        const ke = i + 1;
        // langkah lama meredup halus, langkah baru muncul (fade + fokus), tanpa slide
        tl.to(teks[dari], { opacity: 0.28, scale: 0.92, filter: "blur(1.5px)", duration: 0.9, ease: "power2.inOut" }, t);
        tl.to(teks[ke], { opacity: 1, y: 0, scale: 1.05, filter: "blur(0px)", duration: 1, ease: "power2.out" }, t + 0.2);
        // foto: crossfade elegan di tempat (sedikit zoom), tanpa terbang dari samping
        [[kiri, -12], [kanan, 12]].forEach(([arr, rot]) => {
          tl.to(arr[dari], { opacity: 0, scale: 0.94, rotation: rot * 1.15, duration: 0.8, ease: "power2.inOut" }, t);
          tl.fromTo(
            arr[ke],
            { opacity: 0, scale: 1.08, rotation: rot * 0.85 },
            { opacity: 1, scale: 1, rotation: rot, duration: 1.1, ease: "power2.out" },
            t + 0.3
          );
        });
        tl.to(titik[ke], { scale: 1.5, backgroundColor: "#C8AA78", duration: 0.5, ease: "power2.out" }, t + 0.3);
        tl.to(titik[dari], { scale: 1, duration: 0.4 }, t + 0.3);
      });
      tl.to("[data-progres]", { scaleX: 1, duration: TOTAL }, 0);
      gsap.set(titik[0], { scale: 1.5, backgroundColor: "#C8AA78" });

      return () => {
        stRef.current = null;
      };
    });

    // ===== MOBILE / TABLET: tiap langkah muncul bergantian saat di-scroll =====
    mm.add("(max-width: 1023px)", () => {
      q("[data-step]").forEach((n) => {
        gsap.from(n, {
          y: 70,
          opacity: 0,
          scale: 0.9,
          filter: "blur(8px)",
          duration: 1,
          ease: "expo.out",
          clearProps: "transform,opacity,filter",
          scrollTrigger: { trigger: n, start: "top 88%", once: true },
        });
      });
    });

    return () => mm.revert();
  }, []);

  // klik langkah -> scroll ke posisi langkah itu (desktop)
  const lompat = (i) => {
    const st = stRef.current;
    if (!st) return;
    const waktu = [0, S2, TOTAL][i];
    const y = st.start + (waktu / TOTAL) * (st.end - st.start);
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section
      ref={root}
      className="bg-grey-light text-white min-h-[600px] lg:min-h-screen py-12 px-10 mt-20 rounded-t-4xl relative z-10 overflow-hidden flex flex-col max-md:rounded-t-[50%/60px] max-sm:rounded-t-[50%/40px] max-sm:px-5"
    >
      <h2
        data-judul
        aria-label="Setapak"
        className="text-center text-3xl font-bold font-clash text-white uppercase max-sm:text-2xl mb-4 flex justify-center overflow-hidden"
      >
        {"SETAPAK".split("").map((h, i) => (
          <span key={i} aria-hidden="true" className="inline-block">
            {h}
          </span>
        ))}
      </h2>

      <div className="hidden lg:flex items-center justify-center gap-3 mb-4" aria-hidden="true">
        {steps.map((s) => (
          <span key={s.id} data-titik className="h-2 w-2 rounded-full bg-grey-new/50" />
        ))}
      </div>
      <div className="hidden lg:block mx-auto mb-6 h-[2px] w-56 overflow-hidden rounded-full bg-grey-new/20" aria-hidden="true">
        <div data-progres className="h-full w-full rounded-full bg-light-brown-new" />
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-3 items-center gap-10 lg:gap-0">
        <div className="hidden lg:flex justify-start pl-10">
          <div className="relative h-[400px] w-64">
            {steps.map((s) => (
              <img
                key={s.id}
                data-kiri
                src={s.imageLeft}
                alt={`Step ${s.id} left`}
                className="absolute inset-0 w-64 h-[400px] object-cover rounded-3xl shadow-2xl"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-12 text-center items-center lg:mt-11">
          {steps.map((step, i) => (
            <div
              key={step.id}
              data-step
              className="cursor-pointer text-new-bright will-change-transform"
              onClick={() => lompat(i)}
            >
              <h3 className="text-3xl text-light-brown-new font-clash font-bold mb-1">{step.number}</h3>
              <h4 className="text-4xl font-jakarta font-regular leading-none max-w-[250px] mx-auto mb-2 max-sm:text-2xl">
                {step.title}
              </h4>
              <p className="text-base font-jakarta font-regular text-grey-new max-sm:text-sm">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="hidden lg:flex justify-end pr-10">
          <div className="relative h-[400px] w-64">
            {steps.map((s) => (
              <img
                key={s.id}
                data-kanan
                src={s.imageRight}
                alt={`Step ${s.id} right`}
                className="absolute inset-0 w-64 h-[400px] object-cover rounded-3xl shadow-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
