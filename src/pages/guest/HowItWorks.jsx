import React, { useState } from "react";
import ImageStep1 from "../../assets/images/imagestep1.png";
import ImageStep2 from "../../assets/images/imagestep2.png";
import ImageStep3 from "../../assets/images/imagestep3.png";
import ImageStep4 from "../../assets/images/imagestep4.png";
import ImageStep5 from "../../assets/images/imagestep5.png";
import ImageStep6 from "../../assets/images/imagestep6.png";

function HowItWorks() {
  const steps = [
    {
      id: 1,
      number: "01",
      title: "Set your preferences",
      description: "Destination, dates, budget, and travel style",
      imageLeft: ImageStep1,
      imageRight: ImageStep2,
    },
    {
      id: 2,
      number: "02",
      title: "AI builds your itinerary",
      description: "Destinations, timing, and transportation",
      imageLeft: ImageStep3,
      imageRight: ImageStep4,
    },
    {
      id: 3,
      number: "03",
      title: "Edit and save",
      description: "Review activities, rearrange, and share",
      imageLeft: ImageStep5,
      imageRight: ImageStep6,
    },
  ];

  const [activeStep, setActiveStep] = useState(1);

  const currentData = steps.find((step) => step.id === activeStep);

  return (
    <section className="bg-grey-light text-white min-h-[600px] py-12 px-10 mt-20 mb-96 rounded-t-4xl relative z-10 overflow-hidden flex flex-col max-md:rounded-t-[50%/60px] max-sm:rounded-t-[50%/40px] max-sm:px-5">
      <h2 className="text-center text-3xl font-bold font-clash text-white uppercase">
        Setapak
      </h2>

      <div className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-3 items-center max-md:grid-cols-1 max-md:gap-10 max-md:pt-10">
        <div className="flex justify-start pl-10 max-md:justify-center max-md:pl-0">
          <img
            src={currentData.imageLeft}
            alt="Step Left"
            className="w-64 h-[400px] object-cover rounded-3xl shadow-2xl -rotate-12 transition-all duration-500 max-md:w-48 max-md:h-60"
          />
        </div>

        <div className="flex flex-col gap-12 text-center items-center mt-11">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`cursor-pointer transition-all duration-300 ${
                activeStep === step.id
                  ? "text-new-bright scale-105"
                  : "text-grey-new hover:opacity-50"
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <h3 className="text-3xl text-light-brown-new font-clash font-bold mb-1">
                {step.number}
              </h3>
              <h4 className="text-4xl font-jakarta font-regular leading-none max-w-[250px] mx-auto mb-2 max-sm:text-3xl">
                {step.title}
              </h4>
              <p className="text-base font-jakarta font-regular text-grey-new">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end pr-10 max-md:justify-center max-md:pr-0">
          <img
            src={currentData.imageRight}
            alt="Step Right"
            className="w-64 h-[400px] object-cover rounded-3xl shadow-2xl rotate-12 transition-all duration-500 max-md:w-48 max-md:h-60"
          />
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;