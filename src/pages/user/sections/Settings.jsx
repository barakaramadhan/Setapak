import React from "react";
import FillButton from "../../../components/ui/FillButton";

const dummyUser = {
  name: "Jhon Doe",
  email: "jhondoe123@gmail.com",
  phone: "089603495244",
  photo:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLuR5PKWFCU9Lm6xnsIznp7vNosgUMbRaxQXtdnuGfEQ&s=10",
};

function Settings() {
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
        <div className="flex-1">
          <div className="flex flex-col gap-6 border-2 border-grey-label w-full rounded-2xl p-6">
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
                  className="px-4 py-1 rounded-lg"
                  fillClassName="bg-grey-light rounded-lg text-white"
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
                  className="px-4 py-1 rounded-lg"
                  fillClassName="bg-grey-light rounded-lg text-white"
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
                  className="px-4 py-1 rounded-lg"
                  fillClassName="bg-grey-light rounded-lg text-white"
                  baseClassName="ring-grey-light ring-1 ring-inset"
                >
                  Edit
                </FillButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;