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
      heightClass: "h-[380px] -mt-10 max-lg:h-[300px] max-lg:mt-0",
      widthClass: "w-[300px] max-lg:w-[260px]",
    },
    {
      id: 2,
      country: "Switzerland",
      title: "Alps, Switzerland",
      description: "Picturesque canals and historic charm.",
      image: ImageOrdinary1,
      heightClass: "h-[300px] mt-16 max-lg:h-[240px] max-lg:mt-12",
      widthClass: "w-[210px] max-lg:w-[200px]",
    },
    {
      id: 3,
      country: "Netherlands",
      title: "Amsterdam, Netherlands",
      description: "Breathtaking mountain views and tranquility.",
      image: ImageOrdinary2,
      heightClass: "h-[300px] max-lg:h-[200px] max-lg:mt-5",
      widthClass: "w-[210px] max-lg:w-[200px]",
    },
  ];

  return (
    <section className="px-20 py-10 flex flex-col lg:flex-row gap-12 items-start bg-bright-white max-lg:px-12 max-sm:px-6">
      <div className="flex-1">
        <SectionMarker
          className="mb-10 max-sm:mb-6 px-6 py-2 max-sm:px-3 max-sm:py-1 max-sm:mb-5"
          title="01 Our Value"
        />

        <h1 className="font-jakarta font-medium text-5xl text-grey-light leading-tight pb-2 w-[600px] max-lg:w-[500px] max-sm:text-3xl max-sm:w-[320px]">
          Not Your Ordinary
          <br className="hidden max-sm:block" />
          <span className="max-sm:hidden"> </span>
          Travel
          <span className="font-clash text-5xl font-semibold text-light-brown-new pl-2 max-sm:text-4xl max-sm:pl-1.5">
            Planner.
          </span>
        </h1>

        <p className="font-jakarta font-normal text-base text-grey-light max-w-sm mt-4 max-sm:max-w-[310px] max-sm:text-sm max-sm:mt-0">
          Thoughtfully planned journeys, made for the way you love to explore.
        </p>

        <FillButton
          className="mt-10 max-sm:px-4 max-sm:py-3 max-sm:mt-6"
          baseClassName="ring-1 ring-inset ring-dark-brown-new max-lg:bg-dark-brown-new max-sm:bg-dark-brown-new"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="max-lg:text-white max-sm:text-sm max-sm:text-white">
              Start planning
            </span>
            <i className="fi fi-rr-angle-small-right text-[20px] max-lg:text-white max-sm:text-base max-sm:text-white leading-[70%]"></i>
          </span>
        </FillButton>
      </div>

      <div className="flex-[1.5] flex gap-6 items-start max-lg:w-full max-lg:gap-4 max-sm:gap-6 max-sm:w-full max-sm:max-w-full max-sm:overflow-x-auto max-sm:flex-nowrap max-sm:pb-5 hide-scrollbar">
        {destinations.map((item) => (
          <div
            key={item.id}
            className={`${item.widthClass} shrink-0 group cursor-pointer max-sm:w-[220px]`}
          >
            <div
              className={`relative overflow-hidden rounded-2xl ${item.heightClass} max-sm:h-[280px] max-sm:mt-0`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 sm:group-hover:scale-105"
              />
              <span className="absolute bottom-4 right-4 text-bright-white text-base font-light font-jakarta drop-shadow-md">
                {item.country}
              </span>
            </div>

            <div className="mt-3 transition-all duration-300 opacity-0 translate-y-2 max-sm:hidden sm:group-hover:opacity-100 sm:group-hover:translate-y-0">
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