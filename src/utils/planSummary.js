
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

export function mapMarkersFromPlan(plan) {
  const markers = new Map();
  if (!Array.isArray(plan?.days)) return [];

  plan.days.forEach((day, index) => {
    (day.places || []).forEach((place) => {
      if (
        place.verified === false ||
        !place.name ||
        !Number.isFinite(place.lat) ||
        !Number.isFinite(place.lon)
      ) {
        return;
      }

      const key = `${place.lat},${place.lon}`;
      if (!markers.has(key)) {
        markers.set(key, {
          name: String(place.name),
          day: String(day.title || `Hari ${index + 1}`),
          lat: place.lat,
          lon: place.lon,
          ...(place.mapsUrl ? { mapsUrl: place.mapsUrl } : {}),
        });
      }
    });
  });

  return [...markers.values()];
}
