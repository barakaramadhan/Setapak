import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import RequireAuth from "./components/layouts/RequireAuth";
import LandingPage from "./pages/guest/LandingPage";
import UserLayout from "./components/layouts/UserLayout";
import DashboardUser from "./pages/user/DashboardUser";
import AiChat from "./pages/user/sections/AiChat";
import YourPlan from "./pages/user/sections/YourPlan";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import TripPage from "./pages/user/TripPage";

// HALAMAN AWAL SAAT DEVELOPMENT
const START_PAGE = "";

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
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Halaman user: hanya bisa diakses setelah login (backend/main logic) */}
          <Route
            element={
              <RequireAuth>
                <UserLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardUser />} />
            <Route path="/chats" element={<AiChat />} />
            <Route path="/plan" element={<Navigate to="/trip" replace />} />
            {/* Trip: baraka UI for listing, main logic/workspace for detail */}
            <Route path="/trip" element={<YourPlan />} />
            <Route path="/trip/:id" element={<TripPage />} />
          </Route>

          <Route path="*" element={<Navigate to={START_PAGE || "/"} replace />} />
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;
