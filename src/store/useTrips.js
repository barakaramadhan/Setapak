import { useContext } from "react";
import { TripsContext } from "./tripsContext";

export function useTrips() {
  const value = useContext(TripsContext);
  if (!value) throw new Error("useTrips harus dipakai di dalam TripsProvider");
  return value;
}
