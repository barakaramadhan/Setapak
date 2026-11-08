import React, { useState, useRef, useEffect } from "react";
import SectionMarker from "../../components/ui/SectionMarker";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";
import ImageCard from "../../assets/images/imagecard.png";

const categories = ["Beach", "Mountain", "City", "Culture", "Nature"];
const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function FindYourPlace() {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [category, setCategory] = useState("");

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const dateRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRef.current && !dateRef.current.contains(event.target)) {
        setIsDateOpen(false);
      }
    };

    if (isDateOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDateOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const dateText = selectedDate
    ? selectedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "";

  const toggleCategory = () => {
    setIsCategoryOpen(!isCategoryOpen);
    setIsDateOpen(false);
  };

  const toggleDate = () => {
    setIsDateOpen(!isDateOpen);
    setIsCategoryOpen(false);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setIsDateOpen(false);
  };

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

      <div className="w-full max-w-lg shrink-0 bg-white rounded-2xl shadow-xl">
        <img
          src={ImageCard}
          alt=""
          className="w-full h-28 object-cover rounded-t-2xl"
        />

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
                <div onClick={toggleCategory}>
                  <InputAll
                    placeholder="Select Type"
                    value={category}
                    readOnly
                    className="w-full pr-10 cursor-pointer focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
                  />
                  <i
                    className={`fi fi-br-angle-small-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none transition-transform duration-300 ${
                      isCategoryOpen ? "rotate-180" : ""
                    }`}
                  ></i>
                </div>

                <ul
                  className={`absolute left-0 top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 transition-all duration-200 ${
                    isCategoryOpen
                      ? "opacity-100 visible"
                      : "opacity-0 invisible"
                  }`}
                >
                  {categories.map((item) => (
                    <li
                      key={item}
                      onClick={() => {
                        setCategory(item);
                        setIsCategoryOpen(false);
                      }}
                      className="px-4 py-2 font-jakarta text-sm text-grey-light cursor-pointer hover:bg-gray-100"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-1">
              <p className="font-jakarta font-medium text-sm text-grey-light pb-2">
                Date
              </p>
              <div ref={dateRef} className="relative gap-4">
                <div onClick={toggleDate}>
                  <InputAll
                    placeholder="Select date range"
                    value={dateText}
                    readOnly
                    className="w-full pr-10 cursor-pointer focus:border-blue-500 focus:ring-blue-500 placeholder:text-grey-light/50 placeholder:font-jakarta placeholder:font-normal placeholder:text-sm"
                  />
                  <i className="fi fi-br-angle-small-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none"></i>
                </div>

                {isDateOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-20">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setViewDate(new Date(year, month - 1, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                      >
                        <i className="fi fi-br-angle-small-left text-gray-400 text-lg leading-none"></i>
                      </button>
                      <p className="font-jakarta font-medium text-sm text-grey-light">
                        {monthNames[month]} {year}
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewDate(new Date(year, month + 1, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                      >
                        <i className="fi fi-br-angle-small-right text-gray-400 text-lg leading-none"></i>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-center mb-1">
                      {dayNames.map((name) => (
                        <p
                          key={name}
                          className="font-jakarta text-xs text-grey-light/50 py-1"
                        >
                          {name}
                        </p>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 text-center">
                      {days.map((date, index) => {
                        if (!date) return <div key={index}></div>;

                        const isSelected =
                          selectedDate &&
                          date.getTime() === selectedDate.getTime();

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectDate(date)}
                            className={`h-9 font-jakarta text-sm rounded-full transition-colors ${
                              isSelected
                                ? "bg-light-brown-new text-white"
                                : "text-grey-light hover:bg-gray-100"
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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