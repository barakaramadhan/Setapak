import { Outlet } from "react-router-dom";

// Kerangka halaman sign in / sign up (belum dipakai di App.jsx)
function AuthLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default AuthLayout;
