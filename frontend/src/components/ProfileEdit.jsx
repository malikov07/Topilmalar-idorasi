import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../service/api';
import { Camera, Save, ArrowLeft, Lock } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function ProfileEdit() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    const [passwords, setPasswords] = useState({ new_password: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone_number: user.phone_number || '',
            });
            setAvatarPreview(user.avatar ? (user.avatar.startsWith('http') ? user.avatar : BACKEND_URL + user.avatar) : null);
            setCoverPreview(user.cover_image ? (user.cover_image.startsWith('http') ? user.cover_image : BACKEND_URL + user.cover_image) : null);
            
            // Fetch latest profile to get has_usable_password
            api.get('/auth/profile/')
                .then(res => {
                    const updatedUser = { ...user, ...res.data };
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    if (setUser) setUser(updatedUser);
                })
                .catch(err => console.error("Failed to fetch profile:", err));
        }
    }, [user?.id]);

    if (!user) return null;

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const options = {
            maxSizeMB: 1, // Compress to ~1MB
            maxWidthOrHeight: 1280, // Resize up to 1280px
            useWebWorker: true
        };
        
        try {
            const compressedFile = await imageCompression(file, options);
            const finalFile = new File([compressedFile], file.name || `photo_${Date.now()}.jpg`, { type: compressedFile.type });

            if (type === 'avatar') {
                setAvatarFile(finalFile);
                setAvatarPreview(URL.createObjectURL(finalFile));
            } else {
                setCoverFile(finalFile);
                setCoverPreview(URL.createObjectURL(finalFile));
            }
        } catch (error) {
            console.error("Rasmni qayta ishlashda xatolik:", error);
            setMessage("Rasmni yuklashda xatolik yuz berdi.");
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean phone number before sending
            let cleanedPhone = formData.phone_number ? formData.phone_number.replace(/\s+/g, '') : '';
            if (cleanedPhone && !cleanedPhone.startsWith('+') && cleanedPhone.length === 12) {
                cleanedPhone = '+' + cleanedPhone;
            } else if (cleanedPhone && cleanedPhone.length === 9) {
                cleanedPhone = '+998' + cleanedPhone;
            }

            const data = new FormData();
            data.append('first_name', formData.first_name);
            data.append('last_name', formData.last_name);

            if (cleanedPhone && cleanedPhone.trim() !== '') {
                data.append('phone_number', cleanedPhone);
            }
            if (avatarFile) data.append('avatar', avatarFile);
            if (coverFile) data.append('cover_image', coverFile);

            const res = await api.patch('/auth/profile/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update auth context
            const updatedUser = { ...user, ...res.data };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            if (setUser) setUser(updatedUser);
            
            setMessage("Profil muvaffaqiyatli saqlandi!");
            setTimeout(() => window.location.href = '/profile', 1500);
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.phone_number?.[0] || "Xatolik yuz berdi!";
            setMessage(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async () => {
        setLoading(true);
        try {
            await api.post('/auth/send-otp/', { email: user.email });
            setOtpSent(true);
            setMessage("E-pochtangizga tasdiqlash kodi yuborildi.");
        } catch (error) {
            setMessage("Kodni yuborishda xatolik.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        try {
            await api.post('/auth/verify-otp/', { email: user.email, otp_code: otpCode });
            setOtpVerified(true);
            setMessage("Kod muvaffaqiyatli tasdiqlandi. Endi parolni kiritishingiz mumkin.");
        } catch (error) {
            setMessage("Tasdiqlash kodi noto'g'ri yoki muddati o'tgan.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwords.new_password) return;
        if (!otpVerified) {
            setMessage("Avval elektron pochtangizni tasdiqlang.");
            return;
        }
        setLoading(true);
        try {
            await api.put('/auth/change-password/', passwords);
            setMessage("Parol muvaffaqiyatli o'zgartirildi!");
            setPasswords({new_password: ''});
            setOtpSent(false);
            setOtpVerified(false);
            setOtpCode('');
        } catch (error) {
            console.error(error);
            setMessage(error.response?.data?.new_password?.[0] || "Parol o'zgartirishda xatolik!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-semibold transition-colors">
                    <ArrowLeft size={20} /> {t('profileEdit.backToProfile')}
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Cover Editor */}
                    <div className="relative h-48 sm:h-64 bg-slate-200 group">
                        {coverPreview ? (
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <Camera size={40} className="mb-2 opacity-50" />
                                <span className="font-medium text-sm">{t('profileEdit.uploadCover')}</span>
                            </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
                                <Camera size={18} /> {t('profileEdit.change')}
                            </span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                        </label>
                    </div>

                    <div className="px-6 sm:px-10 pb-8 relative">
                        {/* Avatar Editor */}
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-lg bg-white -mt-14 sm:-mt-18 mb-6 group mx-auto sm:mx-0">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                                    <Camera size={40} className="text-slate-300" />
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera size={24} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                            </label>
                        </div>

                        {message && (
                            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl font-medium mb-6 text-center">
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Profile Info Form */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">{t('profileEdit.personalInfo')}</h3>
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">{t('profileEdit.firstName')}</label>
                                        <input 
                                            type="text" 
                                            value={formData.first_name} 
                                            onChange={e => setFormData({...formData, first_name: e.target.value})}
                                            className="w-full bg-[#f3f4f6] text-slate-800 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">{t('profileEdit.lastName')}</label>
                                        <input 
                                            type="text" 
                                            value={formData.last_name} 
                                            onChange={e => setFormData({...formData, last_name: e.target.value})}
                                            className="w-full bg-[#f3f4f6] text-slate-800 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">{t('profileEdit.phoneNumber')}</label>
                                        <input 
                                            type="text" 
                                            value={formData.phone_number} 
                                            onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                            className="w-full bg-[#f3f4f6] text-slate-800 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-[#1E85FF] text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} /> {loading ? t('profileEdit.saving') : t('profileEdit.save')}
                                    </button>
                                </form>
                            </div>

                            {/* Password Form */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Lock size={20} className="text-slate-400"/>{t('profileEdit.changePassword')}
                                </h3>
                                {!otpVerified ? (
                                    <div className="space-y-4">
                                        <button
                                            type="button"
                                            onClick={handleSendOTP}
                                            disabled={loading}
                                            className="w-full bg-[#1E85FF] text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
                                        >
                                            {loading ? t('profileEdit.sending') : otpSent ? t('profileEdit.resendCode') : t('profileEdit.getVerificationCode')}
                                        </button>
                                        {otpSent && (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('profileEdit.verificationCode')}
                                                    value={otpCode}
                                                    onChange={e => setOtpCode(e.target.value)}
                                                    className="w-full bg-[#f3f4f6] text-slate-800 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium text-center tracking-widest text-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleVerifyOTP}
                                                    disabled={loading || !otpCode}
                                                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50"
                                                >
                                                    {t('profileEdit.verify')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">{user?.has_usable_password === false ? t('profileEdit.newPasswordGoogle') : t('profileEdit.newPassword')}</label>
                                            <input
                                                type="password"
                                                value={passwords.new_password}
                                                onChange={e => setPasswords({...passwords, new_password: e.target.value})}
                                                className="w-full bg-[#f3f4f6] text-slate-800 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !passwords.new_password}
                                            className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50"
                                        >
                                            {user?.has_usable_password === false ? t('profileEdit.savePassword') : t('profileEdit.updatePassword')}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
