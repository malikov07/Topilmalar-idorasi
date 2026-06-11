import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, CalendarDays } from 'lucide-react';
import HomeCart from './HomeCart';
import api from '../service/api';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const [profileUser, setProfileUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const buildImageUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    };

    useEffect(() => {
        let active = true;

        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const [userRes, itemsRes] = await Promise.all([
                    api.get(`/auth/users/${id}/`),
                    api.get(`/api/items/?user=${id}&limit=1000&include_resolved=true`),
                ]);
                if (!active) return;
                setProfileUser(userRes.data);
                setItems(itemsRes.data.results || itemsRes.data || []);
            } catch (err) {
                console.error('Failed to load public profile:', err);
                if (active) setError(t('itemDetail.itemNotFound'));
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchProfile();
        return () => { active = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
                    {t('common.back')}
                </button>
            </div>
        );
    }

    const fullName = `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim() || profileUser.email;
    const avatarUrl = buildImageUrl(profileUser.avatar);
    const coverUrl = buildImageUrl(profileUser.cover_image);
    const joined = profileUser.date_joined
        ? new Date(profileUser.date_joined).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ', { year: 'numeric', month: 'long' })
        : null;

    return (
        <div className="min-h-screen bg-white">
            {/* COVER */}
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#3B82F6] mb-3 transition-colors font-medium w-fit"
                >
                    <ArrowLeft size={18} /> {t('common.back')}
                </button>
                <div className="h-44 md:h-60 lg:h-64 w-full rounded-t-[2rem] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 overflow-hidden relative shadow-lg">
                    <img
                        src={coverUrl || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=2000"}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* HEAD */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative mb-12">
                <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16 relative z-10 border border-slate-100">
                    <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-slate-100 -mt-20 md:-mt-24 z-20 relative">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-500 text-4xl font-bold">
                                {profileUser.first_name?.[0]}{profileUser.last_name?.[0] || ''}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left pt-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                            {fullName}
                            {profileUser.is_verified && <CheckCircle2 className="text-blue-500 w-6 h-6 mt-1" />}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-slate-500 font-medium">
                            <span>{t('profile.publicPosts')}: <span className="font-bold text-slate-700">{profileUser.items_count ?? items.length}</span></span>
                            {joined && (
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays size={16} className="text-slate-400" />
                                    {t('profile.memberSince')} {joined}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* POSTS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-200 pb-4">
                    {t('profile.publicPosts')} <span className="text-slate-400 text-base font-medium ml-2">({items.length})</span>
                </h2>

                {items.length === 0 ? (
                    <div className="text-slate-400 py-10 mt-6 bg-slate-50 rounded-2xl text-center border border-slate-100">
                        {t('profile.noItemsFound')}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-6">
                        {items.map(item => {
                            const firstImageObj = item.images && item.images.length > 0 ? item.images[0] : null;
                            const imageUrl = buildImageUrl(firstImageObj ? firstImageObj.image : null);

                            return (
                                <div key={item.id} className="relative">
                                    {item.is_resolved && (
                                        <div className="absolute top-2 left-2 z-20 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded shadow">
                                            {t('profile.resolved')}
                                        </div>
                                    )}
                                    <HomeCart
                                        date={item.date_lost_or_found || t('common.unknown')}
                                        title={item.title}
                                        author={item.owner_name}
                                        image={imageUrl}
                                        authorImage={buildImageUrl(item.owner_picture)}
                                        status={item.status}
                                        location={item.location_address}
                                        onDetails={() => navigate(`/items/${item.id}`)}
                                        onMap={() => navigate(`/items?focus=${item.id}&view=map`)}
                                        itemId={item.id}
                                        initialSaved={item.is_saved}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
