# SETAPAK

Website AI trip planner untuk **IDN IT FEST**. Setapak membantu pengguna merencanakan perjalanan ke beberapa destinasi dalam satu rute.

Demo: https://setapak-id.vercel.app

## Fitur

- **AI trip planning**: rencana perjalanan disusun otomatis oleh AI.
- **Plan trip manual**: 15 modul kebutuhan planner (itinerary, budget, transport, dokumen, packing list, safety, dll).
- **AI Chat** dengan 2 mode: *Searching* (cari data) dan *Planning* (susun trip).
- **Kalender & Schedule** untuk data trip.
- **Download PDF** rencana trip.
- **Login & Sign up**, data tersimpan di setiap akun.
- **Peta** sederhana di chat dan itinerary.

## Teknologi

React 19, Vite, Tailwind CSS v4, React Router, GSAP, Lenis, Leaflet, Supabase (Auth + Postgres), beberapa provider AI dengan fallback. Deploy di Vercel.

## Menjalankan

```bash
npm install
cp .env.example .env   # isi key Supabase & AI
npm run dev
```

Perintah lain: `npm run build`, `npm run preview`, `npm run lint`.

Jalankan `supabase/schema.sql` di Supabase SQL Editor untuk membuat tabel.

## Struktur

```
src/       # aplikasi React (pages, components, api, data)
server/    # handler chat & provider AI
api/       # entry point Vercel
supabase/  # skema database
```
