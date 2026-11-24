import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/useAuth";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-jakarta text-grey-light">
        <span className="flex items-center gap-3">
          <i className="fi fi-rr-loading animate-spin text-xl"></i>
          Menyiapkan SETAPAK...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
