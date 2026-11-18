import { React, useState } from "react";
import FillButton from "../../../components/ui/FillButton";
import ImageHeaderUser from "../../../assets/images/imageuserhome.png";
import ImageTravelUser1 from "../../../assets/images/imagetraveluser1.png";
import ImageTravelUser2 from "../../../assets/images/imagetraveluser2.png";
import ImageTravelUser3 from "../../../assets/images/imagetraveluser3.png";

const dummyUser = {
  name: "Fulann",
  photo:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLuR5PKWFCU9Lm6xnsIznp7vNosgUMbRaxQXtdnuGfEQ&s=10",
};

// DATA DUMMY "For you" (sementara, nanti diganti hasil AI planning)
const coffeeAndSnacks = [
  {
    id: 1,
    name: "Coffe & Breads",
    rating: 4.5,
    address: "Jl. Pajajaran No. 12, Bogor",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
  },
  {
    id: 2,
    name: "Kopi Kenangan Hills",
    rating: 4.7,
    address: "Jl. Suryakencana No. 5, Bogor",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
  },
  {
    id: 3,
    name: "Roti Unyil Venus",
    rating: 4.4,
    address: "Jl. Pangrango No. 3, Bogor",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
  },
  {
    id: 4,
    name: "Warung Kopi Bogor",
    rating: 4.6,
    address: "Jl. Ahmad Yani No. 20, Bogor",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
  },
];

const outdoorParks = [
  {
    id: 5,
    name: "Kebun Raya Bogor",
    rating: 4.8,
    address: "Jl. Ir. H. Juanda No. 13, Bogor",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600",
  },
  {
    id: 6,
    name: "Taman Safari",
    rating: 4.6,
    address: "Jl. Raya Puncak, Cisarua",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600",
  },
  {
    id: 7,
    name: "Curug Cilember",
    rating: 4.5,
    address: "Cisarua, Bogor",
    image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600",
  },
  {
    id: 8,
    name: "Gunung Pancar",
    rating: 4.4,
    address: "Babakan Madang, Bogor",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600",
  },
];

// "near" = sekitar, "in" = di dalam kota (sementara urutannya dibalik supaya kelihatan bedanya)
const dummyPlaces = {
  near: {
    "Coffe And Snacks": coffeeAndSnacks,
    "Outdoor parks & Trials": outdoorParks,
  },
  in: {
    "Coffe And Snacks": [...coffeeAndSnacks].reverse(),
    "Outdoor parks & Trials": [...outdoorParks].reverse(),
  },
};

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function HomeUser() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [mode, setMode] = useState("near"); // "in" | "near"

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const travel = [
    {
      id: 1,
      title: "Nature",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: ImageTravelUser1,
    },
    {
      id: 2,
      title: "Culture",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: ImageTravelUser2,
    },
    {
      id: 3,
      title: "Food",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: ImageTravelUser3,
    },
  ];

  const schedule = [
    {
      id: 1,
      title: "Trip title here",
      place: "Just place sama sub tittle here",
    },
    {
      id: 2,
      title: "Trip title here",
      place: "Just place sama sub tittle here",
    },
    {
      id: 3,
      title: "Trip title here",
      place: "Just place sama sub tittle here",
    },
  ];

  // data "For you" sesuai toggle
  // NANTI kalau AI sudah jadi: ganti baris ini dengan hasil fetch (state dari API)
  const places = dummyPlaces[mode];

  return (
    // [PERBAIKAN 1]: Ditambah max-w-7xl mx-auto w-full agar layout terpusat rapi
    <section className="font-jakarta max-w-7xl mx-auto w-full">
      {/* bagian atas: sapaan + lonceng + profil */}
      <header className="flex items-start justify-between px-10 pt-9">
        <div>
          <h1 className="text-4xl font-bold font-jakarta text-grey-light">
            Hello, {dummyUser.name}!
          </h1>
          <p className="text-base font-jakarta font-normal text-grey-light">
            wut i have put in here?, so i’ll just put some random word here
          </p>
        </div>
        <div className="flex items-center gap-5">
          <button className="text-2xl ">
            <i className="fi fi-rr-bell"></i>
          </button>
          <button className="-mt-2">
            <img
              src={dummyUser.photo}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
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
                <div
                  key={item.id}
                  className="relative h-[320px] overflow-hidden rounded-2xl bg-dark-brown-new shadow-lg"
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
                    <p className="text-xs font-normal leading-tight text-white">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* deretan kedua: calendar + schedule */}
        <div className="w-[325px] shrink-0 max-md:w-full">
          {/* bagian kalender */}
          <div className="rounded-4xl border-2 border-grey-label/50 bg-white p-4">
            {/* header kalender */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-8 w-8 rounded-full hover:bg-grey-label/50 flex items-center justify-center pt-1"
              >
                <i className="fi fi-rr-angle-small-left text-lg"></i>
              </button>

              <h3 className="font-jakarta text-base font-semibold text-grey-light">
                {monthNames[month]}
              </h3>

              <button
                type="button"
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-full hover:bg-grey-label/50 flex items-center justify-center pt-1"
              >
                <i className="fi fi-rr-angle-small-right text-lg"></i>
              </button>
            </div>

            {/* garis horizontal */}
            <div className="my-3 border-t border-grey-label/50"></div>

            {/* nama hari */}
            <div className="grid grid-cols-7 text-center">
              {dayNames.map((name) => (
                <p
                  key={name}
                  className="py-2 text-sm font-jakarta font-semibold text-grey-light/50"
                >
                  {name}
                </p>
              ))}
            </div>

            {/* tanggal kalender */}
            <div className="grid grid-cols-7 text-center">
              {days.map((date, index) => {
                if (!date) return <div key={index}></div>;

                const isSelected =
                  selectedDate &&
                  date.toDateString() === selectedDate.toDateString();

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`h-9 rounded-xl text-base font-jakarta font-medium text-grey-light/80 ${
                      isSelected
                        ? "bg-[#83ADD0] text-white"
                        : "text-grey-light hover:bg-grey-label/30"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* bagian schedule */}
          <div className="mt-8">
            <h2 className="text-xl font-jakarta font-bold text-grey-light">
              Schedule
            </h2>

            <div className="mt-3 flex flex-col gap-3">
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-2xl border-2 border-grey-label/80 bg-white px-3 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#83ADD0] text-white">
                    <i className="fi fi-rr-marker leading-none text-sm pt-1"></i>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-jakarta font-semibold leading-tight text-grey-light">
                      {item.title}
                    </h3>
                    <p className="text-sm font-jakarta font-normal text-grey-light/80">
                      {item.place}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* bagian for you (data dummy, nanti dari AI planning) */}
      <div className="px-10 pb-10 mt-20">
        {/* judul: For you [In|Near] Bogor > */}
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-jakarta font-bold text-grey-light">
            For you
          </h2>

          <div className="flex rounded-full bg-grey-label/50 p-0.5">
            {["in", "near"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-sm font-jakarta font-medium capitalize ${
                  mode === m ? "bg-[#83ADD0] text-white" : "text-grey-light/80"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <h2 className="text-3xl font-jakarta font-bold text-grey-light">
            Bogor
          </h2>
          <i className="fi fi-rr-angle-small-right text-2xl leading-none pt-1"></i>
        </div>

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
                    src={place.image}
                    alt={place.name}
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HomeUser;