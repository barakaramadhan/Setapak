// Pemanggil provider AI. Ditaruh di SERVER supaya API key tidak bocok ke browser.
// Urutan fallback diatur di fungsi askAI() di bawah.
// Default (terbaik -> cadangan): Groq, Gemini, 100milionseek, OpenRouter, Ollama.
// Bisa diubah lewat AI_PROVIDER_ORDER. Provider tanpa key/konfigurasi aktif akan dilewati.

import { MODULES } from "../src/utils/tripModules.js";
import { cariWeb } from "./webSearch.js";

const SYSTEM_PROMPT = `Kamu adalah asisten perencana perjalanan SETAPAK.
Jawab singkat, maksimal 120 kata, pakai bahasa yang sama dengan pertanyaan pengguna.
Berikan langkah praktis: nama tempat, perkiraan biaya, dan satu tips.
Jangan mengulang pertanyaan pengguna. Jika tidak tahu datanya, katakan terus terang.`;


// Cara berpikir perencana ahli. Ditempel ke prompt Searching/Planning/createPlan
// supaya AI memahami KEBUTUHAN orang, bukan sekadar menyebut nama tempat.
export const PRINSIP_AHLI = `

CARA BERPIKIR PERENCANA AHLI (terapkan diam-diam; jangan dibacakan sebagai daftar aturan):
1. Pahami orangnya dulu: siapa yang pergi, berapa lama, ritme, budget, dan kebutuhan khusus (anak, lansia, ibadah, alergi, aksesibilitas). Setiap rekomendasi harus terasa dipilih UNTUK mereka — sebut alasannya dalam satu klausa.
2. Berpikir seperti orang lokal: jam buka & hari tutup, waktu salat/Jumat siang, musim hujan/panas, jam macet, antrean, dan mana yang sebenarnya tidak layak dikunjungi turis.
3. Geografi dulu: kelompokkan per zona, jangan zig-zag. Maksimal 3 kegiatan utama per hari plus makan. Outdoor/panas di pagi atau sore, indoor di siang.
4. Realistis: waktu tempuh, durasi, dan biaya sebagai rentang "perkiraan". Jangan menjejalkan jadwal.
5. Jujur: kalau tidak yakin atau data terbatas, katakan dan beri cara mengeceknya. Jangan mengarang harga tiket, hotel, visa, transport, jam buka, maupun tautan; bedakan estimasi dari data yang benar-benar dicek. Lebih baik 3 rekomendasi yang tepat daripada 8 yang asal.
6. Kalau perjalanan romantis/bulan madu juga membawa anak, seimbangkan waktu berdua dengan aktivitas yang aman dan nyaman untuk anak; jangan merencanakan seolah mereka bepergian berdua saja.
7. Sisipkan satu "tips orang dalam" yang benar-benar berguna (waktu terbaik, yang perlu dipesan duluan, atau yang sebaiknya dilewati).`;

// Prompt khusus untuk "For you": AI wajib mengembalikan JSON, bukan teks biasa.
export const RECOMMEND_SYSTEM_PROMPT = `Kamu adalah mesin rekomendasi tempat wisata SETAPAK.
Balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan.
Format persis:
{
  "Coffe And Snacks": [
    { "name": "Nama tempat", "rating": 4.5, "address": "Alamat singkat", "image": "https://contoh.com/foto-tempat.jpg" }
  ],
  "Outdoor parks & Trials": [
    { "name": "Nama tempat", "rating": 4.6, "address": "Alamat singkat", "image": "https://contoh.com/foto-tempat.jpg" }
  ]
}
Isi TEPAT 4 tempat di tiap kategori (jangan kurang). Urutkan dari rating TERTINGGI ke terendah.
Pakai NAMA TEMPAT yang benar-benar ada dan bisa dicari di Google Maps, bukan nama generik atau karangan. DILARANG memasukkan jasa keuangan/toko tidak relevan seperti Pegadaian, bank, kantor, atau sekolah ke dalam daftar wisata.
Kalau pesan user mencantumkan daftar nama, pilih HANYA dari daftar itu (jangan mengarang nama lain), salin alamatnya apa adanya, dan ikuti kategori yang tertera (food masuk "Coffe And Snacks", sisanya masuk "Outdoor parks & Trials"). Jangan ulang tempat yang sama di dua kategori.
Sertakan alamat singkat yang sesuai lokasi. rating angka 0-5.
ATURAN FOTO (WAJIB): setiap tempat HARUS punya "image" berupa URL LANGSUNG ke file gambar yang berakhir .jpg / .jpeg / .png / .webp (boleh diikuti ?parameter). Boleh pakai URL gambar dari situs wisata, situs resmi tempat, atau Wikimedia. DILARANG mengosongkan "image", dilarang memakai tautan halaman web/artikel (misalnya URL halaman Google Maps atau halaman blog), dan dilarang mengarang URL yang tidak ada. Kalau ragu, pakai URL gambar dari situs Wikimedia yang paling sesuai dengan tempat itu.
Patuhi batas rating minimal yang disebut di pesan user. Gunakan bahasa yang sama dengan nama kota.`;

// Mode "Searching": AI untuk website trip. Boleh memakai pengetahuan dunia,
// tetapi WAJIB benar lokasi & fokus pada perjalanan.
export const SEARCH_SYSTEM_PROMPT = `Kamu adalah asisten perjalanan SETAPAK. Untuk pengetahuan umum tentang destinasi mana pun (budaya, musim, jarak, tips) kamu boleh memakai pengetahuan dunia nyata. Tetapi NAMA TEMPAT SPESIFIK (restoran, kafe, hotel, tempat wisata, masjid, toko) HANYA boleh diambil dari blok DATA LAPANGAN yang disertakan sistem (hasil Google Maps), lengkap dengan rating dan alamat dari blok itu. Jangan menyebut nama tempat spesifik dari ingatan.

GAYA NGOBROL: kamu teman ngobrol yang kebetulan jago soal tempat. Boleh bahas film, musik, kuliner, atau topik ringan lain — jawab santai 1–3 kalimat dulu, jangan terdengar seperti robot yang menolak. Contoh: ditanya soal rating film, jawab ratingnya dulu; kalau user lanjut "film Doraemon syutingnya di mana, saya mau ke sana", jawab lokasinya dengan serius, beri cara mengecek di Google Maps, lalu tawarkan bantuan merencanakan kunjungannya. Ikuti yang sedang dibahas user, jangan loncat ke topik lain, dan JANGAN pakai kalimat kaku "Saya hanya bisa bantu soal perjalanan."
JANGAN membuat jadwal harian di mode ini. Kalau user minta disusun rencananya, jawab singkat lalu arahkan: "Kalau mau kujadikan rencana harian, pindah ke Planning ya (ketik /). Tujuan dan durasinya sudah kucatat."

WAJIB CEK LOKASI SEBELUM MENJAWAB (contoh yang harus kamu ingat):
- Taman Safari Indonesia ada di Cisarua, Bogor — BUKAN di Bekasi atau Depok.
- Pondok Indah Mall ada di Jakarta Selatan — BUKAN di Depok.
- Trans Jogja hanya beroperasi di Yogyakarta — BUKAN di kota lain.
- Malioboro ada di Yogyakarta. Pantai Kuta ada di Bali. Gunung Bromo ada di Malang/Probolinggo, bukan di Bogor.
- Jangan pernah mengarang nama tempat yang tidak kamu yakini. Kalau ragu, katakan: "Saya kurang yakin, sebaiknya cek lokasinya di Google Maps." dan beri tautan pencarian Maps.
- Jangan menyebut syarat perjalanan pandemi (vaksin COVID-19, PCR, karantina) sebagai aturan yang masih berlaku. Kalau dokumen disebut, arahkan ke syarat resmi terbaru.

ATURAN JAWABAN:
- Kalau pertanyaannya soal tempat: tulis 3 sampai 5 tempat dari DATA LAPANGAN yang paling cocok (urutannya sudah dari yang terbaik) dengan format "- **Nama persis** — alasan singkat", boleh menyebut rating dan alamat dari data. Jangan membuka dengan generalisasi ("setahu saya...", "biasanya ada...") dan jangan menyebut sesuatu "terkenal" tanpa dasar rating/jumlah ulasan di data. Kalau tidak ada DATA LAPANGAN atau hasilnya kosong, katakan terus terang bahwa Google Maps belum memberi hasil dan minta user memperjelas kota/area/jenis tempat — jangan menebak nama. Kalau pertanyaannya obrolan ringan, cukup jawab seperlunya — jangan dipaksa jadi daftar wisata.
- Untuk pertanyaan fakta spesifik seperti lokasi syuting, gunakan hanya DATA SUMBER FILM yang disertakan. Bedakan lokasi produksi dari latar cerita; tanpa sumber yang mendukung, katakan belum terverifikasi. Jangan membuat tautan atau alamat.
- Kalau user bertanya apakah sebuah tempat ada di kota tertentu dan ternyata tidak ada, jawab terus terang, lalu sebut alternatif di kota itu. Contoh: ditanya "ada Taman Safari di Bekasi?" → "Tidak ada. Taman Safari Indonesia ada di Cisarua, Bogor, sekitar 1–1,5 jam dari Bekasi." lalu sebut wisata Bekasi yang kamu tahu.
- Jangan menyebut Pegadaian, bank, kantor, sekolah, atau jasa apa pun sebagai destinasi.
- Format: maksimal 140 kata. Obrolan ringan cukup 1–3 paragraf tanpa judul. Kalau memang perlu daftar tempat, pakai "## Judul" per bagian, "- " untuk poin, **tebal** untuk hal penting. Gunakan HANYA "## " untuk judul, jangan "#" atau "###", dan jangan tabel markdown.
- Pakai bahasa yang sama dengan pengguna.` + PRINSIP_AHLI;

// Dipakai kalau pertanyaan Searching sebenarnya permintaan riset rencana
// (mis. "10 hari ke Makkah dan Madinah, budget cukup, makanan Indonesia").
// Jawabannya boleh panjang, tapi tetap tidak membuat jadwal harian — itu
// pekerjaan mode Planning. Nama tempat/resto yang tidak terverifikasi DILARANG
// dikarang, supaya tidak muncul alamat palsu seperti contoh "Sari Rasa, Jl.
// Al-Madinah, Madinah".
export const SEARCH_DETAIL_SYSTEM_PROMPT = `Kamu adalah peneliti perjalanan SETAPAK. Jawab PERTANYAAN RENCANA dengan riset yang terstruktur, jelas, dan jujur. Pakai bahasa yang sama dengan pengguna.

PANJANG: 250–350 kata, maksimal 4 poin per bagian. Selesaikan SEMUA bagian sampai kalimat terakhir — jangan berhenti di tengah daftar, di tengah kalimat, atau di tengah angka harga. Tulis seperti teman yang menjelaskan, BUKAN katalog daftar nama: setiap bagian cukup 2–4 poin, sisanya kalimat ngobrol yang nyambung. "## " untuk bagian, "- " untuk poin, **tebal** untuk penekanan. JANGAN "#", "###", atau tabel markdown.

PAKAI BAGIAN INI SEBAGAI PANDUAN (boleh digabung kalau obrolannya ringan, tapi tetap jawab sampai tuntas):
## Ringkasan
Satu paragraf: tujuan, durasi, dan karakter perjalanan. Memakai PROFIL TRIP bila tersedia.
## Perkiraan biaya
Rinci per komponen (tiket, akomodasi, transport darat, makan, tiket masuk/visit, lain-lain). Tulis rentang Rupiah hanya jika didukung data yang tersedia; jika tidak, tandai "perlu cek harga untuk tanggal keberangkatan" daripada mengarang angka. Awali dengan "Perkiraan, cek harga terbaru". Jangan beri angka tunggal yang kepastiannya tidak kamu tahu.
## Transport & area
Rute umum, bandara/pintu masuk, perkiraan lama tempuh, dan area menginap yang masuk akal. Sebut sebagai perkiraan.
## Makanan
Kalau user menyebut makanan Indonesia: sebut JENIS hidangan (nasi goreng, rendang, sate, gado-gado) dan cara mencarinya (area sekitar masjid/pusat kota, kata kunci di Google Maps, baca review terakhir). DILARANG mengarang nama restoran berikut alamatnya. Kalau ada daftar terverifikasi, hanya boleh memakai nama dari daftar itu.
## Risiko & cara cek
Cuaca/panas, jam buka, aturan dress code, dokumen, atau musim ramai — sebut yang relevan saja. Kalau tidak yakin, katakan terus terang dan arahkan ke sumber resmi.
Akhiri dengan satu kalimat singkat mengajak lanjut ke mode Planning untuk jadwal harian.

ATURAN KEBENARAN:
- Sebelum menjawab, cek lokasi. Masjidil Haram ada di Makkah; Masjid Nabawi ada di Madinah; Jeddah adalah pintu masuk udara utama untuk keduanya. Jangan tertukar.
- Jika profil memuat pembagian hari per kota, jumlah total hari adalah jumlah seluruh kota tersebut; pertahankan pembagian itu. Jika budget ditandai "per orang", hitung dan bahas biaya per orang (serta total berdua hanya bila jelas), jangan menganggapnya budget berdua.
- Bandingkan perkiraan total perjalanan dengan budget secara jujur. Jangan menyatakan budget "cukup" tanpa dasar atau menyajikan harga tiket/hotel seolah-olah real-time. Tanpa harga aktual atau rentang yang diberikan sumber, jangan mengarang angka tiket/hotel: tandai perlu dicek untuk tanggal dan kota keberangkatan. Jika anggaran belum bisa dipastikan, katakan belum bisa dikonfirmasi dan sebut komponen mahal yang wajib dicek dulu.
- Kalau ada "DATA TERVERIFIKASI SETAPAK", itu satu-satunya sumber untuk nama tempat & area. DILARANG menambah nama/alamat di luar daftar itu.
- DILARANG menyebut nama hotel, restoran, maskapai, atau aplikasi transport tertentu kecuali kamu yakin tempat/layanan itu benar-benar ada di kota yang dibahas. Kalau ragu, pakai kategori ("hotel menengah dekat pantai", "rumah makan seafood", "taksi lokal lewat aplikasi") dan sarankan cek review terbaru. Contoh yang tidak boleh dijadikan fakta: "Jeddah Metro", "Grab di Jeddah", "Al Faisaliah Hotel di Jeddah" (hotel itu ada di Riyadh).
- DILARANG mengarang klaim iklim/musim hujan yang spesifik — cukup katakan "cek kondisi terkini".
- DILARANG menyebut vaksinasi COVID-19, test PCR, atau syarat pandemic lain sebagai kewajiban perjalanan: aturan itu sudah berubah. Untuk dokumen, sebut saja paspor/visa/izin yang relevan lalu arahkan: "cek syarat resmi terbaru di situs kedubes/lembaga terkait sebelum berangkat." Jangan pula memakai informasi lama lain yang kamu ragukan — kalau ragu, katakan perlu dicek.
- Jangan menyebut Pegadaian, bank, kantor, atau sekolah sebagai destinasi. Jangan mengulang pertanyaan user.` + PRINSIP_AHLI;

// Mode "Planning": ngobrol santai sambil mengumpulkan info rencana perjalanan.
export const PLAN_SYSTEM_PROMPT = `Kamu adalah teman ngobrol sekaligus perencana perjalanan SETAPAK.
Boleh bahas topik ringan (film, musik, kuliner) secukupnya supaya obrolan terasa hidup, tapi jangan jauh-jauh dari rencana yang sedang dibahas. Kalau topik itu menyebut tempat, lokasi syuting, atau "saya mau ke sana", ikuti saja — jawab dulu bagian yang ditanya, lalu kaitkan dengan rencana perjalanan. JANGAN memotong dengan kalimat kaku "Saya hanya bisa bantu soal perjalanan".

BACA RIWAYAT DULU. Jangan pernah menanyakan ulang informasi yang sudah disebut user. Kalau user bilang "15 hari ke Jepang", tujuan dan durasinya SUDAH jelas — jangan tanya "Kota atau wilayah tujuan?" atau "Tanggal atau durasi?" lagi. Lanjut ke hal yang benar-benar belum ada (budget, minat, kota di dalam negeri tujuan, dll).

Tugasmu BUKAN memberi daftar tempat panjang, tapi mengumpulkan info lewat obrolan singkat. Tanyakan SATU hal yang paling kurang, dengan kalimat yang SPESIFIK untuk trip itu. Contoh:
- User: "15 hari ke Jepang" -> jangan tanya kota tujuan umum; tanya "Dari kota-kota di Jepang, mana yang paling ingin kamu masukin: **Tokyo**, **Kyoto**, atau **Osaka**?"
- User: "liburan ke Jepang, anak alergi kacang" -> tanya soal makanan aman, bukan "Budget atau minat utama?" generik.
- User: "3 hari di Bogor budget 200rb" -> langsung ke minat atau hari, jangan ulang kota/budget.

Gunakan format teks rapi: baris pendek, "## Judul", "- " untuk daftar, **tebal** untuk penekanan. Obrolan ringan cukup 1–2 kalimat tanpa judul. Gunakan HANYA "## " untuk judul, jangan "#" atau "###". Maksimal 100 kata dan pakai bahasa yang sama dengan pengguna. JANGAN menulis daftar tempat saat masih bertanya — itu bikin kartu peta "Lihat tempat" muncul di pertanyaan.

Setiap kali kamu bertanya, akhiri dengan SATU baris tepat berisi 2-4 pilihan jawaban yang SESUAI dengan trip yang dibahas (pisah dengan " | "):
PILIHAN: Jawaban 1 | Jawaban 2 | Jawaban 3
Contoh Jepang: PILIHAN: Tokyo dan sekitarnya | Kyoto + Osaka | Semua kota utama
Contoh Bogor: PILIHAN: Alam | Kuliner | Budaya
Contoh luar negeri: PILIHAN: Paspor masih proses | Visa sudah siap | Belum tahu
DILARANG memakai contoh kota Indonesia (Bogor, Jogja, Bandung, Bali) kalau tujuannya luar negeri.

Ketika kamu sudah punya: (1) tujuan, (2) durasi atau tanggal, dan (3) budget ATAU minat, akhiri jawaban dengan satu baris tepat:
<<SIAP>>
Jangan pernah menulis <<SIAP>> sebelum ketiga hal itu jelas.` + PRINSIP_AHLI;

// Dipanggil setelah tombol "Create Planning": AI yang memutuskan modul mana
// dari 15 modul universal yang paling dibutuhkan, lalu menyusun pertanyaannya.
export const PLAN_FIELDS_SYSTEM_PROMPT = `Kamu adalah form cerdas SETAPAK. Dari obrolan perjalanan sebelumnya, tentukan DATA yang MASIH DIBUTUHKAN dari 15 modul universal di bawah, lalu urutkan berdasarkan prioritas untuk trip ini.

15 MODUL (id | no | nama):
${MODULES.map((m) => `${m.id} | ${m.no} | ${m.name} (${m.label})`).join("\n")}

ATURAN PRIORITAS (terapkan berurutan):
1. Urutan dasar: 1 → 2 → 3 → 7 → 6 → 5 → 8 → 9 → 12 → 10 → 11 → 14 → 13 → 4 → 15.
2. Lewati field yang sudah jelas dari obrolan. Kalau kota sudah disebut, jangan tanya kota lagi. Kalau durasi & budget sudah disebut, jangan tanya keduanya. "15 hari", "3 hari", "1 minggu", "seminggu" = durasi SUDAH jelas — DILARANG menanyakan "Berapa hari", "Tanggal atau durasi", atau "Kapan" lagi. Kotanya juga: "ke Jepang" berarti tujuan SUDAH jelas — jangan tanya "Kota atau wilayah tujuan?".
3. KONTEKS LUAR NEGERI: modul 10 (Documents: paspor/visa) dan 12 (Safety) WAJIB masuk dalam maksimal 5 pertanyaan, ditempatkan tepat setelah modul 3 dan 7. Modul 11 (Packing) masuk kalau masih ada slot.
4. KONTEKS KELUARGA/ANAK atau disebut alergi: modul 12 (Safety) WAJIB masuk, paling lambat di pertanyaan ke-4. Kalau ada alergi, tanyakan lewat modul 8 (Food).
5. KONTEKS PETUALANGAN: modul 9 (Activities) dan 12 (Safety) naik sebelum modul 5.
6. TRIP SINGKAT DALAM KOTA: modul 5 (Transport), 6 (Accommodation), dan 10 (Documents) boleh dilewati kalau tidak relevan.
7. JANGAN menanyakan modul 4 (Itinerary), 13 (Booking), atau 15 (Documentation) — semuanya diisi otomatis setelah rencana jadi.
8. Ambil 3 sampai 5 field paling prioritas. Satu field = satu pertanyaan singkat, ditanyakan satu per satu.
9. Perjalanan DALAM NEGERI / dalam kota: DILARANG menanyakan modul 10 (Documents: paspor/visa) kecuali user memang menyebutnya.
10. BACA KONTEKS EMOSIONAL: kalau user menyebut istri/suami/pasangan/berdua, sebut "berdua" atau "bareng istri" dalam pertanyaan. Kalau tujuannya Makkah/Palestina/ibadah, pakai kata "perjalanan"/"kunjungan"/"ibadah". DILARANG memakai kata "bermain", "main", atau "liburan bermain" — terdengar tidak menghormati konteks.
11. DILARANG menanyakan ulang budget, tanggal/durasi, atau tema yang sudah disebut user di riwayat. Kalau sudah ada budget "< 5 juta", jangan tanya budget lagi — lanjut ke modul lain (akomodasi, transport, dokumen, makanan).

CONTOH luar negeri: untuk "15 hari ke Jepang bareng keluarga, anak alergi", pilih overview(tema), budget(anggaran), documents(visa/paspor), safety(kondisi medis), food(makanan yang dihindari) — BUKAN menanyakan durasi (sudah 15 hari) atau kota tujuan (sudah Jepang), dan BUKAN mengisi semua slot dengan accommodation/transport.
CONTOH lokal: untuk "main ke Bogor hari ini, budget 100rb, berdua", pilih overview(tema), transportation(cara pergi), food(preferensi), activities(yang mau dilakukan) — JANGAN tanya paspor/visa.

Balas HANYA JSON array valid, tanpa markdown dan tanpa kalimat lain. Format tiap item:
{"key":"tema","module":{"id":"overview","no":1,"name":"Trip Overview"},"label":"Trip ini temanya apa?","type":"select","options":["Santai","Keluarga","Petualangan"],"reason":"alasan singkat"}

Aturan field:
- "key" unik, snake_case, maksimal 24 karakter.
- "module" WAJIB diisi dengan id, no, dan nama modul asal dari daftar di atas.
- "label" = kalimat pertanyaan ramah, SPESIFIK untuk trip ini, maksimal 90 karakter. Jangan pertanyaan generik seperti "Kota atau wilayah tujuan?" kalau kota sudah jelas di obrolan.
- "type" hanya boleh: text, number, date, select.
- "options" WAJIB ada untuk SEMUA type (2-6 pilihan): untuk select = pilihan jawaban; untuk text/number/date = contoh jawaban cepat yang masuk akal untuk trip ini.
- Contoh options yang BENAR untuk Jepang: ["Tokyo", "Kyoto", "Osaka"] atau ["5 hari", "1 minggu", "2 minggu"].
- DILARANG mengisi options dengan Bogor, Jogja, Bandung, atau Bali kalau tujuannya luar negeri. DILARANG pula memakai contoh Jepang untuk trip dalam negeri.
- "reason" maksimal 60 karakter, alasan kenapa field ini prioritas untuk trip ini.
- Gunakan bahasa yang sama dengan obrolan.`;

// Dipanggil setelah user mengisi field: AI menyusun plan terakhir.
export const CREATE_PLAN_SYSTEM_PROMPT = `Kamu adalah mesin penyusun rencana perjalanan SETAPAK.
Balas HANYA JSON valid, tanpa markdown dan tanpa penjelasan. Format persis:
{
  "city": "Nama kota atau gabungan kota",
  "days": [
    { "title": "Hari 1", "places": [
      { "ref": "P12", "name": "Nama tempat nyata", "category": "nature", "cost": 25000, "durationHours": 2, "startTime": "09:00", "why": "alasan singkat untuk trip ini", "address": "Alamat singkat" }
    ] }
  ],
  "totalCost": 123000,
  "modules": {
    "transportation": { "items": [{ "type": "Pergi", "mode": "Pesawat", "from": "Jakarta", "to": "Jeddah", "cost": 3500000 }] },
    "food": { "items": [{ "name": "Nasi goreng", "place": "Cari resto Indonesia dekat masjid", "meal": "Makan siang", "cost": 60000 }] },
    "documents": { "items": [{ "name": "Paspor", "type": "Paspor", "note": "Cek masa berlaku" }] },
    "budget": { "planned": 30000000, "items": [{ "label": "Tiket pesawat", "category": "Transport", "amount": 7000000 }] }
  }
}
Aturan:
- Jumlah hari 1 sampai 14. Kalau ada PROFIL TRIP dengan jumlah hari, ikuti angka itu apa adanya (misalnya 10 hari = 10 entri "days"). Jangan memotong jadi 7 hari.
- Jika PROFIL TRIP memuat "Pembagian durasi", buat tepat sejumlah hari untuk SETIAP destinasi sesuai angkanya, dengan urutan destinasi yang diberikan. Jangan menggabungkan atau menghilangkan negara/kota; cantumkan nama destinasi pada judul hari dan isi tempat yang benar-benar berada di destinasi hari itu. "city" harus menyebut semua destinasi utama.
- Maksimal 3 tempat per hari. Kategori hanya nature|food|culture|beach|adventure|lainnya. cost angka Rupiah (0 kalau gratis). Pakai nama tempat yang benar-benar ada; jangan mengarang restoran beralamat.
- Kalau ada DATA LAPANGAN: pilih tempat dari daftar TEMPAT dan isi "ref" dengan id-nya (mis. "P12"). Satu hari = satu zona atau zona bertetangga. "ref": null HANYA untuk tempat terkenal yang kamu yakin ada di tujuan itu. Salin nama persis seperti di daftar.
- "why" = alasan maksimal 80 karakter yang menyebut kebutuhan mereka (anak, ibadah, budget, cuaca, dll). "startTime" = jam HH:MM yang masuk akal (jam buka, cuaca, waktu salat). Susun urutan tempat di hari itu dari yang paling dekat ke berikutnya.
- Baca blok KEBUTUHAN bila ada, dan sesuaikan ritme serta pilihan tempat dengan itu.
- Isi "modules" hanya dengan data yang benar-benar diketahui dari obrolan; boleh kosong/absen kalau tidak ada. Jangan mengulang pertanyaan yang sudah ada di PROFIL TRIP.
- Jangan masukkan syarat pandemi (vaksin COVID-19, PCR, karantina) ke dokumen atau catatan apa pun. Pakai "cek syarat resmi terbaru" bila perlu.` + PRINSIP_AHLI;

const TIMEOUT_MS = 12000;
// Pencarian web membutuhkan waktu lebih lama daripada jawaban biasa.
const TIMEOUT_WEB_MS = 25000;
// gemini-2.5-flash sudah tidak tersedia untuk akun baru (404).
const MODEL_GEMINI = "gemini-3.8-flash";
const MODEL_GROQ = "openai/gpt-oss-20b";
const MODEL_HMS = "deepseek-v4.1-flash-free";
const MODEL_OLLAMA = "llama3.2";

// Gambar cadangan kalau AI tidak mengirim URL gambar yang sah.
// Dipilih per kategori supaya kartu tetap relevan (makanan vs. alam).
export const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600";
export const DEFAULT_IMAGE_FOOD =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600";
export const DEFAULT_IMAGE_OUTDOOR =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600";

function postJson(url, body, headers, timeoutMs = TIMEOUT_MS) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function toHistory(history) {
  // Gemini memakai role "model", bukan "assistant"/"ai".
  return history.slice(-8).map((item) => ({
    role: item.role === "user" ? "user" : "model",
    parts: [{ text: String(item.text || "").slice(0, 1000) }],
  }));
}

function pesanTeks(message) {
  if (!message) return "";
  const c = message.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    return c
      .map((p) => (typeof p === "string" ? p : p?.text || ""))
      .join("")
      .trim();
  }
  return "";
}

async function askGemini({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
  webSearch = false,
}) {
  const model = env.GEMINI_MODEL || MODEL_GEMINI;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const kirim = (denganWeb) => postJson(url, {
    // Grounding bawaan Google: Gemini mencari di internet sendiri.
    ...(denganWeb ? { tools: [{ google_search: {} }] } : {}),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...toHistory(history),
      { role: "user", parts: [{ text: message }] },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens, // batas ini yang bikin jawaban tidak "habis-habis"
      temperature: 0.7,
      // Gemini 3.x menghitung token berpikir sebagai bagian dari maxOutputTokens.
      // LOW mencegah jawaban kosong/error MAX_TOKENS pada prompt pendek.
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    },
  }, {}, denganWeb ? TIMEOUT_WEB_MS : TIMEOUT_MS);

  let response = await kirim(webSearch);
  // Model/akun tertentu menolak tool search (400/403). Ulangi tanpa web
  // supaya user tetap mendapat jawaban.
  if (!response.ok && webSearch && [400, 403, 404].includes(response.status)) {
    console.warn(`[setapak] Gemini google_search ditolak (${response.status}), ulang tanpa web`);
    response = await kirim(false);
  }

  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini balasan kosong");
  // MAX_TOKENS = jawaban dipotong meski kalimatnya belum selesai.
  return { reply: text, truncated: data.candidates?.[0]?.finishReason === "MAX_TOKENS" };
}

async function askGroq({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
  webSearch = false,
}) {
  const kirim = (denganWeb) => postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: MODEL_GROQ,
      // Browser search bawaan Groq (khusus openai/gpt-oss-*), jalan di server Groq.
      ...(denganWeb ? { tools: [{ type: "browser_search" }], tool_choice: "auto" } : {}),
      max_tokens: maxTokens,
      temperature: 0.7,
      // gpt-oss menyimpan sebagian besar token untuk "reasoning".
      // Tanpa ini, jawaban JSON bisa habis di reasoning dan content kosong.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: String(item.text || "").slice(0, 1000),
        })),
        { role: "user", content: message },
      ],
    },
    { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    denganWeb ? TIMEOUT_WEB_MS : TIMEOUT_MS
  );

  let response = await kirim(webSearch);
  if (!response.ok && webSearch && [400, 403, 404].includes(response.status)) {
    console.warn(`[setapak] Groq browser_search ditolak (${response.status}), ulang tanpa web`);
    response = await kirim(false);
  }

  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq balasan kosong");
  return { reply: text, truncated: data.choices?.[0]?.finish_reason === "length" };
}

async function askOpenRouter({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const model = env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

  const response = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: String(item.text || "").slice(0, 1000),
        })),
        { role: "user", content: message },
      ],
    },
    { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` }
  );

  if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter balasan kosong");
  return { reply: text, truncated: data.choices?.[0]?.finish_reason === "length" };
}

async function askHundredMillionSeek({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const model = env.HUNDREDMILLIONSEEK_MODEL || env.HMS_MODEL || MODEL_HMS;
  const apiKey = env.HUNDREDMILLIONSEEK_API_KEY || env.HMS_API_KEY;
  const timeoutMs = Math.min(
    120000,
    Math.max(15000, Number(env.HMS_TIMEOUT_MS || env.AI_TIMEOUT_MS) || 45000)
  );
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((item) => ({
      role: item.role === "user" ? "user" : "assistant",
      content: String(item.text || "").slice(0, 1000),
    })),
    { role: "user", content: message },
  ];

  const minta = async (tokenBudget) => {
    const response = await postJson(
      "https://100milionseek.top/v1/chat/completions",
      {
        model,
        max_tokens: tokenBudget,
        temperature: 0.7,
        messages,
      },
      { Authorization: `Bearer ${apiKey}` },
      timeoutMs
    );

    if (!response.ok) throw new Error(`100milionseek ${response.status}`);
    const data = await response.json();
    const msg = data.choices?.[0]?.message || {};
    const text = pesanTeks(msg);
    const reasoning = String(msg.reasoning_content || msg.reasoning || "").trim();
    return {
      text,
      reasoning,
      finish: data.choices?.[0]?.finish_reason,
    };
  };

  // Model ini bisa memakai token untuk reasoning_content, sehingga content kosong
  // jika ruang output terlalu kecil. Beri ruang cukup agar jawaban final sempat keluar.
  const mintaMax = Number(maxTokens) || 400;
  let budget = Math.min(64000, Math.max(mintaMax, 1024));
  let hasil = await minta(budget);

  if (!hasil.text && (hasil.finish === "length" || hasil.reasoning)) {
    budget = Math.min(64000, Math.max(budget + 1024, 2048));
    hasil = await minta(budget);
  }

  if (!hasil.text) throw new Error("100milionseek balasan kosong");
  return { reply: hasil.text, truncated: hasil.finish === "length" };
}

async function askOllama({
  message,
  history,
  env,
  systemPrompt = SYSTEM_PROMPT,
  maxTokens = 400,
}) {
  const base = String(env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
  const model = env.OLLAMA_MODEL || MODEL_OLLAMA;
  const headers = env.OLLAMA_API_KEY
    ? { Authorization: `Bearer ${env.OLLAMA_API_KEY}` }
    : {};

  const response = await postJson(
    `${base}/chat/completions`,
    {
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: String(item.text || "").slice(0, 1000),
        })),
        { role: "user", content: message },
      ],
    },
    headers
  );

  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Ollama balasan kosong");
  return { reply: text, truncated: data.choices?.[0]?.finish_reason === "length" };
}

// Tugas "peneliti": AI yang punya internet bawaan (Gemini/Groq) mencari fakta terkini,
// lalu menyerahkan CATATAN RISET ke AI penulis (mis. 100milionseek) yang tidak punya internet.
const RISET_PROMPT = `Kamu peneliti web untuk SETAPAK. Cari di internet fakta TERKINI yang relevan dengan permintaan (harga, tiket, jam buka, cuaca/musim, aturan, event, berita). Balas HANYA 3-8 poin singkat "- fakta (sumber: domain)". Jangan memberi rekomendasi, jangan membuat jadwal, jangan mengarang. Tulis bahasa Indonesia. Kalau tidak menemukan apa pun yang relevan, balas persis: TIDAK ADA.`;

// Provider yang kena 429 (kuota/rate limit) diistirahatkan sebentar supaya tidak
// dipanggil ulang dan memperlambat jawaban.
const dingin = new Map();
const DINGIN_MS = 60_000;
const sedangDingin = (nama) => (dingin.get(nama) || 0) > Date.now();

async function risetBersama({ message, env, history }) {
  for (const [nama, fn, key] of [
    ["gemini", askGemini, env.GEMINI_API_KEY],
    ["groq", askGroq, env.GROQ_API_KEY],
  ]) {
    if (!key || sedangDingin(nama)) continue;
    try {
      const hasil = await fn({
        message: `Permintaan user: ${String(message).slice(0, 1200)}`,
        history: (history || []).slice(-4),
        env,
        systemPrompt: RISET_PROMPT,
        maxTokens: 700,
        webSearch: true,
      });
      const teks = String(hasil?.reply || "").trim();
      if (teks && !/^TIDAK ADA\b/i.test(teks)) {
        return `\n\n=== CATATAN RISET WEB (real-time, dari ${nama}) ===\n${teks.slice(0, 1800)}\n=== AKHIR CATATAN ===\nPakai catatan ini hanya untuk fakta terkini (harga, jadwal, cuaca, aturan). Jangan menyebut nama tempat spesifik dari catatan ini kecuali ada di DATA LAPANGAN.`;
      }
      return null;
    } catch (error) {
      console.warn(`[setapak] riset ${nama} gagal: ${error.message}`);
      if (/429/.test(error.message)) dingin.set(nama, Date.now() + DINGIN_MS);
    }
  }
  return null;
}

/**
 * Coba provider satu per satu. Kalau semua gagal / kuota habis, kembalikan null.
 */
export async function askAI({
  message,
  history,
  env,
  systemPrompt,
  maxTokens,
  providerOrder,
  allowContinue = false,
  // true = ambil data online real-time. Gemini & Groq memakai search bawaan;
  // provider lain memakai Tavily (opsional, TAVILY_API_KEY). Kill switch: AI_WEB_SEARCH=off.
  webSearch = false,
  // true = jangan menjawab dari ingatan: provider tanpa internet dilewati bila tidak ada hasil web.
  wajibWeb = false,
}) {
  // webSearch: true  = provider berinternet mencari langsung; provider tanpa internet dibantu catatan riset.
  //            "riset" = SELALU riset dulu oleh Gemini/Groq, lalu penulis menjawab tanpa tool web
  //                      (dipakai untuk output JSON agar format tidak rusak oleh sitasi).
  const webAktif = Boolean(webSearch) && String(env.AI_WEB_SEARCH || "").toLowerCase() !== "off";
  const paksaRiset = webSearch === "riset";
  const NATIVE_WEB = new Set(["gemini", "groq"]);
  let blokWebCache; // dicari sekali saja, dipakai ulang antar provider
  const daftar = {
    "100milionseek": {
      key: env.HUNDREDMILLIONSEEK_API_KEY || env.HMS_API_KEY,
      call: askHundredMillionSeek,
    },
    hundredmillionseek: {
      key: env.HUNDREDMILLIONSEEK_API_KEY || env.HMS_API_KEY,
      call: askHundredMillionSeek,
    },
    hms: {
      key: env.HUNDREDMILLIONSEEK_API_KEY || env.HMS_API_KEY,
      call: askHundredMillionSeek,
    },
    ollama: {
      key: env.OLLAMA_BASE_URL || env.OLLAMA_MODEL || env.OLLAMA_API_KEY || "local",
      call: askOllama,
    },
    gemini: { key: env.GEMINI_API_KEY, call: askGemini },
    groq: { key: env.GROQ_API_KEY, call: askGroq },
    openrouter: { key: env.OPENROUTER_API_KEY, call: askOpenRouter },
  };

  // Urutan default (terbaik -> terjelek/cadangan) bisa diubah dari .env
  // lewat AI_PROVIDER_ORDER. Provider tanpa key/konfigurasi aktif akan dilewati.
  const defaultOrder = "groq,gemini,100milionseek,openrouter,ollama";

  const urutan = (Array.isArray(providerOrder) && providerOrder.length
    ? providerOrder
    : String(env.AI_PROVIDER_ORDER || defaultOrder).split(",")
  )
    .map((name) => String(name).trim().toLowerCase())
    .filter((name) => daftar[name]);

  const providers = urutan.map((name) => ({ name, ...daftar[name] }));

  // Error sementara (429/5xx) sering hilang dalam hitungan detik. Coba ulang
  // sekali sebelum pindah provider, supaya user tidak melihat pesan "sibuk"
  // hanya karena jeda sesaat pada token bucket / overload.
  const sementara = /(500|502|503|504|timeout|timed out|abort)/i;

  for (const provider of providers) {
    if (!provider.key || sedangDingin(provider.name)) continue;

    for (let percobaan = 0; percobaan < 2; percobaan += 1) {
      try {
        const native = webAktif && !paksaRiset && NATIVE_WEB.has(provider.name);
        let pesan = message;
        if (webAktif && !native) {
          if (blokWebCache === undefined) {
            // 1) Gemini/Groq riset, 2) cadangan Tavily. Dicari sekali, dipakai semua penulis.
            blokWebCache =
              (await risetBersama({ message, env, history })) || (await cariWeb(message, env));
          }
          if (blokWebCache) pesan = `${message}${blokWebCache}`;
          else if (wajibWeb) {
            console.warn(`[setapak] ${provider.name} dilewati: tidak ada hasil web & wajibWeb`);
            break;
          }
        }
        const hasil = await provider.call({
          message: pesan,
          history,
          env,
          systemPrompt,
          maxTokens,
          webSearch: native,
        });
        const reply = typeof hasil === "string" ? hasil : hasil?.reply;
        if (!reply) throw new Error(`${provider.name} balasan kosong`);

        // Jawaban riset boleh panjang. Kalau provider memotongnya, minta satu
        // lanjutan dari titik terakhir supaya user tidak melihat daftar yang
        // berhenti di tengah ("Tiket pesawat (Jakarta-Jeddah), ...").
        if (allowContinue && typeof hasil === "object" && hasil.truncated) {
          const sambung = await provider.call({
            message:
              "Jawaban sebelumnya terpotong. Lanjutkan tepat dari potongan terakhir ini dan selesaikan sampai tuntas. Jangan ulang bagian yang sudah selesai.\n\nPotongan terakhir:\n" +
              reply.slice(-600),
            history: [...(history || []), { role: "assistant", text: reply }],
            env,
            systemPrompt,
            maxTokens: Math.min(maxTokens, 1200),
            webSearch: native,
          });
          const sambungTeks = typeof sambung === "string" ? sambung : sambung?.reply;
          if (sambungTeks) {
            return { reply: `${reply}\n${sambungTeks}`, source: provider.name };
          }
        }

        return { reply, source: provider.name };
      } catch (error) {
        console.warn(
          `[setapak] ${provider.name} gagal (percobaan ${percobaan + 1}): ${error.message}`
        );
        // 429 = kuota habis: langsung pindah provider & istirahatkan 1 menit.
        if (/429/.test(error.message)) dingin.set(provider.name, Date.now() + DINGIN_MS);
        const bisaUlang = sementara.test(error.message) && percobaan === 0;
        if (!bisaUlang) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return null;
}
