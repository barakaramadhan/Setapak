import React from "react";
import SectionMarker from "../../components/ui/SectionMarker";
import ImageCard from "../../assets/images/imagerecomendation.png";
import ImageCard2 from "../../assets/images/imagerecomendation2.png";
import ImageCard3 from "../../assets/images/imagerecomendation3.png";

function Recomendations() {
  const recomendations = [
    {
      id: 1,
      image: ImageCard,
      title: "Rome",
      description: "Rome Metropolitan City, Italy",
      ratting: 4.5,
    },
    {
      id: 2,
      image: ImageCard2,
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
    <section className="sticky top-0 z-0 px-20 py-8 bg-bright-white">
      <SectionMarker title="Recommendation" className="mb-6 w-36" />

      <div className="flex gap-9 overflow-x-auto pb-4">
        {recomendations.map((item) => (
          <div
            key={item.id}
            className="group relative w-[362px] h-[399px] rounded-2xl overflow-hidden shrink-0 shadow-lg"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 to-transparent"></div>

            <div className="absolute bottom-0 w-full p-5 flex justify-between items-end text-white">
              <div className="flex flex-col gap-1 items-start">
                <h3 className="text-2xl font-bold m-0 font-jakarta ">{item.title}</h3>
                <p className="text-sm text-bright-white m-0 font-light -mt-1">{item.description}</p>
              </div>

              <div className="flex items-center gap-2 text-sm font-normal font-jakarta text-bright-white">
                 <i className="fi fi-sr-star text-base text-[#FFD738] flex"></i> {item.ratting}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Recomendations;