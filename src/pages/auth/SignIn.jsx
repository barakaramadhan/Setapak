import React from "react";
import InputAll from "../../components/ui/InputAll";
import FillButton from "../../components/ui/FillButton";
import ImageSignIn from "../../assets/images/imageloginpage.png";

function SignIn() {
  return (
    <div className="flex w-full min-h-screen bg-bright-white">
      <div className="flex-1 flex flex-col justify-between p-5">
        <h1 className="font-clash font-bold text-3xl text-grey-light">
          SETAPAK
        </h1>

        <div className="flex flex-col items-center w-full">
          <h2 className="font-jakarta font-bold text-4xl text-grey-light text-center">
            Welcome Back!
          </h2>
          <p className="font-jakarta font-normal text-base text-center mt-2">
            Let's get you signed in securely
          </p>

          <form className="w-[400px] flex flex-col gap-5 mt-10">
            <div>
              <p className="font-jakarta font-normal text-base text-grey-light mb-2">
                Email
              </p>
              <InputAll
                placeholder="Enter Your Email Address"
                className="border-grey-label rounded-2xl w-full"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="font-jakarta font-normal text-base text-grey-light">
                  Password
                </p>
                <a href="/forgot-password" className="text-sm text-[#83ADD0] font-jakarta font-normal">
                  Forgot your password?
                </a>
              </div>

              <InputAll
                placeholder="Your Password"
                className="border-grey-label rounded-2xl w-full"
              />
            </div>

            <FillButton
              fillClassName="bg-grey-light text-white"
            >
              <span className="inline-flex items-center justify-center gap-2 w-full">
                <span>Log In</span>
              </span>
            </FillButton>
          </form>

          <h3 className="text-center mt-6 font-jakarta font-normal text-base text-grey-light">
            Don't have an account yet?{" "}
            <a href="/sign-up" className="text-[#83ADD0] font-jakarta font-bold text-base">
              Sign Up
            </a>
          </h3>
        </div>

        <p className="text-sm text-grey-light font-jakarta font-normal">
          © 2026 Setapak. Crafted by The Rijalz.
        </p>
      </div>

      <div className="flex-1">
        <img
          src={ImageSignIn}
          alt="Paris city view"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default SignIn;
