import { useRef, useState } from "react";
import FillButton from "../../../components/ui/FillButton";
import InputAll from "../../../components/ui/InputAll";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import ImageLightMode from "../../../assets/images/lightmode.png";
import ImageDarkMode from "../../../assets/images/darkmode.png";
import ImageSystem from "../../../assets/images/system.png";
import { useAuth, displayName } from "../../../store/useAuth";
import { useSettings } from "../../../store/useSettings";

const THEMES = [
  { id: "light", label: "Light", img: ImageLightMode },
  { id: "dark", label: "Dark", img: ImageDarkMode },
  { id: "system", label: "System", img: ImageSystem },
];

const card =
  "flex flex-col gap-6 w-full rounded-2xl border-2 border-grey-label bg-white p-6 max-sm:p-4 scroll-mt-20";
const rowCls =
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-2";
const labelCls = "font-jakarta font-bold text-base text-grey-light";
const valueCls =
  "font-jakarta font-semibold text-base text-grey-light break-all";
const smallBtn = "px-4 py-1 rounded-lg font-semibold text-sm";
const smallBase = "ring-grey-light ring-1 ring-inset text-grey-light";
const smallFill = "bg-grey-light rounded-lg text-white font-semibold";

function Notice({ note }) {
  if (!note?.text) return null;
  return (
    <p
      role="status"
      className={`font-jakarta text-sm ${
        note.error ? "text-red-500" : "text-arctic-blue"
      }`}
    >
      {note.text}
    </p>
  );
}

// Perkecil foto jadi 256px (kotak) supaya ringan disimpan di browser.
function bacaFoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("File harus berupa gambar."));
    if (file.size > 8 * 1024 * 1024) return reject(new Error("Ukuran foto maksimal 8 MB."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca foto."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Foto tidak bisa dibuka."));
      img.onload = () => {
        const ukuran = 256;
        const sisi = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = ukuran;
        canvas.height = ukuran;
        canvas
          .getContext("2d")
          .drawImage(img, (img.width - sisi) / 2, (img.height - sisi) / 2, sisi, sisi, 0, 0, ukuran, ukuran);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function topengEmail(email = "") {
  const [nama, domain] = email.split("@");
  if (!domain) return email;
  return `${nama.slice(0, 2)}${"•".repeat(Math.max(2, nama.length - 2))}@${domain}`;
}

function Settings() {
  const { user, isSupabaseReady, updateProfile, updateEmail, updatePassword } = useAuth();
  const { theme, homeCity, locationAccess, photo, update } = useSettings();

  const fileRef = useRef(null);
  const [photoNote, setPhotoNote] = useState(null);

  // Profil
  const [editing, setEditing] = useState(null); // "name" | "email" | "password" | null
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileNote, setProfileNote] = useState(null);
  const [showEmail, setShowEmail] = useState(false);

  // Lokasi
  const [cityDraft, setCityDraft] = useState(homeCity);
  const [locNote, setLocNote] = useState(null);
  const [locBusy, setLocBusy] = useState(false);

  const nama = displayName(user);

  const mulaiEdit = (jenis, nilaiAwal = "") => {
    setEditing(jenis);
    setDraft(nilaiAwal);
    setProfileNote(null);
  };

  const simpanProfil = async () => {
    if (saving) return;
    setSaving(true);
    let hasil;
    if (editing === "name") hasil = await updateProfile({ name: draft });
    else if (editing === "email") {
      if (!/^\S+@\S+\.\S+$/.test(draft.trim())) hasil = { error: "Format email tidak valid." };
      else hasil = await updateEmail(draft);
    } else {
      hasil = draft.length < 6 ? { error: "Password minimal 6 karakter." } : await updatePassword(draft);
    }
    setSaving(false);
    if (hasil.error) return setProfileNote({ error: true, text: hasil.error });
    setProfileNote({
      text:
        editing === "email"
          ? "Cek inbox email baru untuk konfirmasi perubahan."
          : editing === "password"
            ? "Password berhasil diganti."
            : "Nama berhasil disimpan.",
    });
    setEditing(null);
    setDraft("");
  };

  const pilihFoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      update({ photo: await bacaFoto(file) });
      setPhotoNote({ text: "Foto profil diperbarui." });
    } catch (err) {
      setPhotoNote({ error: true, text: err.message });
    }
  };

  const ambilPosisi = () =>
    new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) return reject(new Error("Browser tidak mendukung lokasi."));
      navigator.geolocation.getCurrentPosition(resolve, (err) =>
        reject(
          new Error(
            err.code === 1
              ? "Izin lokasi ditolak. Aktifkan lewat pengaturan situs di browser."
              : "Lokasi tidak bisa didapat saat ini."
          )
        ),
        { timeout: 10000, maximumAge: 300000 }
      );
    });

  const ubahAksesLokasi = async (nyala) => {
    setLocNote(null);
    if (!nyala) return update({ locationAccess: false });
    setLocBusy(true);
    try {
      await ambilPosisi();
      update({ locationAccess: true });
      setLocNote({ text: "Akses lokasi aktif." });
    } catch (err) {
      update({ locationAccess: false });
      setLocNote({ error: true, text: err.message });
    } finally {
      setLocBusy(false);
    }
  };

  const pakaiLokasiSaya = async () => {
    if (locBusy) return;
    setLocBusy(true);
    setLocNote(null);
    try {
      const pos = await ambilPosisi();
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=id&lat=${latitude}&lon=${longitude}`
      );
      if (!res.ok) throw new Error("Nama kota tidak bisa dicari.");
      const a = (await res.json()).address || {};
      const kota = a.city || a.town || a.municipality || a.county || a.state_district || a.state;
      if (!kota) throw new Error("Nama kota tidak ditemukan untuk lokasi ini.");
      const bersih = kota.replace(/^(Kota|Kabupaten)\s+/i, "");
      setCityDraft(bersih);
      update({ homeCity: bersih });
      setLocNote({ text: `Home city diatur ke ${bersih}.` });
    } catch (err) {
      setLocNote({ error: true, text: err.message || "Gagal mengambil lokasi." });
    } finally {
      setLocBusy(false);
    }
  };

  const simpanKota = () => {
    const bersih = cityDraft.trim().slice(0, 60);
    update({ homeCity: bersih });
    setCityDraft(bersih);
    setLocNote({
      text: bersih ? `Home city disimpan: ${bersih}.` : "Home city dikembalikan ke default (Bogor).",
    });
  };

  const ke = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const editor = (jenis, tipe, placeholder, nilaiAwal) =>
    editing === jenis ? (
      <div className="flex flex-wrap items-center gap-2">
        <InputAll
          type={tipe}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") simpanProfil();
            if (e.key === "Escape") setEditing(null);
          }}
          placeholder={placeholder}
          autoFocus
          autoComplete={tipe === "password" ? "new-password" : "off"}
          aria-label={placeholder}
          className="w-52 max-sm:w-full rounded-xl border-2 border-grey-light px-4 py-2 placeholder:text-grey-label"
        />
        <FillButton
          type="button"
          onClick={simpanProfil}
          disabled={saving}
          className={smallBtn}
          baseClassName="bg-grey-light text-white"
          fillClassName="bg-transparent text-white"
        >
          {saving ? "Saving…" : "Save"}
        </FillButton>
        <FillButton
          type="button"
          onClick={() => setEditing(null)}
          className={smallBtn}
          baseClassName={smallBase}
          fillClassName={smallFill}
        >
          Cancel
        </FillButton>
      </div>
    ) : (
      <FillButton
        type="button"
        onClick={() => mulaiEdit(jenis, nilaiAwal)}
        className={smallBtn}
        baseClassName={smallBase}
        fillClassName={smallFill}
      >
        Edit
      </FillButton>
    );

  return (
    <section className="px-20 py-10 max-lg:px-8 max-sm:px-5 max-sm:py-6">
      <div>
        <h1 className="font-jakarta font-bold text-4xl max-sm:text-3xl text-grey-light">Settings</h1>
        <p className="font-jakarta font-normal text-base text-grey-light">
          Manage your profile and travel preferences.
        </p>
      </div>

      <div className="mt-11 flex gap-24 max-xl:gap-12 max-lg:mt-8 max-lg:flex-col max-lg:gap-6">
        <ul className="flex shrink-0 flex-col gap-6 max-lg:sticky max-lg:top-14 max-lg:z-10 max-lg:-mx-1 max-lg:flex-row max-lg:gap-2 max-lg:overflow-x-auto max-lg:bg-bright-white max-lg:px-1 max-lg:py-2 lg:sticky lg:top-10 lg:self-start">
          {[
            ["profile", "Profile"],
            ["appearance", "Appearance"],
            ["location", "Location"],
          ].map(([id, label]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => ke(id)}
                className="font-jakarta font-normal text-base text-grey-light hover:underline max-lg:rounded-full max-lg:border max-lg:border-grey-label max-lg:px-4 max-lg:py-1.5 max-lg:text-sm"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1 flex flex-col gap-8">
          {/* Profile */}
          <div id="profile" className={card}>
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">Profile</h2>

            <div className="flex flex-wrap items-center gap-3.5">
              {photo ? (
                <img src={photo} alt="Foto profil" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-grey-light font-jakarta text-3xl font-bold text-white">
                  {(nama || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pilihFoto} />
              <FillButton
                type="button"
                onClick={() => fileRef.current?.click()}
                baseClassName="bg-grey-light text-white"
                fillClassName="bg-transparent text-white"
                className="px-3 py-2 text-sm rounded-lg"
              >
                Change Photo
              </FillButton>
              {photo && (
                <button
                  type="button"
                  onClick={() => {
                    update({ photo: "" });
                    setPhotoNote({ text: "Foto profil dihapus." });
                  }}
                  className="font-jakarta text-sm font-semibold text-grey-label hover:underline"
                >
                  Remove
                </button>
              )}
              <Notice note={photoNote} />
            </div>

            <div className={rowCls}>
              <p className={labelCls}>Username</p>
              <div className="flex flex-wrap items-center gap-4">
                {editing !== "name" && <p className={valueCls}>{nama}</p>}
                {editor("name", "text", "Nama baru", nama)}
              </div>
            </div>

            <div className={rowCls}>
              <p className={labelCls}>Email</p>
              <div className="flex flex-wrap items-center gap-4">
                {editing !== "email" && (
                  <>
                    <p className={valueCls}>{showEmail ? user?.email : topengEmail(user?.email)}</p>
                    <button
                      type="button"
                      onClick={() => setShowEmail((v) => !v)}
                      className="font-jakarta font-semibold text-arctic-blue text-base"
                    >
                      {showEmail ? "Hide" : "Reveal"}
                    </button>
                  </>
                )}
                {isSupabaseReady ? editor("email", "email", "Email baru", "") : null}
              </div>
            </div>

            <div className={rowCls}>
              <p className={labelCls}>Password</p>
              <div className="flex flex-wrap items-center gap-4">
                {editing !== "password" && <p className={valueCls}>••••••••</p>}
                {isSupabaseReady ? editor("password", "password", "Password baru (min. 6)", "") : null}
              </div>
            </div>

            {!isSupabaseReady && (
              <p className="font-jakarta text-sm text-grey-label">
                Mode demo: email dan password hanya bisa diganti saat Supabase aktif.
              </p>
            )}
            <Notice note={profileNote} />
          </div>

          {/* Appearance */}
          <div id="appearance" className={`${card} !gap-0`}>
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">Appearance</h2>
            <div className="mt-6">
              <h3 className={labelCls}>Theme</h3>
              <p className="font-jakarta font-normal text-base text-grey-light">
                Choose how Setapak looks on this device.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 max-sm:grid-cols-1" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => {
                const aktif = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => update({ theme: t.id })}
                    className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                      aktif ? "border-arctic-blue ring-2 ring-arctic-blue/40" : "border-grey-label hover:border-grey-light"
                    }`}
                  >
                    <img src={t.img} alt={`${t.label} mode`} loading="lazy" className="h-24 w-full rounded-lg object-cover" />
                    <p className="font-jakarta font-medium text-sm text-grey-light">
                      {t.label}
                      {aktif && <i className="fi fi-br-check ml-2 text-xs text-arctic-blue" />}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div id="location" className={`${card} !gap-6`}>
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">Location</h2>

            <div className={rowCls}>
              <div className="min-w-0 max-w-md">
                <h3 className={labelCls}>Home city</h3>
                <p className="font-jakarta font-normal text-sm text-grey-light">
                  Dianggap rumahmu: jadi kota awal “For you” dan titik berangkat plan AI kalau kamu tidak menyebut asal. Kosongkan untuk reset.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InputAll
                  type="text"
                  value={cityDraft}
                  onChange={(e) => setCityDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && simpanKota()}
                  placeholder="Bogor"
                  maxLength={60}
                  aria-label="Home city"
                  className="w-36 rounded-xl border-2 border-grey-light px-4 py-2 text-base text-grey-light placeholder:text-grey-label"
                />
                <FillButton
                  type="button"
                  onClick={simpanKota}
                  disabled={cityDraft.trim() === homeCity}
                  className={`${smallBtn} disabled:opacity-50`}
                  baseClassName={smallBase}
                  fillClassName={smallFill}
                >
                  Save
                </FillButton>
              </div>
            </div>

            <div className={rowCls}>
              <div className="min-w-0 max-w-md">
                <h3 className={labelCls}>Location access</h3>
                <p className="font-jakarta font-normal text-sm text-grey-light">
                  Izinkan Setapak membaca lokasi perangkat untuk mengisi Home city otomatis.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {locationAccess && (
                  <button
                    type="button"
                    onClick={pakaiLokasiSaya}
                    disabled={locBusy}
                    className="font-jakarta text-sm font-semibold text-arctic-blue disabled:opacity-50"
                  >
                    {locBusy ? "Mencari…" : "Gunakan lokasi saya"}
                  </button>
                )}
                <ToggleSwitch
                  checked={locationAccess}
                  onChange={ubahAksesLokasi}
                  disabled={locBusy}
                  aria-label="Location access"
                />
              </div>
            </div>
            <Notice note={locNote} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
