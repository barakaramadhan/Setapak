import React, { useState } from "react";
// import step1ImgLeft from "../../assets/images/step1-left.jpg";
// import step1ImgRight from "../../assets/images/step1-right.jpg";

function HowItWorks() {
  const steps = [
    {
      id: 1,
      number: "01",
      title: "Set your preferences",
      description: "Destination, dates, budget, and travel style",
      imageLeft: "URL_GAMBAR_KIRI_1",
      imageRight: "URL_GAMBAR_KANAN_1",
    },
    {
      id: 2,
      number: "02",
      title: "AI builds your itinerary",
      description: "Destinations, timing, and transportation",
      imageLeft: "URL_GAMBAR_KIRI_2",
      imageRight: "URL_GAMBAR_KANAN_2",
    },
    {
      id: 3,
      number: "03",
      title: "Edit and save",
      description: "Review activities, rearrange, and share",
      imageLeft: "URL_GAMBAR_KIRI_3",
      imageRight: "URL_GAMBAR_KANAN_3",
    },
  ];

  const [activeStep, setActiveStep] = useState(1);

  const currentData = steps.find((step) => step.id === activeStep);

  return (
    <section className="bg-[#1e1e1e] text-white min-h-[600px] py-10 px-10 rounded-t-4xl relative overflow-hidden flex flex-col max-sm:px-5">
      <h2 className="text-center text-xl font-bold tracking-widest uppercase">
        Setapak
      </h2>

      <div className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-3 items-center max-md:grid-cols-1 max-md:gap-10 max-md:pt-10">
        <div className="flex justify-start max-md:justify-center">
          <img
            src={currentData.imageLeft}
            alt="Step Left"
            className="w-64 h-80 object-cover rounded-3xl shadow-2xl -rotate-12 transition-all duration-500 max-md:w-48 max-md:h-60"
          />
        </div>

        <div className="flex flex-col gap-12 text-center items-center">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`cursor-pointer transition-all duration-300 ${
                activeStep === step.id
                  ? "opacity-100 scale-105"
                  : "opacity-40 hover:opacity-70"
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <h3 className="text-2xl text-[#d4af37] font-bold mb-2">
                {step.number}
              </h3>
              <h4 className="text-4xl font-light leading-none max-w-xs mx-auto mb-2 max-sm:text-3xl">
                {step.title}
              </h4>
              <p className="text-xs text-gray-400 font-light">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end max-md:justify-center">
          <img
            src={currentData.imageRight}
            alt="Step Right"
            className="w-64 h-80 object-cover rounded-3xl shadow-2xl rotate-12 transition-all duration-500 max-md:w-48 max-md:h-60"
          />
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;