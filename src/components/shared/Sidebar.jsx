import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, displayName } from "../../store/useAuth";
import { useChats } from "../../store/useChats";
import { useTrips } from "../../store/useTrips";
import InputAll from "../ui/InputAll";

const navigasiMenu = [
  { label: "Home", to: "/dashboard", icon: "fi fi-rr-house-blank" },
  { label: "Chats", to: "/chats", icon: "fi fi-rr-beacon" },
  { label: "Trip", to: "/trip", icon: "fi fi-rr-briefcase-blank" },
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [menuId, setMenuId] = useState(null); // menu titik tiga per chat
  const [mobileOpen, setMobileOpen] = useState(false); // laci menu di layar kecil
  const { pathname } = useLocation();
  useEffect(() => setMobileOpen(false), [pathname]);
  const tombolMenu = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileOpen(false);
    else setIsOpen((v) => !v);
  };
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { trips } = useTrips();
  const {
    chats,
    activeId,
    newChat,
    openChat,
    renameChat,
    togglePin,
    deleteChat,
  } = useChats();

  const mulaiChatBaru = async () => {
    await newChat();
    navigate("/chats");
  };

  const bukaChat = (id) => {
    openChat(id);
    navigate("/chats");
  };

  const simpanJudul = async (id) => {
    if (editTitle.trim()) await renameChat(id, editTitle);
    setEditingId(null);
  };

  return (
    <>
    <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-grey-label/50 bg-white px-4 lg:hidden">
      <button type="button" aria-label="Buka menu" onClick={() => setMobileOpen(true)}>
        <i className="fi fi-rr-bars-staggered text-grey-light text-xl leading-none" />
      </button>
      <span className="text-xl font-clash font-bold text-dark-brown-new">SETAPAK</span>
    </div>
    {mobileOpen && (
      <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden rounded-r-3xl border-2 border-l-0 border-grey-label/50 bg-white transition-all duration-300 ease-in-out max-lg:w-72 lg:sticky lg:top-0 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full"
      } ${isOpen ? "lg:w-72" : "lg:w-20"}`}
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
          onClick={tombolMenu}
          className={`absolute top-[30px] transition-all duration-300 ${
            isOpen ? "right-5" : "right-7"
          }`}
        >
          <i className="fi fi-rr-bars-staggered text-grey-light text-2xl leading-none" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <button
          type="button"
          onClick={mulaiChatBaru}
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
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-4 pt-3">
        {navigasiMenu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className="flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-base font-jakarta font-medium text-grey-light hover:bg-grey-label/15"
          >
            {({ isActive }) => (
              <>
                <i
                  className={`${
                    isActive ? m.icon.replace("fi-rr-", "fi-sr-") : m.icon
                  } shrink-0 text-xl leading-none`}
                />
                <span
                  className={`whitespace-nowrap transition-opacity duration-300 ${
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
        className={`my-4 border-t-2 border-grey-label transition-all duration-300 ${
          isOpen ? "mx-10" : "mx-5"
        }`}
      />

      <div
        data-lenis-prevent
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p className="sticky top-0 z-10 flex items-center justify-between bg-white px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-grey-light/60">
          Chats
          <span className="rounded-full bg-grey-label/30 px-2 py-0.5 text-[10px] font-semibold normal-case text-grey-light/70">
            {chats.length}
          </span>
        </p>
        {chats.length === 0 && (
          <p className="px-2 text-xs text-grey-label">Belum ada chat.</p>
        )}
        {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}
        <div className="space-y-0.5">
          {[...chats]
            .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
            .map((chat, idx, arr) => {
              const trip = trips.find((item) => item.id === chat.tripId);
              const aktif = chat.id === activeId;
              const menuAtas = arr.length > 3 && idx >= arr.length - 2;

              if (editingId === chat.id) {
                return (
                  <div key={chat.id} className="px-1 py-1">
                    <InputAll
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") simpanJudul(chat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => simpanJudul(chat.id)}
                      className="w-full !px-2 !py-1 text-sm"
                    />
                  </div>
                );
              }

              return (
                <div key={chat.id}>
                  <div
                    className={`group relative flex items-center rounded-xl transition-colors ${
                      aktif ? "bg-[#83ADD0]/20" : "hover:bg-grey-label/15"
                    }`}
                  >
                    {aktif && (
                      <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[#6f9abf]" />
                    )}
                    <button
                      type="button"
                      onClick={() => bukaChat(chat.id)}
                      title={chat.title}
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        {chat.pinned && (
                          <svg viewBox="0 0 24 24" width="12" height="12" className="shrink-0 text-[#6f9abf]" fill="currentColor">
                            <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7zM11 15h2v6h-2z" />
                          </svg>
                        )}
                        <span className="truncate text-sm font-medium text-grey-light">{chat.title}</span>
                      </span>
                      {trip && (
                        <span className="mt-0.5 block truncate text-[11px] text-grey-light/50">
                          Trip · {trip.title}
                        </span>
                      )}
                    </button>

                    <div className="relative shrink-0 pr-1">
                      <button
                        type="button"
                        aria-label="Menu chat"
                        onClick={() => setMenuId(menuId === chat.id ? null : chat.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-grey-light/60 hover:bg-grey-label/25 focus:opacity-100 ${
                          aktif || menuId === chat.id ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <circle cx="5" cy="12" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="19" cy="12" r="1.8" />
                        </svg>
                      </button>
                      {menuId === chat.id && (
                        <div
                          className={`absolute right-0 z-20 w-40 overflow-hidden rounded-xl border border-grey-label/50 bg-white py-1 text-sm shadow-lg ${
                            menuAtas ? "bottom-8" : "top-8"
                          }`}
                        >
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left font-medium text-grey-light hover:bg-grey-label/15"
                            onClick={() => {
                              togglePin(chat.id);
                              setMenuId(null);
                            }}
                          >
                            {chat.pinned ? "Lepas sematan" : "Sematkan"}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left font-medium text-grey-light hover:bg-grey-label/15"
                            onClick={() => {
                              setEditingId(chat.id);
                              setEditTitle(chat.title);
                              setMenuId(null);
                            }}
                          >
                            Ganti nama
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left font-medium text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setConfirmId(chat.id);
                              setMenuId(null);
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {confirmId === chat.id && (
                    <div className="flex items-center gap-2 px-3 pb-1.5 pt-1 text-xs">
                      <span className="font-medium text-grey-light/80">Hapus chat ini?</span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteChat(chat.id);
                          setConfirmId(null);
                        }}
                        className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold text-white"
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-full border border-grey-label px-2.5 py-0.5 font-semibold text-grey-light"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div
        className={`overflow-hidden px-5 py-2 text-center transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="truncate font-jakarta text-sm font-semibold text-grey-light">
          {displayName(user)}
        </p>
        <p className="truncate font-jakarta text-xs text-grey-label">
          {user?.email || "No chat yet."}
        </p>
      </div>

      <div className="mt-auto px-4 pb-6">
        <button
          type="button"
          onClick={() => signOut()}
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
    </>
  );
}

export default Sidebar;