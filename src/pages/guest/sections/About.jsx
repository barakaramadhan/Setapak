import React from 'react'
import MapsHome from '../../../assets/images/about/maps.webp'
import SectionMarker from '../../../components/ui/SectionMarker'

function About() {
  return (
    <section className="relative overflow-hidden bg-bright-white -mt-8 pt-40 pb-32 px-52 max-md:px-10 max-md:pb-20 max-sm:pt-20 max-sm:pb-20 max-sm:px-5">
      <img
        src={MapsHome}
        alt=""
        className="absolute -left-20 -top-32 z-0 w-250 h-200 max-md:w-150 max-md:h-120 max-sm:w-100 max-sm:h-80 object-contain opacity-20"
      />
      <div className="relative z-10 flex flex-col items-end max-sm:items-center gap-6">
        <div className="flex justify-center gap-10 max-md:gap-6 max-sm:gap-4">
          <div className="flex gap-3 max-sm:gap-2 items-center">
            <i className="fi fi-sr-users-alt text-base text-arctic-blue flex"></i>
            <p className="font-jakarta font-semibold text-sm max-sm:text-xs text-grey-light">
              We are Setapak
            </p>
          </div>
          <div className="flex gap-3 max-sm:gap-2 items-center">
            <i className="fi fi-sr-star text-base text-[#FFD738] flex"></i>
            <p className="font-jakarta font-semibold text-sm max-sm:text-xs text-grey-light">
              5K + People Satisfied
            </p>
          </div>
        </div>

        <h1 className="font-jakarta font-medium text-7xl max-md:text-5xl max-sm:text-3xl text-grey-light w-fit text-right max-sm:text-center leading-tight pb-2">
          Every Journey Begins <br />
          with a <span className="font-semibold text-light-brown-new font-clash">Plan</span>.
        </h1>
      </div>
    </section>
  )
}

export default About