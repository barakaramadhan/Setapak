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

const START_PAGE = "";

function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-jakarta text-sm text-grey-light/60">Memuat…</div>}>
        <Routes>
          {START_PAGE && (
            <Route path="/" element={<Navigate to={START_PAGE} replace />} />
          )}

          <Route element={<GuestLayout />}>
            {!START_PAGE && <Route path="/" element={<LandingPage />} />}
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

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
