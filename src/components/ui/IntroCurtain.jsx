import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { gerakDikurangi, tandaiIntroSelesai } from "../../animations/introState";

const KEY = "setapak:intro-seen";
const sudahLihat = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

// Tirai pembuka: wordmark muncul huruf demi huruf, lalu dua panel "berjalan ke kanan"
// membuka halaman. Hanya sekali per sesi dan dilewati bila gerak dikurangi.
export default function IntroCurtain() {
  const [tampil, setTampil] = useState(() => !sudahLihat() && !gerakDikurangi());
  const root = useRef(null);

  useLayoutEffect(() => {
    if (!tampil) {
      tandaiIntroSelesai();
      return undefined;
    }
    const html = document.documentElement;
    html.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      const huruf = gsap.utils.toArray(".ic-huruf");
      gsap.set(root.current, { opacity: 1 });
      const tl = gsap.timeline({
        onComplete: () => {
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* abaikan */
          }
          html.style.overflow = "";
          setTampil(false);
        },
      });
      tl.from(huruf, { opacity: 0, y: 18, filter: "blur(14px)", duration: 1.1, ease: "power3.out", stagger: 0.09 })
        .from(".ic-garis", { scaleX: 0, duration: 1.1, ease: "power2.inOut", transformOrigin: "50% 50%" }, 0.5)
        .from(".ic-tag", { opacity: 0, duration: 0.9, ease: "power1.out" }, 1)
        .add("buka", "+=0.55")
        .add(tandaiIntroSelesai, "buka+=0.2")
        .to(".ic-isi", { opacity: 0, y: -10, duration: 0.7, ease: "power2.in" }, "buka")
        .to(root.current, { opacity: 0, duration: 1.2, ease: "power2.inOut" }, "buka+=0.2");
    }, root);
    return () => {
      ctx.revert();
      html.style.overflow = "";
    };
  }, [tampil]);

  if (!tampil) return null;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-auto fixed inset-0 z-[200]">
      <div className="ic-krem absolute inset-0 flex flex-col items-center justify-center bg-[#F3EBDD]">
        <div className="ic-isi flex flex-col items-center">
        <div className="flex overflow-hidden px-2 pb-2 font-clash text-6xl font-bold text-[#29241F] max-sm:text-4xl">
          {"SETAPAK".split("").map((h, i) => (
            <span key={i} className="ic-huruf inline-block">
              {h}
            </span>
          ))}
        </div>
        <div className="ic-garis mt-3 h-[3px] w-56 rounded-full bg-[#C8AA78] max-sm:w-36" />
        <p className="ic-tag mt-4 font-jakarta text-sm font-medium text-[#75604A]">
          Plan your next trip across multiple destinations
        </p>
        </div>
      </div>
    </div>
  );
}
