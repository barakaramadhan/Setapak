
import imageMaps from "../../assets/images/maps.png";
import ImageDestination from "../../assets/images/yogyakarta.png";
import ImageDestination2 from "../../assets/images/bandung.png";
import ImageDestination3 from "../../assets/images/bali.png";

function Destinations() {
  return (
    <section className="relative overflow-hidden bg-white px-20 pt-32 pb-40">
      <img
        src={imageMaps}
        alt=""
        className="absolute left-0 -top-28 z-0 w-150 h-150 object-contain opacity-20"
      />

      <div className="relative">
        <div className="absolute top-114 left-24 z-0 pointer-events-none select-none">
          <h1 className="font-clash font-bold text-[200px] leading-none text-grey-light/20">
            SE
          </h1>
          <div className="flex items-center">
            <div className="w-96 h-105"></div>
            <h1 className="font-clash font-bold text-[250px] leading-none text-grey-light/20">
              TAPAK
            </h1>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-5">
          <div className="col-span-2">
            <img
              src={ImageDestination}
              alt="Yogyakarta"
              className="mt-14 w-120 h-105 rounded-xl object-cover"
            />
            <img
              src={ImageDestination3}
              alt="Bali"
              className="mt-40 ml-12 w-120 h-120 rounded-xl object-cover"
            />
          </div>

          <div>
            <h2 className="ml-16 whitespace-nowrap font-clash font-bold text-6xl leading-none text-black">
              Indonesia <br />
              <span className="text-light-brown-new">
                Stories Between <br />
                Streets
              </span>
            </h2>

            <div className="mt-28 mx-auto w-52 text-center">
              <p className="font-jakarta text-xl text-black">
                Explore Indonesia's timeless streets, rich culture, and hidden
                stories.
              </p>
              <div className="mt-4 mx-auto w-32 h-px bg-black"></div>
            </div>
          </div>

          <div className="col-span-2">
            <img
              src={ImageDestination2}
              alt="Bandung"
              className="mt-56 ml-auto w-120 h-150 rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Destinations;
