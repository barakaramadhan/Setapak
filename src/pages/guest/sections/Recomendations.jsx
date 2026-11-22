import React from "react";
import SectionMarker from "../../../components/ui/SectionMarker";
import ImageCard from "../../../assets/images/recomendations/imagerecomendation.webp";
import ImageCard2 from "../../../assets/images/recomendations/imagerecomendation2.webp";
import ImageCard3 from "../../../assets/images/recomendations/imagerecomendation3.webp";

function Recomendations() {
  const recomendations = [
    {
      id: 1,
      image: ImageCard2,
      title: "Rome",
      description: "Rome Metropolitan City, Italy",
      ratting: 4.5,
    },
    {
      id: 2,
      image: ImageCard,
      title: "Braga",
      description: "Bandung, West Java, Indonesia",
      ratting: 4.5,
    },
    {
      id: 3,
      image: ImageCard3,
      title: "Seoul",
      description: "Seoul, South Korea",
      ratting: 4.5,
    },
  ];

  return (
    <section className="sticky top-0 z-0 px-20 py-8 bg-bright-white max-lg:px-12 max-sm:px-5">
      <SectionMarker title="Recommendation" className="mb-6 w-36 max-sm:px-3 max-sm:py-1 max-sm:mb-5" />

      {/* Container diubah dengan menambahkan snap-scroll dan menyembunyikan scrollbar */}
      <div className="flex gap-9 max-lg:gap-4 max-sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {recomendations.map((item) => (
          <div
            key={item.id}
            // Card diberikan ukuran khusus mobile dan ditambahkan efek snap-center
            className="group relative w-[362px] h-[399px] max-lg:flex-1 max-lg:h-[300px] max-sm:flex-none max-sm:w-[280px] max-sm:h-[340px] rounded-2xl overflow-hidden shrink-0 shadow-lg snap-center"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 to-transparent"></div>

            <div className="absolute bottom-0 w-full p-5 max-lg:p-4 max-sm:p-4 flex justify-between items-end text-white">
              <div className="flex flex-col gap-1 items-start">
                <h3 className="text-2xl max-lg:text-xl max-sm:text-xl font-bold m-0 font-jakarta ">
                  {item.title}
                </h3>
                <p className="text-sm max-lg:text-xs max-sm:text-xs text-bright-white m-0 font-light -mt-1">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center gap-2 max-lg:gap-1 max-sm:gap-1 text-sm max-lg:text-xs max-sm:text-xs font-normal font-jakarta text-bright-white">
                <i className="fi fi-sr-star text-base max-lg:text-sm max-sm:text-sm text-[#FFD738] flex"></i>{" "}
                {item.ratting}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Recomendations;