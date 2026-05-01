import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import HomeCart from './HomeCart';
import api from '../service/api';
import { Settings, LogOut, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [myItems, setMyItems] = useState([]);
    const [savedItems, setSavedItems] = useState([]); // Or fetch from a separate "favorites" api if one exists
    const [loading, setLoading] = useState(true);

    const BACKEND_URL = "http://127.0.0.1:8000";

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        const fetchUserData = async () => {
            try {
                const [allItemsResponse, savedItemsResponse] = await Promise.all([
                    api.get('/api/items/?limit=1000&include_resolved=true'),
                    api.get('/api/items/?saved=true&limit=1000&include_resolved=true')
                ]);

                const allFetched = allItemsResponse.data.results ? allItemsResponse.data.results : allItemsResponse.data;
                const savedFetched = savedItemsResponse.data.results ? savedItemsResponse.data.results : savedItemsResponse.data;
                const currentUserId = String(user.id || user.user_id);
                const mine = allFetched.filter(item => String(item.user) === currentUserId);
                setMyItems(mine);
                setSavedItems(savedFetched);

            } catch (err) {
                console.error("Error fetching items:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user, navigate]);

    if (!user) return null;

    const handleToggleResolved = async (itemId, currentStatus) => {
        try {
            await api.patch(`/api/items/${itemId}/`, { is_resolved: !currentStatus });
            
            // Optimistic update
            setMyItems(myItems.map(item => 
                item.id === itemId ? { ...item, is_resolved: !currentStatus } : item
            ));
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Xatolik yuz berdi!");
        }
    };

    const handleDeleteItem = async (itemId) => {
        const ok = window.confirm("Ushbu e'lonni o'chirishni xohlaysizmi?");
        if (!ok) return;

        try {
            await api.delete(`/api/items/${itemId}/`);
            setMyItems(prev => prev.filter(item => item.id !== itemId));
            setSavedItems(prev => prev.filter(item => item.id !== itemId));
        } catch (err) {
            console.error("Error deleting item:", err);
            alert("E'lonni o'chirishda xatolik yuz berdi.");
        }
    };

    const handleSavedChange = (itemId, saved) => {
        setMyItems(prev => prev.map(item => (
            item.id === itemId ? { ...item, is_saved: saved } : item
        )));

        if (!saved) {
            setSavedItems(prev => prev.filter(item => item.id !== itemId));
        }
    };

    const handleProfileUpdate = async (file, field) => {
        try {
            const formData = new FormData();
            formData.append(field, file);

            const res = await api.patch('/auth/profile/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update auth context by replacing local storage
            const updatedUser = { ...user, ...res.data };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Reload to propagate changes via AuthContext
            window.location.reload();
        } catch (err) {
            console.error(`Error updating ${field}:`, err);
            alert("Rasm yuklashda xatolik yuz berdi.");
        }
    };

    const renderItemGrid = (items, isMyItems = false) => {
        if (loading) return <div className="text-slate-500 py-10">{t('profile.loading')}</div>;
        if (items.length === 0) return <div className="text-slate-400 py-10 bg-slate-50 rounded-2xl text-center border border-slate-100">{t('profile.noItemsFound')}</div>;

        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-6">
                {items.map(item => {
                    const firstImageObj = item.images && item.images.length > 0 ? item.images[0] : null;
                    let imageUrl = firstImageObj ? firstImageObj.image : null;
                    
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${BACKEND_URL}${imageUrl}`;
                    }

                    return (
                        <div key={item.id} className="flex flex-col">
                            <div className="relative">
                                {item.is_resolved && (
                                    <div className="absolute top-2 left-2 z-20 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded shadow">
                                        {t('profile.resolved')}
                                    </div>
                                )}
                                <HomeCart
                                    date={item.date_lost_or_found || "Noma'lum"}
                                    title={item.title}
                                    author={item.owner_name}
                                    image={imageUrl}
                                    authorImage={item.owner_picture || null}
                                    status={item.status}
                                    location={item.location_address}
                                    onDetails={() => navigate(`/items/${item.id}`)}
                                    onMap={() => navigate(`/items?focus=${item.id}&view=map`)}
                                    itemId={item.id}
                                    initialSaved={item.is_saved}
                                    onSavedChange={handleSavedChange}
                                />
                            </div>
                            
                            {isMyItems && (
                                <div className="mt-2 grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => handleToggleResolved(item.id, item.is_resolved)}
                                        className={`py-2 w-full text-sm font-bold rounded-lg transition-colors ${item.is_resolved ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'}`}
                                    >
                                        {item.is_resolved
                                            ? t('profile.cancelStatus')
                                            : item.status === 'FOUND'
                                                ? t('profile.markAsDelivered')
                                                : t('profile.markAsReceived')
                                        }
                                    </button>
                                    <button
                                        onClick={() => navigate(`/edit-item/${item.id}`)}
                                        className="py-2 w-full text-sm font-bold rounded-lg transition-colors bg-[#1E85FF] hover:bg-blue-600 text-white shadow-sm"
                                    >
                                        {t('profile.edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="py-2 w-full text-sm font-bold rounded-lg transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-100"
                                    >
                                        {t('profile.delete')}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            
            {/* HER0 BACKGROUND */}
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <div className="h-48 md:h-64 lg:h-72 w-full rounded-t-[2rem] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 object-cover overflow-hidden relative shadow-lg group">
                    <img 
                      src={user.cover_image 
                            ? (user.cover_image.startsWith('http') ? user.cover_image : `${BACKEND_URL}${user.cover_image}`) 
                            : "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=2000"} 
                      alt="Cover" 
                      className="w-full h-full object-cover" 
                    />
                </div>
            </div>

            {/* PROFILE HEAD SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative mb-12">
                <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16 relative z-10 border border-slate-100">
                    
                    {/* AVATAR */}
                    <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-slate-100 -mt-20 md:-mt-24 z-20 relative group">
                        {user.avatar ? (
                            <img src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`} alt={user.first_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-500 text-4xl font-bold">
                                {user.first_name?.[0]}{user.last_name?.[0] || ''}
                            </div>
                        )}
                    </div>

                    {/* USER INFO */}
                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                            {user.first_name} {user.last_name}
                            {user.is_verified && <CheckCircle2 className="text-blue-500 w-6 h-6 mt-1" />}
                        </h1>
                        <p className="text-slate-500 text-lg font-medium mt-1">{user.email}</p>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 mt-4 md:mt-2 w-full md:w-auto">
                        <button onClick={() => navigate('/settings')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-slate-700 px-6 py-3 rounded-xl font-bold transition-all">
                            <Settings size={18} />
                            {t('profile.editProfile')}
                        </button>
                        <button onClick={logoutUser} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold transition-all">
                            <LogOut size={18} />
                            {t('profile.logout')}
                        </button>
                    </div>
                </div>
            </div>

            {/* TABS SECTIONS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                
                {/* SAVED ITEMS ROW */}
                <div className="mb-16">
                    <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-4">
                        {t('profile.savedAds')} <span className="text-slate-400 text-base font-medium ml-2">({savedItems.length})</span>
                    </h2>
                    {renderItemGrid(savedItems)}
                    {savedItems.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <button className="px-8 py-3 border-2 border-[#1E85FF] text-[#1E85FF] font-bold rounded-xl hover:bg-blue-50 transition-colors">
                                {t('profile.loadMoreButton')}
                            </button>
                        </div>
                    )}
                </div>

                {/* MY ITEMS ROW */}
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-4">
                        {t('profile.myAds')} <span className="text-slate-400 text-base font-medium ml-2">({myItems.length})</span>
                    </h2>
                    {renderItemGrid(myItems, true)}
                    {myItems.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <button className="px-8 py-3 border-2 border-[#1E85FF] text-[#1E85FF] font-bold rounded-xl hover:bg-blue-50 transition-colors">
                                {t('profile.loadMoreButton')}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

