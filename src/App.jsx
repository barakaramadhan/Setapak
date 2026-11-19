import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import RequireAuth from "./components/layouts/RequireAuth";
import LandingPage from "./pages/guest/LandingPage";
import UserLayout from "./components/layouts/UserLayout";
import DashboardUser from "./pages/user/DashboardUser";
import AiChat from "./pages/user/sections/AiChat";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import TripPage from "./pages/user/TripPage";

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

          {/* Masuk / daftar (Supabase Auth) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Halaman user: hanya bisa diakses setelah login */}
          <Route
            element={
              <RequireAuth>
                <UserLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardUser />} />
            <Route path="/chats" element={<AiChat />} />
            <Route path="/plan" element={<AiChat />} />
            <Route path="/trip" element={<TripPage />} />
            <Route path="/trip/:id" element={<TripPage />} />
          </Route>

          <Route
            path="*"
            element={
              <Navigate to={START_AT_DASHBOARD ? "/dashboard" : "/"} replace />
            }
          />
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;
