import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import LandingPage from "./pages/guest/LandingPage";
import UserLayout from "./components/layouts/UserLayout";
import DashboardUser from "./pages/user/DashboardUser";
import AiChat from "./pages/user/sections/AiChat";
import YourPlan from "./pages/user/sections/YourPlan";
// 1. Import file dummy detail yang baru (pastikan Anda sudah membuat file ini nanti)
import TripDetail from "./pages/user/sections/TripDetail"; 
import AuthLayout from "./components/layouts/AuthLayout";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

// HALAMAN AWAL SAAT DEVELOPMENT
const START_PAGE = ""; // Saya ubah ke "/trip" agar Anda langsung melihat halaman YourPlan saat npm run dev

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
            
            {/* List kumpulan Card Trip */}
            <Route path="/trip" element={<YourPlan />} /> 
            
            {/* 2. Tambahkan route baru ini untuk halaman detail yang ada map/timeline-nya */}
            <Route path="/trip/:id" element={<TripDetail />} /> 
          </Route>
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;