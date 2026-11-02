import React from "react";
import SmoothScroll from "./components/layouts/SmoothScroll";
import Home from "./pages/guest/Home";
import Destinations from "./pages/guest/Destinations";

function App() {
  return (
    <SmoothScroll>
      <Home />
      <Destinations />
    </SmoothScroll>
  );
}
  
export default App;