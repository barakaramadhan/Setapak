import { formatRupiah } from "./tripModules.js";

const esc = (teks) =>
  String(teks ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const rp = (n) => (Number(n) > 0 ? formatRupiah(n).replace(/\s/g, " ") : "Free");

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: "Plus Jakarta Sans", "Segoe UI", Helvetica, Arial, sans-serif; color: #292929; font-size: 11px; line-height: 1.5; background: #fff; }
.hero { background: #29241F; color: #FAFAFA; border-radius: 18px; padding: 26px 28px 24px; position: relative; overflow: hidden; }
.hero:after { content: ""; position: absolute; right: -60px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: #83ADD0; opacity: .22; }
.hero:before { content: ""; position: absolute; right: 70px; bottom: -90px; width: 170px; height: 170px; border-radius: 50%; background: #83ADD0; opacity: .12; }
.brand { font-weight: 800; letter-spacing: .28em; font-size: 10px; color: #83ADD0; }
h1 { margin: 10px 0 4px; font-size: 30px; line-height: 1.12; font-weight: 800; letter-spacing: -.01em; position: relative; z-index: 1; }
.sub { margin: 0; color: #D8D4CE; font-size: 12px; position: relative; z-index: 1; }
.tags { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 6px; position: relative; z-index: 1; }
.tag { border: 1px solid rgba(250,250,250,.45); border-radius: 999px; padding: 4px 12px; font-weight: 600; font-size: 10.5px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 18px; }
.stat { border: 1px solid #DAD6D0; border-radius: 12px; padding: 10px 12px; }
.stat b { display: block; font-size: 12.5px; font-weight: 800; }
.stat span { color: #8A857E; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
.day { margin-top: 18px; }
.day-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #292929; padding-bottom: 6px; margin-bottom: 12px; break-after: avoid; page-break-after: avoid; }
.day-head h2 { margin: 0; font-size: 17px; font-weight: 800; }
.day-head small { display: block; color: #8A857E; font-size: 10px; font-weight: 500; margin-top: 1px; }
.day-cost { font-weight: 800; font-size: 12px; }
.row { display: grid; grid-template-columns: 38px 14px 1fr; column-gap: 8px; break-inside: avoid; page-break-inside: avoid; }
.time { text-align: right; font-weight: 800; font-size: 11px; padding-top: 11px; }
.rail { position: relative; }
.rail:before { content: ""; position: absolute; left: 50%; top: 18px; bottom: -2px; width: 1.5px; background: #CFCAC3; transform: translateX(-50%); }
.row:last-child .rail:before { display: none; }
.dot { position: absolute; left: 50%; top: 14px; width: 9px; height: 9px; background: #292929; border-radius: 50%; transform: translateX(-50%); }
.card { border: 1px solid #DAD6D0; border-radius: 12px; padding: 10px 14px; margin-bottom: 10px; display: flex; justify-content: space-between; gap: 14px; }
.chip { display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 9px; border-radius: 999px; margin-bottom: 4px; }
.name { font-weight: 800; font-size: 12.5px; line-height: 1.3; }
.meta { color: #8A857E; font-size: 10px; margin-top: 1px; }
.note { margin-top: 5px; font-size: 10.5px; font-weight: 500; color: #3A3A3A; }
.price { font-weight: 800; font-size: 11px; white-space: nowrap; padding-top: 2px; }
.empty { color: #8A857E; font-style: italic; padding: 8px 0; }
.budget { margin-top: 22px; border: 1px solid #DAD6D0; border-radius: 16px; padding: 18px 20px; break-inside: avoid; page-break-inside: avoid; }
.budget h3 { margin: 0 0 6px; font-size: 13px; font-weight: 800; }
.big { font-size: 24px; font-weight: 800; }
.muted { color: #8A857E; font-size: 10.5px; }
.bar { height: 8px; background: #E8E6E2; border-radius: 99px; margin: 12px 0 14px; overflow: hidden; }
.bar i { display: block; height: 100%; background: #83ADD0; border-radius: 99px; }
.line { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #DAD6D0; font-size: 11px; }
.line:last-of-type { border-bottom: 0; }
.line b { font-weight: 800; }
.section-title { margin: 22px 0 8px; font-size: 13px; font-weight: 800; break-after: avoid; page-break-after: avoid; }
.foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #DAD6D0; display: flex; justify-content: space-between; color: #8A857E; font-size: 9.5px; }
`;

export function buildTripHtml(model, tanggalCetak = new Date()) {
  const b = model.budget;
  const stat = (nilai, label) => `<div class="stat"><b>${esc(nilai)}</b><span>${esc(label)}</span></div>`;

  const hari = model.hari
    .map((h) => {
      const baris = h.items.length
        ? h.items
            .map(
              (it) => `
        <div class="row">
          <div class="time">${esc(it.time)}</div>
          <div class="rail"><div class="dot"></div></div>
          <div class="card">
            <div>
              <span class="chip" style="background:${it.category.bg};color:${it.category.fg}">${esc(it.category.label)}</span>
              <div class="name">${esc(it.name)}</div>
              ${it.address || it.meta ? `<div class="meta">${esc([it.address, it.meta].filter(Boolean).join(" · "))}</div>` : ""}
              ${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}
            </div>
            <div class="price">${it.cost > 0 ? esc(rp(it.cost)) : ""}</div>
          </div>
        </div>`
            )
            .join("")
        : `<div class="empty">Belum ada jadwal untuk hari ini.</div>`;
      return `
      <section class="day">
        <div class="day-head">
          <div><h2>Day ${h.index + 1}${h.shortTitle ? ` · ${esc(h.shortTitle)}` : ""}</h2>
          <small>${esc([h.dateLabel, `${h.items.length} place${h.items.length === 1 ? "" : "s"} planned`].filter(Boolean).join(" · "))}</small></div>
          ${h.cost > 0 ? `<div class="day-cost">Est. ${esc(rp(h.cost))}</div>` : ""}
        </div>
        ${baris}
      </section>`;
    })
    .join("");

  const lain = model.belumDijadwalkan.length
    ? `<h3 class="section-title">Other activities</h3>${model.belumDijadwalkan
        .map(
          (it) => `<div class="card" style="break-inside:avoid">
            <div><span class="chip" style="background:${it.category.bg};color:${it.category.fg}">${esc(it.category.label)}</span>
            <div class="name">${esc(it.name)}</div>
            ${it.place || it.day || it.note ? `<div class="meta">${esc([it.place, it.day, it.note].filter(Boolean).join(" · "))}</div>` : ""}</div>
            <div class="price">${it.cost > 0 ? esc(rp(it.cost)) : ""}</div></div>`
        )
        .join("")}`
    : "";

  const rincian = b.rows
    .map((r) => `<div class="line"><span>${esc(r.label)}</span><b>${esc(rp(r.amount))}</b></div>`)
    .join("");

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Setapak - ${esc(model.title)}</title>
<style>${CSS}</style></head><body>
  <header class="hero">
    <div class="brand">SETAPAK</div>
    <h1>${esc(model.title)}</h1>
    <p class="sub">${esc(model.subtitle)}</p>
    <div class="tags">${model.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
  </header>

  <div class="stats">
    ${stat(model.dateLabel, "Dates")}
    ${stat(model.days ? `${model.days} days` : "-", "Duration")}
    ${stat(String(model.jumlahTempat), "Places")}
    ${stat(b.planned > 0 ? rp(b.planned) : "Not set", "Budget")}
  </div>

  ${hari}
  ${lain}

  <section class="budget">
    <h3>Budget</h3>
    <div class="big">${b.used > 0 ? esc(rp(b.used)) : "Rp 0"}</div>
    <div class="muted">${
      b.planned > 0 ? `planned of ${esc(rp(b.planned))} · ${esc(rp(b.left))} left` : "Budget belum diatur"
    }</div>
    <div class="bar"><i style="width:${b.percent.toFixed(1)}%"></i></div>
    ${rincian}
    <div class="muted" style="margin-top:10px">${b.scopeLabel ? `${esc(b.scopeLabel)}<br>` : ""}Estimates only. Lodging is not included.<br>Harap dicek di situs resmi. AI dapat melakukan kesalahan.</div>
  </section>

  <div class="foot">
    <span>Crafted with Setapak</span>
    <span>Generated ${esc(tanggalCetak.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }))}</span>
  </div>
</body></html>`;
}

// Membuka dialog cetak browser; pilih "Save as PDF" untuk menyimpan.
// Teks tetap vektor (tajam & bisa dicopy), tanpa library tambahan.
export function printTripPdf(model) {
  const html = buildTripHtml(model);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  let selesai = false;
  const bersihkan = () => {
    if (selesai) return;
    selesai = true;
    setTimeout(() => iframe.remove(), 500);
  };
  iframe.onload = async () => {
    const win = iframe.contentWindow;
    try {
      await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    } catch {
      /* font gagal dimuat: pakai font cadangan */
    }
    win.addEventListener("afterprint", bersihkan);
    win.focus();
    win.print();
    setTimeout(bersihkan, 120000);
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
