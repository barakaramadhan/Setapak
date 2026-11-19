import { useEffect, useState } from "react";
import { supabase, isSupabaseReady } from "../lib/supabase";
import { AuthContext, LOCAL_DEMO_ID } from "./authContext";

// Tanpa env Supabase, aplikasi tetap bisa didemo dengan user lokal.
const DEMO_USER = {
  id: LOCAL_DEMO_ID,
  email: "demo@setapak.local",
  user_metadata: { name: "Fulann" },
};

export default function AuthProvider({ children }) {
  // Tanpa Supabase langsung pakai user demo (state awal, bukan lewat effect).
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
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const signUp = async (email, password) => {
    setAuthError("");
    if (!supabase) {
      setUser(DEMO_USER);
      return { error: null, needsConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    // Email confirmation aktif → session belum ada; user baru boleh masuk
    // setelah verifikasi. Tampilkan pesan di halaman sign up.
    setUser(data.session?.user ?? null);
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    setAuthError("");
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    authError,
    isSupabaseReady,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
