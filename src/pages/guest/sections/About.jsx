import React from 'react'
import MapsHome from '../../../assets/images/about/maps.webp'
import SectionMarker from '../../../components/ui/SectionMarker'

function About() {
  return (
    <section className="relative overflow-hidden bg-bright-white pt-32 pb-32 px-52">
      <img
        src={MapsHome}
        alt=""
        className="absolute -left-20 -top-40 z-0 w-250 h-200 object-contain opacity-20"
      />
      <div className="relative z-10 flex flex-col items-end gap-6">
        <div className="flex justify-center gap-10">
          <div className="flex gap-3 items-center">
            <i className="fi fi-sr-users-alt text-base text-[#83ADD0] flex"></i>
            <p className="font-jakarta font-semibold text-sm text-grey-light">
              We are Setapak
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <i className="fi fi-sr-star text-base text-[#FFD738] flex"></i>
            <p className="font-jakarta font-semibold text-sm text-grey-light">
              5K + People Satisfied
            </p>
          </div>
        </div>

        <h1 className="font-jakarta font-medium text-7xl text-grey-light w-fit text-right leading-tight pb-2">
          Every Journey Begins <br />
          with a <span className="font-semibold text-light-brown-new font-clash">Plan</span>.
        </h1>
      </div>
    </section>
  )
}

export default About