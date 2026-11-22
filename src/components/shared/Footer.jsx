import React from "react";
import FillButton from "../ui/FillButton";
import ImageFooter from "../../assets/images/footer/imagefooter.webp";

function Footer() {
  return (
    <footer id="footer" className="relative w-full overflow-hidden bg-black font-sans text-grey-light">
      {/* Foto latar (img, paling belakang) */}
      <img
        src={ImageFooter}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />

      {/* Overlay gelap supaya teks tetap terbaca */}
      <div className="absolute inset-0 z-0 bg-black/30" />

      {/* Kurva putih DESKTOP (disembunyikan di mobile) */}
      <svg
        className="absolute bottom-0 left-0 z-0 h-[360px] w-full max-lg:h-[280px] max-sm:hidden"
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

      {/* Kurva putih MOBILE (hanya tampil di mobile) */}
      <svg
        className="hidden max-sm:block absolute bottom-0 left-0 z-0 h-[480px] w-full"
        viewBox="0 0 390 358"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M166.5 53.3065C103.615 21.9189 67.0897 -5.05619 8.5 0.806517C-1.09627 2.30805 -6.16513 4.30453 -14 12.3065V357.807H404V71.3065L326 51C295.539 43.0698 292.343 47.121 257 53.3065C221.657 59.4921 201.844 68.7477 166.5 53.3065Z"
          fill="white"
        />
      </svg>

      {/* 1. CTA: Start Exploring */}
      <section className="relative mb-10 z-10 flex items-center justify-between gap-8 px-20 pt-7 pb-10 text-white max-lg:px-8 max-lg:pt-6 max-sm:flex-col max-sm:gap-4 max-sm:px-5 max-sm:pt-20 max-sm:pb-10">
        <h2 className="text-8xl font-bold leading-none font-clash text-bright-white max-lg:text-6xl max-sm:text-5xl max-sm:-ml-20">
          Start
          <br />
          Exploring.
        </h2>

        {/* Blok kanan: pakai relative + top, bukan mt */}
        <div className="relative top-20 flex max-w-[406px] flex-col items-end gap-6 text-right max-lg:top-14 max-lg:max-w-[260px] max-lg:gap-4 max-sm:top-0 max-sm:max-w-[406px] max-sm:items-start max-sm:text-left">
          {/* Ikon pin + tangan (disembunyikan di mobile) */}
          <svg
            width="383"
            height="344"
            viewBox="0 0 383 344"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-auto w-[400px] max-lg:w-[260px] object-contain max-sm:hidden"
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

          <p className="text-lg font-jakarta font-normal leading-relaxed text-bright-white -mt-14 max-lg:-mt-10 max-lg:text-base max-sm:mt-0 max-sm:text-sm">
            Discover new places, explore local experiences, and create
            meaningful journeys filled with unforgettable moments with Setapak.
          </p>

          <FillButton
            className="ring-bright-white text-bright-white max-sm:px-4 max-sm:py-3"
            fillClassName="bg-bright-white text-dark-brown-new"
          >
            Start Planning
          </FillButton>
        </div>
      </section>

      {/* 2. Brand + Social (di atas area putih) */}
      <section className="relative z-10 flex items-start justify-between gap-10 px-12 pt-14 pb-14 max-lg:px-8 max-lg:pt-10 max-lg:pb-10 max-sm:flex-col max-sm:gap-8 max-sm:px-5 max-sm:pt-24 max-sm:pb-0">
        {/* Brand */}
        <div className="flex max-w-xs flex-col gap-3 max-sm:gap-2">
          <h2 className="text-4xl font-bold font-clash text-grey-light uppercase max-lg:text-3xl max-sm:text-black max-sm:text-3xl">
            SETAPAK
          </h2>

          <p className="text-base font-jakarta font-normal leading-relaxed text-grey-light max-lg:text-sm max-sm:text-sm max-sm:leading-snug max-sm:text-black">
            Discover new places, explore local experiences, and create
            meaningful journeys filled with unforgettable moments with Setapak.
          </p>
        </div>

        {/* Social: pakai relative + top, bukan mt */}
        <nav className="relative top-32 flex flex-col items-end gap-3 max-lg:top-20 max-sm:top-0 max-sm:items-start">
          <h3 className="text-3xl font-bold font-clash text-grey-light max-lg:text-2xl max-sm:text-xl max-sm:text-black">
            Social
          </h3>

          <div className="flex flex-col items-end gap-2 text-xs font-medium text-grey-light max-sm:items-start max-sm:-mt-4 max-sm:gap-0">
            {/* Baris 1 */}
            <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 max-lg:gap-x-3 max-sm:justify-start max-sm:gap-x-2 ">
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-youtube text-2xl pt-2 max-lg:text-xl max-sm:text-xl" />
                  Setapak.
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-instagram text-2xl pt-1 max-lg:text-xl max-sm:text-xl" />
                  SetapakGo
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 hover:opacity-75 font-jakarta font-normal text-base text-grey-light max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-facebook text-2xl pt-1 max-lg:text-xl max-sm:text-xl" />
                  Setapak
                </a>
              </li>
            </ul>

            {/* Baris 2 */}
            <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 max-lg:gap-x-3 max-sm:justify-start max-sm:gap-x-3">
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 font-jakarta font-normal text-base text-grey-light hover:opacity-75 max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-github text-2xl pt-1 max-lg:text-xl max-sm:text-xl" />
                  fawwazRN
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 font-jakarta font-normal text-base text-grey-light hover:opacity-75 max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-github text-2xl pt-1 max-lg:text-xl max-sm:text-xl" />
                  barakaramadhan
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 font-jakarta font-normal text-base text-grey-light hover:opacity-75 max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-brands-github text-2xl pt-1 max-lg:text-xl max-sm:text-xl" />
                  Izzamnuddin
                </a>
              </li>
            </ul>

            {/* Baris 3 */}
            <ul className="flex items-center justify-end max-sm:justify-start">
              <li>
                <a
                  href="mailto:setapakinfo@gmail.com"
                  className="flex items-center gap-2 font-jakarta font-semibold text-base text-grey-light hover:opacity-75 max-lg:text-sm max-sm:text-sm max-sm:text-black"
                >
                  <i className="fi fi-sr-envelope text-xl pt-1 max-lg:text-lg max-sm:text-lg" />
                  setapakinfo@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </section>

      {/* 3. Copyright */}
      <div className="relative z-10 px-10 pt-10 pb-6 max-lg:px-8 max-lg:pt-6 max-sm:px-5 max-sm:pt-6">
        <small className="block text-base font-jakarta font-bold text-grey-light max-lg:text-sm max-sm:text-sm max-sm:font-normal max-sm:text-black">
          © 2026 Setapak. Crafted by The Rijalz.
        </small>
      </div>
    </footer>
  );
}

export default Footer;