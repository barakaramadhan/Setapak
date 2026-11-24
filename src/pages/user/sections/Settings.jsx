import React, { useState } from "react";
import FillButton from "../../../components/ui/FillButton";
import InputAll from "../../../components/ui/InputAll";
import ImageLightMode from "../../../assets/images/lightmode.png";
import ImageDarkMode from "../../../assets/images/darkmode.png";
import ImageSystem from "../../../assets/images/system.png";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";

const dummyUser = {
  name: "Jhon Doe",
  email: "jhondoe123@gmail.com",
  phone: "089603495244",
  photo:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLuR5PKWFCU9Lm6xnsIznp7vNosgUMbRaxQXtdnuGfEQ&s=10",
};

function Settings() {
const [locationAccess, setLocationAccess] = useState(true);
  return (
    <section className="px-20 py-10">
      <div>
        <h1 className="font-jakarta font-bold text-4xl text-grey-light">
          Settings
        </h1>
        <p className="font-jakarta font-normal text-base text-grey-light">
          Manage your profile and travel preferences.
        </p>
      </div>
      <div className="flex gap-24 mt-11">
        <ul className="flex shrink-0 flex-col gap-6">
          <li>
            <a
              href="#"
              className="font-jakarta font-normal text-base text-grey-light"
            >
              profile
            </a>
          </li>
          <li>
            <a
              href="#"
              className="font-jakarta font-normal text-base text-grey-light"
            >
              Appearance
            </a>
          </li>
          <li>
            <a
              href="#"
              className="font-jakarta font-normal text-base text-grey-light"
            >
              Location
            </a>
          </li>
        </ul>

        {/* setting profile */}
        <div className="flex-1">
          <div className="flex flex-col gap-6 border-2 border-grey-label w-full rounded-2xl p-6 bg-white">
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">
              Profile
            </h2>

            <div className="flex items-center gap-3.5">
              <img
                src={dummyUser.photo}
                className="h-20 w-20 rounded-full object-cover"
              />
              <FillButton
                baseClassName="bg-grey-light text-white"
                fillClassName="bg-transparent text-white"
                className="px-3 py-2 text-sm rounded-lg"
              >
                Change Photo
              </FillButton>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-jakarta font-bold text-base text-grey-light">
                Username
              </p>
              <div className="flex flex-row gap-4 items-center">
                <p className="font-jakarta font-semibold text-grey-light text-base">
                  {dummyUser.name}
                </p>
                <FillButton
                  className="px-4 py-1 rounded-lg font-semibold"
                  fillClassName="bg-grey-light rounded-lg text-white font-semibold"
                  baseClassName="ring-grey-light ring-1 ring-inset"
                >
                  Edit
                </FillButton>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-jakarta font-bold text-base text-grey-light">
                Email
              </p>
              <div className="flex flex-row gap-4 items-center">
                <p className="font-jakarta font-semibold text-grey-light text-base">
                  {dummyUser.email}
                </p>
                <p className="font-jakarta font-semibold text-arctic-blue text-base">
                  Reveal
                </p>
                <FillButton
                  className="px-4 py-1 rounded-lg font-semibold"
                  fillClassName="bg-grey-light rounded-lg text-white font-semibold"
                  baseClassName="ring-grey-light ring-1 ring-inset"
                >
                  Edit
                </FillButton>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-jakarta font-bold text-base text-grey-light">
                Password
              </p>
              <div className="flex flex-row gap-4 items-center">
                <p className="font-jakarta font-semibold text-grey-light text-base">
                  {dummyUser.phone}
                </p>
                <p className="font-jakarta font-semibold text-arctic-blue text-base">
                  Reveal
                </p>
                <FillButton
                  className="px-4 py-1 rounded-lg font-semibold"
                  fillClassName="bg-grey-light rounded-lg text-white font-semibold"
                  baseClassName="ring-grey-light ring-1 ring-inset"
                >
                  Edit
                </FillButton>
              </div>
            </div>
          </div>

          {/* setting ke 2 */}
          <div className="flex flex-col border-2 border-grey-label w-full rounded-2xl p-6 mt-8 bg-white">
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">
              Appearance
            </h2>

            <div className="mt-6">
              <h3 className="font-jakarta font-bold text-base text-grey-light">
                Theme
              </h3>
              <p className="font-jakarta font-normal text-base text-grey-light">
                Choose how Setapak looks on this device.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-3 max-sm:grid-cols-1">
              {/* mode light */}
              <div className="flex flex-col gap-3 rounded-xl border-2 border-grey-label p-3 cursor-pointer">
                <img
                  src={ImageLightMode}
                  alt="Light Mode"
                  className="h-24 w-full rounded-lg object-cover"
                />
                <p className="font-jakarta font-medium text-sm text-grey-light">
                  Light
                </p>
              </div>

              {/* mode dark */}
              <div className="flex flex-col gap-3 rounded-xl border-2 border-grey-label p-3 cursor-pointer ">
                <img
                  src={ImageDarkMode}
                  alt="Dark Mode"
                  className="h-24 w-full rounded-lg object-cover"
                />
                <p className="font-jakarta font-medium text-sm text-grey-light">
                  Dark
                </p>
              </div>

              {/* system */}
              <div className="flex flex-col gap-3 rounded-xl border-2 border-grey-label p-3 cursor-pointer">
                <img
                  src={ImageSystem}
                  alt="System Mode"
                  className="h-24 w-full rounded-lg object-cover"
                />
                <p className="font-jakarta font-medium text-sm text-grey-light">
                  System
                </p>
              </div>
            </div>
          </div>

          {/* settings 3 */}
          <div className="flex flex-col border-2 border-grey-label w-full rounded-2xl p-6 bg-white mt-8">
            <h2 className="font-jakarta font-bold text-2xl text-grey-light">
              Location
            </h2>
            {/* bagian home location */}
            <div className="flex justify-between items-center mt-6">
              <div>
                <h2 className="font-jakarta font-bold text-base text-grey-light">
                  Home city
                </h2>
                <p className="font-jakarta font-normal text-sm text-grey-light">
                  Used for “For you” on Home and as the default in Explore.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <InputAll
                  type="text"
                  placeholder="Bogor"
                  className="w-36 rounded-xl border-2 border-grey-light px-4 py-2 text-base text-grey-light placeholder:text-grey-light"
                />
                <FillButton
                  className="px-4 py-1 rounded-lg font-semibold"
                  fillClassName="bg-grey-light rounded-lg text-white font-semibold"
                  baseClassName="ring-grey-light ring-1 ring-inset"
                >
                  Edit
                </FillButton>
              </div>
            </div>
            {/* bagian Location access */}
            <div className="flex justify-between items-center mt-6">
              <div>
                <h2 className="font-jakarta font-bold text-base text-grey-light">
                  Location access
                </h2>
                <p className="font-jakarta font-normal text-sm text-grey-light">
                  Lets “Near me” in Explore show places close to you.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={locationAccess}
                  onChange={setLocationAccess}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
