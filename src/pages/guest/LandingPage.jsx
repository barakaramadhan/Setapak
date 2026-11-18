import Home from "./sections/Home";
import About from "./sections/About";
import OrdinaryTravel from "./sections/OrdinaryTravel";
import FindYourPlace from "./sections/FindYourPlace";
import Recomendations from "./sections/Recomendations";
import HowItWorks from "./sections/HowItWorks";

// Menyusun semua section landing page. Tambah section baru di sini.
function LandingPage() {
  return (
    <>
      <div id="home">
        <Home />
      </div>
      <div id="about">
        < About />
      </div>
      <div id="ordinary-travel">
        < OrdinaryTravel />
      </div>
      <div id="find-your-place">
        < FindYourPlace />
      </div>
      <div id="recomendations" className="sticky top-0 z-0">
        < Recomendations />
      </div>
      <div id="how-it-works" className="relative z-10">
        < HowItWorks />
      </div>
      
    </>
  );
}

export default LandingPage;