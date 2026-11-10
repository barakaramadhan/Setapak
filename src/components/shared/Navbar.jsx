import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { HOME_PIN_DISTANCE } from "../../animations/HomeAnimation";
import useActiveSection from "../../hooks/useActiveSection";
import { getSectionTop } from "../../utils/scroll";

const leftLinks = [
  { label: "Home", href: "#home" },
  { label: "Destination", href: "#recomendations" },
];

const rightLinks = [
  { label: "Plan a trip", href: "#find-your-place" },
  { label: "Info", href: "#footer" },
];

// id section yang dipantau untuk isActive (urutan bebas)
const sectionIds = [...leftLinks, ...rightLinks].map((link) => link.href.slice(1));

function Navbar() {
  const [solid, setSolid] = useState(false);
  const active = useActiveSection(sectionIds);

  const listRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef({});
  const firstPlace = useRef(true);

  // Background muncul setelah animasi garis selesai, lalu scroll dilanjutkan
  const lenis = useLenis((instance) => {
    setSolid(instance.scroll > HOME_PIN_DISTANCE);
  });

  // Klik menu: scroll halus ke section tujuan
  const handleClick = (e, href) => {
    e.preventDefault();
    e.stopPropagation();

    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    const top = id === "home" ? 0 : getSectionTop(target);

    if (lenis) {
      lenis.scrollTo(top, { duration: 1.4 });
    } else {
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // Geser "pill" ke menu yang aktif
  useLayoutEffect(() => {
    const place = (animate) => {
      const item = itemRefs.current[active];
      const pill = pillRef.current;
      if (!item || !pill) return;

      pill.style.transition = animate ? "" : "none";
      pill.style.width = `${item.offsetWidth}px`;
      pill.style.transform = `translateX(${item.offsetLeft}px)`;
      pill.style.opacity = "1";
    };

    place(!firstPlace.current);
    firstPlace.current = false;

    // Hitung ulang kalau lebar menu berubah (mis. font selesai dimuat)
    const list = listRef.current;
    if (!list || !window.ResizeObserver) return;

    // ResizeObserver selalu memanggil callback sekali saat mulai observe; lewati
    let skipFirst = true;
    const observer = new ResizeObserver(() => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      place(false);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    // Reset state "pertama kali" supaya mount ulang tidak menganimasikan pill dari 0
    return () => {
      firstPlace.current = true;
    };
  }, []);

  const renderLink = ({ label, href }) => {
    const id = href.slice(1);
    const isActive = active === id;

    return (
      <li
        key={label}
        ref={(el) => {
          itemRefs.current[id] = el;
        }}
      >
        <a
          href={href}
          onClick={(e) => handleClick(e, href)}
          aria-current={isActive ? "location" : undefined}
          className={`relative z-10 block px-4 py-1.5 font-jakarta font-semibold text-sm transition-colors duration-300 ${
            isActive ? "text-bright-white" : "text-dark-brown-new"
          }`}
        >
          {label}
        </a>
      </li>
    );
  };

  return (
    <header className="fixed top-3 inset-x-0 z-50 flex justify-center pointer-events-none">
      <nav
        className={`pointer-events-auto rounded-full border px-6 py-2 transition-all duration-300 ${
          solid
            ? "bg-grey-new/50 backdrop-blur-md border-white/20"
            : "bg-transparent border-transparent"
        }`}
      >
        <ul ref={listRef} className="relative flex items-center">
          {/* Pill isActive: bergeser mengikuti menu yang aktif */}
          <span
            ref={pillRef}
            aria-hidden="true"
            style={{ opacity: 0 }}
            className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-dark-brown-new transition-[transform,width] duration-300 ease-out"
          />

          {leftLinks.map(renderLink)}

          <li className="px-4">
            <a href="#home" onClick={(e) => handleClick(e, "#home")}>
              <h1 className="font-clash font-bold text-2xl text-bright-white">
                SETAPAK
              </h1>
            </a>
          </li>

          {rightLinks.map(renderLink)}
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
