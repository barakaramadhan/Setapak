// Kosongkan planner data bersama (tabel city_recommendations) lewat REST Supabase.
// Cara jalan: npm run reset:planner
// Cache browser otomatis ikut ter-reset karena versi key cache dinaikkan di src/api/chat.js.
// Cache memory server kosong sendiri setiap kali server di-restart.

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("Supabase belum diisi — tidak ada data bersama yang perlu dihapus.");
  console.log("Restart server dev untuk mengosongkan cache memory.");
  process.exit(0);
}

try {
  const res = await fetch(`${url}/rest/v1/city_recommendations?id=gt.0`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (res.ok) {
    console.log("Planner data bersama berhasil dikosongkan.");
  } else {
    const text = (await res.text()).slice(0, 250);
    console.log(`Gagal menghapus (HTTP ${res.status}): ${text}`);
    if (res.status === 404) {
      console.log(" Jalankan dulu supabase/schema.sql di SQL Editor Supabase.");
    }
    if (res.status === 401 || res.status === 403) {
      console.log(" Gunakan SECRET / SERVICE ROLE key, bukan anon key.");
    }
  }
} catch (error) {
  console.log("Request gagal:", error.message);
}

console.log("Langkah berikutnya: restart server dev, lalu refresh halaman di browser.");
