import { useContext } from "react";
import { ChatsContext } from "./chatsContext";

export function useChats() {
  const value = useContext(ChatsContext);
  if (!value) throw new Error("useChats harus dipakai di dalam ChatsProvider");
  return value;
}
