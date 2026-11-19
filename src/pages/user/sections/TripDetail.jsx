import React, { useState } from "react";
import { useParams } from "react-router-dom";
import OutlineButton from "../../../components/ui/OutlineButton";

// Data Dummy Lengkap sesuai desain gambar referensi
const DETAIL_DUMMY = {
  id: 1,
  title: "Trip to Jakarta",
  subtitle: "A 5-day journey to discover the best of Jakarta.",
  tags: ["Jakarta", "2 Travelers", "5 days", "Rp 2.000.000"],
  days: [
    {
      dayNumber: 1,
      dayTitle: "Central Jakarta",
      daySubtitle: "Orientation + easy pace",
      estBudget: "Est. Rp 305.000",
      activities: [
        {
          id: 101,
          time: "12:30",
          category: "Stay",
          categoryStyle: "bg-blue-100 text-blue-700",
          title: "Check-in & drop bags",
          meta: "Menteng area · 30 min",
          description: "Leave your bags and freshen up before heading out.",
        },
        {
          id: 102,
          time: "14:00",
          category: "Museum",
          categoryStyle: "bg-amber-100 text-amber-800",
          title: "National Museum of Indonesia",
          meta: "2 hrs · Est. Rp 20.000",
          description:
            "A gentle introduction to Indonesian history and culture, indoors and easy to walk.",
        },
        {
          id: 103,
          time: "16:30",
          category: "Nature",
          categoryStyle: "bg-emerald-100 text-emerald-700",
          title: "Taman Suropati",
          meta: "1.5 hrs · Free",
          description:
            "An easy late-afternoon stroll in Menteng, shaded and relaxed.",
        },
        {
          id: 104,
          time: "19:00",
          category: "Food",
          categoryStyle: "bg-rose-100 text-rose-700",
          title: "Dinner in Menteng",
          meta: "1.5 hrs · Est. Rp 220.000 for 2",
          description:
            "Plenty of local dining close to the park, so no extra travel tonight.",
        },
      ],
    },
    {
      dayNumber: 2,
      dayTitle: "Old Town & North Jakarta",
      daySubtitle: "Historical walk + coastal breeze",
      estBudget: "Est. Rp 420.000",
      activities: [
        {
          id: 201,
          time: "09:00",
          category: "Museum",
          categoryStyle: "bg-amber-100 text-amber-800",
          title: "Kota Tua & Jakarta History Museum",
          meta: "2.5 hrs · Est. Rp 15.000",
          description: "Explore the Dutch colonial architecture in Fatahillah Square.",
        },
      ],
    },
    { dayNumber: 3, dayTitle: "South Jakarta", daySubtitle: "Cafe hopping & modern art", estBudget: "Est. Rp 350.000", activities: [] },
    { dayNumber: 4, dayTitle: "Thousand Islands", daySubtitle: "Day trip island hopping", estBudget: "Est. Rp 400.000", activities: [] },
    { dayNumber: 5, dayTitle: "Shopping & Departure", daySubtitle: "Last minute souvenirs", estBudget: "Est. Rp 175.000", activities: [] },
  ],
  budgetDetails: {
    usedFormatted: "Rp 1.650.000",
    plannedFormatted: "Rp 2.000.000",
    leftFormatted: "Rp 350.000",
    percentage: 82.5,
    breakdown: [
      { label: "Day 1 · Transport", amount: "Rp 65.000" },
      { label: "Day 1 · Food", amount: "Rp 220.000" },
      { label: "Day 1 · Tickets", amount: "Rp 20.000" },
    ],
  },
};

function TripDetail() {
  const { id } = useParams();
  // State untuk mengatur tab hari yang sedang aktif (default Day 1)
  const [activeDay, setActiveDay] = useState(1);

  const tripData = DETAIL_DUMMY;
  // Mencari data hari yang sesuai dengan tombol yang diklik
  const currentDayData =
    tripData.days.find((d) => d.dayNumber === activeDay) || tripData.days[0];

  return (
    <div className="px-10 py-9 w-full min-h-screen font-jakarta text-grey-light">
      {/* HEADER ATAS (Judul & Tags) */}
      <h1 className="font-jakarta font-bold text-4xl text-grey-light">{tripData.title}</h1>
      <p className="font-jakarta font-normal text-base text-grey-light/80 mt-1">{tripData.subtitle}</p>

      {/* Tags Info */}
      <div className="flex flex-wrap gap-2 mt-4">
        {tripData.tags.map((tag, index) => (
          <OutlineButton
            key={index}
            title={tag}
            className="border border-grey-light/50 text-grey-light px-6 py-2 font-jakarta font-semibold text-base"
          >
          </OutlineButton>
        ))}
      </div>

      {/* Tombol Navigasi Hari (Day 1 - Day 5) */}
     {/* Tombol Navigasi Hari (Day 1 - Day 5) */}
      <div className="flex flex-wrap gap-2.5 mt-6 mb-8">
        {tripData.days.map((day) => {
          const isActive = day.dayNumber === activeDay;
          return (
            <OutlineButton
              key={day.dayNumber}
              title={`Day ${day.dayNumber}`}
              onClick={() => setActiveDay(day.dayNumber)}
              className={`px-6 py-2 font-jakarta font-semibold text-base transition-colors cursor-pointer ${
                isActive
                  ? "bg-grey-light text-white border border-grey-light"
                  : "border border-grey-light/50 text-grey-light hover:bg-gray-100"
              }`}
            />
          );
        })}
      </div>

      {/* KONTEN UTAMA: 2 Kolom (Kiri Timeline, Kanan Map & Budget) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* KOLOM KIRI: Header Hari & Timeline Aktivitas */}
        <div className="flex-1 w-full">
          {/* Header Sub-Hari */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-bold text-2xl">
                Day {currentDayData.dayNumber} · {currentDayData.dayTitle}
              </h2>
              <p className="text-sm text-grey-light/70 mt-0.5">
                {currentDayData.daySubtitle}
              </p>
            </div>
            <span className="font-bold text-base">
              {currentDayData.estBudget}
            </span>
          </div>

          {/* Daftar Timeline Aktivitas */}
          <div className="flex flex-col">
            {currentDayData.activities.length > 0 ? (
              currentDayData.activities.map((item, idx) => {
                const isLast = idx === currentDayData.activities.length - 1;
                return (
                  <div key={item.id} className="flex gap-4">
                    {/* Bagian Kiri: Jam, Titik Hitam, dan Garis Vertikal */}
                    <div className="flex items-start gap-3 pt-4">
                      <span className="text-xs font-bold w-10 text-right">
                        {item.time}
                      </span>
                      <div className="flex flex-col items-center h-full">
                        <div className="w-2.5 h-2.5 rounded-full bg-grey-light mt-1 shrink-0" />
                        {/* Garis vertikal penghubung (hilang di item terakhir) */}
                        {!isLast && (
                          <div className="w-[1.5px] bg-gray-300 flex-1 my-1" />
                        )}
                      </div>
                    </div>

                    {/* Bagian Kanan: Card Aktivitas */}
                    <div className="flex-1 border border-grey-label/70 rounded-2xl p-4 mb-4 bg-white flex gap-4 items-start">
                      {/* Placeholder Gambar Tempat */}
                      <div className="w-24 h-24 rounded-xl bg-gray-200 shrink-0 overflow-hidden">
                        {/* Nanti bisa diisi <img src={item.image} /> */}
                      </div>

                      {/* Detail Teks */}
                      <div className="flex-1">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1.5 ${item.categoryStyle}`}
                        >
                          {item.category}
                        </span>
                        <h3 className="font-bold text-base text-grey-light">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.meta}
                        </p>
                        <p className="text-xs text-grey-light/80 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Tombol Aksi Kanan (Swap & Delete) */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          title="Replace place"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="fi fi-rr-exchange text-xs"></i>
                        </button>
                        <button
                          title="Remove place"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                        >
                          <i className="fi fi-rr-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 mb-4">
                Belum ada jadwal untuk hari ini.
              </div>
            )}

            {/* Tombol + Add place di bagian paling bawah timeline */}
            <div className="pl-[62px] mt-1">
              <OutlineButton
                title="+ Add place"
                className="border-grey-label text-grey-light px-5 py-2 text-sm font-semibold rounded-xl hover:bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Map & Rincian Budget */}
        <div className="w-full lg:w-[360px] flex flex-col gap-6 shrink-0">
          {/* Kotak Map */}
          <div className="h-60 rounded-2xl overflow-hidden border border-grey-label/60 bg-gray-100 relative">
            <img
              src="https://i.pinimg.com/736x/2e/3c/32/2e3c320b9f6806c64821a705116d6d09.jpg"
              alt="Jakarta Map"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Kotak Budget */}
          <div className="p-6 border border-grey-label/70 rounded-2xl bg-white">
            <h3 className="font-bold text-base mb-2">Budget</h3>
            <p className="text-3xl font-bold">{tripData.budgetDetails.usedFormatted}</p>
            <p className="text-xs text-gray-500 mt-1">
              planned of {tripData.budgetDetails.plannedFormatted} ·{" "}
              {tripData.budgetDetails.leftFormatted} left
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 my-4">
              <div
                className="bg-blue-400 h-2 rounded-full"
                style={{ width: `${tripData.budgetDetails.percentage}%` }}
              ></div>
            </div>

            {/* Rincian Pengeluaran */}
            <div className="flex flex-col gap-2.5 mt-4 pt-2">
              {tripData.budgetDetails.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-grey-light/80">{item.label}</span>
                  <span className="font-bold">{item.amount}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 mt-5">
              Estimates only. Lodging is not included.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default TripDetail;