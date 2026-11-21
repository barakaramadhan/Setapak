import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, displayName } from "../../store/useAuth";
import { useChats } from "../../store/useChats";
import { useTrips } from "../../store/useTrips";
import InputAll from "../ui/InputAll";

const navigasiMenu = [
  { label: "Home", to: "/dashboard", icon: "fi fi-rr-house-blank" },
  { label: "Chats", to: "/chats", icon: "fi fi-rr-beacon" },
  { label: "Trip", to: "/trip", icon: "fi fi-rr-briefcase-blank" },
  { label: "Explore", to: "/explore", icon: "fi fi-rr-search" },
];

// Tombol aksi kecil dengan ikon SVG (pasti tampil, tanpa bergantung font ikon).
function AksiChat({ label, onClick, children, aktif = false, bahaya = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium hover:bg-grey-label/20 ${
        bahaya ? "text-red-600" : aktif ? "text-[#4f7fa6]" : "text-grey-light/80"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
      {label}
    </button>
  );
}

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmId, setConfirmId] = useState(null);
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
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden rounded-r-3xl border-2 border-l-0 border-grey-label/50 bg-white transition-[width] duration-300 ease-in-out ${
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
                {/* aktif -> ikon solid (fi-sr-), tidak aktif -> ikon outline (fi-rr-) */}
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

      {/* Daftar chat — tepat di bawah garis pemisah Explore */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-3 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-grey-light/60">
          Chats
        </p>
        {chats.length === 0 && (
          <p className="px-2 text-xs text-grey-label">Belum ada chat.</p>
        )}
        <div className="space-y-1">
          {chats.map((chat) => {
            const trip = trips.find((item) => item.id === chat.tripId);
            const aktif = chat.id === activeId;
            return (
              <div
                key={chat.id}
                className={`rounded-xl px-2 py-1.5 ${
                  aktif ? "bg-[#83ADD0]/20" : "hover:bg-grey-label/10"
                }`}
              >
                {editingId === chat.id ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => bukaChat(chat.id)}
                    title={chat.title}
                    className="block w-full truncate text-left text-sm font-semibold text-grey-light"
                  >
                    {chat.pinned && <span className="mr-1 text-[#6f9abf]">📌</span>}
                    {chat.title}
                  </button>
                )}
                {trip && (
                  <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-[#83ADD0]/20 px-2 py-0.5 text-[10px] font-semibold text-[#4f7fa6]">
                    Trip: {trip.title}
                  </span>
                )}

                {confirmId === chat.id ? (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-red-600">Hapus chat ini?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteChat(chat.id);
                        setConfirmId(null);
                      }}
                      className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold text-white"
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-full border border-grey-label px-2.5 py-0.5 font-semibold text-grey-light"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1 text-grey-light">
                    <AksiChat
                      label={chat.pinned ? "Lepas pin" : "Pin"}
                      onClick={() => togglePin(chat.id)}
                      aktif={chat.pinned}
                    >
                      <path d="M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7z" />
                    </AksiChat>
                    <AksiChat
                      label="Ganti judul"
                      onClick={() => {
                        setEditingId(chat.id);
                        setEditTitle(chat.title);
                      }}
                    >
                      <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
                    </AksiChat>
                    <AksiChat label="Hapus" bahaya onClick={() => setConfirmId(chat.id)}>
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </AksiChat>
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
  );
}

export default Sidebar;