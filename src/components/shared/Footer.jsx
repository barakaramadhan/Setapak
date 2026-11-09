import React from "react";
import FillButton from "../ui/FillButton";
// import ImageFooter from "../../assets/images/imagefooter.png";
import ImageFooter from "../../assets/images/imagebackup.png";

function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-black font-sans text-gray-900">
      {/* Foto latar (img, paling belakang) */}
      <img
        src={ImageFooter}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />

      {/* Overlay gelap supaya teks tetap terbaca */}
      <div className="absolute inset-0 z-0 bg-black/30" />

      {/* Kurva putih (background, di belakang konten) */}
      <svg
        className="absolute bottom-0 left-0 z-0 h-[360px] w-full max-md:h-[340px] max-sm:h-[300px]"
        viewBox="0 0 1272 500"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-8 15.7433C93.5339 -11.6046 151.26 2.21836 250 15.7433C432.108 40.6876 497.94 120.478 649 190.606C765.861 227.599 842.801 227.471 1005.5 180.647C1099.36 155.303 1159.87 179.455 1272 243.034V500H-8V15.7433Z"
          fill="#FAFAFA"
        />
      </svg>

      {/* 1. CTA: Start Exploring */}
      <section className="relative mb-10 z-10 flex items-center justify-between gap-8 px-20 pt-7 pb-10 text-white max-md:flex-col max-md:px-8 max-md:pt-16 max-sm:px-5 max-sm:pt-12">
        <h2 className="text-8xl font-bold leading-none font-clash text-bright-white max-md:text-6xl max-sm:text-5xl">
          Start
          <br />
          Exploring.
        </h2>

        {/* Blok kanan: pakai relative + top, bukan mt */}
        <div className="relative top-20 flex max-w-[406px] flex-col items-end gap-6 text-right max-md:top-0 max-md:items-start max-md:gap-4 max-md:text-left">
          {/* Ikon pin + tangan */}
          <svg
            width="383"
            height="344"
            viewBox="0 0 383 344"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-auto w-[400px] object-contain max-sm:w-32"
          >
            <path
              d="M239.493 180.378L266.001 123.83C271.303 112.521 284.669 118.786 279.367 130.096L262.498 166.081C266.354 157.856 278.691 163.639 274.354 172.892C277.727 165.695 290.065 171.479 285.245 181.76C287.655 176.62 298.483 182.95 293.663 193.231L284.024 213.794C276.071 230.758 261.211 235.705 249.002 234.998L241.772 250.42"
              strokeWidth="3.97425"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="white"
            />
            <path
              d="M239.493 180.378C233.55 166.305 216.328 168.265 215.685 183.012C215.396 191.655 221.147 198.113 223.878 205.664C225.034 211.222 221.66 218.419 212.985 236.925"
              strokeWidth="3.97425"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="white"
            />
            <path
              d="M274.354 172.893L264.233 194.483"
              strokeWidth="3.97425"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="white"
            />
            <path
              d="M285.246 181.761L276.088 201.295"
              strokeWidth="3.97425"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="white"
            />
            <path
              opacity="0.6"
              d="M265.422 141.116L259.157 154.482"
              strokeWidth="2.83875"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="white"
            />

            <g clipPath="url(#clip0_3133_152)">
              <path
                d="M188.291 212.479C188.291 212.479 131.363 167.54 121.379 129.922C118.127 117.67 119.438 104.744 125.022 93.9876C130.607 83.2315 140.008 75.5263 151.158 72.5672C162.307 69.608 174.292 71.6373 184.476 78.2086C194.659 84.7798 202.207 95.3548 205.459 107.607C215.442 145.225 188.291 212.479 188.291 212.479Z"
                strokeWidth="8.87655"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="white"
              />
              <path
                d="M180.234 114.302C182.943 124.507 177.61 134.779 168.323 137.244C159.036 139.708 149.311 133.433 146.603 123.228C143.894 113.022 149.227 102.75 158.514 100.286C167.801 97.8207 177.526 104.096 180.234 114.302Z"
                strokeWidth="8.87655"
                stroke="white"
              />
            </g>

            <g clipPath="url(#clip1_3133_152)">
              <path
                d="M174.621 253.157L102.464 159.739"
                strokeWidth="4.47643"
                strokeLinecap="round"
                stroke="white"
              />
              <path
                d="M59.3624 203.684C82.8994 196.158 82.9425 167.714 104.182 161.963L122.049 185.095C102.421 188.182 102.957 212.626 80.3394 219.442L59.3624 203.684Z"
                fill="white"
                strokeWidth="4.47643"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="white"
              />
            </g>

            <defs>
              <clipPath id="clip0_3133_152">
                <rect
                  width="124.272"
                  height="177.531"
                  fill="white"
                  transform="translate(86.1963 70.0273) rotate(-14.8638)"
                />
              </clipPath>

              <clipPath id="clip1_3133_152">
                <rect
                  width="104.527"
                  height="146.145"
                  fill="white"
                  transform="matrix(-0.791405 0.611292 0.611292 0.791405 114.555 132.644)"
                />
              </clipPath>
            </defs>
          </svg>

          <p className="text-lg font-jakarta font-normal leading-relaxed text-bright-white -mt-14">
            Discover new places, explore local experiences, and create
            meaningful journeys filled with unforgettable moments with Setapak.
          </p>

          <FillButton
            className="ring-bright-white text-bright-white"
            fillClassName="bg-bright-white text-dark-brown-new"
          >
            Start Planning
          </FillButton>
        </div>
      </section>

      {/* 2. Brand + Social (di atas area putih) */}
      <section className="relative z-10 flex items-start justify-between gap-10 px-12 pt-14 pb-14 max-md:flex-col max-md:px-8 max-md:pt-24 max-sm:px-5 max-sm:pt-20">
        {/* Brand */}
        <div className="flex max-w-xs flex-col gap-3">
          <h2 className="text-4xl font-bold font-clash text-grey-light uppercase">
            SETAPAK
          </h2>

          <p className="text-base font-jakarta font-normal leading-relaxed text-grey-light">
            Discover new places, explore local experiences, and create
            meaningful journeys filled with unforgettable moments with Setapak.
          </p>
        </div>

        {/* Social: pakai relative + top, bukan mt */}
        <nav className="relative top-32 flex flex-col items-end gap-3 max-md:top-0 max-md:items-start">
          <h3 className="text-3xl font-bold font-clash text-grey-light">
            Social
          </h3>

          <div className="flex flex-col items-end gap-2 text-xs font-medium text-gray-900 max-md:items-start">
            {/* Baris 1 */}
            <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 max-md:justify-start">
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light"
                >
                  <i className="fi fi-brands-youtube text-2xl" />
                  Setapak.
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light"
                >
                  <i className="fi fi-brands-instagram text-2xl" />
                  SetapakGo
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light"
                >
                  <i className="fi fi-brands-facebook text-2xl" />
                  Setapak
                </a>
              </li>
            </ul>

            {/* Baris 2 */}
            <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 max-md:justify-start">
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75"
                >
                  <i className="fab fa-github text-2xl" />
                  fawwazRN
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75"
                >
                  <i className="fab fa-github text-2xl" />
                  barakaramadhan
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75"
                >
                  <i className="fab fa-github text-2xl" />
                  Izzamnuddin
                </a>
              </li>
            </ul>

            {/* Baris 3 */}
            <ul className="flex items-center justify-end max-md:justify-start">
              <li>
                <a
                  href="mailto:setapakinfo@gmail.com"
                  className="flex items-center gap-2 hover:opacity-75"
                >
                  <i className="fas fa-envelope text-2xl" />
                  setapakinfo@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </section>

      {/* 3. Copyright */}
      <div className="relative z-10 px-10 pt-10 pb-6 max-md:px-8 max-sm:px-5">
        <small className="block text-xs font-semibold text-gray-800">
          © 2026 Setapak. Crafted by The Rijalz.
        </small>
      </div>
    </footer>
  );
}

export default Footer;