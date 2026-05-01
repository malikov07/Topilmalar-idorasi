import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Key, User, Phone, ShieldCheck, Camera } from 'lucide-react'; // Added Camera icon
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import { useGoogleLogin } from '@react-oauth/google';

const RegisterPage = () => {
    const { registerUser, loginWithGoogle, verifyUserOtp } = useAuth();

    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    const [fullName, setFullName] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Avatar States
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState(''); 

    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [step, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleGoogleClick = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                await loginWithGoogle(tokenResponse.access_token);
            } catch (err) {
                setError("Google orqali kirishda xatolik yuz berdi.");
            }
        },
        onError: () => setError("Google tizimiga ulanish bekor qilindi."),
    });

    const formatPhoneDisplay = (value) => {
        if (!value) return value;
        const phone = value.replace(/[^\d]/g, '');
        const cvLength = phone.length;
        if (cvLength < 3) return phone;
        if (cvLength < 6) return `${phone.slice(0, 2)} ${phone.slice(2)}`;
        if (cvLength < 8) return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
        return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)}`;
    };

    const handlePhoneChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
        setPhoneNumber(rawValue);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file)); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Parollar mos kelmadi. Iltimos tekshirib qaytadan kiriting.");
            setLoading(false);
            return;
        }

        if (phoneNumber.length !== 9) {
            setError("Telefon raqam to'liq kiritilmagan.");
            setLoading(false);
            return;
        }

        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // --- THE MAGIC: Switch to FormData for the image ---
        const formData = new FormData();
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('phone_number', phoneNumber);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('password_confirm', confirmPassword);
        
        // Append the file if they selected one
        if (avatar) {
            formData.append('avatar', avatar);
        }

        try {
            // Pass formData instead of a standard JSON object
            await registerUser(formData);

            setStep(2);
            setTimeLeft(60);
        } catch (err) {
            if (err.response && err.response.data) {
                const backendErrors = err.response.data;

                if (backendErrors.email) {
                    setError("Ushbu email allaqachon ro'yxatdan o'tgan.");
                }
                else if (backendErrors.phone_number) {
                    setError("Ushbu telefon raqam bilan foydalanuvchi allaqachon mavjud.");
                }
                else if (backendErrors.password) {
                    setError(backendErrors.password[0]);
                }
                else if (backendErrors.detail) {
                    setError(backendErrors.detail);
                }
                else if (backendErrors.email_send_error) {
                    setError("Tasdiqlash kodini yuborishda xatolik yuz berdi. Iltimos, email manzilingizni tekshiring.");
                }
                else if (backendErrors.error) {
                    setError(backendErrors.error);
                }
                else {
                    setError("Ro'yxatdan o'tishda xatolik yuz berdi. Ma'lumotlarni tekshiring.");
                }
            } else {
                setError("Server bilan ulanishda xatolik yuz berdi.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await verifyUserOtp(email, otp);
            window.location.href = "/"; 
        } catch (err) {
            setError(err.response?.data?.detail || "Noto'g'ri kod kiritildi. Iltimos qaytadan urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
            <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full bg-white rounded-xl shadow-none sm:shadow-lg sm:border sm:border-slate-100 p-8 space-y-6">

                    <div className="flex justify-center items-center gap-2 mb-2">
                        <div className="w-8 h-8 relative flex items-center justify-center">
                            <img src="/img/logo.png" alt="Topilmalar Logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#1E85FF] tracking-tight">Topilmalar</h2>
                    </div>

                    <div className="error">{error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}</div>

                    {step === 1 ? (
                        <>
                            <form className="space-y-4" onSubmit={handleSubmit}>

                                {/* --- NEW: AVATAR UPLOADER --- */}
                                <div className="flex flex-col items-center mb-6 pt-2">
                                    <label className="relative cursor-pointer group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md flex items-center justify-center transition-all group-hover:ring-2 group-hover:ring-blue-500">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-10 h-10 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full shadow-md border-2 border-white">
                                            <Camera className="w-4 h-4" />
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/jpeg, image/png, image/jpg" 
                                            onChange={handleImageChange} 
                                        />
                                    </label>
                                    <span className="text-xs text-slate-500 mt-2 font-medium">Rasm yuklash (Ixtiyoriy)</span>
                                </div>

                                {/* Full Name Input */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-800" />
                                    </div>
                                    <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                        <label className="block text-xs font-medium text-slate-500 mb-0.5">To'liq ism</label>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold"
                                            placeholder="Ism Familiya"
                                        />
                                    </div>
                                </div>

                                {/* Phone Number Input */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-slate-800" />
                                    </div>
                                    <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Telefon raqam</label>
                                        <div className="flex items-center">
                                            <span className="text-slate-900 font-bold mr-1 sm:text-sm tracking-wide">+998</span>
                                            <input
                                                type="text"
                                                required
                                                value={formatPhoneDisplay(phoneNumber)}
                                                onChange={handlePhoneChange}
                                                className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold tracking-wide"
                                                placeholder="90 123 45 67"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-800" />
                                    </div>
                                    <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold"
                                            placeholder="example@gmail.com"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Key className="h-5 w-5 text-slate-800" />
                                    </div>
                                    <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 pr-10 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Parol</label>
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold tracking-widest"
                                            placeholder="••••••••••"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Confirm Password Input */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Key className="h-5 w-5 text-slate-800" />
                                    </div>
                                    <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 pl-12 pr-10 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Parolni tekshirish</label>
                                        <input
                                            required
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm font-bold tracking-widest"
                                            placeholder="••••••••••"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-slate-500">OR</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => handleGoogleClick()}
                                        className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                        Google orqali davom etish
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1E85FF] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Yuklanmoqda..." : "Royxatdan o'tish"}
                                    </button>
                                </div>
                            </form>

                            <div className="text-center text-sm pt-4">
                                <span className="text-slate-600">Hisobingiz mavjudmi ? </span>
                                <a href="/login" className="font-medium text-[#1E85FF] hover:text-blue-700">
                                    Kirish
                                </a>
                            </div>
                        </>
                    ) : (
                        <form className="space-y-6" onSubmit={handleOtpSubmit}>
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Emailni tasdiqlash</h3>
                                <p className="text-sm text-slate-500">
                                    Tasdiqlash kodi <strong>{email}</strong> manziliga yuborildi.
                                </p>
                            </div>

                            <div className="bg-[#F3F4F6] rounded-lg px-4 pt-2 pb-2 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                                <label className="block text-xs font-medium text-slate-500 mb-0.5 text-center">Tasdiqlash kodi</label>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="block w-full bg-transparent border-none p-0 text-slate-900 placeholder-slate-400 focus:ring-0 text-center text-2xl tracking-[0.5em] font-bold"
                                    placeholder="000000"
                                />
                            </div>

                            <div className="text-center">
                                <span className="text-sm text-slate-500 font-medium">Kodni qayta olish - </span>
                                {timeLeft > 0 ? (
                                    <span className="text-sm text-[#1E85FF] font-bold">{formatTime(timeLeft)}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setTimeLeft(60)}
                                        className="text-sm text-[#1E85FF] font-bold hover:underline"
                                    >
                                        Hozir qayta yuborish
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 4}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1E85FF] hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                            </button>

                            <div className="text-center">
                                <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
                                    Orqaga qaytish
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RegisterPage;