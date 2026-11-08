import Home from "./Home";
import Destinations from "./Destinations";
import TripPlanning from "./TripPlanning";
import About from "./About";
import OrdinaryTravel from "./OrdinaryTravel";
import FindYourPlace from "./FindYourPlace";
import Recomendations from "./Recomendations";
import HowItWorks from "./HowItWorks";

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
      <div id="recomendations">
        < Recomendations />
      </div>
      <div id="how-it-works">
        < HowItWorks />
      </div>
      {/* <div id="destinations">
        <Destinations />
      </div> */}
      {/* <div id="trip-planning">
        <TripPlanning />
      </div> */}
      
    </>
  );
}

export default LandingPage;
