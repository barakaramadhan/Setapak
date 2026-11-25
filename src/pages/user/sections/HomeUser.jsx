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
  searchCityKey,
  cityLabels,
  mapsLinkFor,
} from "../../../api/plannerEngine";
import { askRecommendations } from "../../../api/chat";
import { useAuth, displayName } from "../../../store/useAuth";
import { useSettings } from "../../../store/useSettings";
import { useTrips } from "../../../store/useTrips";
import { toDateKey } from "../../../utils/tripDate";

function HomeUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { homeCity, photo } = useSettings();
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
  const [city, setCity] = useState(() => homeCity || "bogor");
  const [minRating, setMinRating] = useState(0); // 0 = tidak difilter, urut dari rating tertinggi
  const [editingCity, setEditingCity] = useState(false); // form input kota
  const [cityInput, setCityInput] = useState("");
  const [loadingCity, setLoadingCity] = useState(false);
  const [aiGroups, setAiGroups] = useState(null); // hasil rekomendasi AI
  const [aiSource, setAiSource] = useState(""); // sumber AI
  const [aiError, setAiError] = useState(false);

  const saringRating = (groups, batas) =>
    Object.fromEntries(
      Object.entries(groups || {}).map(([kategori, items]) => [
        kategori,
        (items || []).filter((item) => item.rating >= batas),
      ])
    );

  const gambarCadangan = (kategori) =>
    kategori === "Coffe And Snacks" ? ImageFallbackFood : ImageFallbackOutdoor;
  const perbaikiGambar = (event, kategori) => {
    const img = event.currentTarget;
    if (img.dataset.fallback) return; // jangan loop kalau cadangan pun gagal
    img.dataset.fallback = "1";
    img.src = gambarCadangan(kategori);
  };

  const kunciKota = searchCityKey(city);
  const places = saringRating(aiGroups || {}, minRating);
  const adaTempat = Object.values(places).some((items) => items.length > 0);

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
      const ada = Object.values(hasil.groups || {}).some((items) => items?.length);
      if (hasil.source === "error" || !ada) {
        setAiError(true); // hasil lama (kalau ada) tetap ditampilkan
      } else {
        setAiError(false);
        setAiGroups(hasil.groups);
        setAiSource(hasil.source);
      }
    } finally {
      setLoadingCity(false);
    }
  };

  const muatUlang = () => {
    if (loadingCity) return;
    const namaTampil = Object.values(aiGroups || places || {})
      .flat()
      .map((item) => item?.name)
      .filter(Boolean);
    mintaRekomendasi(city, mode, minRating, true, namaTampil);
  };

  useEffect(() => {
    mintaRekomendasi(city, mode, minRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bukaInputKota = () => {
    setCityInput("");
    setEditingCity(true);
  };

  const pilihKota = async (event) => {
    event.preventDefault();
    const tulisan = cityInput.trim();
    if (!tulisan || loadingCity) return;

    setCity(tulisan);
    setEditingCity(false);
    await mintaRekomendasi(tulisan, mode, minRating);
  };

  const pilihMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    mintaRekomendasi(city, nextMode, minRating);
  };

  const pilihRating = (nextRating) => {
    const nilai = minRating === nextRating ? 0 : nextRating;
    setMinRating(nilai);
    mintaRekomendasi(city, mode, nilai);
  };

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
    <section className="font-jakarta max-w-7xl mx-auto w-full bg-bright-white">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-6 sm:px-10 sm:pt-9">
        <div>
          <h1 className="text-2xl font-bold font-jakarta text-grey-light sm:text-4xl">
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
            onClick={() => navigate("/settings")}
            className="-mt-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-grey-light text-sm font-bold text-white"
          >
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              (displayName(user) || "U").slice(0, 1).toUpperCase()
            )}
          </button>
        </div>
      </header>

      <div className="flex items-stretch gap-6 px-5 pt-8 pb-10 sm:px-10 sm:pt-12 max-md:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-5 max-md:w-full">
          <div className="relative min-h-[250px] overflow-hidden rounded-3xl bg-[#29241F] shadow-lg max-md:w-full">
            <img loading="lazy" decoding="async"
              src={ImageHeaderUser}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>

            <div className="relative z-10 flex h-full flex-col items-start px-6 py-8">
              <h2 className="font-clash text-2xl font-bold text-white sm:text-4xl">
                Your Next Journey Awaits!
              </h2>
              <p className="mt-1 max-w-md text-base font-normal font-jakarta text-white">
                Discover amazing destinations and let AI help you create the
                perfect travel itinerary.
              </p>
              <FillButton
                onClick={() => navigate("/chats")}
                className="mt-7 ring-white text-white px-6 py-2"
                fillClassName="bg-[#FDFDFD] text-[#29241F]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Start planning</span>
                  <i className="fi fi-rr-angle-small-right leading-none text-[20px] pt-2"></i>
                </span>
              </FillButton>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-jakarta font-bold text-grey-light mt-6">
              Travel Interests
            </h2>

            <div className="mt-2 grid w-full grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
              {travel.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    navigate("/chats", { state: { prompt: item.prompt } })
                  }
                  title={`Tanya AI: ${item.prompt}`}
                  className="relative h-[320px] w-full cursor-pointer overflow-hidden rounded-2xl bg-[#29241F] text-left shadow-lg"
                >
                  <img loading="lazy" decoding="async"
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 z-10 px-4 pb-5">
                    <h3 className="font-clash text-2xl font-bold text-white sm:text-4xl tracking-normal">
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

        <div className="w-[325px] shrink-0 max-md:w-full">
          <CalendarCard
            tripsByDate={tripsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddForDate={bukaFormTanggal}
            onEditTrip={setEditTrip}
          />

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

      <div className="px-5 pb-10 mt-12 sm:px-10 sm:mt-20">
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
            <form
              onSubmit={pilihKota}
              onKeyDown={(e) => { if (e.key === "Escape") setEditingCity(false); }}
              className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
            >
              <InputAll
                autoFocus
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
                placeholder="Mau kota apa?"
                maxLength={40}
                aria-label="Nama kota"
                className="w-40 rounded-full sm:w-52 border border-grey-label/60 bg-grey-label/30 py-2 text-base placeholder:text-grey-light/50 focus:border-[#83ADD0] focus:ring-[#83ADD0]"
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
                fillClassName="rounded-full bg-bright-white/70 text-grey-light"
              >
                <i className="fi fi-rr-cross-small text-xl leading-none"></i>
              </FillButton>

              <div className="flex w-full flex-wrap items-center gap-2">
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
              </div>
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

          <FillButton
            type="button"
            onClick={muatUlang}
            disabled={loadingCity}
            title="Muat rekomendasi lain"
            className="flex h-10 w-10 items-center justify-center !rounded-full !px-0 !py-0 !text-base disabled:opacity-60"
            baseClassName="ring-1 ring-inset ring-grey-label/60 bg-grey-label/50 text-grey-light"
            fillClassName="rounded-full bg-bright-white/70 text-grey-light"
          >
            <i
              className={`fi fi-rr-refresh text-lg leading-none ${
                loadingCity ? "animate-spin" : ""
              }`}
            ></i>
          </FillButton>
        </div>

        {adaTempat && (
          <p className="mt-2 text-sm font-jakarta font-normal text-grey-light/60">
            Rekomendasi dari AI
            {loadingCity ? " · memperbarui..." : ""}
          </p>
        )}

        {!adaTempat && loadingCity && (
          <p className="mt-6 text-base font-jakarta text-grey-light/60">
            AI sedang mencari tempat makan dan wisata terbaik...
          </p>
        )}

        {!adaTempat && !loadingCity && (
          <p className="mt-6 text-base font-jakarta text-grey-light/60">
            AI belum bisa memberi rekomendasi untuk {cityLabels[kunciKota] || city}.
            Coba tekan tombol muat ulang atau pilih kota lain.
          </p>
        )}

        {adaTempat && aiError && (
          <p className="mt-2 text-xs font-jakarta text-grey-light/60">
            Pembaruan terakhir gagal, menampilkan hasil sebelumnya.
          </p>
        )}

        {Object.entries(places)
          .filter(([, items]) => items.length > 0)
          .map(([category, items]) => (
          <div key={category} className="mt-8 [contain-intrinsic-size:auto_360px] [content-visibility:auto]">
            <h3 className="text-xl font-jakarta font-bold text-grey-light">
              {category}
            </h3>

            <div className="mt-3 grid w-full grid-cols-4 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
              {items.map((place) => (
                <div key={place.id} className="flex flex-col">
                  <img loading="lazy" decoding="async"
                    src={place.image || gambarCadangan(category)}
                    alt={place.name}
                    onError={(event) => perbaikiGambar(event, category)}
                    className="aspect-[4/3] w-full rounded-2xl bg-grey-label/50 object-cover"
                  />

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <h4 className="truncate text-base font-jakarta font-semibold text-grey-light">
                      {place.name}
                    </h4>
                    {Number(place.rating) > 0 && (
                      <span className="shrink-0 text-sm font-jakarta font-medium text-grey-light">
                        <i className="fi fi-sr-star text-xs"></i> {place.rating}
                      </span>
                    )}
                  </div>

                  {place.address && (
                    <p className="line-clamp-2 text-sm font-jakarta font-normal text-grey-light/80">
                      {place.address}
                    </p>
                  )}
                  {place.fact && (
                    <p className="mt-1 line-clamp-3 text-xs font-jakarta font-normal italic text-grey-light/70">
                      <i className="fi fi-rr-bulb mr-1 text-[10px] leading-none"></i>
                      {place.fact}
                    </p>
                  )}

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