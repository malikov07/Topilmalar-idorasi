import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function MapPopup({ item }) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const images = item.images && item.images.length > 0 ? item.images : [];

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    let currentImgUrl = images.length > 0 ? images[currentIndex].image : null;
    if (currentImgUrl && !currentImgUrl.startsWith('http')) {
        currentImgUrl = `${BACKEND_URL}${currentImgUrl}`;
    }

    return (
        <div className="w-48 overflow-hidden rounded-lg flex flex-col items-center">
            {images.length > 0 ? (
                <div className="relative w-full h-32 bg-slate-100 rounded-t-md overflow-hidden">
                    <img src={currentImgUrl} alt={item.title} className="w-full h-full object-cover" />
                    {images.length > 1 && (
                        <>
                            <button onClick={prevImage} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={nextImage} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                                <ChevronRight size={16} />
                            </button>
                            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">
                                {currentIndex + 1} / {images.length}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="w-full h-32 bg-slate-200 flex items-center justify-center text-slate-500 text-xs rounded-t-md">
                    Rasm yo'q
                </div>
            )}
            <div className="w-full p-2 bg-white rounded-b-md text-left">
                <p className="font-bold text-sm text-slate-800 truncate" title={item.title}>{item.title}</p>
                <p className="text-[10px] text-slate-400 font-semibold">
                    {item.date_lost_or_found || "Sana noma'lum"}
                </p>
                <p className="text-xs text-slate-500  truncate" title={item.location_address}>{item.location_address}</p>
                <button 
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="w-full text-center bg-[#1E85FF] hover:bg-blue-600 font-semibold text-white py-1.5 rounded-md text-xs transition-colors"
                >Batafsil</button>
            </div>
        </div>
    );
}
