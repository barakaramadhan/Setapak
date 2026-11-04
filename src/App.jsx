import { BrowserRouter, Routes, Route } from "react-router-dom";
import SmoothScroll from "./components/layouts/SmoothScroll";
import GuestLayout from "./components/layouts/GuestLayout";
import LandingPage from "./pages/guest/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <Routes>
          {/* Halaman untuk pengunjung (belum login) */}
          <Route element={<GuestLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Nanti: <Route element={<AuthLayout />}> untuk sign in / sign up */}
          {/* Nanti: <Route element={<UserLayout />}> untuk halaman user */}
        </Routes>
      </SmoothScroll>
    </BrowserRouter>
  );
}

export default App;
