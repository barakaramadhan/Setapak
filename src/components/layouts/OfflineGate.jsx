import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Saat web dibuka tanpa internet, langsung arahkan ke halaman Trip (rencana tersimpan).
export default function OfflineGate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (navigator.onLine === false && !pathname.startsWith("/trip")) {
      navigate("/trip", { replace: true });
    }
    // hanya saat pertama kali web dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
