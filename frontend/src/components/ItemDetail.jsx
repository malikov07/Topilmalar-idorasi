import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Eye, Heart, MapPin, ChevronLeft, ChevronRight, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../service/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const BACKEND_URL = "http://127.0.0.1:8000";

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // --- State ---
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Carousel State
  const [activeImage, setActiveImage] = useState(0);
  const thumbnailScrollRef = useRef(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        const response = await api.get(`/api/items/${id}/`);
        setItem(response.data);
        setIsSaved(Boolean(response.data?.is_saved));
      } catch (err) {
        console.error(err);
        setError(t('itemDetail.itemNotFound'));
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id]);

  // --- Helpers ---
  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/800x600?text=Rasm+yoq';
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  // If loading or error, show a simple screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Orqaga qaytish
        </button>
      </div>
    );
  }

  // Safely extract the image array from the backend response
  const imageArray = item.images && item.images.length > 0
    ? item.images.map(img => getImageUrl(img.image || img.url))
    : [];

  // --- Logic to handle image switching and scrolling ---
  const scrollThumbnail = (index) => {
    if (thumbnailScrollRef.current) {
      const thumbnailWidth = 80;
      const scrollAmount = index * thumbnailWidth - (thumbnailScrollRef.current.clientWidth / 2) + (thumbnailWidth / 2);
      thumbnailScrollRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatDateUz = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Safety check just in case Django sends a bad string
    if (isNaN(date.getTime())) return dateString;

    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'
    ];



    const day = date.getDate();
    const month = monthsUz[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month} ${year}`;
  };

  const handleNext = (e) => {
    e.stopPropagation();
    const nextIndex = (activeImage + 1) % imageArray.length;
    setActiveImage(nextIndex);
    scrollThumbnail(nextIndex);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    const prevIndex = (activeImage - 1 + imageArray.length) % imageArray.length;
    setActiveImage(prevIndex);
    scrollThumbnail(prevIndex);
  };

  const handleThumbnailClick = (index) => {
    setActiveImage(index);
    scrollThumbnail(index);
  };

  const handleToggleSaved = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/items/${id}/toggle-save/`);
      setIsSaved(Boolean(response.data?.saved));
    } catch (err) {
      console.error('Saved toggle error:', err);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-5 pt-3">
      <div className="max-w-[85%] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#3B82F6] mb-6 transition-colors font-medium w-fit"
        >
          <ArrowLeft size={20} />
          {t('itemDetail.back')}
        </button>

        {/* Responsive layout: On mobile, details first, map second. On desktop, side by side. */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16`}> 
          
          {/* If images exist, put them in the left column */}
          {imageArray.length > 0 && (
            <div className="w-full order-1 flex flex-col gap-6">
              <div className="space-y-4 select-none w-full">
                {/* Main Image Stage */}
                <div className="relative aspect-[4/3] w-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-sm group">
                  {imageArray.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${item.title} rasm ${index + 1}`}
                      className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply transition-opacity duration-500 ease-in-out ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
                    />
                  ))}
                  {/* Only show arrows if there is more than 1 image */}
                  {imageArray.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-slate-800 p-3 rounded-full shadow-lg opacity-100 transition-all active:scale-95"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-slate-800 p-3 rounded-full shadow-lg opacity-100 transition-all active:scale-95"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                </div>
                {/* Scrollable Thumbnails Strip (Only show if multiple images) */}
                {imageArray.length > 1 && (
                  <div
                    ref={thumbnailScrollRef}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {imageArray.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => handleThumbnailClick(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === index
                          ? 'border-[#3B82F6] ring-2 ring-blue-100 opacity-100'
                          : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                      >
                        <img src={img} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details (and Map if images exist) placed according to condition */}
          <div className={`w-full flex flex-col gap-6 ${imageArray.length > 0 ? 'order-2' : 'order-1'}`}> 
            <div>
              <div className='flex flex-wrap gap-2 sm:gap-4 justify-between items-end mb-3'>
                <h1 className="flex-1 min-w-0 break-words text-2xl xs:text-3xl pb-2 md:text-4xl font-extrabold text-[#0F172A] font-sans leading-tight">
                  {item.title}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 mb-2 shrink-0 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                    <Clock size={13} /> {item.date_lost_or_found ? formatDateUz(item.date_lost_or_found) : t('common.unknown')}
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                    <Eye size={13} /> {item.views_count ?? 0}
                  </div>
                  <button
                    onClick={handleToggleSaved}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold border transition-colors ${isSaved ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-slate-600 border-slate-200 hover:border-red-200 hover:text-red-500'}`}
                  >
                    <Heart size={13} className={isSaved ? 'fill-current' : ''} />
                    {isSaved ? t('itemDetail.saved') : t('itemDetail.save')}
                  </button>
                </div>
              </div>
              {/* Description */}
              <div className="mb-3">
                <p className="text-slate-600 leading-relaxed text-base bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold block mb-1">{t('itemDetail.detailsLabel')}</span> 
                  {item.description || <span className="text-slate-400 italic">{t('itemDetail.noDescription')}</span>}
                </p>
              </div>
              {/* Profile Card */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 mb-5 border border-slate-100">
                <h3 className="text-sm font-bold text-[#0F172A] mb-3">
                  {item.status === 'LOST' ? t('itemDetail.lostProfile') : t('itemDetail.foundProfile')}
                </h3>
                <div
                  onClick={() => item.user && navigate(`/users/${item.user}`)}
                  className={`flex items-center gap-4 mb-4 ${item.user ? 'cursor-pointer group/owner' : ''}`}
                >
                  <img
                    src={getImageUrl(item.owner_picture)}
                    alt={item.owner_name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className={`font-bold text-[#0F172A] text-lg ${item.user ? 'group-hover/owner:text-[#3B82F6] group-hover/owner:underline' : ''}`}>{item.owner_name}</h4>
                    <p className="text-slate-400 text-sm">{item.location_address || t('itemDetail.unknownLocation')}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {item.contact_info ? (
                    <a
                      href={`tel:${item.contact_info}`}
                      className="flex-1 min-w-0 bg-white border border-slate-200 hover:border-[#3B82F6] hover:text-[#3B82F6] text-slate-700 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Phone size={16} className="shrink-0" /> <span className="whitespace-nowrap">{item.contact_info}</span>
                    </a>
                  ) : (
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-slate-400 py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                      <Phone size={16} className="shrink-0" /> {t('itemDetail.noPhone')}
                    </div>
                  )}
                  <button className="flex-1 bg-white border border-slate-200 hover:border-[#3B82F6] hover:text-[#3B82F6] text-slate-700 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                    <MessageCircle size={16} className="shrink-0" /> {t('itemDetail.message')}
                  </button>
                </div>
              </div>
            </div>

            {/* If there are images, Map goes here. If not, map goes in the other column. */}
            {imageArray.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-3">{t('itemDetail.locationTitle')}</h3>
                <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 z-0">
                  {(item.latitude && item.longitude) ? (
                    <MapContainer
                      center={[item.latitude, item.longitude]}
                      zoom={16}
                      scrollWheelZoom={true}
                      style={{ height: "100%", width: "100%", zIndex: 1 }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[item.latitude, item.longitude]} />
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <MapPin size={40} className="mb-2 opacity-50" />
                      <p>{t('itemDetail.noMapData')}</p>
                    </div>
                  )}
                  {item.location_address && (
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-xl text-sm font-bold text-slate-800 shadow-lg z-[1000] pointer-events-none border border-slate-100 flex items-center gap-2">
                      <MapPin size={18} className="text-[#3B82F6]" />
                      {item.location_address}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* If no images, Map is on the right column alone */}
          {imageArray.length === 0 && (
            <div className="w-full order-2 flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-3">{t('itemDetail.locationTitle')}</h3>
                <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 z-0">
                  {(item.latitude && item.longitude) ? (
                    <MapContainer
                      center={[item.latitude, item.longitude]}
                      zoom={16}
                      scrollWheelZoom={true}
                      style={{ height: "100%", width: "100%", zIndex: 1 }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[item.latitude, item.longitude]} />
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <MapPin size={40} className="mb-2 opacity-50" />
                      <p>{t('itemDetail.noMapData')}</p>
                    </div>
                  )}
                  {item.location_address && (
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-xl text-sm font-bold text-slate-800 shadow-lg z-[1000] pointer-events-none border border-slate-100 flex items-center gap-2">
                      <MapPin size={18} className="text-[#3B82F6]" />
                      {item.location_address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}