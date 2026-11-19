import { useContext } from "react";
import { AuthContext } from "./authContext";

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return value;
}

/** Nama yang ditampilkan di sapaan dashboard & sidebar. */
export function displayName(user) {
  if (!user) return "Fulann";
  const meta = user.user_metadata || {};
  return (
    meta.name ||
    meta.full_name ||
    (user.email ? user.email.split("@")[0] : "Fulann")
  );
}
