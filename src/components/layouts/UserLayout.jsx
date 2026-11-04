import { Outlet } from "react-router-dom";

// Kerangka halaman user setelah login (belum dipakai di App.jsx)
function UserLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default UserLayout;
