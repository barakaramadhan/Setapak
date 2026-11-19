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
| `server/worldKnowledge.js` | Pengetahuan dunia yang dikurasi (Bekasi, Depok, Jepang, Singapura, Malang, dll.) + fakta lokasi yang sering tertukar |
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
| `src/pages/user/sections/AiChat.jsx` | 2 mode (Searching/Planning) ada di samping tombol kirim, ketik `/` masuk Planning, format markdown rapi (`#`/`##`/`###` jadi judul bertingkat, bukan teks `###`), tombol plan muncul saat siap → AI minta field → user isi → plan tersimpan. Scroll mengikuti halaman (kolom input sticky). Toggle peta OSM gratis. Kartu hanya memakai foto terverifikasi |
| `src/components/shared/Sidebar.jsx` | New Chat bikin chat baru; daftar chat (pilih, rename, pin, hapus, badge trip) tepat di bawah garis Explore |
| `server/aiProviders.js` | Prompt AI trip (Searching/Planning/field/JSON plan). Prompt Searching memakai pengetahuan dunia, melarang jasa seperti Pegadaian, melarang salah lokasi, dan hanya memakai `## ` untuk judul |
| `server/chatHandler.js` | Mode baru + geocode Nominatim/OpenStreetMap (gratis, tanpa API key). Kota dengan data lokal dijawab dari planner; kota/negara lain dijawab dari `worldKnowledge.js`; AI dipanggil hanya untuk pertanyaan travel umum. Peta selalu muncul saat toggle aktif, geocode dibatasi ±0.5° sekitar kota. Nama sampah (Pegadaian/bank/dll.) difilter, jumlah tempat mengikuti angka di prompt |
| `server/placeMedia.js` | Pencarian foto Wikipedia/Commons kini menolak judul orang/kejadian (mis. Anies Baswedan) dan mengharuskan token nama tempat cocok; nama yang terlalu umum memakai gambar cadangan |
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

## Perbaikan grounding AI

- Kota/negara tidak lagi dijawab "belum ada data". AI SETAPAK sekarang paham destinasi dunia: Bekasi, Depok, Jogja, Malang, Singapura, Jepang, Korea, Thailand, dll.
- Lokasi yang sering tertukar dikoreksi otomatis: Taman Safari di **Cisarua, Bogor** (bukan Bekasi/Depok), Pondok Indah Mall di **Jakarta Selatan** (bukan Depok), Trans Jogja/Malioboro di **Yogyakarta**, Kuta di **Bali**, Bromo di **Malang/Probolinggo**.
- Jawaban untuk kota populer berasal dari daftar yang dikurasi, jadi tidak bisa mengarang "Pegadaian", "Cibodas di Depok", atau wajah orang pada foto.
- Contoh hasil: `Aku mau ke Bekasi, ada taman safari gak?` → "Tidak ada. Taman Safari Indonesia ada di Cisarua, Bogor, sekitar 1–1,5 jam dari Bekasi." + alternatif wisata Bekasi.

## Dihilangkan

Tidak ada file yang dihapus. Yang dibuang hanya **kode dummy/mock** di `AiChat.jsx` dan `HomeUser.jsx`, logika penolakan "Belum ada data terverifikasi", dan import yang tidak terpakai.

---

Verifikasi: `npm run lint` ✅ · `npm run build` ✅
