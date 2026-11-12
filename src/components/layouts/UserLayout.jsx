import { Outlet } from "react-router-dom";
import Sidebar from "../shared/Sidebar";

// Kerangka halaman user setelah login (dipakai di App.jsx untuk rute /dashboard)
function UserLayout() {
  return (
    <>
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default UserLayout;
