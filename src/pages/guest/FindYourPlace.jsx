import React from "react";
import SectionMarker from "../../components/ui/SectionMarker";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";
import ImageCard from "../../assets/images/imagecard.png";

function FindYourPlace() {
  return (
    <section className="px-20 py-14 flex items-center bg-bright-white">
      <div className="flex-1">
        <SectionMarker title="02  Pouplar Destination" className="mb-10 w-48" />
        <h1 className="font-jakarta font-medium text-7xl text-grey-light">
          Find Your
          <span className="font-clash font-semibold text-light-brown-new pl-3">
            Place
          </span>
        </h1>
        <p className="font-jakarta font-normal text-grey-light text-base max-w-sm mt-4">
          Discover remarkable destinations, uncover hidden gems, and explore the
          beauty of places around the world.
        </p>
      </div>

      <div className="w-full max-w-lg shrink-0 bg-white rounded-2xl shadow-xl overflow-hidden">
        <img src={ImageCard} alt="" className="w-full h-28 object-cover" />

        <div className="px-5 py-6">
          <div className="flex gap-6 pb-5">
            <div>
              <p className="font-jakarta font-medium text-sm text-grey-light pb-2">
                Destination
              </p>
              <InputAll
                placeholder="Find a spot"
                className="w-full focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
              />
            </div>
            <div className="flex-1">
              <p className="font-jakarta font-medium text-sm text-grey-light pb-2">
                Category
              </p>
              <div className="relative">
                <InputAll
                  placeholder="Select Type"
                  className="w-full pr-10 focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
                />
                <i className="fi fi-br-angle-small-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-1">
              <p className="font-jakarta font-medium text-sm text-grey-light pb-2">
                Date
              </p>
              <div className="relative gap-4">
                <InputAll
                  placeholder="Select date range"
                  className="w-full pr-10 focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
                />
                <i className="fi fi-br-angle-small-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none"></i>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-jakarta font-medium text-sm text-grey-light pb-2">
                Price
              </p>
              <InputAll
                placeholder="Enter Your Budget"
                className="w-full focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
              />
            </div>
          </div>

          <FillButton className="mt-6">Plan Trip</FillButton>
        </div>
      </div>
    </section>
  );
}

export default FindYourPlace;