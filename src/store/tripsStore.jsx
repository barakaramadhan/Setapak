
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { LOCAL_DEMO_ID } from "./authContext";
import { useAuth } from "./useAuth";
import { expandDateRange } from "../utils/tripDate";
import { TripsContext } from "./tripsContext";

const TABLE = "trips";
const localKey = (userId) => `setapak:trips:${userId || "anon"}`;

function readLocal(userId) {
  try {
    const raw = localStorage.getItem(localKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(userId, trips) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(trips));
  } catch {
  }
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title || "Trip",
    date: row.trip_date,
    endDate: row.end_date || row.trip_date || null,
    city: row.city || "",
    place: row.place || "",
    notes: row.notes || "",
    plan: row.plan || null,
    createdAt: row.created_at || null,
  };
}

function toRow(trip, userId) {
  return {
    user_id: userId,
    title: String(trip.title || "Trip").slice(0, 120),
    trip_date: trip.date,
    end_date: trip.endDate || trip.date,
    city: trip.city || null,
    place: trip.place || null,
    notes: trip.notes || null,
    plan: trip.plan ?? null,
    updated_at: new Date().toISOString(),
  };
}

function urut(list) {
  return [...list].sort((a, b) => {
    const tanggal = String(a.date || "").localeCompare(String(b.date || ""));
    if (tanggal) return tanggal;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}

export default function TripsProvider({ children }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pakaiCloud = Boolean(
    supabase && user && user.id !== LOCAL_DEMO_ID
  );

  const refresh = useCallback(async () => {
    setError("");
    if (!user) {
      setTrips([]);
      return;
    }
    if (!pakaiCloud) {
      setTrips(urut(readLocal(user.id)));
      return;
    }

    // Tanpa internet: tampilkan salinan terakhir yang tersimpan di perangkat
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setTrips(urut(readLocal(user.id)));
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("trip_date", { ascending: true });
      if (err) {
        setTrips(urut(readLocal(user.id)));
        setError(err.message);
        return;
      }
      const daftar = urut((data || []).map(fromRow));
      writeLocal(user.id, daftar); // salinan untuk mode offline
      setTrips(daftar);
    } catch {
      setTrips(urut(readLocal(user.id)));
    } finally {
      setLoading(false);
    }
  }, [pakaiCloud, user]);

  useEffect(() => {
    let aktif = true;
    queueMicrotask(() => {
      if (aktif) refresh();
    });
    return () => {
      aktif = false;
    };
  }, [refresh]);

  const addTrip = async (input) => {
    setError("");
    const payload = {
      title: String(input.title || "").trim(),
      date: input.date,
      endDate: input.endDate && input.endDate >= input.date ? input.endDate : input.date,
      city: String(input.city || "").trim(),
      place: String(input.place || "").trim(),
      notes: String(input.notes || "").trim(),
      plan: input.plan || null,
    };
    if (!payload.title || !payload.date) {
      return { error: "Judul dan tanggal wajib diisi." };
    }
    if (!user) return { error: "Masuk dulu ya untuk menyimpan trip." };

    if (!pakaiCloud) {
      const row = {
        ...payload,
        id:
          globalThis.crypto?.randomUUID?.() ||
          `trip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      };
      const next = [...readLocal(user.id), row];
      writeLocal(user.id, next);
      setTrips(urut(next));
      return { data: row, error: null };
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .insert(toRow(payload, user.id))
      .select()
      .single();
    if (err) {
      setError(err.message);
      return { error: err.message };
    }
    const row = fromRow(data);
    setTrips((prev) => urut([...prev, row]));
    return { data: row, error: null };
  };

  const updateTrip = async (id, patch) => {
    setError("");
    if (!user) return { error: "Masuk dulu ya untuk mengubah trip." };

    const lama = trips.find((trip) => trip.id === id) || {};
    const gabungan = { ...lama, ...patch };
    if (gabungan.endDate && gabungan.endDate < gabungan.date) {
      gabungan.endDate = gabungan.date;
    }

    if (!pakaiCloud) {
      const next = readLocal(user.id).map((trip) =>
        trip.id === id ? { ...trip, ...gabungan } : trip
      );
      writeLocal(user.id, next);
      setTrips(urut(next));
      return { error: null };
    }

    const { error: err } = await supabase
      .from(TABLE)
      .update(toRow(gabungan, user.id))
      .eq("id", id)
      .eq("user_id", user.id);
    if (err) {
      setError(err.message);
      return { error: err.message };
    }
    setTrips((prev) =>
      urut(prev.map((trip) => (trip.id === id ? { ...trip, ...gabungan } : trip)))
    );
    return { error: null };
  };

  const deleteTrip = async (id) => {
    setError("");
    if (!user) return { error: "Masuk dulu ya untuk menghapus trip." };

    if (!pakaiCloud) {
      const next = readLocal(user.id).filter((trip) => trip.id !== id);
      writeLocal(user.id, next);
      setTrips(next);
      return { error: null };
    }

    const { error: err } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (err) {
      setError(err.message);
      return { error: err.message };
    }
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
    return { error: null };
  };

  const tripsByDate = useMemo(
    () =>
      trips.reduce((acc, trip) => {
        expandDateRange(trip.date, trip.endDate).forEach((key) => {
          (acc[key] ||= []).push(trip);
        });
        return acc;
      }, {}),
    [trips]
  );

  const value = {
    trips,
    tripsByDate,
    loading,
    error,
    refresh,
    addTrip,
    updateTrip,
    deleteTrip,
    pakaiCloud,
  };

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
}
