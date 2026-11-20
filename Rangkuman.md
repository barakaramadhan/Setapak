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

## AI jadi satu-satunya yang menjawab (update terbaru)

- **Cache jawaban dihapus total** (browser & server). Setiap prompt di `Searching`/`Planning` selalu memanggil AI lewat `/api/chat`. Tidak ada lagi jawaban lama yang muncul kembali.
- **Data kurasi tetap dipakai, tapi sebagai KONTEKS** (`GROUND_ATURAN` + `konteksTerverifikasi()` di `server/chatHandler.js`). AI yang merangkai kalimat; daftar tempat, area, dan fakta lokasi dari `plannerData`/`worldKnowledge` jadi sumber kebenaran supaya tidak halusinasi.
- Contoh: ditanya "Aku mau ke Bekasi, ada taman safari gak?" -> AI menjawab tidak ada, Taman Safari di Cisarua Bogor, lalu alternatif Bekasi. Semua dari AI, tanpa teks "kuota penuh".
- `TripWorkspace` sekarang memakai `askCreatePlan()` (AI) untuk mengisi modul, bukan planner lokal.
- **Form interaktif saat AI bertanya**: `WizardForm` di `AiChat.jsx` menampilkan progress (1/3, 2/3), pilihan cepat yang bisa diklik, dan input + tombol Kirim di dalam kartu yang sama. Mirip pengalaman bertanya di GPT/Gemini. Berlaku di dua tempat: (1) pertanyaan bebas AI di mode Planning — kartu ringkas "Jawab pertanyaan AI" memakai `msg.options` dari baris `PILIHAN:`; (2) form 15 modul setelah Create Planning — ada badge modul, alasan prioritas, chip ringkasan, dan progress per pertanyaan. Tidak ada lagi chip telanjang tanpa input.
- **Semua pertanyaan & pilihan dari AI, tetap terverifikasi**: tidak ada lagi contoh hardcoded (Bogor/Jogja/Bandung/Bali) di browser. `PLAN_SYSTEM_PROMPT` menyuruh AI membaca riwayat dulu — kalau user bilang "15 hari ke Jepang", AI tidak menanyakan kota/durasi lagi, melainkan hal yang benar-benar kurang (budget, paspor/visa, alergi). Pilihan cepat dikirim lewat baris `PILIHAN:` / field `options`, lalu `verifikasiOpsi()` di `server/chatHandler.js` membuang kota lokal kalau tujuannya luar negeri dan nama tempat yang tidak ada di data kurasi. Kartu "Lihat tempat" tidak lagi nempel di pertanyaan — `namaTempatFallback()` sekarang hanya mengambil baris daftar (`- ` / `1.`), bukan judul atau kalimat tanya.
- **Anti pertanyaan dobel & kartu tempat palsu**: `fieldsTanpaPengulangan()` di `server/chatHandler.js` membuang field yang sudah dijawab di obrolan (budget, tanggal/durasi, tema), lalu mengisi slot dengan modul lain (akomodasi, transport, dokumen, makanan) lewat `fieldLanjutan()`. Prompt AI juga dilarang memakai kata "bermain" dan wajib menangkap konteks istri/pasangan/ibadah. Kartu "Lihat tempat" sekarang hanya dibuat kalau ada daftar nama terverifikasi — tujuan seperti USA/Palestina/Makkah tidak menghasilkan kartu dari kalimat opsi.
- **Form menentukan kebutuhan dari 15 modul**: `PLAN_FIELDS_SYSTEM_PROMPT` (`server/aiProviders.js`) memuat daftar 15 modul dari `src/utils/tripModules.js`. AI memilih 3-5 field paling prioritas, melewati yang sudah disebut user, dan menyesuaikan konteks: luar negeri memunculkan Documents (10) + Safety (12); keluarga/alergi memunculkan Safety (12) + Food (8); trip lokal dilarang menanya paspor/visa. Setiap pertanyaan menampilkan badge `Modul no · Nama`, alasan prioritas, dan ringkasan modul terpilih di pertanyaan pertama. Modul 4 (Itinerary), 13 (Booking), 15 (Documentation) tidak ditanyakan karena diisi otomatis.
- Yang TIDAK dihapus sesuai keputusan: planner data bersama Supabase, riwayat chat, dan foto terverifikasi kartu "For you".

## Update: riset Searching & anti pertanyaan dobel (terbaru)

- Searching dengan niat rencana (mis. "10 hari ke Makkah dan Madinah, budget cukup, makanan Indonesia") kini dijawab 250–400 kata memakai `SEARCH_DETAIL_SYSTEM_PROMPT`: ringkasan, perkiraan biaya per komponen, transport & area, makanan, risiko & cara verifikasi. **Gemini duluan** + 2000 token; kalau tetap terpotong, AI diminta lanjut sekali dari titik terakhir. Fallback otomatis tetap ada.
- Nama restoran/hotel beralamat yang tidak terverifikasi dilarang keras. Kalau tidak ada data, AI memberi cara mencari (area, kata kunci Maps, review terbaru), bukan mengarang "Sari Rasa, Jl. Al-Madinah".
- Kartu "Lanjut ke Planning" muncul langsung setelah riset (`handoff`), dengan ringkasan fakta yang sudah terbaca: tujuan · durasi · makanan.
- `extractTripFacts()` (`src/api/chat.js`) membaca **semua** pesan user, bukan 6–8 terakhir. Profil trip dikirim di setiap request dan disuntik ke prompt Planning/planFields/createPlan, jadi kota, durasi, budget, dan preferensi makanan tidak ditanyakan ulang.
- `fieldsTanpaPengulangan()` memfilter pertanyaan berdasarkan kunci + modul + profil; fallback hardcoded `FIELD_DARURAT` di browser dihapus. Satu modul hanya boleh ditanyakan sekali.
- Rencana tidak lagi dipotong 7 hari: batas 14 hari, durasi mengikuti profil, dan `modules` (transport, makanan, dokumen, budget) ikut masuk ke 15 modul lewat `normalizePlan`.
- Obrolan ringan (mis. rating film) kini dijawab apa adanya, tanpa kalimat kaku "Saya hanya bisa bantu soal perjalanan". Kalau user menyebut lokasi syuting / "saya mau ke sana", baru dijawab bagian tempatnya dan ditawari bantuan merencanakan.
- Riset panjang ditulis seperti teman yang menjelaskan, bukan katalog 5+ nama per bagian; nama hotel/restoran/aplikasi transport yang tidak yakin diganti kategori + cara cek review.
- Prompt Searching/createPlan dilarang memakai syarat pandemi kedaluwarsa (vaksin COVID-19, PCR, karantina) sebagai aturan berlaku; dokumen cukup paspor/visa + anjuran cek syarat resmi terbaru.
- **Tidak ada** penambahan data kurasi kota, tabel Supabase, atau komponen UI baru.

## Dihilangkan

Tidak ada file yang dihapus. Yang dibuang hanya **kode dummy/mock** di `AiChat.jsx` dan `HomeUser.jsx`, logika penolakan "Belum ada data terverifikasi", dan import yang tidak terpakai.

---

Verifikasi: `npm run lint` ✅ · `npm run build` ✅
