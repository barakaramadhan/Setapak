import React from "react";
import SectionMarker from "../../../components/ui/SectionMarker";
import FillButton from "../../../components/ui/FillButton";
import ImageOrdinary from "../../../assets/images/ordinary-travel/bandung.webp";
import ImageOrdinary1 from "../../../assets/images/ordinary-travel/ordinaryimage1.webp";
import ImageOrdinary2 from "../../../assets/images/ordinary-travel/ordinaryimage2.webp";

function OrdinaryTravel() {
  const destinations = [
    {
      id: 1,
      country: "Indonesia",
      title: "Braga, Bandung",
      description: "Where history meets modern city life.",
      image: ImageOrdinary,
      heightClass: "h-[380px] -mt-10",
      widthClass: "w-[300px]",
    },
    {
      id: 2,
      country: "Switzerland",
      title: "Alps, Switzerland",
      description: "Picturesque canals and historic charm.",
      image: ImageOrdinary1,
      heightClass: "h-[300px] mt-16",
      widthClass: "w-[210px]", 
    },
    {
      id: 3,
      country: "Netherlands",

      title: "Amsterdam, Netherlands",
      description: "Breathtaking mountain views and tranquility.",
      image: ImageOrdinary2,
      heightClass: "h-[300px]",
      widthClass: "w-[210px]", 
    },
  ];

  return (
    <section className="px-20 py-10 flex flex-col md:flex-row gap-12 items-start bg-bright-white">
      <div className="flex-1">
        <SectionMarker title="01 Our Value" className="mb-10" />
        <h1 className="font-jakarta font-medium text-5xl text-grey-light leading-tight pb-2">
          Not Your Ordinary Travel
          <span className="font-clash text-5xl font-semibold text-light-brown-new pl-3">
            Planner.
          </span>
        </h1>
        <p className="font-jakarta font-normal text-base text-grey-light max-w-sm mt-4">
          Thoughtfully planned journeys, made for the way you love to explore.
        </p>
        <FillButton className="mt-10">
          <span className="inline-flex items-center justify-center gap-2">
            <span>Start planning</span>
            <i className="fi fi-rr-angle-small-right leading-none text-[20px] pt-2"></i>
          </span>
        </FillButton>
      </div>

      {/* image yang di kanan */}
      <div className="flex-[1.5] flex gap-6 items-start">
        {destinations.map((item) => (
          <div
            key={item.id}
            className={`${item.widthClass} shrink-0 group cursor-pointer`}
            >
            {/* Box Gambar */}
            <div
              className={`relative overflow-hidden rounded-2xl ${item.heightClass}`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* nama negara yang ada di atas gambar  */}
              <span className="absolute bottom-4 right-4 text-bright-white text-base font-light font-jakarta  drop-shadow-md">
                {item.country}
              </span>
            </div>

            {/* kotak deskripsi */}
            <div className="mt-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              <h3 className="font-jakarta font-semibold text-lg text-grey-light tracking-wide">
                {item.title}
              </h3>
              <p className="font-jakarta text-sm text-grey-light font-light mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OrdinaryTravel;
