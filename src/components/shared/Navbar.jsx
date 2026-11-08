import { useState } from "react";
import { useLenis } from "lenis/react";
import { HOME_PIN_DISTANCE } from "../../animations/HomeAnimation";

const leftLinks = [
  { label: "Home", href: "#home" },
  { label: "Destination", href: "#destinations" },
];

const rightLinks = [
  { label: "Plan a trip", href: "#" },
  { label: "Info", href: "#" },
];

function NavLink({ href, label }) {
  return (
    <li>
      <a href={href} className="font-jakarta font-semibold text-sm text-dark-brown-new">
        {label}
      </a>
    </li>
  );
}

function Navbar() {
  const [solid, setSolid] = useState(false);

  // Background muncul setelah animasi garis selesai, lalu scroll dilanjutkan
  useLenis((lenis) => {
    setSolid(lenis.scroll > HOME_PIN_DISTANCE);
  });

  return (
    <header className="fixed top-3 inset-x-0 z-50 flex justify-center pointer-events-none">
      <nav
        className={`pointer-events-auto rounded-full border px-10 py-2 transition-all duration-300 ${
          solid
            ? "bg-grey-new/50 backdrop-blur-md border-white/20"
            : "bg-transparent border-transparent"
        }`}
      >
        <ul className="flex items-center gap-8">
          {leftLinks.map((link) => (
            <NavLink key={link.label} {...link} />
          ))}

          <li>
            <h1 className="font-clash font-bold text-2xl text-bright-white">
              SETAPAK
            </h1>
          </li>

          {rightLinks.map((link) => (
            <NavLink key={link.label} {...link} />
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;