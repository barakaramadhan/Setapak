import React from "react";
import FillButton from "../../../components/ui/FillButton";
import ImageHeaderUser from "../../../assets/images/imageuserhome.png";

const dummyUser = {
  name: "Badonnn",
  photo:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLuR5PKWFCU9Lm6xnsIznp7vNosgUMbRaxQXtdnuGfEQ&s=10",
};

function HomeUser() {
  const travel = [
    {
      id: 1,
      title: "Nature",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: "https://picsum.photos/seed/nature/600/750",
    },
    {
      id: 2,
      title: "Culture",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: "https://picsum.photos/seed/culture/600/750",
    },
    {
      id: 3,
      title: "Food",
      description: "Lorem ipsum dolor sit amet, consectetur ",
      image: "https://picsum.photos/seed/food/600/750",
    },
  ];

  const schedule = [
    { id: 1, title: "Trip title here", place: "Just place sama sub tittle here" },
    { id: 2, title: "Trip title here", place: "Just place sama sub tittle here" },
    { id: 3, title: "Trip title here", place: "Just place sama sub tittle here" },
  ];

  return (
    <section className="font-jakarta">
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

            <div className="mt-2 grid max-w-[820px] grid-cols-3 gap-4 max-sm:grid-cols-1">
              {travel.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-dark-brown-new shadow-lg"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* lapisan gelap di bagian bawah supaya teks terbaca */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 z-10 p-3">
                    <h3 className="font-clash text-3xl font-bold text-white tracking-normal">
                      {item.title}
                    </h3>
                    <p className="text-[10px] font-normal leading-tight text-white">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* deretan kedua: kalender + schedule */}
        <div className="flex w-[325px] shrink-0 flex-col gap-6 max-md:w-full">
          {/* untuk bagian kalender (belum dibuat) */}
          <div></div>

          {/* bagian schedule */}
          <div className="mt-[338px]">
            <h2 className="text-xl font-jakarta font-bold text-grey-light">
              Schedule
            </h2>

            <div className="mt-3 flex flex-col gap-3">
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-grey-new bg-white px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7FA9D1] text-white">
                    <i className="fi fi-rr-marker leading-none text-sm pt-1"></i>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-tight text-dark-brown-new">
                      {item.title}
                    </h3>
                    <p className="text-xs font-normal text-dark-brown-new">
                      {item.place}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeUser;