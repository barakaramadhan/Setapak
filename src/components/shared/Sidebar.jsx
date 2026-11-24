import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const navigasiMenu = [
  { label: "Home", to: "/dashboard", icon: "fi fi-rr-house-blank" },
  { label: "Chats", to: "/chats", icon: "fi fi-rr-beacon" },
  { label: "Trip", to: "/trip", icon: "fi fi-rr-briefcase-blank" },
  { label: "Settings", to: "/settings", icon: "fi fi-rr-settings" } // <--- BENAR
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false); // khusus mobile: sidebar tertutup di awal

  return (
    <aside
      className={`sticky top-4 flex h-[750px] shrink-0 flex-col overflow-hidden rounded-r-3xl border-2 border-l-0 border-grey-label/50 bg-white transition-[width] duration-300 ease-in-out max-sm:left-0 max-sm:top-0 max-sm:rounded-r-2xl max-sm:border-0 ${isMobileOpen ? "max-sm:fixed max-sm:z-50 max-sm:h-dvh max-sm:w-[300px] max-sm:shadow-2xl" : "max-sm:absolute max-sm:z-20 max-sm:h-16 max-sm:w-[260px] max-sm:bg-transparent"} ${
        isOpen ? "w-72" : "w-20"
      }`}
    >
      <div className="relative h-[76px] shrink-0 max-sm:h-16">
        <span
          className={`absolute left-5 top-6 overflow-hidden whitespace-nowrap text-3xl font-clash text-dark-brown-new font-bold transition-all duration-300 ${isMobileOpen ? "max-sm:left-4" : "max-sm:left-[72px]"} max-sm:top-1/2 max-sm:max-w-[200px] max-sm:-translate-y-1/2 max-sm:opacity-100 ${
            isOpen ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          SETAPAK
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute top-[30px] transition-all duration-300 max-sm:hidden ${
            isOpen ? "right-5" : "right-7"
          }`}
        >
          <i className="fi fi-rr-bars-staggered text-grey-light text-2xl leading-none" />
        </button>

        {/* tombol menu khusus mobile: hamburger (tertutup) <-> X (terbuka) */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`absolute top-1/2 hidden -translate-y-1/2 max-sm:block ${
            isMobileOpen ? "right-5" : "left-5"
          }`}
        >
          <i
            className={`${
              isMobileOpen
                ? "fi fi-br-cross text-xl"
                : "fi fi-rr-bars-staggered text-2xl"
            } text-grey-light leading-none`}
          />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8 max-sm:hidden">
        <NavLink
          to="/plan"
          className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-grey-light py-3 text-base font-jakarta font-medium text-white hover:bg-grey-light/95"
        >
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              isOpen ? "mr-2 max-w-[120px] opacity-100" : "mr-0 max-w-0 opacity-0"
            }`}
          >
            New Chat
          </span>
          <i className="fi fi-br-plus shrink-0 text-base leading-none" />
        </NavLink>
      </div>

      <nav
        className={`flex flex-col gap-1 px-4 pt-3 max-sm:gap-3 ${
          isMobileOpen ? "" : "max-sm:hidden"
        }`}
      >
        {navigasiMenu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-base font-jakarta font-medium text-grey-light hover:bg-grey-label/15 max-sm:gap-2 max-sm:px-0"
          >
            {({ isActive }) => (
              <>
                {/* aktif -> ikon solid (fi-sr-) + hitam, tidak aktif -> ikon outline (fi-rr-) */}
                <i
                  className={`${
                    isActive
                      ? m.icon.replace("fi-rr-", "fi-sr-") + " text-black"
                      : m.icon
                  } shrink-0 text-xl leading-none`}
                />
                <span
                  className={`whitespace-nowrap transition-opacity duration-300 max-sm:opacity-100 ${
                    isOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {m.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div
        className={`my-6 border-t-2 border-grey-label transition-all duration-300 max-sm:hidden ${
          isOpen ? "mx-10" : "mx-5"
        }`}
      />

      <p
        className={`whitespace-nowrap px-5 text-center font-jakarta font-semibold text-base text-grey-label transition-opacity duration-300 max-sm:hidden ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        No chat yet.
      </p>

      <div
        className={`mt-auto px-4 pb-6 ${isMobileOpen ? "" : "max-sm:hidden"}`}
      >
        <button
          type="button"
          onClick={() => {}}
          className="flex w-full items-center gap-3 overflow-hidden border-2 border-grey-label/90 rounded-xl px-3.5 py-2.5 text-base font-jakarta font-medium text-grey-light hover:bg-neutral-100 max-sm:gap-2 max-sm:border-0 max-sm:px-0"
        >
          <i className="fi fi-rr-sign-out-alt shrink-0 text-xl leading-none" />
          <span
            className={`whitespace-nowrap transition-opacity duration-300 max-sm:opacity-100 font-jakarta font-medium text-base text-grey-light ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;