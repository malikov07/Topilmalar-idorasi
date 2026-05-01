import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../service/api';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = 'http://127.0.0.1:8000';

const CardItem = ({ image, userImage, name, location, onClick, isSaved, onToggleSaved }) => {
  return (
    <div onClick={onClick} className="bg-[#E9E9E9] rounded-[18px] sm:rounded-[24px] p-3 sm:p-4 lg:p-5 flex flex-col gap-3 sm:gap-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
      <div className="w-full aspect-[4/3] rounded-[12px] sm:rounded-[16px] overflow-hidden bg-white relative flex items-center justify-center">
        {image ? (
          <img src={image} alt="Product" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 font-medium text-lg">Rasm yo'q</span>
        )}
        <button
          onClick={onToggleSaved}
          className={`absolute top-3 right-3 p-2 rounded-full border transition-colors ${isSaved ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-400 border-slate-200 bg-white hover:text-red-500 hover:border-red-200'}`}
          aria-label="Saqlash"
        >
          <Heart size={16} className={isSaved ? 'fill-current' : ''} />
        </button>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 px-1">
        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-[10px] sm:rounded-[12px] overflow-hidden bg-black shrink-0">
          <img src={userImage} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="text-[#0A2342] font-bold text-sm sm:text-base lg:text-lg leading-tight">
            {name || t('sections.ownerUnknown')}
          </span>
          <span className="text-[#8E8E93] text-xs sm:text-sm lg:text-base font-medium">
            {location || t('common.unknown')}
          </span>
        </div>
      </div>
    </div>
  );
};

const LostItems = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        const response = await api.get('/api/items/?status=LOST&limit=3');
        setItems(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching LOST items:', error);
      }
    };

    fetchLostItems();
  }, []);

  const handleToggleSaved = async (e, itemId) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/items/${itemId}/toggle-save/`);
      const saved = Boolean(response.data?.saved);
      setItems(prev => prev.map(item => (item.id === itemId ? { ...item, is_saved: saved } : item)));
    } catch (error) {
      console.error('Error toggling save in LostItems:', error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8 lg:py-10">
      <div className="flex justify-between items-end mb-5 sm:mb-8 gap-3">
        <div>
          <h2 className="text-[#0a1d37] text-xl sm:text-2xl lg:text-4xl font-bold leading-tight">
            {t('sections.lostItemsTitle')}
          </h2>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm md:text-base font-medium">
            {t('sections.lostItemsDescription')}
          </p>
        </div>
        <button
          onClick={() => navigate('/items?status=LOST')}
          className="hover:text-[#1e88e5] underline underline-offset-4 sm:underline-offset-8 decoration-blue-600 cursor-pointer text-sm md:text-base pb-1 whitespace-nowrap"
        >
          {t('sections.lostItemsMore')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
        {items.map((item) => {
          const firstImage = item.images?.[0]?.image;
          const mainImage = firstImage
            ? (firstImage.startsWith('http') ? firstImage : `${BACKEND_URL}${firstImage}`)
            : null;

          const ownerImage = item.owner_picture
            ? (item.owner_picture.startsWith('http') ? item.owner_picture : `${BACKEND_URL}${item.owner_picture}`)
            : 'https://via.placeholder.com/120x120?text=User';

          return (
            <CardItem
              key={item.id}
              image={mainImage}
              userImage={ownerImage}
              name={item.owner_name || 'Foydalanuvchi'}
              location={item.location_address || 'Manzil noma\'lum'}
              onClick={() => navigate(`/items/${item.id}`)}
              isSaved={item.is_saved}
              onToggleSaved={(e) => handleToggleSaved(e, item.id)}
              noImagePlaceholder={mainImage === null}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LostItems;
