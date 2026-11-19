
import React from "react";
import OutlineButton from "../../../components/ui/OutlineButton";

// data sementara karna Ai belom jadi
const DATA_DUMMY = [
  {
    id: 1,
    title: "Trip to Jakarta",
    location: "Jakarta",
    date: "Nov 16 - 20",
    duration: "5 days",
    travelers: "2 Travelers",
    status: "Planned",
    budgetUsed: 1.65,
    budgetTotal: 2,
    image:
      "https://i.pinimg.com/1200x/2c/6e/47/2c6e47da70dd05bebe32fb04a1225ea0.jpg",
  },
  {
    id: 2,
    title: "Trip to Switzerland",
    location: "Switzerland",
    date: "Date not set",
    duration: "5 days",
    travelers: "2 Travelers",
    status: "Draft",
    budgetUsed: 0,
    budgetTotal: 2,
    image:
      "https://i.pinimg.com/1200x/ea/c8/d6/eac8d6651afd6db5f79fc06e7bc08fd2.jpg",
  },
  {
    id: 3,
    title: "Trip to Italy",
    location: "Italy",
    date: "Aug 12 - Sep 1",
    duration: "21 days",
    travelers: "2 Travelers",
    status: "Past",
    budgetUsed: 1.65,
    budgetTotal: 2,
    image:
      "https://i.pinimg.com/1200x/92/ac/41/92ac411789973a80c8ea6aba9acccd5f.jpg",
  },
];

function YourPlan() {
  return (
    <div className="px-10 py-9 w-full min-h-screen">
      {/* Header & Filter Buttons */}
      <h1 className="font-jakarta font-bold text-4xl text-grey-light">
        Your Plan
      </h1>
      <p className="font-jakarta font-normal text-base text-grey-light mt-1">
        All your travel ideas and itineraries, organized in one place.
      </p>

      <div className="flex gap-3 pt-7">
        <OutlineButton
          title="All"
          className="bg-grey-light text-white border-grey-light px-8 py-2 font-normal text-base"
        />

        <OutlineButton
          title="Upcoming"
          className="border-grey-light text-grey-light px-8 py-2 font-normal text-base"
        />

        <OutlineButton
          title="Past"
          className="border-grey-light text-grey-light px-8 py-2 font-normal text-base"
        />

        <OutlineButton
          title="Draft"
          className="border-grey-light text-grey-light px-8 py-2 font-normal text-base"
        />
      </div>

      {/* Mapping Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-10">
        {DATA_DUMMY.map((trip) => (
          <div
            key={trip.id}
            className="flex flex-col border border-grey-label/60 rounded-2xl overflow-hidden font-jakarta"
          >
            {/* Bagian Gambar */}
            <div className="relative w-full h-40">
              <img
                src={trip.image}
                alt={trip.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 right-3 bg-white text-grey-light text-xs font-bold px-3 py-1 rounded-full">
                {trip.status}
              </span>
            </div>

            {/* Bagian Teks & Konten Bawah */}
            <div className="p-5 flex flex-col flex-1 bg-white">
              <h3 className="font-jakarta font-bold text-xl text-grey-light">
                {trip.title}
              </h3>
              <p className="font-jakarta font-normal text-sm text-grey-light/80 mb-4">
                {trip.location} - {trip.date}
              </p>

              <div className="flex gap-2 mb-8">
                <OutlineButton
                  title={trip.duration}
                  className="border-grey-label text-grey-light/80 px-3 py-1 text-sm font-jakarta font-semibold min-w-0"
                />

                <OutlineButton
                  title={trip.travelers}
                  className="border-grey-label text-grey-light/80 px-3 py-1 text-sm font-semibold font-jakarta min-w-0"
                />
              </div>

              {/* Logika Bawah: Tombol (jika Draft) atau Progress Bar */}
              <div className="mt-auto">
                {trip.status === "Draft" ? (
                  <button className="w-full border border-grey-light text-grey-light rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Continue Planing
                  </button>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                      <span>Planed</span>
                      <span>
                        Rp. {trip.budgetUsed} / {trip.budgetTotal} jt
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-400 h-1.5 rounded-full"
                        style={{
                          width: `${(trip.budgetUsed / trip.budgetTotal) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Tambahan Card: Start a new trip */}
        <div className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors min-h-[350px] font-jakarta">
          <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-gray-600 pb-1">+</span>
          </div>
          <h3 className="font-bold text-lg text-grey-light mb-1">
            Start a new trip
          </h3>
          <p className="text-sm text-gray-500">
            Tell Setapak where
            <br />
            want to go.
          </p>
        </div>
      </div>
    </div>
  );
}

export default YourPlan;
