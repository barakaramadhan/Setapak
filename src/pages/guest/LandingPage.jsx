import Home from "./Home";
import Destinations from "./Destinations";

// Menyusun semua section landing page. Tambah section baru di sini.
function LandingPage() {
  return (
    <>
      <div id="home">
        <Home />
      </div>
      <div id="destinations">
        <Destinations />
      </div>
    </>
  );
}

export default LandingPage;
