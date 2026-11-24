import { useNavigate } from "react-router-dom";
import FillButton from "./FillButton";

// FillButton yang pindah halaman saat diklik (CTA di landing page).
export default function GoButton({ to, ...props }) {
  const navigate = useNavigate();
  return <FillButton type="button" onClick={() => navigate(to)} {...props} />;
}
