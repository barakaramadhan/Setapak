import { useNavigate } from "react-router-dom";
import FillButton from "./FillButton";

export default function GoButton({ to, ...props }) {
  const navigate = useNavigate();
  return <FillButton type="button" onClick={() => navigate(to)} {...props} />;
}
