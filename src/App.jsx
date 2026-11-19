import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import LandingPage from "./pages/guest/LandingPage";
import UserLayout from "./components/layouts/UserLayout";
import DashboardUser from "./pages/user/DashboardUser";
import AiChat from "./pages/user/sections/AiChat";
import YourPlan from "./pages/user/sections/YourPlan";
import AuthLayout from "./components/layouts/AuthLayout";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

// HALAMAN AWAL SAAT DEVELOPMENT
// Isi dengan alamat halaman yang sedang dikerjakan, maka npm run dev langsung membukanya.
//   "/sign-in"    -> halaman Sign In
//   "/sign-up"    -> halaman Sign Up
//   "/dashboard"  -> Dashboard User
//   null          -> normal: alamat "/" menampilkan Landing Page
const START_PAGE = "/dashboard";

function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <Routes>
          {/* Kalau START_PAGE diisi, "/" langsung diarahkan ke sana */}
          {START_PAGE && (
            <Route path="/" element={<Navigate to={START_PAGE} replace />} />
          )}

          {/* Halaman untuk pengunjung (belum login) */}
          <Route element={<GuestLayout />}>
            {/* Landing Page hanya aktif kalau START_PAGE kosong */}
            {!START_PAGE && <Route path="/" element={<LandingPage />} />}
          </Route>

          {/* Halaman sign in / sign up */}
          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
          </Route>

          {/* Halaman untuk user yang sudah login */}
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<DashboardUser />} />
            <Route path="/chats" element={<AiChat />} />
            <Route path="/trip" element={<YourPlan />} />
          </Route>
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;