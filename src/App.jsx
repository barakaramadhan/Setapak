import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import RequireAuth from "./components/layouts/RequireAuth";
const LandingPage = lazy(() => import("./pages/guest/LandingPage"));
import UserLayout from "./components/layouts/UserLayout";
const DashboardUser = lazy(() => import("./pages/user/DashboardUser"));
const AiChat = lazy(() => import("./pages/user/sections/AiChat"));
const YourPlan = lazy(() => import("./pages/user/sections/YourPlan"));
const SignIn = lazy(() => import("./pages/auth/SignIn"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const TripPage = lazy(() => import("./pages/user/TripPage"));

// HALAMAN AWAL SAAT DEVELOPMENT
const START_PAGE = "";

function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-jakarta text-sm text-grey-light/60">Memuat…</div>}>
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
        </Suspense>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;
