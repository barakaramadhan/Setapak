import React from "react";
import SectionMarker from "../../components/ui/SectionMarker";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";

function FindYourPlace() {
  return (
    <section className="px-20 py-10 flex gap-20">
      <div>
        <SectionMarker title="02  Pouplar Destination" className="mb-10 w-48" />
        <h1 className="font-jakarta font-medium text-7xl text-grey-light">
          Find Your{" "}
          <span className="font-clash font-semibold text-light-brown-new">
            Place
          </span>
        </h1>
        <p className="font-jakarta font-normal text-grey-light text-base max-w-sm mt-4">
          Discover remarkable destinations, uncover hidden gems, and explore the
          beauty of places around the world.
        </p>
      </div>

      <div>
        <img src="" alt="" />
        <div>
          <p>Destination</p>
          <InputAll
            placeholder="Cari lokasi..."
            className="focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <p>Category</p>
          <div className="relative">
            <InputAll
              placeholder="Pilih kategori..."
              className="pr-10 focus:border-blue-500 focus:ring-blue-500"
            />
            <i className="fi fi-br-angle-small-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none"></i>
          </div>
        </div>
        <FillButton className="mt-10">Plan Trip</FillButton>
      </div>
    </section>
  );
}

export default FindYourPlace;
