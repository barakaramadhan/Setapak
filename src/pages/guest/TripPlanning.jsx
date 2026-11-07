import React from "react";
import SectionMarker from "../../components/ui/SectionMarker";
import FillButton from "../../components/ui/FillButton";
// import ImagePlan1 from "../../assets/images/imageplan1.png"
// import ImagePlan2 from "../../assets/images/imageplan2.png"
// import ImagePlan3 from "../../assets/images/imageplan3.png"
// import ImagePlan4 from "../../assets/images/imageplan4.png"
function TripPlanning() {
  return (
    <section className="px-20">
      <div>
        <SectionMarker title="Plan a trip" className="mb-3"/>
        <h1 className="font-jakarta font-bold text-5xl text-grey-light max-w-2xl leading-tight pb-2">
          Plan Your Next Unforgettable Journey Ahead.
        </h1>
        <p className="font-jakarta font-normal text-xl text-grey-light max-w-sm"> 
          Discover new destinations, create your own itinerary, and make every
          journey unforgettable.
        </p>
         <FillButton className="mt-10">
              <span className="inline-flex items-center justify-center gap-2">
                <span>Start planning</span>
                <i className="fi fi-rr-angle-small-right leading-none text-[20px] pt-2"></i>
              </span>
            </FillButton>
      </div>

      <div className="flex">
        {/* <img src={ImagePlan1} alt="" className="w-96 h-80"/>
        <img src={ImagePlan2} alt="" />
        <img src={ImagePlan3} alt="" />
        <img src={ImagePlan4} alt="" /> */}
      </div>
    </section>
  );
}

export default TripPlanning;
