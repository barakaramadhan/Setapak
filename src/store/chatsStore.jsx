// Riwayat chat SETAPAK: satu sumber kebenaran untuk daftar chat, judul, pin,
// dan penanda trip. Supabase + RLS dipakai kalau env & login tersedia;
// sisanya fallback localStorage supaya aplikasi tetap bisa didemo.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { LOCAL_DEMO_ID } from "./authContext";
import { useAuth } from "./useAuth";
import { ChatsContext } from "./chatsContext";

const TABLE = "chats";
const localKey = (userId) => `setapak:chats:${userId || "anon"}`;

function idBaru() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback tetap berformat UUID agar cocok dengan kolom id di Supabase.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function buatChat(title = "Chat baru") {
  const now = new Date().toISOString();
  return {
    id: idBaru(),
    title,
    messages: [],
    pinned: false,
    tripId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function readLocal(userId) {
  try {
    const raw = localStorage.getItem(localKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(userId, chats) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(chats));
  } catch {
    // localStorage penuh / tidak tersedia — abaikan.
  }
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title || "Chat baru",
    messages: Array.isArray(row.messages) ? row.messages : [],
    pinned: Boolean(row.pinned),
    tripId: row.trip_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
  };
}

function toRow(chat, userId) {
  return {
    // WAJIB: tanpa id, upsert(onConflict: "id") selalu membuat baris BARU.
    id: chat.id,
    user_id: userId,
    title: String(chat.title || "Chat baru").slice(0, 120),
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    pinned: Boolean(chat.pinned),
    trip_id: chat.tripId || null,
    updated_at: new Date().toISOString(),
  };
}

// Chat yang di-pin tampil di atas, sisanya urut berdasarkan terakhir dipakai.
function urut(list) {
  return [...list].sort((a, b) => {
    const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pin) return pin;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

export default function ChatsProvider({ children }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatsRef = useRef([]);
  const saveQueue = useRef(new Map());

  const pakaiCloud = Boolean(supabase && user && user.id !== LOCAL_DEMO_ID);

  const terapkan = useCallback((daftar) => {
    const sorted = urut(daftar);
    chatsRef.current = sorted;
    setChats(sorted);
    return sorted;
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    if (!user) {
      terapkan([]);
      setActiveId(null);
      return;
    }

    if (!pakaiCloud) {
      let daftar = readLocal(user.id);
      if (!daftar.length) {
        daftar = [buatChat()];
        writeLocal(user.id, daftar);
      }
      const sorted = terapkan(daftar);
      setActiveId((prev) =>
        sorted.some((chat) => chat.id === prev) ? prev : sorted[0].id
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (err) {
        setError(err.message);
        return;
      }

      let daftar = (data || []).map(fromRow);
      if (!daftar.length) {
        const baru = buatChat();
        const { data: inserted, error: insertError } = await supabase
          .from(TABLE)
          .insert(toRow(baru, user.id))
          .select()
          .single();
        if (insertError) {
          setError(insertError.message);
          return;
        }
        // Pakai id dari database supaya state & baris Supabase identik.
        daftar = [fromRow(inserted)];
      }

      const sorted = terapkan(daftar);
      setActiveId((prev) =>
        sorted.some((chat) => chat.id === prev) ? prev : sorted[0].id
      );
    } finally {
      setLoading(false);
    }
  }, [pakaiCloud, terapkan, user]);

  useEffect(() => {
    let aktif = true;
    queueMicrotask(() => {
      if (aktif) refresh();
    });
    return () => {
      aktif = false;
    };
  }, [refresh]);

  /** Simpan perubahan satu chat (localStorage atau Supabase). */
  const simpanChat = useCallback(
    async (chat) => {
      if (!user) return chat;
      if (pakaiCloud) {
        // Antre per chat supaya pesan cepat berurutan tidak saling menimpa.
        const sebelumnya = saveQueue.current.get(chat.id) || Promise.resolve();
        const tugas = sebelumnya.catch(() => {}).then(async () => {
          const { error: err } = await supabase
            .from(TABLE)
            .upsert(toRow(chat, user.id), { onConflict: "id" });
          if (err) setError(err.message);
        });
        saveQueue.current.set(chat.id, tugas);
        await tugas;
      } else {
        writeLocal(user.id, chatsRef.current);
      }
      return chat;
    },
    [pakaiCloud, user]
  );

  const updateChat = useCallback(
    async (id, patch) => {
      const lama = chatsRef.current.find((chat) => chat.id === id);
      if (!lama) return null;
      const baru = {
        ...lama,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      terapkan([...chatsRef.current.filter((chat) => chat.id !== id), baru]);
      return simpanChat(baru);
    },
    [simpanChat, terapkan]
  );

  const newChat = useCallback(async () => {
    // Jangan menumpuk "Chat baru" kosong: pakai yang kosong kalau sudah ada.
    const kosong = chatsRef.current.find(
      (chat) => !chat.messages.length && chat.title === "Chat baru"
    );
    if (kosong) {
      setActiveId(kosong.id);
      return kosong;
    }
    const baru = buatChat();
    let tersimpan = baru;
    if (user && pakaiCloud) {
      const { data, error: err } = await supabase
        .from(TABLE)
        .insert(toRow(baru, user.id))
        .select()
        .single();
      if (err) {
        setError(err.message);
        return null;
      }
      tersimpan = fromRow(data);
    }
    terapkan([...chatsRef.current, tersimpan]);
    if (user && !pakaiCloud) writeLocal(user.id, chatsRef.current);
    setActiveId(tersimpan.id);
    return tersimpan;
  }, [pakaiCloud, terapkan, user]);

  const openChat = useCallback((id) => setActiveId(id), []);

  const renameChat = useCallback(
    (id, title) => {
      const bersih = String(title || "").trim().slice(0, 120);
      if (!bersih) return Promise.resolve(null);
      return updateChat(id, { title: bersih });
    },
    [updateChat]
  );

  const togglePin = useCallback(
    (id) => {
      const chat = chatsRef.current.find((item) => item.id === id);
      if (!chat) return Promise.resolve(null);
      return updateChat(id, { pinned: !chat.pinned });
    },
    [updateChat]
  );

  const setChatTrip = useCallback(
    (id, tripId) => updateChat(id, { tripId: tripId || null }),
    [updateChat]
  );

  const appendMessage = useCallback(
    (id, message) => {
      const chat = chatsRef.current.find((item) => item.id === id);
      if (!chat) return Promise.resolve(null);
      return updateChat(id, { messages: [...chat.messages, message] });
    },
    [updateChat]
  );

  const deleteChat = useCallback(
    async (id) => {
      if (user && pakaiCloud) {
        const { error: err } = await supabase
          .from(TABLE)
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (err) {
          setError(err.message);
          return;
        }
      }
      const sisa = chatsRef.current.filter((chat) => chat.id !== id);
      if (!sisa.length) sisa.push(buatChat());
      terapkan(sisa);
      if (user && !pakaiCloud) writeLocal(user.id, sisa);
      setActiveId((prev) => (prev === id ? sisa[0].id : prev));
    },
    [pakaiCloud, terapkan, user]
  );

  const activeChat = chats.find((chat) => chat.id === activeId) || null;

  const value = {
    chats,
    activeChat,
    activeId,
    loading,
    error,
    refresh,
    newChat,
    openChat,
    renameChat,
    togglePin,
    setChatTrip,
    appendMessage,
    deleteChat,
  };

  return (
    <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>
  );
}
