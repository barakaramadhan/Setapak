import { useEffect, useState, useSyncExternalStore } from "react";
import { setAsalDefault } from "../api/chat";
import { SettingsContext } from "./settingsContext";
import { useAuth } from "./useAuth";

// Pengaturan disimpan per akun di browser ini (localStorage).
const DEFAULTS = {
  theme: "light", // "light" | "dark" | "system"
  homeCity: "", // kosong = pakai default Home
  locationAccess: false,
  photo: "", // data URL foto profil (kecil)
};

const bacaKunci = (key) => {
  try {
    const mentah = localStorage.getItem(key);
    return { ...DEFAULTS, ...(mentah ? JSON.parse(mentah) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
};

const MQ = "(prefers-color-scheme: dark)";
const subscribeSystem = (cb) => {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function SettingsProvider({ children }) {
  const { user } = useAuth();
  const key = `setapak:settings:v1:${user?.id || "guest"}`;
  const [store, setStore] = useState(() => ({ key, data: bacaKunci(key) }));
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(MQ).matches,
    () => false
  );

  // Ganti akun -> muat pengaturan akun itu
  let data = store.data;
  if (store.key !== key) {
    data = bacaKunci(key);
    setStore({ key, data });
  }

  const update = (patch) => {
    setStore((prev) => {
      const next = { ...prev.data, ...patch };
      try {
        localStorage.setItem(prev.key, JSON.stringify(next));
      } catch {
        /* penyimpanan penuh/diblokir: tetap berlaku selama sesi */
      }
      return { key: prev.key, data: next };
    });
  };

  // AI memakai kota rumah sebagai titik berangkat kalau user tidak menyebut asal
  useEffect(() => {
    setAsalDefault(data.homeCity);
  }, [data.homeCity]);

  const resolvedTheme =
    data.theme === "system" ? (systemDark ? "dark" : "light") : data.theme;

  return (
    <SettingsContext.Provider value={{ ...data, resolvedTheme, update }}>
      {children}
    </SettingsContext.Provider>
  );
}
