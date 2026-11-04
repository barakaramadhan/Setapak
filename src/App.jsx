import React from "react";
import SmoothScroll from "./components/layouts/SmoothScroll";
import Home from "./pages/guest/Home";
import Destinations from "./pages/guest/Destinations";
import Navbar from "./components/shared/Navbar";

function App() {
  return (
    <SmoothScroll>
      <Navbar />
      <Home />
      <Destinations />
    </SmoothScroll>
  );
}
  
export default App;