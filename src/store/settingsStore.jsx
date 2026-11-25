import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAsalDefault } from "../api/chat";
import { supabase } from "../lib/supabase";
import { LOCAL_DEMO_ID } from "./authContext";
import { SettingsContext } from "./settingsContext";
import { useAuth } from "./useAuth";

// Pengaturan disimpan per akun di browser (cache/offline) DAN di Supabase
// (tabel user_settings + bucket avatars) supaya ikut ke perangkat lain.
const DEFAULTS = {
  theme: "light", // "light" | "dark" | "system"
  homeCity: "", // kosong = pakai default Home
  homeLat: null,
  homeLng: null,
  locationAccess: false,
  photo: "", // URL foto (cloud) atau data URL (mode lokal)
  photoPath: "", // path di bucket avatars (hanya cloud)
};

const TABLE = "user_settings";
const BUCKET = "avatars";
const CLOUD_FIELDS = ["theme", "homeCity", "homeLat", "homeLng", "locationAccess", "photo", "photoPath"];

const bacaKunci = (key) => {
  try {
    const mentah = localStorage.getItem(key);
    return { ...DEFAULTS, ...(mentah ? JSON.parse(mentah) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
};

const tulisKunci = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* penyimpanan penuh/diblokir: tetap berlaku selama sesi */
  }
};

const dariRow = (row) => ({
  theme: ["light", "dark", "system"].includes(row.theme) ? row.theme : "light",
  homeCity: row.home_city || "",
  homeLat: row.home_lat ?? null,
  homeLng: row.home_lng ?? null,
  locationAccess: Boolean(row.location_access),
  photo: row.photo_url || "",
  photoPath: row.photo_path || "",
});

const keRow = (data, userId) => ({
  user_id: userId,
  theme: data.theme,
  home_city: data.homeCity || "",
  home_lat: data.homeLat ?? null,
  home_lng: data.homeLng ?? null,
  location_access: Boolean(data.locationAccess),
  photo_path: data.photoPath || null,
  photo_url: data.photoPath ? data.photo || null : null,
});

const dataUrlKeBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

const MQ = "(prefers-color-scheme: dark)";
const subscribeSystem = (cb) => {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function SettingsProvider({ children }) {
  const { user } = useAuth();
  const key = `setapak:settings:v1:${user?.id || "guest"}`;
  const userId = user?.id || null;
  const cloud = Boolean(supabase && userId && userId !== LOCAL_DEMO_ID);

  const [store, setStore] = useState(() => ({ key, data: bacaKunci(key) }));
  // "idle" | "syncing" | "saved" | "error" — status penyimpanan ke Supabase
  const [sync, setSync] = useState({ state: "idle", error: "" });
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(MQ).matches,
    () => false
  );

  const latest = useRef(store);
  const timer = useRef(null);
  const dirty = useRef(false);

  // Ganti akun -> muat pengaturan akun itu
  let data = store.data;
  if (store.key !== key) {
    data = bacaKunci(key);
    setStore({ key, data });
  }
  useEffect(() => {
    latest.current = store;
  }, [store]);

  const pushCloud = useCallback(async () => {
    if (!cloud || !dirty.current) return;
    dirty.current = false;
    setSync({ state: "syncing", error: "" });
    const { error } = await supabase
      .from(TABLE)
      .upsert(keRow(latest.current.data, userId), { onConflict: "user_id" });
    if (error) {
      dirty.current = true;
      setSync({ state: "error", error: error.message });
    } else {
      setSync({ state: "saved", error: "" });
    }
  }, [cloud, userId]);

  const jadwalkanPush = useCallback(() => {
    if (!cloud) return;
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(pushCloud, 600);
  }, [cloud, pushCloud]);

  // Saat login / ganti akun: tarik dari Supabase. Kalau belum ada baris, unggah
  // pengaturan lokal yang sudah ada supaya tidak hilang.
  useEffect(() => {
    if (!cloud) return undefined;
    let aktif = true;
    (async () => {
      setSync({ state: "syncing", error: "" });
      const { data: row, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!aktif) return;
      if (error) {
        setSync({ state: "error", error: error.message });
        return;
      }
      if (row) {
        const next = { ...DEFAULTS, ...dariRow(row) };
        tulisKunci(key, next);
        setStore({ key, data: next });
        setSync({ state: "saved", error: "" });
      } else {
        dirty.current = true;
        await pushCloud();
      }
    })();
    return () => {
      aktif = false;
      clearTimeout(timer.current);
    };
  }, [cloud, userId, key, pushCloud]);

  // Kirim sisa perubahan saat tab ditutup / disembunyikan
  useEffect(() => {
    if (!cloud) return undefined;
    const flush = () => {
      if (document.visibilityState === "hidden" && dirty.current) {
        clearTimeout(timer.current);
        pushCloud();
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [cloud, pushCloud]);

  const update = (patch) => {
    const bersih = Object.fromEntries(Object.entries(patch).filter(([k]) => k in DEFAULTS));
    const prev = latest.current;
    const next = { ...prev.data, ...bersih };
    latest.current = { key: prev.key, data: next };
    tulisKunci(prev.key, next);
    setStore({ key: prev.key, data: next });
    if (CLOUD_FIELDS.some((k) => k in bersih)) jadwalkanPush();
  };

  // Simpan foto: ke Storage bila akun cloud, kalau gagal tetap tersimpan lokal.
  const savePhoto = async (dataUrl) => {
    if (!cloud) {
      update({ photo: dataUrl, photoPath: "" });
      return { error: null };
    }
    setSync({ state: "syncing", error: "" });
    try {
      const blob = await dataUrlKeBlob(dataUrl);
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      update({ photo: `${pub.publicUrl}?v=${Date.now()}`, photoPath: path });
      return { error: null };
    } catch (err) {
      update({ photo: dataUrl, photoPath: "" });
      setSync({ state: "error", error: err.message || "Gagal mengunggah foto." });
      return { error: `Foto hanya tersimpan di perangkat ini: ${err.message || "unggah gagal"}` };
    }
  };

  const removePhoto = async () => {
    const path = latest.current.data.photoPath;
    update({ photo: "", photoPath: "" });
    if (cloud && path) await supabase.storage.from(BUCKET).remove([path]);
  };

  // AI memakai kota rumah sebagai titik berangkat kalau user tidak menyebut asal
  useEffect(() => {
    setAsalDefault(data.homeCity);
  }, [data.homeCity]);

  const resolvedTheme =
    data.theme === "system" ? (systemDark ? "dark" : "light") : data.theme;

  return (
    <SettingsContext.Provider
      value={{ ...data, resolvedTheme, update, savePhoto, removePhoto, cloud, sync }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
