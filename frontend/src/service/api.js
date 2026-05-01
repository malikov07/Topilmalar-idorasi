import axios from "axios";

// 1. Create the instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/", // Adjust to your backend URL
});

// 2. Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    // Read token from storage
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Auto-Refresh Logic
api.interceptors.response.use(
  (response) => response, // If success, just return response
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url.includes('/login/')) {
        return Promise.reject(error);
    }

    // 2. If we don't even have a refresh token, don't try to refresh.
    const refreshToken = localStorage.getItem("refresh");
    if (!refreshToken) {
        return Promise.reject(error);
    }
    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried so we don't loop forever

      try {
        const refreshToken = localStorage.getItem("refresh");
        
        // Call backend to get new access token
        const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/";
        const response = await axios.post(`${baseURL}auth/refresh/`, {
          refresh: refreshToken,
        });

        // Save the new token
        localStorage.setItem("access", response.data.access);

        // Update the header for the failed request
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails (token expired), logout user
        console.error("Session expired:", refreshError);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;