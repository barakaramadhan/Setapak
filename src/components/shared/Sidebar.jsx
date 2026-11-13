import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const navigasiMenu = [
  { label: "Home", to: "/dashboard", icon: "fi fi-rr-house-blank" },
  { label: "Chats", to: "/chats", icon: "fi fi-rr-beacon" },
  { label: "Trip", to: "/trip", icon: "fi fi-rr-briefcase-blank" },
  { label: "Explore", to: "/explore", icon: "fi fi-rr-search" },
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={`sticky top-4 flex h-[750px] shrink-0 flex-col overflow-hidden rounded-r-3xl border-2 border-l-0 border-grey-label/50 bg-white transition-[width] duration-300 ease-in-out ${
        isOpen ? "w-72" : "w-20"
      }`}
    >
      <div className="relative h-[76px] shrink-0">
        <span
          className={`absolute left-5 top-6 overflow-hidden whitespace-nowrap text-3xl font-clash text-dark-brown-new font-bold transition-all duration-300 ${
            isOpen ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          SETAPAK
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute top-[30px] transition-all duration-300 ${
            isOpen ? "right-5" : "right-7"
          }`}
        >
          <i className="fi fi-rr-bars-staggered text-grey-light text-2xl leading-none" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
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

      <nav className="flex flex-col gap-1 px-4 pt-3">
        {navigasiMenu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className="flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-base font-jakarta font-medium text-grey-light hover:bg-grey-label/15"
          >
            <i className={`${m.icon} shrink-0 text-xl leading-none`} />
            <span
              className={`whitespace-nowrap transition-opacity duration-300 ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              {m.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div
        className={`my-6 border-t-2 border-grey-label transition-all duration-300 ${
          isOpen ? "mx-10" : "mx-5"
        }`}
      />

      <p
        className={`whitespace-nowrap px-5 text-center font-jakarta font-semibold text-base text-grey-label transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        No chat yet.
      </p>

      <div className="mt-auto px-4 pb-6">
        <button
          type="button"
          onClick={() => {}}
          className="flex w-full items-center gap-3 overflow-hidden border-2 border-grey-label/90 rounded-xl px-3.5 py-2.5 text-base font-jakarta font-medium text-grey-light hover:bg-neutral-100"
        >
          <i className="fi fi-rr-sign-out-alt shrink-0 text-xl leading-none" />
          <span
            className={`whitespace-nowrap transition-opacity duration-300 font-jakarta font-medium text-base text-grey-light ${
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