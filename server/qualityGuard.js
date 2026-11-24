
const MARKER = /^(PILIHAN|LOKASI):.*$/gim;

export function badanBalasan(reply = "") {
  return String(reply)
    .replace(MARKER, "")
    .replace(/<<\s*SIAP\s*>>/g, "")
    .trim();
}

const KATA_GANTUNG = /\b(dan|yang|di|ke|untuk|dengan|atau|serta|dari|pada|karena|sekitar|seperti|agar|supaya|the|and|to|of|for)$/i;

export function terpotong(reply = "") {
  const t = badanBalasan(reply);
  if (!t) return false;
  const kosongPendek = t.length < 40;
  if (kosongPendek) return false;

  if ((t.match(/\*\*/g) || []).length % 2 === 1) return true;
  if ((t.match(/`/g) || []).length % 2 === 1) return true;

  const akhir = t.slice(-1);
  if (/[.!?…)"”’\]:]/u.test(akhir) && !/[,:;(-]\s*$/.test(t)) {
    // berakhir tanda baca; tetap curiga jika baris terakhir adalah poin yang menggantung
    const barisAkhir = t.split("\n").pop().trim();
    if (/^(-|\*|\d+\.)\s/.test(barisAkhir) && KATA_GANTUNG.test(barisAkhir.replace(/[.!?…)]+$/, ""))) {
      return true;
    }
    return false;
  }
  if (/[,;(-]$/.test(akhir)) return true;
  if (KATA_GANTUNG.test(t)) return true;
  // harga/angka yang belum selesai ("... sekitar Rp")
  if (/(\bRp\.?|\bIDR|\bUSD|[±~])\s*$/i.test(t)) return true;
  // berakhir huruf/angka tanpa tanda baca pada teks panjang
  if (/[\p{L}\p{N}]$/u.test(t) && t.length > 140) return true;
  // heading "## Judul" paling akhir tanpa isi
  if (/^##\s.+$/m.test(t.split("\n").pop())) return true;
  return false;
}

/** Rapikan teks terpotong: buang ujung yang menggantung, jangan sampai kosong. */
export function rapikanAkhir(reply = "") {
  if (!terpotong(reply)) return reply;
  let t = badanBalasan(reply);
  // tutup penanda tebal yang terbuka
  if ((t.match(/\*\*/g) || []).length % 2 === 1) t = t.replace(/\*\*(?=[^*]*$)/, "");

  const baris = t.split("\n");
  // buang baris terakhir bila menggantung (poin/heading tak selesai)
  while (baris.length > 1 && terpotong(baris.join("\n"))) {
    const terakhir = baris[baris.length - 1].trim();
    if (!terakhir || /^##\s/.test(terakhir) || KATA_GANTUNG.test(terakhir) || /[,;(-]$/.test(terakhir) || !/[.!?…)]$/.test(terakhir)) {
      baris.pop();
    } else break;
  }
  let hasil = baris.join("\n").trim();
  // masih menggantung dalam satu paragraf: potong ke tanda baca terakhir
  if (terpotong(hasil)) {
    const idx = Math.max(hasil.lastIndexOf(". "), hasil.lastIndexOf("! "), hasil.lastIndexOf("? "), hasil.lastIndexOf(".\n"));
    // lebih baik berhenti di kalimat lengkap terakhir daripada berakhir "dan…"
    if (idx >= 30) hasil = hasil.slice(0, idx + 1);
    else hasil = `${hasil.replace(/[,;:(-]\s*$/, "")}…`;
  }
  // kembalikan penanda yang tadi dibuang
  const penanda = String(reply).match(MARKER) || [];
  const siap = /<<\s*SIAP\s*>>/.test(reply) ? ["<<SIAP>>"] : [];
  return [hasil, ...penanda, ...siap].join("\n").trim();
}

// -------------------------------------------------------- pertanyaan dobel

const POLA_TANYA = {
  durasi:
    /(berapa\s+(hari|lama|malam|minggu)|tanggal\s+berapa|kapan\s+(rencana\s+)?(berangkat|perginya|mau\s+pergi|perjalanan)|(durasi|lama)\s+(perjalanan|trip|liburan|menginap)|how\s+many\s+(days|nights)|how\s+long|when\s+(are|do)\s+you)/i,
  tujuan:
    /(mau\s+(ke|pergi\s+ke)\s+mana|(kota|wilayah|negara)(\s+atau\s+wilayah)?\s+(tujuan|mana|apa)|tujuan(nya)?\s+(ke\s+)?mana|destinasi\s+(mana|apa)|where\s+(do|would)\s+you\s+want)/i,
  budget:
    /(berapa\s+(budget|anggaran|biaya)|(budget|anggaran)(nya)?\s+(berapa|kira-?kira|sekitar)|kisaran\s+(budget|anggaran)|what('s| is)\s+your\s+budget)/i,
};

function kalimatTanya(teks = "") {
  const bersih = badanBalasan(teks);
  return bersih
    .split(/(?<=[?.!\n])\s+/)
    .map((k) => k.trim())
    .filter((k) => k.includes("?"));
}

function tokenSet(teks) {
  return new Set(
    String(teks || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((k) => k.length > 2)
  );
}

function mirip(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let sama = 0;
  A.forEach((k) => B.has(k) && (sama += 1));
  return sama / Math.min(A.size, B.size);
}

/**
 * Daftar alasan kalau balasan menanyakan hal yang sudah diketahui / sudah pernah ditanya.
 * @returns {string[]} kosong = aman
 */
export function pertanyaanDobel(reply, fakta = null, history = []) {
  const alasan = [];
  const tanya = kalimatTanya(reply);
  const pilihan = (String(reply).match(/^PILIHAN:.*$/im) || [""])[0];
  const gabung = [...tanya, pilihan].join(" ");

  if (fakta && (fakta.days || fakta.startDate) && POLA_TANYA.durasi.test(gabung)) {
    alasan.push("durasi/tanggal");
  }
  if (fakta?.destinations?.length && POLA_TANYA.tujuan.test(gabung)) {
    alasan.push("tujuan");
  }
  if (fakta?.budget && POLA_TANYA.budget.test(gabung)) {
    alasan.push("budget");
  }

  const tanyaLama = (history || [])
    .filter((h) => h?.role && h.role !== "user")
    .slice(-4)
    .flatMap((h) => kalimatTanya(h.text));
  if (tanya.some((k) => tanyaLama.some((lama) => mirip(k, lama) >= 0.75))) {
    alasan.push("pertanyaan yang sama sudah pernah ditanyakan");
  }
  return alasan;
}

/** Kalimat koreksi yang ditempel ke permintaan ulang ke AI. */
export function catatanKoreksi({ dobel = [], potong = false }) {
  const bagian = [];
  if (dobel.length) {
    bagian.push(
      `Jawabanmu sebelumnya menanyakan hal yang SUDAH diketahui (${dobel.join(", ")}). Tulis ulang TANPA menanyakan hal itu; tanyakan satu hal lain yang benar-benar belum ada di PROFIL TRIP / riwayat, dan sertakan baris PILIHAN yang sesuai.`
    );
  }
  if (potong) {
    bagian.push(
      "Jawabanmu sebelumnya berhenti di tengah kalimat. Tulis ulang LEBIH RINGKAS dan selesaikan sampai kalimat terakhir."
    );
  }
  return bagian.length ? `\n\nKOREKSI WAJIB: ${bagian.join(" ")}` : "";
}
