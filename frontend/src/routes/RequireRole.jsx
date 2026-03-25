import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function RequireRole({ role, children }) {
    const { user, ready, isLoggedIn } = useAuth();
    const location = useLocation();

    if (!ready) return null; // hoặc spinner
    if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
    if (role && user?.role !== role) return <Navigate to="/" replace />;

    return children;
}