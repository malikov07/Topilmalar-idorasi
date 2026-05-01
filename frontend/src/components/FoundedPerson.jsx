import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../service/api';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = 'http://127.0.0.1:8000';

const getAvatarUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/120x120?text=User';
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

const FoundedPerson = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchFoundItems = async () => {
      try {
        const response = await api.get('/api/items/?status=FOUND&limit=8');
        const fetchedItems = response.data.results || response.data || [];
        const uniqueByUser = [];
        const seenUsers = new Set();

        for (const item of fetchedItems) {
          const userKey = String(item.user || item.owner_name || item.id);
          if (!seenUsers.has(userKey)) {
            seenUsers.add(userKey);
            uniqueByUser.push(item);
          }
        }

        setItems(uniqueByUser);
      } catch (error) {
        console.error('Error fetching FOUND items:', error);
      }
    };

    fetchFoundItems();
  }, []);

  return (
    <div className="max-w-85/100 w-full mx-auto py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[#0a1d37] text-2xl md:text-4xl font-bold ">
            {t('sections.foundedPersonTitle')}
          </h2>
          <p className="text-gray-500 mt-1 text-xs md:text-base font-medium">
            {t('sections.foundedPersonSubtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/items?status=FOUND')}
          className="hover:text-[#1e88e5] underline underline-offset-4 sm:underline-offset-8 decoration-blue-600 text-sm md:text-base pb-1 whitespace-nowrap cursor-pointer md:mb-5"
        >
          {t('sections.foundedPersonMore')}
        </button>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6 lg:gap-x-30 lg:gap-y-10 py-5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/items/${item.id}`)}
            className="flex flex-row gap-1 lg:gap-5 items-center text-center group cursor-pointer"
          >
            <img
              src={getAvatarUrl(item.owner_picture)}
              alt={item.owner_name || 'User'}
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl md:rounded-3xl object-cover shadow-sm transition-transform group-hover:scale-105"
            />
            <div className="mt-2 space-y-0.5">
              <h4 className="text-[#0a1d37] font-bold text-[10px] sm:text-sm md:text-xl leading-tight">
                {item.owner_name || 'Foydalanuvchi'}
              </h4>
              
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoundedPerson;
