import { useContext } from "react";
import { SettingsContext } from "./settingsContext";

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings harus dipakai di dalam SettingsProvider");
  return value;
}
