# SETAPAK

Website perencanaan perjalanan untuk **IDN IT FEST**. SETAPAK membantu pengguna menemukan destinasi dan merencanakan perjalanan ke beberapa tempat dalam satu rute.

## Fitur

Sudah tersedia:
- Landing page (hero dengan animasi garis perjalanan, section Destinations)
- Smooth scroll dan animasi berbasis scroll
- **AI Planning (hybrid)** di `/chats` dan rekomendasi di `/dashboard`
  - Klik kotak **Travel Interests** (Nature / Culture / Food) → langsung membuka
    `/chats` dengan prompt yang sudah disusun dan dikirim ke AI.
  - Toggle **in / near** di “For you”: `in` = di dalam kota, `near` = di sekitar kota.
    Kota tidak berubah saat toggle (mis. `Bandung · near` → `Bandung · in`).
  - Tiap bagian “For you” berisi **4 kartu** yang diurutkan dari rating tertinggi.
    Saat form kota dibuka, tersedia rating **opsional** 3 / 3.5 / 4 / 4.5. Tidak
    dipilih = urut dari atas ke bawah; dipilih = hanya rating ≥ batas itu.
  - Form kota memakai komponen **`InputAll`** dan tombol **`FillButton`**.
  - Kartu memakai foto asli tempat bila tersedia, plus tautan **Lihat di Google Maps**.
  - Klik tanda **`>`** setelah nama kota → muncul input kota. Ketik kota/area apa
    saja (mis. `Bandung`, `Kuta`, `Jepang`). Kunci pencarian memakai nama yang
    diketik: `Kuta` tetap Kuta (bukan diganti Bali), `Jepang` tetap Jepang.
    Hanya sinonim asli yang digabung (`Jogja` → `Yogyakarta`).
  - **Planner data bersama:** hasil AI untuk kota/area baru disimpan di tabel
    `city_recommendations`. Orang lain yang mencari kota + mode + rating yang sama
    mendapat **kartu yang identik** tanpa memanggil AI lagi. Tombol **reload**
    (panah putar) sengaja meminta variasi baru, lalu menyimpannya sebagai data terbaru.
  - Untuk Bogor, Yogyakarta, Bali, dan Bandung, AI hanya boleh memilih nama + alamat
    dari data SETAPAK yang sudah diverifikasi. Kota di luar data tetap bisa dijawab AI.
- Halaman user
- **Sign in / sign up** dengan Supabase Auth (email + password), route user
  dilindungi — belum login otomatis diarahkan ke `/login`.
- **Kalender + Schedule** di `/dashboard`
  - Hari ini diberi penanda; tanggal yang punya perjalanan memakai titik biru.
  - Hover/focus pada tanggal bertanda memunculkan kartu perjalanan; popover
    bertahan ~1,6 detik supaya kursor bisa pindah ke kartu. Klik kartu →
    `/trip/:id` menampilkan agenda perjalanan itu.
  - Satu perjalanan bisa ber rentang tanggal (mis. `15–20 Desember`) dan muncul
    di semua tanggal tersebut. Schedule menampilkan **satu kartu per perjalanan**
    dengan agenda di dalamnya (mis. `Taman Safari`, `Nginep di villa`).
  - Schedule hanya menampilkan satu kartu dalam satu waktu: pakai **panah
    kiri/kanan** atau **kolom pencarian** (judul, kota, agenda, tanggal) untuk
    menjelajah perjalanan lain.
  - Perjalanan bisa **ditambah, diedit, & dihapus**. Edit tersedia dari popover
    kalender, kartu Schedule, dan halaman Trip.
  - Prompt chat bertanggal (mis. `12 desember ke curug` atau
    `jalan-jalan keluarga 15-20 desember`) memunculkan tombol **Simpan ke
    Schedule**: form langsung terisi, tapi tetap bisa diedit.
  - `/trip` = daftar perjalanan, `/trip/:id` = **Universal Trip Planner** 15
    modul yang memakai store yang sama dengan kalender & Schedule.

## Teknologi

React 19, Vite, Tailwind CSS v4, React Router, GSAP (ScrollTrigger), Lenis,
Flaticon UIcons, Supabase (Auth + Postgres/RLS).

## Cara menjalankan

Pastikan Node.js sudah terpasang, lalu:

```bash
npm install
npm run dev
```

Perintah lain:

```bash
npm run build     # build untuk production
npm run preview   # lihat hasil build
npm run lint      # cek kode dengan ESLint
```

## Cara mengaktifkan Auth, Kalender & Schedule

1. Jalankan seluruh isi `supabase/schema.sql` di **Supabase → SQL Editor**.
   Script itu membuat tabel `trips` (termasuk `end_date` untuk rentang
   tanggal) + RLS: hanya pemilik (`auth.uid()`) yang bisa membaca/mengubah
   trip-nya. Script aman dijalankan ulang.
   Kalau muncul error `PGRST205 / Could not find the table 'public.trips'`,
   berarti script ini belum dijalankan di project Supabase yang dipakai `.env`.
   Kalau muncul `permission denied for table trips`, jalankan ulang script ini:
   bagian `GRANT` di bawah memberi hak akses ke role `authenticated` (RLS saja
   tidak cukup).
2. Isi di `.env` (lihat `.env.example`):

   ```env
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon / publishable key>
   ```

   `VITE_*` sengaja dikirim ke browser — aman karena RLS yang membatasi data.
   `VITE_SUPABASE_ANON_KEY` boleh anon key (JWT) maupun publishable key baru
   (`sb_publishable_...`). **Jangan** memakai service/secret key (`sb_secret_...`)
   di sini. Service role tetap dipakai server untuk log chat & planner data;
   kalau kosong, keduanya otomatis pakai memory.
3. Restart `npm run dev` setelah mengubah `.env`, lalu buka `/signup`.
4. Kalau dua variabel `VITE_*` kosong, aplikasi otomatis pakai **mode lokal**
   (user demo + trip di `localStorage`) supaya tampilan tetap bisa dicoba.

Alur data: `AuthProvider` → `TripsProvider` → `CalendarCard`, `ScheduleCard`,
dan `TripPage`. Semua komponen membaca satu store yang sama, jadi tambah/hapus
trip langsung terlihat di titik kalender, daftar Schedule, dan halaman Trip.

## Universal Trip Planner (15 modul)

Buka `/trip`, klik salah satu perjalanan. Workspace di `/trip/:id` memuat 15
modul di sidebar kiri; modul yang sudah berisi ditandai centang, dan progres
`X / 15` dihitung otomatis.

| # | Modul | Isi utama |
| - | ----- | --------- |
| 1 | Trip Overview | Nama, tujuan, tema, skala, teman perjalanan |
| 2 | Destination Planning | Negara, provinsi, kota, daftar tempat wisata |
| 3 | Date & Duration | Tanggal mulai/selesai, durasi, lama tinggal |
| 4 | Itinerary | Jadwal harian + aktivitas (bisa tambah/hapus/urut) |
| 5 | Transportation | Pesawat, kereta, mobil, kapal + kode & jadwal |
| 6 | Accommodation | Hotel, villa, hostel + check-in & konfirmasi |
| 7 | Budget Management | Anggaran, rincian biaya, total & sisa otomatis |
| 8 | Food Planning | Restoran, kuliner, waktu makan, biaya |
| 9 | Activities | Wisata, hiburan, petualangan, biaya |
| 10 | Documents | Paspor, visa, tiket, identitas + masa berlaku |
| 11 | Packing List | Checklist barang + progres "sudah disiapkan" |
| 12 | Safety & Emergency | Kontak darurat, alergi, medis, rencana darurat |
| 13 | Booking Management | Reservasi, kode booking, status, biaya |
| 14 | Travel Logistics | Rute perpindahan & konektivitas antar titik |
| 15 | Trip Documentation | Album foto, jurnal, kenangan |

Catatan implementasi:

- Kelima belas modul disimpan di **satu kolom `plan` (jsonb)** pada tabel
  `trips` — bukan 15 tabel — sehingga RLS `auth.uid() = user_id` tetap sederhana.
- Tombol **Isi dari AI** memanggil planner yang sama dengan halaman Chat, lalu
  menyebarkan hasilnya ke Itinerary, Destination, Activities, dan Budget.
- Tombol **Ekspor JSON** mengunduh seluruh rencana; **Cetak** membuka dialog
  cetak/PDF (tombol & sidebar disembunyikan lewat `@media print`).
- Rencana lama hasil chat (`city`, `days`, `totalCost`) tetap terbaca dan
  otomatis dinormalisasi ke modul baru — tidak perlu migrasi data.

## Cara mengaktifkan AI

Salin `.env.example` menjadi `.env`, lalu isi minimal salah satu provider AI. SETAPAK mendukung **100milionseek** (gratis 100.000.000 token/akun/hari, reset 00:00 UTC) dan **Ollama** (lokal, gratis/open-source):

```env
# Rekomendasi: 100milionseek (100 juta token/hari)
HUNDREDMILLIONSEEK_API_KEY=hms-...

# Opsional: Ollama (lokal, gratis & open-source; butuh Ollama + model terpasang)
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3.2
# OLLAMA_API_KEY=

# Opsional: data lokasi/tempat (Geoapify)
# GEOAPIFY_API_KEY=...

# Opsional: cadangan/fallback
GEMINI_API_KEY=API_KEY_DARI_AI_STUDIO
GEMINI_MODEL=gemini-3.8-flash
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-4-31b-it:free

# AI_PROVIDER_ORDER=100milionseek,ollama,groq,gemini,openrouter
```

> **100milionseek** (`https://100milionseek.top/`): endpoint OpenAI-compatible (`/v1/chat/completions`), model default `deepseek-v4.1-flash-free`, 100M token/akun/hari, maks 5 request paralel. Bila `HUNDREDMILLIONSEEK_API_KEY` diisi, SETAPAK otomatis mencobanya lebih dulu (kecuali `AI_PROVIDER_ORDER` diatur).
>
> **Ollama**: **gratis** kalau dipakai secara lokal/self-host karena open-source dan berjalan di komputer/server kamu sendiri (tanpa biaya token API), tapi tetap memakai resource perangkat (CPU/RAM/GPU) dan kualitas/kecepatan tergantung model & hardware. SETAPAK memanggil endpoint OpenAI-compatible Ollama (`/v1/chat/completions`, default `http://localhost:11434/v1`). Untuk Ollama Cloud/endpoint hosted lain, isi `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` jika diminta); biaya/limit mengikuti layanan tersebut.
>
> **Geoapify** (`https://www.geoapify.com/`): API untuk geocoding (mencari lokasi/tujuan) dan Places/POI (tempat wisata, kuliner, dll.). Butuh `GEOAPIFY_API_KEY` (ada paket/kuota gratis terbatas, cek ketentuan di situs Geoapify). Jika diisi, SETAPAK dapat memakai Geoapify sebagai sumber data lokasi/tempat dan tetap punya fallback ke sumber lain (Google Places/OSM, Wikivoyage/Wikipedia, Open-Meteo) bila diperlukan.
>
> `gemini-2.5-flash` sudah tidak tersedia untuk akun baru (HTTP 404). Kalau model
> default berubah, cukup ganti `GEMINI_MODEL` di `.env` tanpa mengubah kode.
>
> Urutan default (terbaik → cadangan, provider tanpa key/konfigurasi dilewati): `groq,gemini,100milionseek,openrouter,ollama`. Bisa diubah lewat `AI_PROVIDER_ORDER`. 100milionseek punya kuota harian besar tetapi kadang lebih lambat; Groq/Gemini biasanya lebih responsif. Gemini 3.x menghitung token "berpikir" sebagai bagian dari batas output, jadi jawaban pendek bisa terpotong jadi kosong. Gemini sudah diatur `thinkingLevel: LOW`. Di free tier **tidak ada tagihan** — kalau kuota habis cukup dapat `429`.

Tanpa API key/provider AI pun aplikasi tetap jalan — pertanyaan yang dikenal mesin lokal
(misalnya `3 hari di Yogyakarta budget 300rb`) tetap dijawab instan.

Urutan jawaban (`src/api/chat.js` + `server/aiProviders.js`):

1. **Mesin lokal** (`src/api/plannerEngine.js`) — baca kota, durasi, budget, minat,
   lalu susun itinerary dari `src/data/plannerData.js`. Instan & gratis (untuk pola yang dikenali).
2. **100milionseek** (jika dikonfigurasi) — kuota besar 100 juta token/hari.
3. **Ollama** (jika dikonfigurasi) — lokal/self-host gratis (pakai resource sendiri) atau endpoint hosted sesuai konfigurasi.
4. **Groq** lewat `/api/chat` — cepat, gratis.
5. **Gemini 3.8 Flash → OpenRouter `:free`** — fallback otomatis kalau kena `429` / timeout.
6. **Jawaban template** — kalau semua kuota habis, user tetap dapat balasan.

Untuk **For you** (input kota), jalurnya sedikit beda: server meminta AI mengembalikan
JSON berisi kartu (`mode: "recommend"` + `minRating`). Server menyortir ulang hasil AI
dari rating tertinggi dan memotong jadi 4 kartu per kategori. Hasilnya disimpan di
**planner data bersama** (`server/plannerStore.js` → tabel `city_recommendations`),
jadi pencarian yang sama tidak perlu AI lagi dan hasilnya identik untuk semua orang.
Browser juga punya cache `setapak:recommend-cache:v3`. Untuk kota yang ada di data
lokal, prompt AI menyertakan daftar nama/alamat/kategori yang **boleh dipakai saja**.
Kalau AI gagal, kartu diambil dari data lokal (atau hasil lama saat tombol reload).

**Reset data tersimpan** (misal hasil lama bertahan/Taman Safari terus muncul):
```bash
npm run reset:planner     # kosongkan tabel city_recommendations di Supabase
```
Atau jalankan `supabase/reset.sql` di SQL Editor. Versi cache browser sudah dinaikkan
ke `v3`, jadi cache lama otomatis terbuang. **Restart server dev** untuk mengosongkan
cache memory. Setelah itu pencarian berikutnya dijawab AI lagi dan hasilnya disimpan
kembali. Tombol **reload** melakukan hal yang sama untuk satu kota: melewati data lama,
minta tempat lain ke AI (nama yang sedang tampil dilarang dipakai), lalu menimpaninya.

Kuota dijaga dengan: batas token (500 untuk chat singkat, 2000 untuk riset rencana
di mode Searching, 3600 untuk membuat rencana, 1600 untuk rekomendasi), riwayat
cukup 8 pesan, input maksimal 500 karakter, dan rate limit 10 request/menit per IP.
**Jawaban riset panjang dan pembuatan rencana** akan memprioritaskan provider yang
dikonfigurasi (mis. 100milionseek/Ollama) lalu Gemini → Groq → OpenRouter lewat
`providerOrder`; kalau kena 429/error, otomatis fallback ke provider berikutnya. Kalau
jawaban tetap terpotong (`MAX_TOKENS` / `finish_reason: length`), AI diminta melanjutkan
sekali dari titik terakhir. Pertanyaan singkat mengikuti urutan provider dari `.env`
(default otomatis: `100milionseek,ollama,groq,gemini,openrouter` sesuai konfigurasi).

### Catatan 100milionseek

Layanan gratis dengan kuota **100.000.000 token per akun per hari** (reset 00:00 UTC).
OpenAI-compatible (`https://100milionseek.top/v1/chat/completions`), model default
`deepseek-v4.1-flash-free`. Tidak menyimpan prompt/response. Batas 5 request paralel
per akun; status/limit dapat dilihat dari header quota dan dokumentasi resmi. Pendaftaran
dapat dibatasi saat kapasitas penuh — lihat `https://100milionseek.top/`.

### Catatan Ollama

**Ollama lokal itu gratis** (open-source) untuk dipakai sebagai API di mesin sendiri: tidak ada biaya per-token seperti layanan hosted. Kamu perlu menginstal Ollama, menjalankannya, dan men-download model (`ollama pull <model>`). Performa/kapasitas bergantung pada hardware dan model yang dipilih. Endpoint OpenAI-compatible biasanya tersedia di `http://localhost:11434/v1`.

Jika kamu memakai endpoint Ollama yang di-host (cloud/pihak ketiga), ketentuan biaya, kuota, dan autentikasi mengikuti layanan tersebut (isi `OLLAMA_BASE_URL` dan `OLLAMA_API_KEY` bila diperlukan).

### Catatan Geoapify (lokasi/tempat)

Geoapify menyediakan API geocoding dan data tempat/POI yang bisa dipakai untuk fitur "lokasi-lokasi" (mencari tujuan, koordinat, dan daftar tempat). SETAPAK sudah mendukung integrasi ini via `GEOAPIFY_API_KEY` di server (`server/geoapify.js` + `server/liveKnowledge.js`). Geoapify umumnya punya **free tier/kuota gratis terbatas** (detail & limit dapat berubah, cek di https://www.geoapify.com/). Jika key tidak diisi atau request gagal, sistem akan fallback ke sumber data lain yang tersedia (mis. Google Places bila dikonfigurasi, atau OpenStreetMap/Nominatim/Overpass).

### Catatan 100milionseek

Layanan gratis dengan kuota **100.000.000 token per akun per hari** (reset 00:00 UTC).
OpenAI-compatible (`https://100milionseek.top/v1/chat/completions`), model default
`deepseek-v4.1-flash-free`. Tidak menyimpan prompt/response. Batas 5 request paralel
per akun; status/limit dapat dilihat dari header quota dan dokumentasi resmi. Pendaftaran
dapat dibatasi saat kapasitas penuh — lihat `https://100milionseek.top/`.

### Catatan OpenRouter (cadangan ke-3)

OpenRouter **gratis hanya untuk model yang id-nya berakhir `:free`** (default:
`google/gemma-4-31b-it:free`). Kuota model free: 50 request/hari untuk akun yang
belum pernah membeli credit, atau 1.000 request/hari kalau pernah membeli minimal
10 credit (opsional). Memakai model tanpa `:free` akan memotong credit / berbayar.
Cek sisa kuota di `https://openrouter.ai/activity` atau `GET /api/v1/key`.

### Deploy ke Vercel

- Import repository, lalu tambahkan env var yang sama di **Settings → Environment Variables**.
- File `api/chat.js` otomatis menjadi endpoint `/api/chat`.
- Sebelum deploy, ubah `START_AT_DASHBOARD` di `src/App.jsx` menjadi `false`
  supaya `/` menampilkan landing page.

### Supabase (opsional, tapi diperlukan agar hasil sama antar-user)

Jalankan `supabase/schema.sql` di SQL Editor (membuat `chat_logs` **dan**
`city_recommendations`), lalu isi:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

**Penting:** pakai **secret / service role key** (`sb_secret_...` atau JWT dengan
`role: service_role`), **bukan** publishable/anon key. Kalau yang terpasang anon,
request akan ditolak (`permission denied for table chat_logs`) dan planner data
hanya tersimpan di memory server satu proses — hasil belum otomatis sama di
perangkat/user lain. Tanpa Supabase, aplikasi tetap jalan dan tidak error.

Catatan foto: Google Places API bisa memberi foto tempat yang di-host Google, tetapi
butuh akun **billing**. Tanpa itu, kartu memakai foto asli dari Wikimedia/sumber web
yang sudah diverifikasi bila tersedia, sisanya foto stok + tautan Google Maps.

AI sering mengarang URL gambar Wikimedia yang ternyata **404/429** (terutama untuk
kota tanpa data lokal seperti Makassar). Supaya gambar tetap tampil, ada tiga lapis:
1. Nama yang ada di data lokal memakai **foto aslinya** (`placeImages.js`).
2. Nama di luar data lokal memakai kumpulan **URL Unsplash terverifikasi** (200
   `image/jpeg`) yang dipilih bergilir per kategori di `server/chatHandler.js`.
3. Kalau URL tetap gagal dimuat di browser, `onError` di `HomeUser.jsx` menggantinya
   dengan gambar lokal yang ikut ter-bundle. Jadi tidak ada lagi kartu tanpa gambar.

Balasan AI juga diperbaiki sebelum diparse: batas token dinaikkan ke 1600 dan JSON
yang terpotong di tengah URL ditutup otomatis (`bacaJsonAI`), sehingga kartu tidak
lagi hilang hanya karena URL gambar yang panjang.

## Struktur folder

```
src/
├── animations/     # animasi GSAP (mis. HomeAnimation.js)
├── api/            # pemanggilan API
├── assets/
│   ├── fonts/      # Clash Display
│   └── images/     # gambar (format .webp)
├── components/
│   ├── layouts/    # GuestLayout, AuthLayout, UserLayout, SmoothScroll
│   ├── shared/     # komponen bersama (Navbar)
│   └── ui/         # komponen kecil (FillButton)
├── hooks/          # custom hooks
├── pages/
│   ├── guest/      # Home, Destinations, LandingPage
│   ├── auth/       # sign in / sign up
│   └── user/       # halaman user
├── store/          # state global
├── utils/          # fungsi bantu
├── App.jsx         # router
├── main.jsx
└── index.css
```

Alur halaman landing: `App.jsx` -> `GuestLayout` (Navbar) -> `LandingPage` -> section `Home` dan `Destinations`.
