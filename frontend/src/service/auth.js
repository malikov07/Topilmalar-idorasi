import { useAsyncValue } from "react-router-dom";
import api from "./api";


// Login: Saves tokens to LocalStorage
export const login = async (email, password) => {
  const response = await api.post("/auth/login/", { email, password });
  
  if (response.data.access) {
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      const userObj = {
          id: response.data.user_id,
          email: response.data.email,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          is_verified: response.data.is_verified,
          avatar: response.data.avatar // Include avatar if available
      };
      
      // 3. Save User Data
      localStorage.setItem("user", JSON.stringify(userObj));
  }
  return response.data;
};

// register
export const register = async (formData) => {
  const response = await api.post("/auth/register/", formData);
  return response.data;
};

// Google Login: Saves tokens to LocalStorage
export const googleLogin = async (googleToken) => {
    const response = await api.post("/auth/google-login/", { auth_token: googleToken });
    
    if (response.data.tokens) {
        localStorage.setItem("access", response.data.tokens.access);
        localStorage.setItem("refresh", response.data.tokens.refresh);
        localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
};


export const verifyOtp = async (email, otpCode) => {
  // Make sure this URL matches your Django OTP verification endpoint
  const response = await api.post("/auth/verify-otp/", { 
      email: email, 
      otp_code: otpCode 
  });
  
  // Now we save the tokens just like a normal login!
  if (response.data.tokens && response.data.tokens.access) {
      localStorage.setItem("access", response.data.tokens.access);
      localStorage.setItem("refresh", response.data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(response.data.user));
  }
  
  return response.data;
};

// Logout: Clears LocalStorage
export const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    window.location.href = "/login";
};