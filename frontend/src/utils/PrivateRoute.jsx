import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = () => {
    const { user } = useAuth();
    
    // If user is logged in, show the page (Outlet).
    // If not, redirect to Login.
    return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;