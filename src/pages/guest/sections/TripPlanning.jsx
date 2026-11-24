import SectionMarker from "../../../components/ui/SectionMarker";
import GoButton from "../../../components/ui/GoButton";
import FillButton from "../../../components/ui/FillButton";
function TripPlanning() {
  return (
    <section className="px-20 bg-bright-white">
      <div>
        <SectionMarker title="Plan a trip" className="mb-3"/>
        <h1 className="font-jakarta font-bold text-5xl text-grey-light max-w-2xl leading-tight pb-2">
          Plan Your Next Unforgettable Journey Ahead.
        </h1>
        <p className="font-jakarta font-normal text-xl text-grey-light max-w-sm"> 
          Discover new destinations, create your own itinerary, and make every
          journey unforgettable.
        </p>
         <GoButton to="/chats" className="mt-10">
              <span className="inline-flex items-center justify-center gap-2">
                <span>Start planning</span>
                <i className="fi fi-rr-angle-small-right leading-none text-[20px] pt-2"></i>
              </span>
            </GoButton>
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
