import React from "react";
import InputAll from "../../components/ui/InputAll";
import FillButton from "../../components/ui/FillButton";
import ImageSignIn from "../../assets/images/imageloginpage.png";

function SignUp() {
  return (
    <div className="flex w-full min-h-screen bg-bright-white">
      <div className="flex-1 flex flex-col justify-between p-5">
        <h1 className="font-clash font-bold text-3xl text-grey-light">
          SETAPAK
        </h1>

        <div className="flex flex-col items-center w-full">
          <h2 className="font-jakarta font-bold text-4xl text-grey-light text-center">
            Create an Account
          </h2>
          <p className="font-jakarta font-normal text-base text-center mt-2">
            Start your journey with us.
          </p>

          <form className="w-[400px] flex flex-col gap-3 mt-5">
            <div>
              <p className="font-jakarta font-normal text-base text-grey-light mb-2">
                Full name
              </p>
              <InputAll
                placeholder="Enter Your Name"
                className="border-grey-label rounded-2xl w-full"
              />
            </div>

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
              <p className="font-jakarta font-normal text-base text-grey-light mb-2">
                Password
              </p>

              <InputAll
                placeholder="Create a password"
                className="border-grey-label rounded-2xl w-full"
              />
            </div>
            <div>
              <p className="font-jakarta font-normal text-base text-grey-light mb-2">
                Confirm Password
              </p>

              <InputAll
                placeholder="Re-enter your password"
                className="border-grey-label rounded-2xl w-full"
              />
            </div>

            <FillButton fillClassName="bg-grey-light text-white" className="mt-8">
              <span className="inline-flex items-center justify-center gap-2 w-full">
                <span>Sign Up</span>
              </span>
            </FillButton>
          </form>

          <h3 className="text-center mt-6 font-jakarta font-normal text-base text-grey-light ">
            Don't have an account yet?{" "}
            <a
              href="/sign-up"
              className="text-arctic-blue font-jakarta font-bold text-base"
            >
              Sign In
            </a>
          </h3>
        </div>

        <p className="text-sm text-grey-light font-jakarta font-normal mt-5">
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

export default SignUp;
