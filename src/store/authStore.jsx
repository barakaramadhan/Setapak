import { useEffect, useState } from "react";
import { supabase, isSupabaseReady } from "../lib/supabase";
import { AuthContext, LOCAL_DEMO_ID } from "./authContext";

const DEMO_NAME_KEY = "setapak:demo-name";
const LAST_USER_KEY = "setapak:last-user";

// Salinan user terakhir (tanpa token) supaya web bisa dibuka saat offline.
function bacaUserTersimpan() {
  try {
    const u = JSON.parse(localStorage.getItem(LAST_USER_KEY) || "null");
    return u && u.id ? u : null;
  } catch {
    return null;
  }
}
function simpanUser(u) {
  try {
    if (u) {
      localStorage.setItem(
        LAST_USER_KEY,
        JSON.stringify({ id: u.id, email: u.email, user_metadata: u.user_metadata || {} })
      );
    } else {
      localStorage.removeItem(LAST_USER_KEY);
    }
  } catch {
    /* abaikan */
  }
}

function bacaNamaDemo() {
  try {
    return localStorage.getItem(DEMO_NAME_KEY) || "Fulann";
  } catch {
    return "Fulann";
  }
}

function buatDemoUser() {
  return {
    id: LOCAL_DEMO_ID,
    email: "demo@setapak.local",
    user_metadata: { name: bacaNamaDemo() },
  };
}

const DEMO_USER = buatDemoUser();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (supabase ? null : DEMO_USER));
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const sesi = data.session?.user ?? null;
        if (sesi) simpanUser(sesi);
        setUser(sesi ?? (navigator.onLine === false ? bacaUserTersimpan() : null));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        if (navigator.onLine === false) setUser(bacaUserTersimpan());
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) simpanUser(session.user);
      else if (navigator.onLine === false) return; // offline: pertahankan user yang sudah ada
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setAuthError("");
    if (!supabase) {
      setUser(DEMO_USER);
      return { error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    setUser(data.user ?? null);
    return { error: null };
  };

  const signUp = async (email, password, fullName = "") => {
    setAuthError("");
    if (!supabase) {
      setUser(DEMO_USER);
      return { error: null, needsConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: fullName.trim() ? { data: { full_name: fullName.trim() } } : undefined,
    });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    setUser(data.session?.user ?? null);
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    setAuthError("");
    simpanUser(null);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  // Ganti nama tampilan. Mode lokal (tanpa Supabase) disimpan di browser.
  const updateProfile = async ({ name }) => {
    const bersih = String(name || "").trim();
    if (!bersih) return { error: "Nama tidak boleh kosong." };
    if (!supabase) {
      try {
        localStorage.setItem(DEMO_NAME_KEY, bersih);
      } catch {
        /* abaikan */
      }
      setUser((u) => ({ ...u, user_metadata: { ...u?.user_metadata, name: bersih } }));
      return { error: null };
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { name: bersih, full_name: bersih },
    });
    if (error) return { error: error.message };
    setUser(data.user ?? null);
    return { error: null };
  };

  const updateEmail = async (email) => {
    if (!supabase) return { error: "Ganti email hanya tersedia saat Supabase aktif." };
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (password) => {
    if (!supabase) return { error: "Ganti password hanya tersedia saat Supabase aktif." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? error.message : null };
  };

  const value = {
    user,
    updateProfile,
    updateEmail,
    updatePassword,
    loading,
    authError,
    isSupabaseReady,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
