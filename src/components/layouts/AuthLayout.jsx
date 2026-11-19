import { Outlet } from "react-router-dom";

// Kerangka halaman sign in / sign up
// Isinya hanya latar + menaruh form di tengah layar
function AuthLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default AuthLayout;
