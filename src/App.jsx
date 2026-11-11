import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import LandingPage from "./pages/guest/LandingPage";
import UserLayout from "./components/layouts/UserLayout";
import DashboardUser from "./pages/user/DashboardUser";

// MODE PENGEMBANGAN HALAMAN USER
// true  -> npm run dev langsung menampilkan Dashboard User (alamat "/" diarahkan ke "/dashboard")
// false -> normal: alamat "/" menampilkan Landing Page
const START_AT_DASHBOARD = true;

function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <Routes>
          {START_AT_DASHBOARD && (
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          )}

          {/* Halaman untuk pengunjung (belum login) */}
          <Route element={<GuestLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Nanti: <Route element={<AuthLayout />}> untuk sign in / sign up */}
          {/* Halaman untuk user yang sudah login */}
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<DashboardUser />} />
          </Route>
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;
