# Rangkuman Perubahan SETAPAK

## Ditambahkan

| File | Fungsi |
| --- | --- |
| `src/api/plannerEngine.js` | Otak rule-based: kota, `in`/`near`, TOP 4 per kategori, tautan Maps |
| `src/api/chat.js` | Gerbang AI + cache + `askRecommendations()`, `askPlanFields()`, `askCreatePlan()` |
| `src/data/plannerData.js` | Data destinasi Bogor, Yogyakarta, Bali, Bandung |
| `src/data/placeImages.js` | Foto asli tempat + cadangan |
| `server/aiProviders.js` | Groq → Gemini → OpenRouter + system prompt |
| `server/chatHandler.js` | Endpoint `/api/chat` (chat + rekomendasi) |
| `server/plannerStore.js` | Planner data bersama (Supabase + memory) |
| `api/chat.js` | Entry point Vercel |
| `supabase/schema.sql` | Tabel `chat_logs`, `city_recommendations`, `trips` + RLS |
| `supabase/reset.sql` | Reset data tersimpan |
| `scripts/reset-planner.mjs` | Reset lewat `npm run reset:planner` |
| `.env.example` | Template API key |
| `src/lib/supabase.js` | Client browser Supabase (anon key saja) |
| `src/store/authStore.jsx`, `authContext.js`, `useAuth.js` | Supabase Auth |
| `src/store/tripsStore.jsx`, `tripsContext.js`, `useTrips.js` | Satu store trip (Supabase + localStorage) |
| `src/components/layouts/RequireAuth.jsx` | Lindungi route, belum login → `/login` |
| `src/pages/auth/SignIn.jsx`, `SignUp.jsx` | Form masuk/daftar |
| `src/pages/user/sections/CalendarCard.jsx` | Kalender + popover kartu perjalanan |
| `src/pages/user/sections/ScheduleCard.jsx` | Schedule dinamis |
| `src/pages/user/TripPage.jsx` | `/trip` daftar + `/trip/:id` workspace |
| `src/pages/user/TripWorkspace.jsx` | Workspace 15 modul |
| `src/pages/user/sections/ModuleEditor.jsx`, `ModuleField.jsx` | Editor & field generik |
| `src/utils/tripDate.js` | Parser tanggal & rentang, `buildTripPrefill()` |
| `src/utils/tripModules.js` | Definisi 15 modul + normalisasi rencana |
| `src/store/chatsStore.jsx`, `chatsContext.js`, `useChats.js` | Riwayat chat: baru, ganti judul, pin, tanda trip (Supabase + localStorage) |

## Diedit

| File | Perubahan |
| --- | --- |
| `src/pages/user/sections/HomeUser.jsx` | `For you`: form kota, rating, reload `excludeNames`, gambar `onError`. 3 kotak Travel Interests kirim prompt bertema ber-placeholder `[lokasi]` — tujuan ditentukan user |
| `src/pages/user/sections/AiChat.jsx` | 2 mode (Searching/Planning) ada di samping tombol kirim, ketik `/` masuk Planning, format teks rapi, tombol plan muncul saat siap → AI minta field → user isi → plan tersimpan. Scroll mengikuti halaman (kolom input sticky). Toggle peta OSM gratis |
| `src/components/shared/Sidebar.jsx` | New Chat bikin chat baru; daftar chat (pilih, rename, pin, hapus, badge trip) tepat di bawah garis Explore |
| `server/aiProviders.js` | Prompt khusus Searching, Planning, field pelengkap, dan JSON plan |
| `server/chatHandler.js` | Mode baru + geocode Nominatim/OpenStreetMap (gratis, tanpa API key). Peta selalu muncul saat toggle aktif (nama diambil dari jawaban/data planner), geocode dibatasi ±0.5° sekitar kota |
| `src/main.jsx` | Pasang `ChatsProvider` |
| `supabase/schema.sql` | Tabel `chats` + RLS (judul, pin, `trip_id`) |
| `src/App.jsx` | Rute `/plan`, `/login`, `/trip` |
| `vite.config.js` | Middleware `/api/chat` untuk dev |
| `package.json` | Script `reset:planner` |
| `eslint.config.js` | `globals.node` untuk folder server |
| `README.md` | Dokumentasi AI, env, kuota, reset, Auth, Trip |
| `src/index.css` | `@media print` untuk cetak workspace |
| `src/pages/user/DashboardUser.jsx` | Hapus import tak terpakai |
| `UserLayout.jsx`, `Footer.jsx`, `Sidebar.jsx`, `InputAll.jsx` | Hapus import React tak terpakai |
| 6 file di `src/pages/guest/sections/` | Hapus import tak terpakai |

## Dihilangkan

Tidak ada file yang dihapus. Yang dibuang hanya **kode dummy/mock** di `AiChat.jsx` dan `HomeUser.jsx`, plus import yang tidak terpakai.

---

Verifikasi: `npm run lint` ✅ · `npm run build` ✅
