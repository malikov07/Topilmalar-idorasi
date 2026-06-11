import React, { useEffect, useState } from 'react';
import { Calendar, ChevronRight, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../service/api';
import { useLanguage } from '../context/LanguageContext';

// 1. onDetails propini qo'shdik
const HomeCart = ({ date, title, author, authorId, authorImage, image, onDetails, onMap, itemId, initialSaved = false, onSavedChange }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const noImagePlaceholder = false; // Default value for noImagePlaceholder
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(initialSaved));

  useEffect(() => {
    setSaved(Boolean(initialSaved));
  }, [initialSaved, itemId]);

  const handleToggleSaved = async (e) => {
    e.stopPropagation();

    if (!itemId) return;
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const res = await api.post(`/api/items/${itemId}/toggle-save/`);
      const newSaved = Boolean(res.data?.saved);
      setSaved(newSaved);
      if (onSavedChange) onSavedChange(itemId, newSaved);
    } catch (error) {
      console.error('Failed to toggle save from card:', error);
    }
  };
  return (
    <div onClick={onDetails} className="w-full border border-slate-200 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 h-full group relative cursor-pointer">
      {/* Rasm qismi */}
      <div className="relative w-full rounded-lg overflow-hidden bg-slate-50 aspect-[4/3]">
        {/* Sana (Badge) */}
        <div className="absolute top-2 left-2 z-10 bg-[#1E85FF]/90 backdrop-blur-sm text-white px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
          <Calendar size={12} className="text-white/90" />
          <span className="font-semibold text-[10px] sm:text-xs tracking-wide">{date}</span>
        </div>
        
        {/* Saqlash tugmasi rasmning ustida o'ngda */}
        <button
          onClick={handleToggleSaved}
          className={`absolute top-2 right-2 z-10 p-1.5 sm:p-2 rounded-full backdrop-blur-sm transition-all shadow-sm ${saved ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-500 hover:bg-white hover:text-red-500'}`}
          aria-label={t('common.save')}
        >
          <Heart size={14} className={saved ? 'fill-current' : ''} />
        </button>
        
        {/* Kitob rasmi foni */}
        {noImagePlaceholder || !image || typeof image !== 'string' || image.trim() === '' ? (
          <div className="w-full h-full flex items-center justify-center bg-[#e4e9f1] text-[#5a7ca9] text-base sm:text-lg font-semibold">
            {t('common.noImage')}
          </div>
        ) : (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode && (e.target.parentNode.innerHTML = `<div class='w-full h-full flex items-center justify-center bg-[#e4e9f1] text-[#5a7ca9] text-base sm:text-lg font-semibold'>${t('common.noImage')}</div>`); }}
          />
        )}
      </div>

      {/* CONTENT SECTION */}
      <div className="flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5 sm:space-y-2">
          {/* Title */}
          <h3 className="text-slate-900 text-sm sm:text-base font-bold line-clamp-2 leading-snug">
            {title || t('sections.unknownItem')}
          </h3>

          {/* Author and Link Row */}
          <div className="flex justify-between items-center pt-1">
            <div
              onClick={(e) => { if (authorId) { e.stopPropagation(); navigate(`/users/${authorId}`); } }}
              className={`flex items-center gap-2 overflow-hidden flex-1 ${authorId ? 'cursor-pointer group/author' : ''}`}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                <img src={authorImage || 'https://via.placeholder.com/120x120?text=User'} alt={author} className="w-full h-full object-cover" />
              </div>
              <span className={`text-slate-500 font-medium text-xs sm:text-sm truncate ${authorId ? 'group-hover/author:text-[#1E85FF] group-hover/author:underline' : ''}`}>
                {author || t('sections.ownerUnknown')}
              </span>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onMap(); }}
              className="flex items-center text-[#1E85FF] font-semibold text-xs hover:underline whitespace-nowrap shrink-0 pr-1 ml-2"
            >
              {t('sections.viewMap')} <ChevronRight size={14} className="ml-0.5" />
            </button>
          </div>
        </div>

        {/* 2. ACTION BUTTON */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDetails(); }}
          className="w-full mt-2 bg-slate-50 border border-slate-200 text-slate-700 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-[#1E85FF] hover:border-[#1E85FF] hover:text-white transition-all active:scale-95"
        >
          {t('sections.viewDetails')}
        </button>
      </div>
    </div>
  );
};

export default HomeCart;