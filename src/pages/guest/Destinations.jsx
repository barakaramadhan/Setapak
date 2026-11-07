import imageMaps from "../../assets/images/maps.png";
import FillButton from "../../components/ui/FillButton";
import SectionMarker from "../../components/ui/SectionMarker";
import ImageDestination from "../../assets/images/yogyakarta.png";
import ImageDestination2 from "../../assets/images/bandung.png";
import ImageDestination3 from "../../assets/images/bali.png";

function Destinations() {
  return (
    <section className="relative overflow-hidden bg-bright-white px-20 pt-32 pb-40">
      <img
        src={imageMaps}
        alt=""
        className="absolute left-0 -top-36 z-0 w-250 h-200 object-contain opacity-20"
      />

      <div className="relative">
        <div className="absolute top-114 left-24 z-0 pointer-events-none select-none">
          <h1 className="font-clash font-bold text-[200px] leading-none text-grey-light/30">
            SE
          </h1>
          <div className="flex items-center">
            <div className="w-96 h-105"></div>
            <h1 className="font-clash font-bold text-[230px] leading-none text-grey-light/30">
              TAPAK
            </h1>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-5">
          <div className="col-span-2">
            {/* Yogyakarta */}
            <div className="group relative mt-14 w-120 h-105 overflow-hidden rounded-xl">
              <img
                src={ImageDestination}
                alt="Yogyakarta"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                <span className="font-clash text-4xl font-bold text-bright-white tracking-wide">
                  Yogyakarta
                </span>
              </div>
            </div>

            {/* Bali */}
            <div className="group relative mt-40 ml-12 w-120 h-120 overflow-hidden rounded-xl">
              <img
                src={ImageDestination3}
                alt="Bali"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                <span className="font-jakarta text-2xl font-bold text-bright-white tracking-wide flex flex-col items-start">
                  Pulau <span className="text-bright-white font-clash font-bold text-5xl">Lemukutan</span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <SectionMarker className="ml-16 mb-3" title="Destinations" />

            <h2 className="ml-16 whitespace-nowrap font-clash font-bold text-6xl leading-none text-grey-light ">
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

              <FillButton className="mt-7">Explore Now</FillButton>
            </div>
          </div>

          <div className="col-span-2 pt-5">
            {/* Bandung */}
            <div className="group relative mt-56 ml-auto w-120 h-150 overflow-hidden rounded-xl">
              <img
                src={ImageDestination2}
                alt="Bandung"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                <span className="font-clash text-4xl font-bold text-bright-white tracking-wide">
                  Braga
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Destinations;