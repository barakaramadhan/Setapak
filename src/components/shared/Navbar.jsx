import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { HOME_PIN_DISTANCE } from "../../animations/HomeAnimation";
import useActiveSection from "../../hooks/useActiveSection";
import { getSectionTop } from "../../utils/scroll";
import FillButton from "../ui/FillButton";

const leftLinks = [
  { label: "Home", href: "#home" },
  { label: "Plan a Trip", href: "#find-your-place" },
];

const rightLinks = [
  { label: "Destination", href: "#recomendations" },
  { label: "Info", href: "#footer" },
];

// Menu khusus sidebar mobile (urutan & ikon sesuai desain)
// Semua ikon ditulis versi outline (fi-rr-), versi solid dipakai otomatis saat menu aktif
const mobileLinks = [
  { label: "Home", href: "#home", icon: "fi fi-rr-house-blank" },
  { label: "Destination", href: "#recomendations", icon: "fi fi-rr-marker" },
  {
    label: "Plan a trip",
    href: "#find-your-place",
    icon: "fi fi-rr-briefcase-blank",
  },
  { label: "Info", href: "#footer", icon: "fi fi-rr-info" },
];

// id section yang dipantau untuk isActive (urutan bebas)
const sectionIds = [...leftLinks, ...rightLinks].map((link) =>
  link.href.slice(1),
);

function Navbar() {
  const [solid, setSolid] = useState(false);
  const [mobileSolid, setMobileSolid] = useState(false); // background bar mobile (muncul begitu di-scroll)
  const [menuOpen, setMenuOpen] = useState(false); // buka/tutup sidebar mobile
  const active = useActiveSection(sectionIds);

  const listRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef({});
  const firstPlace = useRef(true);

  // Background muncul setelah animasi garis selesai, lalu scroll dilanjutkan
  const lenis = useLenis((instance) => {
    setSolid(instance.scroll > HOME_PIN_DISTANCE);
    setMobileSolid(instance.scroll > 20);
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

  // Klik menu di sidebar mobile: tutup sidebar, lalu scroll ke section
  const handleMobileClick = (e, href) => {
    setMenuOpen(false);
    handleClick(e, href);
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
    <>
      {/* ===== NAVBAR DESKTOP (disembunyikan di mobile) ===== */}
      <header className="fixed top-3 inset-x-0 z-50 flex justify-center pointer-events-none max-sm:hidden">
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

      {/* ===== NAVBAR MOBILE (hanya tampil di mobile) ===== */}
      <div className="hidden max-sm:block">
        {/* 1. Bar atas: logo + tombol menu */}
        <header
          className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-4 transition-all duration-300 ${
            mobileSolid
              ? "bg-dark-brown-new/30 backdrop-blur-md rounded-b-2xl"
              : "bg-transparent"
          }`}
        >
          <a href="#home" onClick={(e) => handleMobileClick(e, "#home")}>
            <span className="font-clash font-bold text-2xl text-bright-white">
              SETAPAK
            </span>
          </a>

          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/30 text-xl text-bright-white"
          >
            <i className="fi fi-rr-bars-staggered" />
          </button>
        </header>

        {/* 2. Layar gelap + blur di belakang sidebar (klik untuk menutup) */}
        <div
          onClick={() => setMenuOpen(false)}
          className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        {/* 3. Sidebar: geser dari kiri */}
        <aside
          className={`fixed top-0 left-0 z-50 flex h-full w-3/4 flex-col rounded-r-3xl bg-white px-8 py-8 transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Atas: logo + tombol tutup */}
          <div className="flex items-center justify-between">
            <span className="font-clash font-bold text-2xl text-black">
              SETAPAK
            </span>

            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setMenuOpen(false)}
              className="text-2xl mt-1 text-black"
            >
              <i class="fi fi-br-cross-small"></i>
            </button>
          </div>

          {/* Daftar menu */}
          <ul className="mt-10 flex flex-col gap-8">
            {mobileLinks.map(({ label, href, icon }) => {
              // menu yang sedang aktif -> ikon jadi solid & hitam
              const isActive = active === href.slice(1);

              return (
                <li key={label}>
                  <a
                    href={href}
                    onClick={(e) => handleMobileClick(e, href)}
                    className="flex items-center gap-4 font-jakarta text-lg text-dark-brown-new"
                  >
                    <i
                      className={`${
                        isActive ? icon.replace("fi-rr-", "fi-sr-") : icon
                      } text-xl ${
                        isActive ? "text-black" : "text-dark-brown-new"
                      }`}
                    />
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Bawah: tombol Sign Up & Log In (mt-auto = didorong ke dasar) */}
          <div className="mt-auto flex flex-col gap-4">
            <FillButton
              className="w-full rounded-xl py-3 bg-grey-light text-bright-white ring-dark-brown-new "
              fillClassName="bg-bright-white text-dark-brown-new"
              baseCla
            >
              Sign Up
            </FillButton>

            <FillButton
              className="w-full rounded-xl py-3 text-grey-light ring-grey-light"
              fillClassName="bg-dark-brown-new text-bright-white"
            >
              Log In
            </FillButton>
          </div>
        </aside>
      </div>
    </>
  );
}

export default Navbar;