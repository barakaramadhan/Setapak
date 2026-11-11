import { Outlet } from "react-router-dom";

// Kerangka halaman user setelah login (dipakai di App.jsx untuk rute /dashboard)
function UserLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default UserLayout;
