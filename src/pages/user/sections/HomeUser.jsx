import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FillButton from "../../../components/ui/FillButton";
import CalendarCard from "./CalendarCard";
import ScheduleCard from "./ScheduleCard";
import TripModal from "./TripModal";
import InputAll from "../../../components/ui/InputAll";
import ImageHeaderUser from "../../../assets/images/imageuserhome.png";
import ImageTravelUser1 from "../../../assets/images/imagetraveluser1.png";
import ImageTravelUser2 from "../../../assets/images/imagetraveluser2.png";
import ImageTravelUser3 from "../../../assets/images/imagetraveluser3.png";
import ImageFallbackFood from "../../../assets/images/recomendations/imagerecomendation2.webp";
import ImageFallbackOutdoor from "../../../assets/images/recomendations/imagerecomendation.webp";
import {
  recommendPlaces,
  searchCityKey,
  cityLabels,
  mapsLinkFor,
} from "../../../api/plannerEngine";
import { askRecommendations } from "../../../api/chat";
import { useAuth, displayName } from "../../../store/useAuth";
import { useTrips } from "../../../store/useTrips";
import { toDateKey } from "../../../utils/tripDate";


function HomeUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    trips,
    tripsByDate,
    addTrip,
    updateTrip,
    deleteTrip,
    loading: loadingTrips,
    error: errorTrips,
  } = useTrips();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [prefillLokal, setPrefillLokal] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const prefillDariChat = location.state?.prefillSchedule;
  const prefill = prefillDariChat || prefillLokal;

  // Tombol "Simpan ke Schedule" di Chat mengirim prefill lewat location.state.
  // State dibersihkan setelah ScheduleCard sempat memakainya (microtask),
  // supaya form tidak terbuka lagi saat halaman di-refresh.
  useEffect(() => {
    if (!prefillDariChat) return undefined;
    const id = setTimeout(() => {
      navigate(location.pathname, { replace: true, state: null });
    }, 0);
    return () => clearTimeout(id);
  }, [prefillDariChat, location.pathname, navigate]);

  const pakaiPrefill = useCallback(() => setPrefillLokal(null), []);
  const bukaFormTanggal = useCallback(
    (date) => setPrefillLokal({ date: toDateKey(date) }),
    []
  );

  const simpanEdit = async (data) => {
    if (!editTrip) return { error: "Perjalanan tidak ditemukan." };
    return updateTrip(editTrip.id, data);
  };
  const [mode, setMode] = useState("near"); // "in" | "near"
  const [city, setCity] = useState("bogor");
  const [minRating, setMinRating] = useState(0); // 0 = tidak difilter, urut dari rating tertinggi
  const [editingCity, setEditingCity] = useState(false); // form input kota
  const [cityInput, setCityInput] = useState("");
  const [loadingCity, setLoadingCity] = useState(false);
  const [aiGroups, setAiGroups] = useState(null); // hasil rekomendasi AI
  const [aiSource, setAiSource] = useState(""); // "gemini" / "engine" / ...

  // Filter bintang dipakai untuk data lokal DAN hasil AI (aman kalau cache lama).
  const saringRating = (groups, batas) =>
    Object.fromEntries(
      Object.entries(groups || {}).map(([kategori, items]) => [
        kategori,
        (items || []).filter((item) => item.rating >= batas),
      ])
    );

  // Gambar dari AI/Wikimedia bisa rusak atau diblokir jaringan. Kalau gagal
  // dimuat, ganti dengan gambar lokal yang ikut ter-bundle, jadi tetap tampil.
  const gambarCadangan = (kategori) =>
    kategori === "Coffe And Snacks" ? ImageFallbackFood : ImageFallbackOutdoor;
  const perbaikiGambar = (event, kategori) => {
    const img = event.currentTarget;
    if (img.dataset.fallback) return; // jangan loop kalau cadangan pun gagal
    img.dataset.fallback = "1";
    img.src = gambarCadangan(kategori);
  };

  // Selama belum ada hasil AI, kartu tetap memakai data lokal.
  // searchCityKey: "kuta" tetap kuta (bukan bali), "Jepang" tetap Jepang.
  const kunciKota = searchCityKey(city);
  const places = saringRating(
    aiGroups || recommendPlaces(mode, kunciKota, minRating),
    minRating
  );

  // Minta rekomendasi ke AI lewat server (API key tidak masuk browser).
  const mintaRekomendasi = async (
    nextCity,
    nextMode,
    nextRating = minRating,
    refresh = false,
    excludeNames = []
  ) => {
    setLoadingCity(true);
    try {
      const hasil = await askRecommendations(nextCity, nextMode, nextRating, {
        refresh,
        excludeNames,
      });
      setAiGroups(hasil.groups);
      setAiSource(hasil.source);
    } finally {
      setLoadingCity(false);
    }
  };

  // Tombol reload: AI cari tempat lain, lalu hasilnya jadi planner data terbaru.
  // Nama yang sedang tampil dikirim supaya AI tidak mengulangnya (termasuk
  // untuk kota hasil AI yang tidak punya data lokal di SETAPAK).
  const muatUlang = () => {
    if (loadingCity) return;
    const namaTampil = Object.values(aiGroups || places || {})
      .flat()
      .map((item) => item?.name)
      .filter(Boolean);
    mintaRekomendasi(city, mode, minRating, true, namaTampil);
  };

  const bukaInputKota = () => {
    setCityInput("");
    setEditingCity(true);
  };

  const pilihKota = async (event) => {
    event.preventDefault();
    const tulisan = cityInput.trim();
    if (!tulisan || loadingCity) return;

    // Biarkan nama yang diketik user. "Kuta" tidak diubah jadi "Bali".
    setCity(tulisan);
    setEditingCity(false);
    await mintaRekomendasi(tulisan, mode, minRating);
  };

  // Ganti in/near tidak mengubah kota: city tetap dipakai untuk request berikutnya.
  const pilihMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (aiGroups) mintaRekomendasi(city, nextMode, minRating);
  };

  // Bintang bersifat opsional: klik lagi untuk membatalkan (kembali ke 0).
  const pilihRating = (nextRating) => {
    const nilai = minRating === nextRating ? 0 : nextRating;
    setMinRating(nilai);
    if (aiGroups) mintaRekomendasi(city, mode, nilai);
  };

  // Klik kotak = langsung bantu susun prompt di halaman chat.
  const travel = [
    {
      id: 1,
      title: "Nature",
      description: "Gunung, pantai, dan alam terbuka",
      image: ImageTravelUser1,
      prompt: "Rekomendasi tempat alam di [lokasi]",
    },
    {
      id: 2,
      title: "Culture",
      description: "Candi, museum, dan tradisi lokal",
      image: ImageTravelUser2,
      prompt: "Rekomendasi tempat budaya di [lokasi]",
    },
    {
      id: 3,
      title: "Food",
      description: "Kuliner khas yang wajib dicoba",
      image: ImageTravelUser3,
      prompt: "Rekomendasi kuliner di [lokasi]",
    },
  ];

  return (
    // [PERBAIKAN 1]: Ditambah max-w-7xl mx-auto w-full agar layout terpusat rapi
    <section className="font-jakarta max-w-7xl mx-auto w-full bg-bright-white">
      {/* bagian atas: sapaan + lonceng + profil */}
      <header className="flex items-start justify-between px-10 pt-9">
        <div>
          <h1 className="text-4xl font-bold font-jakarta text-grey-light">
            Hello, {displayName(user)}!
          </h1>
          <p className="text-base font-jakarta font-normal text-grey-light">
            {trips.length
              ? `Kamu punya ${trips.length} perjalanan. Ayo lanjutkan rencanamu!`
              : "Belum ada perjalanan. Mau ke mana kita hari ini?"}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            title="Lihat jadwal perjalanan"
            onClick={() => navigate("/trip")}
            className="text-2xl"
          >
            <i className="fi fi-rr-bell"></i>
          </button>
          <button
            type="button"
            title={displayName(user)}
            onClick={() => navigate("/trip")}
            className="-mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-grey-light text-sm font-bold text-white"
          >
            {(displayName(user) || "U").slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* pembungkus bagian bawah, dibagi dua deretan */}
      <div className="flex items-stretch gap-6 px-10 pt-12 pb-10 max-md:flex-col">
        {/* deretan pertama: hero + travel interests */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 max-md:w-full">
          {/* bagian hero homeUser */}
          <div className="relative min-h-[250px] overflow-hidden rounded-3xl bg-dark-brown-new shadow-lg max-md:w-full">
            <img
              src={ImageHeaderUser}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* lapisan gelap supaya teks putih terbaca */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>

            <div className="relative z-10 flex h-full flex-col items-start px-6 py-8">
              <h2 className="font-clash text-4xl font-bold text-white">
                Your Next Journey Awaits!
              </h2>
              <p className="mt-1 max-w-md text-base font-normal font-jakarta text-white">
                Discover amazing destinations and let AI help you create the
                perfect travel itinerary.
              </p>
              <FillButton
                onClick={() => navigate("/chats")}
                className="mt-7 ring-bright-white text-bright-white px-6 py-2"
                fillClassName="bg-bright-white text-dark-brown-new"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Start planning</span>
                  <i className="fi fi-rr-angle-small-right leading-none text-[20px] pt-2"></i>
                </span>
              </FillButton>
            </div>
          </div>

          {/* bagian travel interests */}
          <div>
            <h2 className="text-xl font-jakarta font-bold text-grey-light mt-6">
              Travel Interests
            </h2>

            {/* [PERBAIKAN 2]: max-w-[820px] diubah menjadi w-full agar mengisi ruang kosong secara maksimal */}
            <div className="mt-2 grid w-full grid-cols-3 gap-4 max-sm:grid-cols-1">
              {travel.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    navigate("/chats", { state: { prompt: item.prompt } })
                  }
                  title={`Tanya AI: ${item.prompt}`}
                  className="relative h-[320px] w-full cursor-pointer overflow-hidden rounded-2xl bg-dark-brown-new text-left shadow-lg"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* lapisan gelap di bagian bawah supaya teks terbaca */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 z-10 px-4 pb-5">
                    <h3 className="font-clash text-4xl font-bold text-white tracking-normal">
                      {item.title}
                    </h3>
                    <p className="text-sm font-light leading-tight text-white">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* deretan kedua: calendar + schedule */}
        <div className="w-[325px] shrink-0 max-md:w-full">
          {/* bagian kalender */}
          <CalendarCard
            tripsByDate={tripsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddForDate={bukaFormTanggal}
            onEditTrip={setEditTrip}
          />

          {/* bagian schedule */}
          <ScheduleCard
            trips={trips}
            prefill={prefill}
            onPrefillUsed={pakaiPrefill}
            addTrip={addTrip}
            deleteTrip={deleteTrip}
            loading={loadingTrips}
            error={errorTrips}
            onEditTrip={setEditTrip}
          />
        </div>
      </div>

      {/* bagian for you (hasil planner SETAPAK) */}
      <div className="px-10 pb-10 mt-20">
        {/* judul: For you [In|Near] Bogor > [Bintang] */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-jakarta font-bold text-grey-light">
            For you
          </h2>

          <div className="flex rounded-full bg-grey-label/50 p-0.5">
            {["in", "near"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pilihMode(m)}
                className={`rounded-full px-3 py-1 text-sm font-jakarta font-medium capitalize ${
                  mode === m ? "bg-arctic-blue text-white" : "text-grey-light/80"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {editingCity ? (
            <form onSubmit={pilihKota} className="flex flex-wrap items-center gap-2">
              <InputAll
                autoFocus
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
                placeholder="Mau kota apa?"
                maxLength={40}
                aria-label="Nama kota"
                className="w-52 rounded-full border border-grey-label/60 bg-grey-label/30 py-2 text-base placeholder:text-grey-light/50 focus:border-[#83ADD0] focus:ring-[#83ADD0]"
              />
              <FillButton
                type="submit"
                disabled={loadingCity}
                title="Cari rekomendasi"
                className="flex h-10 w-10 items-center justify-center !rounded-full !px-0 !py-0 !text-base disabled:opacity-60"
                baseClassName="ring-1 ring-inset ring-[#83ADD0] bg-[#83ADD0] text-white"
                fillClassName="rounded-full bg-[#6f9abf] text-white"
              >
                <i
                  className={`fi ${
                    loadingCity
                      ? "fi-rr-loading animate-spin"
                      : "fi-rr-angle-small-right"
                  } text-xl leading-none`}
                ></i>
              </FillButton>
              <FillButton
                type="button"
                onClick={() => setEditingCity(false)}
                title="Batal"
                className="flex h-10 w-10 items-center justify-center !rounded-full !px-0 !py-0 !text-base"
                baseClassName="ring-1 ring-inset ring-grey-label/60 bg-grey-label/50 text-grey-light"
                fillClassName="rounded-full bg-white/70 text-grey-light"
              >
                <i className="fi fi-rr-cross-small text-xl leading-none"></i>
              </FillButton>

              {/* Rating opsional: muncul hanya saat input kota dibuka. Klik lagi untuk batal. */}
              <span className="ml-1 text-xs font-jakarta font-medium text-grey-light/60">
                Rating (opsional)
              </span>
              {[3, 3.5, 4, 4.5].map((value) => (
                <FillButton
                  key={value}
                  type="button"
                  onClick={() => pilihRating(value)}
                  title={`Minimal bintang ${value}`}
                  className="!rounded-full !px-3 !py-1 !text-xs !font-medium"
                  baseClassName={
                    minRating === value
                      ? "ring-1 ring-inset ring-[#83ADD0] bg-[#83ADD0] text-white"
                      : "ring-1 ring-inset ring-grey-label/60 text-grey-light/80"
                  }
                  fillClassName="rounded-full bg-[#6f9abf] text-white"
                >
                  {value}+
                </FillButton>
              ))}
            </form>
          ) : (
            <button
              type="button"
              onClick={bukaInputKota}
              title="Klik untuk cari kota lain"
              className="flex cursor-pointer items-center gap-3"
            >
              <h2 className="text-3xl font-jakarta font-bold text-grey-light">
                {cityLabels[kunciKota] || city}
              </h2>
              <i className="fi fi-rr-angle-small-right text-2xl leading-none pt-1"></i>
            </button>
          )}

          {/* Reload: cari variasi tempat lain, lalu disimpan lagi sebagai data bersama */}
          <FillButton
            type="button"
            onClick={muatUlang}
            disabled={loadingCity}
            title="Muat rekomendasi lain"
            className="flex h-10 w-10 items-center justify-center !rounded-full !px-0 !py-0 !text-base disabled:opacity-60"
            baseClassName="ring-1 ring-inset ring-grey-label/60 bg-grey-label/50 text-grey-light"
            fillClassName="rounded-full bg-white/70 text-grey-light"
          >
            <i
              className={`fi fi-rr-refresh text-lg leading-none ${
                loadingCity ? "animate-spin" : ""
              }`}
            ></i>
          </FillButton>
        </div>

        {aiGroups && (
          <p className="mt-2 text-sm font-jakarta font-normal text-grey-light/60">
            Rekomendasi{" "}
            {aiSource === "engine"
              ? "dari data lokal"
              : aiSource === "planner"
                ? "dari planner SETAPAK"
                : "dari AI"}
            {loadingCity ? " · memperbarui..." : ""}
          </p>
        )}

        {/* kategori + card tempat */}
        {Object.entries(places).map(([category, items]) => (
          <div key={category} className="mt-8">
            <h3 className="text-xl font-jakarta font-bold text-grey-light">
              {category}
            </h3>

            <div className="mt-3 grid w-full grid-cols-4 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
              {items.map((place) => (
                <div key={place.id} className="flex flex-col">
                  <img
                    src={place.image || gambarCadangan(category)}
                    alt={place.name}
                    onError={(event) => perbaikiGambar(event, category)}
                    className="aspect-[4/3] w-full rounded-2xl bg-grey-label/50 object-cover"
                  />

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <h4 className="truncate text-base font-jakarta font-semibold text-grey-light">
                      {place.name}
                    </h4>
                    <span className="shrink-0 text-sm font-jakarta font-medium text-grey-light">
                      <i className="fi fi-sr-star text-xs"></i> {place.rating}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm font-jakarta font-normal text-grey-light/80">
                    {place.address}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-3">
                    <a
                      href={place.mapsUrl || mapsLinkFor(place.name, place.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-jakarta font-medium text-[#83ADD0] hover:underline"
                    >
                      <i className="fi fi-rr-marker text-[10px] leading-none"></i>
                      Lihat di Google Maps
                    </a>
                    {place.infoUrl && (
                      <a
                        href={place.infoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-jakarta font-medium text-[#83ADD0] hover:underline"
                      >
                        <i className="fi fi-rr-link text-[10px] leading-none"></i>
                        Info tempat
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TripModal
        key={editTrip?.id || "edit"}
        trip={editTrip}
        onClose={() => setEditTrip(null)}
        onSave={simpanEdit}
      />
    </section>
  );
}

export default HomeUser;