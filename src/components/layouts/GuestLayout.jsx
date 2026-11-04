import { Outlet } from "react-router-dom";
import Navbar from "../shared/Navbar";

function GuestLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default GuestLayout;
