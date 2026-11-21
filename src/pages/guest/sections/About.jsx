import MapsHome from "../../../assets/images/about/maps.webp";

function About() {
  return (
    <section className="relative overflow-hidden bg-bright-white -mt-8 pt-40 pb-32 px-52 max-sm:px-6 max-sm:pt-32 max-sm:pb-16">
      <img
        src={MapsHome}
        alt=""
        className="absolute -left-20 -top-32 z-0 w-250 h-200 object-contain opacity-20 max-sm:hidden"
      />
      <div className="relative z-10 flex flex-col items-end gap-6 max-sm:items-center max-sm:gap-4">
        <div className="flex justify-center gap-10 max-sm:gap-4">
          <div className="flex gap-3 max-sm:gap-1.5 items-center">
            <i className="fi fi-sr-users-alt text-base max-sm:text-sm text-arctic-blue flex"></i>
            <p className="font-jakarta font-semibold text-sm max-sm:text-xs text-grey-light">
              We are Setapak
            </p>
          </div>
          <div className="flex gap-3 max-sm:gap-1.5 items-center">
            <i className="fi fi-sr-star text-base max-sm:text-sm text-[#FFD738] flex"></i>
            <p className="font-jakarta font-semibold text-sm max-sm:text-xs text-grey-light">
              5K + People Satisfied
            </p>
          </div>
        </div>

        <h1 className="font-jakarta font-medium text-7xl text-grey-light text-right leading-tight pb-2 w-[650px] max-sm:text-4xl max-sm:text-center max-sm:w-[350px]">
          Every Journey Begins with a
          <span className="font-semibold text-light-brown-new font-clash pl-1">
            Plan
          </span>
          .
        </h1>
      </div>
    </section>
  );
}

export default About;
