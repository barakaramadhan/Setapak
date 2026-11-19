--* clear

-- Reset planner data bersama supaya semua rekomendasi di-generate ulang AI.
-- Jalankan di Supabase SQL Editor. Tabel tetap ada, hanya isinya yang dikosongkan.
-- Data lokal SETAPAK (nama tempat asli + foto) TIDAK berubah.

TRUNCATE TABLE public.city_recommendations;

-- Kalau TRUNCATE ditolak karena RLS/permission, pakai DELETE sebagai gantinya:
-- DELETE FROM public.city_recommendations WHERE id IS NOT NULL;
