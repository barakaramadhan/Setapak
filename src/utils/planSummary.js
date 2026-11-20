// Ringkasan rencana untuk pesan chat. Menampilkan hal yang membuat plan terasa
// "dipikirkan": jam mulai, alasan pilihan, jarak antar tempat, dan cuaca nyata.

export function ringkasPlan(plan) {
  if (!plan || !Array.isArray(plan.days) || !plan.days.length) return "";

  const baris = plan.days.slice(0, 14).map((hari, index) => {
    const tempat = (hari.places || [])
      .map((t) => {
        const jam = t.startTime ? `${t.startTime} ` : "";
        const alasan = t.why ? ` — ${t.why}` : "";
        const ragu = t.verified === false ? " (cek di Maps)" : "";
        return `${jam}${t.name}${ragu}${alasan}`;
      })
      .join("; ");
    const jarak = hari.jarakKm ? ` (±${hari.jarakKm} km antar tempat)` : "";
    return `- **${hari.title || `Hari ${index + 1}`}**${jarak}: ${tempat || "bebas"}`;
  });

  const bagian = [baris.join("\n")];
  const g = plan.grounding;
  if (g?.cuaca) bagian.push(`Cuaca: ${g.cuaca}`);
  if (g?.tempatTerverifikasi) {
    const dibuang = g.tempatDibuang
      ? `, ${g.tempatDibuang} tempat yang tidak terbukti ada dibuang`
      : "";
    bagian.push(
      `${g.tempatTerverifikasi} tempat sudah dicocokkan ke peta nyata (OpenStreetMap)${dibuang}. Jam buka dan harga tetap cek lagi sebelum berangkat.`
    );
  }
  return bagian.join("\n\n");
}
