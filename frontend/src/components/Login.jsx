import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Key } from 'lucide-react';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook
import { useGoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../context/LanguageContext';
// Import your login function
// If using react-router-dom for navigation
// import { Link } from 'react-router-dom'; 

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''); // Default value from design
  const [password, setPassword] = useState(''); // Default value from design
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null); // For handling login errors
  const [loading, setLoading] = useState(false); // For handling loading state
  const { loginUser, loginWithGoogle } = useAuth();
  const { t } = useLanguage();

  // 3. Initialize the Google Hook
  const handleGoogleClick = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Send Google's access token to your backend
        await loginWithGoogle(tokenResponse.access_token);
      } catch (err) {
        setError(t('auth.googleLoginError'));
      }
    },
    onError: () => setError(t('auth.googleLoginCanceled')),
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {

      await loginUser(email, password);

    } catch (err) {
      setError(`Login failed. Please check your credentials.${err.response ? ` (${err.response.data.detail})` : ''} Try again.`);
    } finally {
      setLoading(false);
      console.log("Error state after login attempt:", error); // Debugging line to check error state
    }
  };


  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">

      {/* --- Main Content Area --- */}
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-none sm:shadow-lg sm:border sm:border-slate-100 p-8 space-y-8">

          {/* Logo Header */}
          <div className="flex justify-center items-center gap-2 mb-8">
            <div className="w-8 h-8 relative flex items-center justify-center">
              <img src="/img/logo.png" alt="Topilmalar Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#1E85FF] tracking-tight">Topilmalar</h2>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleGoogleClick()} // 4. Attach the hook here!
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              {t('auth.googleContinue')}
            </button>
          </div>

          <div className="error">{error && <p className="text-red-500 text-sm">{error}</p>}</div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 uppercase">{t('common.or')}</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Email Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-800" />
              </div>
              <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                <label htmlFor="email" className="block text-xs font-medium text-slate-500 mb-0.5">
                  {t('auth.emailLabel')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-800" />
              </div>
              <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 pr-10 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                <label htmlFor="password" className="block text-xs font-medium text-slate-500 mb-0.5">
                  {t('auth.passwordLabel')}
                </label>
                <input
                  id="password"
                  name="password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold tracking-widest"
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                  {t('auth.rememberMe')}
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  {t('auth.forgotPassword')}
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1E85FF] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? t('auth.verifying') : t('auth.loginButton')}
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="text-center text-sm">
            <span className="text-slate-600">{t('auth.noAccount')} </span>
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.registerButton')}
            </a>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LoginPage;