import { createContext, useState, useEffect, useContext } from "react";
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin, verifyOtp as apiVerifyOtp } from "../service/auth"; // Import functions we wrote earlier
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Check if user is already logged in when app starts
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("access");

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // 2. Login Function
    const loginUser = async (email, password) => {
        try {
            const data = await apiLogin(email, password);
            setUser(data.user); // Update State
            window.location.href = '/'; // Redirect to Dashboard
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Let the UI handle the error message
        }
    };

    const registerUser = async (formData) => {
        try {
            const data = await apiRegister(formData);

            // If Django returned tokens (auto-login), set state and go home
            if (data.tokens) {
                const userObj = {
                    id: data.user.id, // Handle both possible keys
                    email: data.user.email,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    is_verified: data.user.is_verified,
                    avatar: data.user.avatar // Include avatar if available
                };
                setUser(userObj);
                // window.location.href = "/";
            } else {
                // If Django DOESN'T auto-login, send them to the login page
                window.location.href = "/login";
            }


        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    // 3. Don't forget to export it at the bottom!


    // 3. Logout Function
    const logoutUser = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login");
    };

    const loginWithGoogle = async (googleAccessToken) => {
        try {
            // Send the Google token to your Django backend
            const data = await apiGoogleLogin(googleAccessToken);

            if (data && data.tokens && data.tokens.access) {
                const userObj = {
                    id: data.user.id,
                    email: data.user.email,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    is_verified: data.user.is_verified,
                    avatar: data.user.avatar
                };
                setUser(userObj);
                window.location.href = "/";
            }
        } catch (error) {
            console.error("Google Login failed:", error);
            throw error;
        }
    };


    const verifyUserOtp = async (email, otpCode) => {
        try {
            const data = await apiVerifyOtp(email, otpCode);
            
            if (data.tokens && data.tokens.access) {
                setUser(data.user);
                window.location.href = "/"; // Redirect to dashboard!
            }
        } catch (error) {
            console.error("OTP Verification failed:", error);
            throw error;
        }
    };


    return (
        <AuthContext.Provider value={{ user, setUser, loginUser, registerUser, logoutUser, loginWithGoogle, verifyUserOtp, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);