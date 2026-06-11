import React from "react";
import { useNavigate } from "react-router-dom"; // 1. Navigatsiya uchun import
import HomeCart from "./HomeCart";
import api from "../service/api";
import { useEffect } from "react";
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function FoundItems() {
    const { t } = useLanguage();
    const navigate = useNavigate(); // 2. Hookni chaqiramiz
    const [items, setItems] = React.useState([]);
    useEffect(() => {
        fetchFourItems();
    }
        , []);

    const fetchFourItems = async () => {
        // Show the 8 most recent FOUND items (backend orders by -created_at)
        const response = await api.get('/api/items/?status=FOUND&limit=8');

        // Note: When you turn on pagination, DRF wraps your data in a 'results' object
        const fetched = response.data.results || response.data || [];
        setItems(fetched);
        console.log("Fetched items:", fetched);
    };



    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className='flex justify-between items-end my-5 sm:my-8 gap-3'>
                <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>{t('sections.foundItemsTitle')}</h1>
                <button
                    onClick={() => navigate('/items?status=FOUND')}
                    className='hover:text-[#1e88e5] cursor-pointer underline underline-offset-4 sm:underline-offset-8 decoration-blue-600 text-sm sm:text-base pb-1'
                >
                    {t('sections.foundItemsMore')}
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {items.map((item) => {
                    const firstImageObj = item.images && item.images.length > 0 ? item.images[0] : null;
                    let imageUrl = firstImageObj ? firstImageObj.image : null;

                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${BACKEND_URL}${imageUrl}`;
                    }

                    return (
                        <HomeCart
                            key={item.id}
                            date={item.date_lost_or_found || "Noma'lum"}
                            title={item.title}
                            author={item.owner_name}
                            authorId={item.user}
                            status={item.status}
                            location={item.location_address}
                            image={imageUrl}
                            authorImage={item.owner_picture || null}
                            onDetails={() => navigate(`/items/${item.id}`)}
                            onMap={() => navigate(`/items?focus=${item.id}&view=map`)}
                            itemId={item.id}
                            initialSaved={item.is_saved}
                        />
                    );
                })}
            </div>
        </div>
    )
}