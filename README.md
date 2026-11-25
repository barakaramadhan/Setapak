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

## Settings (`/settings`)

Menu **Settings** ada di sidebar user. Pengaturan tersimpan per akun: di cloud (Supabase tabel `user_settings`, foto di bucket `avatars`) dan disalin ke browser (`localStorage`, kunci `setapak:settings:v1:<id-user>`) untuk mode offline. Tanpa Supabase (mode demo) hanya di browser. Jalankan `supabase/schema.sql` (atau `supabase/user_settings.sql` untuk database lama) agar tabel & bucket ada.

- **Profile**: ganti foto (dikecilkan 256px, diunggah ke Supabase Storage), ganti username, ganti email dan password (butuh Supabase aktif; di mode demo hanya username).
- **Appearance**: Light / Dark / System (System mengikuti tema perangkat). Tema gelap berlaku di area user saja.
- **Location**: *Home city* dipakai sebagai kota awal "For you" di Home. *Location access* meminta izin lokasi browser; kalau aktif muncul tombol **Gunakan lokasi saya** yang mengisi Home city lewat Nominatim (OpenStreetMap).
