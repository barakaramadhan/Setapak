import { useEffect, useRef } from "react";
import { initHomeAnimation } from "./animation/HomeAnimation";
import ImageHero from "./../../assets/images/imagehero.png";
import ImageSecond from "./../../assets/images/imagehero2.png";

function Home() {
  const animasiRef = useRef(null);

  useEffect(() => {
    const cleanup = initHomeAnimation(animasiRef.current);

    return cleanup;
  }, []);

  return (
    <>
      <section className="relative grid w-full overflow-hidden">
        {/* gambar utama */}
        <img
          src={ImageHero}
          alt="Hero"
          className="block w-full h-full [grid-area:1/1] object-cover object-center"
        />

        {/* SVG garis */}
        <div
          ref={animasiRef}
          id="animasi-container"
          className="absolute top-72 right-0 w-[1500px] z-[5]"
        >
          <svg
            className="garis-svg w-full h-auto overflow-visible"
            width="1204"
            height="297"
            viewBox="0 0 1204 297"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="garis"
              d="M-10.25 31.05L9.75146 27.8228C62.6515 19.2228 156.351 8.72294 236.251 27.8229C285.251 39.4229 527.151 238.2 575.251 257.2C642.551 283.8 767.951 268.2 835.852 245C863.637 235.498 898.324 225.123 931.967 211.013"
              strokeWidth="19.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="#FDFDFD"
            />

            <path
              className="garis"
              d="M931.967 211.013C977.996 191.709 1022.07 165.414 1043.85 124.8C1080.45 56.6997 1008.75 -17.0003 939.751 19.4997C886.651 47.5997 892.451 113.3 905.852 150.8C913.684 172.604 922.088 192.989 931.967 211.013Z"
              strokeWidth="19.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="#FDFDFD"
            />

            <path
              className="garis"
              d="M931.967 211.013C957.655 257.88 993.317 288.789 1054.85 287.2C1268.75 281.7 1404.25 144.7 1548.05 34.7997"
              strokeWidth="19.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="#FDFDFD"
            />

            <g className="ikon" id="ikon-1">
              <g className="melayang">
                <rect
                  x="1022.75"
                  y="35.323"
                  width="51"
                  height="51"
                  rx="25.5"
                  fill="#FDFDFD"
                />
                <rect
                  x="1022.75"
                  y="35.323"
                  width="51"
                  height="51"
                  rx="25.5"
                  stroke="#B9B1A3"
                />

                <g clipPath="url(#clip0_2790_4)">
                  <path
                    d="M1044.21 48.5698C1041.72 49.4676 1039.69 51.3161 1038.56 53.7097C1037.43 56.1033 1037.3 58.8466 1038.19 61.3377C1039.06 63.7562 1042.29 66.868 1047.8 70.5862C1048.46 71.0305 1049.21 71.3136 1049.99 71.4125C1050.78 71.5113 1051.58 71.4231 1052.33 71.155C1053.07 70.8869 1053.74 70.4466 1054.29 69.8697C1054.83 69.2929 1055.23 68.5958 1055.45 67.8354C1057.33 61.4618 1057.84 57.0037 1056.98 54.5852C1056.08 52.0962 1054.23 50.0651 1051.83 48.9374C1049.44 47.8096 1046.7 47.6775 1044.21 48.5698ZM1048.93 61.705C1048.18 61.9726 1047.38 62.0134 1046.61 61.8223C1045.84 61.6312 1045.15 61.2167 1044.62 60.6313C1044.08 60.0459 1043.74 59.3159 1043.62 58.5335C1043.5 57.7511 1043.62 56.9515 1043.96 56.2358C1044.29 55.5202 1044.84 54.9206 1045.51 54.5129C1046.19 54.1052 1046.98 53.9076 1047.77 53.9453C1048.56 53.983 1049.32 54.2541 1049.95 54.7245C1050.59 55.1948 1051.07 55.8432 1051.34 56.5877C1051.7 57.586 1051.65 58.686 1051.19 59.6457C1050.74 60.6054 1049.93 61.3461 1048.93 61.705Z"
                    fill="#DCA878"
                  />
                </g>
              </g>
            </g>

            <g className="ikon" id="ikon-2">
              <g className="melayang">
                <rect
                  x="758.751"
                  y="232.323"
                  width="51"
                  height="51"
                  rx="25.5"
                  fill="#FDFDFD"
                />
                <rect
                  x="758.751"
                  y="232.323"
                  width="51"
                  height="51"
                  rx="25.5"
                  stroke="#B9B1A3"
                />

                <g clipPath="url(#clip1_2790_4)">
                  <path
                    d="M776.873 249.025C776.501 247.695 777.276 246.315 778.606 245.943C779.936 245.57 781.315 246.346 781.688 247.675C782.06 249.005 781.285 250.385 779.955 250.757C778.625 251.13 777.246 250.354 776.873 249.025ZM785.074 255.159L783.006 252.811C782.288 252.085 781.297 251.726 780.301 251.787C779.93 251.756 779.512 251.934 779.152 252.021C778.43 252.223 777.75 252.538 777.128 252.959L774.347 254.841C773.7 255.28 773.29 256.008 773.252 256.79L773.123 259.449C773.083 260.277 773.721 260.98 774.549 261.02C775.377 261.062 776.081 260.422 776.12 259.594L776.237 257.184L777.636 256.237L777.78 259.554C777.838 260.885 778.63 262.051 779.846 262.595L783.171 264.086L784.196 267.742C784.42 268.54 785.247 269.005 786.045 268.782C786.843 268.558 787.308 267.731 787.085 266.932L785.997 263.05C785.796 262.334 785.291 261.748 784.612 261.444L782.672 260.575L782.508 256.784L782.99 257.332C783.101 257.459 783.234 257.566 783.382 257.649L785.231 258.689C785.954 259.095 786.867 258.839 787.274 258.116C787.68 257.395 787.423 256.479 786.701 256.074L785.074 255.159ZM780.013 264.299C779.188 264.303 778.514 264.975 778.516 265.803L778.523 268.916C778.525 269.745 779.199 270.415 780.027 270.413C780.835 270.417 781.529 269.744 781.524 268.909L781.516 265.796C781.515 264.968 780.841 264.298 780.013 264.299ZM794.814 253.113L791.499 251.438C790.818 251.093 790.051 251.724 790.258 252.459L790.55 253.501L789.142 253.896C788.345 254.119 787.879 254.947 788.102 255.745C788.326 256.543 789.154 257.008 789.951 256.784L791.359 256.39L791.674 257.515C791.878 258.242 792.849 258.381 793.248 257.739L795.222 254.567C795.545 254.058 795.355 253.38 794.814 253.113Z"
                    fill="black"
                  />
                </g>
              </g>
            </g>

            <defs>
              <clipPath id="clip0_2790_4">
                <rect
                  width="24"
                  height="24"
                  fill="white"
                  transform="translate(1032.9 52.5896) rotate(-19.7714)"
                />
              </clipPath>

              <clipPath id="clip1_2790_4">
                <rect
                  width="24"
                  height="24"
                  fill="white"
                  transform="translate(769.458 248.506) rotate(-15.6554)"
                />
              </clipPath>
            </defs>
          </svg>
        </div>

        {/* gambar kedua (menimpa gambar pertama, kotak dan crop sama persis) */}
        <img
          src={ImageSecond}
          alt="Second Image"
          className="block w-full h-full [grid-area:1/1] object-cover object-center z-10"
        />

        <div>
          <div className="absolute top-48 right-[430px] z-10 leading-none">
            <h1 className="font-jakarta text-5xl font-medium text-white">
              Plan Your Next <br />
              Trip Across <br />
              <span className="font-clash text-5xl font-semibold leading-0">
                Multiple <br /> Destinations.
              </span>
            </h1>
            <p className="pt-3 font-jakarta text-white font-medium text-base w-2xs">
              Discover New Places and Create Your Perfect Journey.
            </p>

            {/* ini masih dummy nnti kan pake component */}
            <button className="pt-3">Get Started</button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
