import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../service/api';
import HomeCart from './HomeCart';
import { Filter, Search, Calendar, Map as MapIcon, List, X, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryDisplayName } from '../utils/category';

import MapPopup from './MapPopup';

const BACKEND_URL = "http://127.0.0.1:8000";

// Custom icons based on status
const createIcon = (color) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const lostIcon = createIcon('red');
const foundIcon = createIcon('green');

const buildCategoryTree = (items = []) => {
    const map = new globalThis.Map();
    const roots = [];

    items.forEach((item) => {
        map.set(String(item.id), { ...item, children: [] });
    });

    items.forEach((item) => {
        const node = map.get(String(item.id));
        if (!node) return;

        if (item.parent && map.has(String(item.parent))) {
            map.get(String(item.parent)).children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
};

function FocusedMarkerController({ focusedItem }) {
    const map = useMap();

    useEffect(() => {
        if (!focusedItem?.latitude || !focusedItem?.longitude) return;
        map.flyTo([focusedItem.latitude, focusedItem.longitude], 15, { duration: 0.8 });
    }, [focusedItem, map]);

    return null;
}

function ResizeMapController({ trigger }) {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => clearTimeout(timer);
    }, [map, trigger]);

    return null;
}

export default function MapSearchPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();

    // States
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'map' | 'list'

    const searchParams = new URLSearchParams(location.search);
    const initialCategory = searchParams.get('category') || '';
    const initialSearch = searchParams.get('search') || '';
    const initialStatus = searchParams.get('status') || '';
    const initialFocus = searchParams.get('focus') || null;
    const initialView = searchParams.get('view') === 'map' ? 'map' : 'list';

    // Filters
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [category, setCategory] = useState(initialCategory);
    const [status, setStatus] = useState(initialStatus);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(''); 

    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [showCatalogPanel, setShowCatalogPanel] = useState(false);
    const [hoveredMainCategoryId, setHoveredMainCategoryId] = useState('');
    const [mobileCatalogMainId, setMobileCatalogMainId] = useState('');
    const [isMobileCatalog, setIsMobileCatalog] = useState(false);
    const [focusedItemId, setFocusedItemId] = useState(initialFocus);
    const markerRefs = useRef({});
    const [expandedCategories, setExpandedCategories] = useState([]);

    // Infinite scroll (client-side reveal). We still fetch all items so the map
    // keeps every marker; the list view just reveals more as the user scrolls.
    const ITEMS_PER_PAGE = 12;
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const sentinelRef = useRef(null);

    // Count active filters for badge
    const activeFilterCount = [category, status, startDate, endDate].filter(Boolean).length;
    const hasActiveCategory = Boolean(category);
    const categoryTree = buildCategoryTree(categories);
    const rootCategories = categoryTree;
    const desktopMainCategory = rootCategories.find((cat) => String(cat.id) === String(hoveredMainCategoryId)) || rootCategories[0] || null;
    const mobileMainCategory = rootCategories.find((cat) => String(cat.id) === String(mobileCatalogMainId)) || null;
    const activeCatalogMainCategory = isMobileCatalog ? mobileMainCategory : desktopMainCategory;
    const relatedSubcategories = activeCatalogMainCategory?.children || [];

    useEffect(() => {
        const updateCatalogMode = () => {
            const mobile = window.matchMedia('(max-width: 1023px)').matches;
            setIsMobileCatalog(mobile);
            if (!mobile) {
                setMobileCatalogMainId('');
            }
        };

        updateCatalogMode();
        window.addEventListener('resize', updateCatalogMode);
        return () => window.removeEventListener('resize', updateCatalogMode);
    }, []);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;

        if (showCatalogPanel) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
        };
    }, [showCatalogPanel]);

    // Initial load for categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catRes = await api.get('/api/categories/?limit=1000');
                setCategories(catRes.data.results || catRes.data);
            } catch (err) {
                console.error("Failed to load filters:", err);
            }
        };
        fetchCategories();
    }, []);

    // Sync state if location.search changes from outside
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchQuery = queryParams.get('search');
        const categoryQuery = queryParams.get('category');
        const statusQuery = queryParams.get('status');
        const focusQuery = queryParams.get('focus');
        const viewQuery = queryParams.get('view');
        
        if (searchQuery !== null) {
            setSearchInput(searchQuery || '');
            setSearch(searchQuery || '');
        }
        if (categoryQuery !== null) setCategory(categoryQuery || '');
        if (statusQuery !== null) setStatus(statusQuery || '');
        if (focusQuery !== null) setFocusedItemId(focusQuery);
        if (viewQuery !== null) {
            setViewMode(viewQuery === 'map' ? 'map' : 'list');
        } else {
            setViewMode('list');
        }
    }, [location.search]);

    // Load items
    const fetchItems = async () => {
        setLoading(true);
        try {
            let queryParams = [`limit=1000`];
            if (search) queryParams.push(`search=${search}`);
            if (category) queryParams.push(`category=${category}`);
            if (status) queryParams.push(`status=${status}`);
            if (startDate) queryParams.push(`start_date=${startDate}`);
            if (endDate) queryParams.push(`end_date=${endDate}`);
            const queryString = `?${queryParams.join('&')}`;
            const res = await api.get(`/api/items/${queryString}`);
            setItems(res.data.results || res.data);
            setVisibleCount(ITEMS_PER_PAGE);
        } catch (err) {
            console.error("Failed to load items:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        // eslint-disable-next-line
    }, [search, category, status, startDate, endDate]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setVisibleCount(ITEMS_PER_PAGE);
        setShowMobileFilters(false);
    };

    const handleApplyFilters = () => {
        setSearch(searchInput.trim());
        setVisibleCount(ITEMS_PER_PAGE);
        setShowMobileFilters(false);
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setSearch('');
        setCategory('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        setVisibleCount(ITEMS_PER_PAGE);
        setExpandedCategories([]);
        setShowMobileFilters(false);
        setShowCatalogPanel(false);
        setHoveredMainCategoryId('');
        setMobileCatalogMainId('');
    };

    const handleCardSavedChange = (itemId, saved) => {
        setItems(prev => prev.map(item => (
            item.id === itemId ? { ...item, is_saved: saved } : item
        )));
    };

    const capitalizeFirst = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const focusedItem = items.find(i => String(i.id) === String(focusedItemId));

    const openMainCategory = (mainId) => {
        if (isMobileCatalog) {
            setMobileCatalogMainId(String(mainId));
            return;
        }

        applyCategory(mainId);
    };

    const backToMainCategories = () => {
        setMobileCatalogMainId('');
    };

    const toggleCategoryExpansion = (catId) => {
        setExpandedCategories((prev) =>
            prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
        );
    };

    const renderCategoryNode = (node, depth = 0) => {
        const hasChildren = node.children?.length > 0;
        const isExpanded = expandedCategories.includes(node.id);
        const isSelected = String(category) === String(node.id);

        return (
            <div key={node.id} className={depth > 0 ? 'ml-3 border-l border-slate-100 pl-3' : ''}>
                <button
                    type="button"
                    onClick={() => {
                        setCategory(String(node.id));
                        if (hasChildren) toggleCategoryExpansion(node.id);
                    }}
                    className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                        isSelected
                            ? 'border-[#1E85FF] bg-blue-50 text-[#1E85FF]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                    style={{ paddingLeft: `${12 + depth * 10}px` }}
                >
                    <span className="truncate">{capitalizeFirst(getCategoryDisplayName(node, language))}</span>
                    {hasChildren ? (
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    ) : null}
                </button>

                {hasChildren && isExpanded && (
                    <div className="mb-2 space-y-1">
                        {node.children.map((child) => renderCategoryNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const openCatalogFor = (mainCategory) => {
        setHoveredMainCategoryId(String(mainCategory.id));
        setShowCatalogPanel(true);
    };

    useEffect(() => {
        if (showCatalogPanel && !hoveredMainCategoryId && rootCategories.length > 0) {
            setHoveredMainCategoryId(String(rootCategories[0].id));
        }
    }, [showCatalogPanel, hoveredMainCategoryId, rootCategories]);

    const applyCategory = (id) => {
        setCategory(String(id));
        setShowCatalogPanel(false);
        setHoveredMainCategoryId('');
        setMobileCatalogMainId('');
        setVisibleCount(ITEMS_PER_PAGE);
    };

    const closeCatalogPanel = () => {
        setShowCatalogPanel(false);
        setHoveredMainCategoryId('');
        setMobileCatalogMainId('');
    };

    useEffect(() => {
        if (focusedItem && focusedItem.latitude && focusedItem.longitude) {
            setViewMode('map');
            const openFocusedPopup = () => {
                const marker = markerRefs.current[focusedItem.id];
                if (marker) marker.openPopup();
            };
            openFocusedPopup();
            const timer = setTimeout(openFocusedPopup, 300);
            return () => clearTimeout(timer);
        }
    }, [focusedItem]);

    const mapCenter = focusedItem?.latitude && focusedItem?.longitude
        ? [focusedItem.latitude, focusedItem.longitude]
        : items.length > 0 && items[0].latitude && items[0].longitude
            ? [items[0].latitude, items[0].longitude]
            : [41.2995, 69.2401];

    // Reveal 12 more items whenever the bottom sentinel scrolls into view
    useEffect(() => {
        if (viewMode !== 'list') return;
        const node = sentinelRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) =>
                        prev < items.length ? prev + ITEMS_PER_PAGE : prev
                    );
                }
            },
            { rootMargin: '300px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [viewMode, items.length, visibleCount]);

    // ── Reusable filter panel content ──────────────────────────────────────────
    const FilterPanel = ({ isMobile = false }) => (
        <div className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 ${!isMobile ? 'sticky top-24' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-lg">
                    <Filter size={18} className="text-[#1E85FF]" /> {t('search.filters')}
                </div>
                {isMobile && (
                    <button
                        onClick={() => setShowMobileFilters(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Status */}
            <div className="mb-4 sm:mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('search.status')}</label>
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setStatus('')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${status === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t('search.statusAll')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus('LOST')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${status === 'LOST' ? 'bg-red-500 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t('search.statusLost')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus('FOUND')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${status === 'FOUND' ? 'bg-green-500 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t('search.statusFound')}
                    </button>
                </div>
            </div>

            {/* Date Range */}
            <div className="mb-4 sm:mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('search.dateRange')}</label>
                <div className="space-y-2">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-100 text-slate-700 text-sm font-medium pl-9 pr-3 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1E85FF]"
                        />
                    </div>
                    <div className="text-center text-[11px] text-slate-400 font-bold">{t('search.until')}</div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-100 text-slate-700 text-sm font-medium pl-9 pr-3 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1E85FF]"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                <button
                    onClick={handleApplyFilters}
                    className="w-full bg-[#1E85FF] hover:bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
                >
                    {t('search.applyFilters')}
                </button>
                <button
                    onClick={handleClearFilters}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95"
                >
                    {t('search.clearFilters')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen pt-3 sm:pt-4 pb-8 sm:pb-12">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex flex-col lg:flex-row gap-4 sm:gap-5">

                {/* ── LEFT SIDE ─────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">

                    {/* Top Controls Bar */}
                    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-center">
                        {/* Search */}
                        <form onSubmit={handleSearchSubmit} className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={t('search.searchInputPlaceholder')}
                                className="w-full bg-slate-100 pl-10 pr-4 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-[#1E85FF] focus:bg-white transition-all text-sm font-semibold text-slate-700"
                            />
                        </form>

                        {/* Catalog button */}
                        <button
                            type="button"
                            onClick={() => setShowCatalogPanel((prev) => !prev)}
                            className="relative inline-flex items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                        >
                            <List size={15} /> {t('search.catalog')}
                            {hasActiveCategory && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-[#1E85FF] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                                    1
                                </span>
                            )}
                        </button>

                        {/* View Toggle + Filter Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                            {/* Map / List toggle */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 flex-1 sm:flex-none">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('map')}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none ${viewMode === 'map' ? 'bg-[#1E85FF] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <MapIcon size={15} /> <span className="hidden sm:inline">{t('common.map')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none ${viewMode === 'list' ? 'bg-[#1E85FF] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <List size={15} /> <span className="hidden sm:inline">{t('common.list')}</span>
                                </button>
                            </div>

                            {/* Mobile filter toggle – only on < lg */}
                            <button
                                type="button"
                                onClick={() => setShowMobileFilters(prev => !prev)}
                                className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white shadow transition-all active:scale-95"
                            >
                                <Filter size={15} />
                                <span>{t('search.filters')}</span>
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1E85FF] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Filter Panel – inline, appears between controls and content */}
                    {showMobileFilters && (
                        <div className="lg:hidden">
                            <FilterPanel isMobile={true} />
                        </div>
                    )}

                    {showCatalogPanel && (
                        <div className="fixed inset-0 z-[9998] flex items-start sm:items-center justify-center bg-slate-950/35 p-2 sm:p-6 overflow-y-auto" onClick={closeCatalogPanel}>
                            <div
                                className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl my-3 sm:my-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                                    <div>
                                        <p className="text-lg font-extrabold text-slate-900">{t('search.catalog')}</p>
                                        <p className="text-sm text-slate-500">{t('search.catalogHint')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeCatalogPanel}
                                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="grid gap-0 lg:grid-cols-[280px_1fr] max-h-[calc(92vh-72px)] overflow-y-auto">
                                    <div className={`border-slate-100 bg-slate-50 p-4 sm:p-6 lg:max-w-[280px] ${isMobileCatalog && mobileCatalogMainId ? 'hidden lg:block' : 'block'}`}>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('search.mainCategories')}</h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCategory('');
                                                        closeCatalogPanel();
                                                }}
                                                className="text-[11px] font-bold text-[#1E85FF] hover:underline"
                                            >
                                                {t('search.allCategories')}
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
                                            {rootCategories.length > 0 ? (
                                                rootCategories.map((main) => {
                                                    const isSelected = activeCatalogMainCategory && String(activeCatalogMainCategory.id) === String(main.id);
                                                    return (
                                                        <button
                                                            key={main.id}
                                                            type="button"
                                                            onMouseEnter={() => {
                                                                if (!isMobileCatalog) setHoveredMainCategoryId(String(main.id));
                                                            }}
                                                            onClick={() => openMainCategory(main.id)}
                                                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                                                isSelected
                                                                    ? 'border-[#1E85FF] bg-blue-50 text-[#1E85FF]'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                                            }`}
                                                        >
                                                            <span className="text-sm font-semibold">{capitalizeFirst(getCategoryDisplayName(main, language))}</span>
                                                            <ChevronDown className={`h-4 w-4 transition-transform -rotate-90 ${isSelected ? 'text-[#1E85FF]' : 'text-slate-400'}`} />
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-xs text-slate-400 font-medium italic">{t('search.noCategoriesLoaded')}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`p-4 sm:p-6 ${isMobileCatalog && !mobileCatalogMainId ? 'hidden lg:block' : 'block'}`}>
                                        {activeCatalogMainCategory ? (
                                            <>
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-sm font-bold uppercase tracking-wider text-slate-500">{t('search.subcategories')}</h3>
                                                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                                                            {capitalizeFirst(getCategoryDisplayName(activeCatalogMainCategory, language))}
                                                        </p>
                                                    </div>

                                                    {isMobileCatalog ? (
                                                        <button
                                                            type="button"
                                                            onClick={backToMainCategories}
                                                            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            {t('common.back')}
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => applyCategory(activeCatalogMainCategory.id)}
                                                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                                            String(category) === String(activeCatalogMainCategory.id)
                                                                ? 'border-[#1E85FF] bg-blue-50 text-[#1E85FF]'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        {t('search.allItemsInCategory')}: {capitalizeFirst(getCategoryDisplayName(activeCatalogMainCategory, language))}
                                                    </button>
                                                </div>

                                                {relatedSubcategories.length > 0 ? (
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        {relatedSubcategories.map((sub) => (
                                                            <button
                                                                key={sub.id}
                                                                type="button"
                                                                onClick={() => applyCategory(sub.id)}
                                                                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                                                    String(category) === String(sub.id)
                                                                        ? 'border-[#1E85FF] bg-blue-50 text-[#1E85FF]'
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                                                }`}
                                                            >
                                                                <span>{capitalizeFirst(getCategoryDisplayName(sub, language))}</span>
                                                                <span className="text-[11px] font-bold text-slate-400">→</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                                                        {t('search.noSubcategories')}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                                                {t('search.selectMainCategory')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CONTENT AREA (Map or List) ─────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">

                        {/* MAP VIEW */}
                        {viewMode === 'map' && (
                            <div style={{ height: '65vh', minHeight: '420px', maxHeight: '780px' }}>
                                <MapContainer
                                    key={`map-${viewMode}`}
                                    center={mapCenter}
                                    zoom={14}
                                    style={{ height: '100%', width: '100%' }}
                                    className="z-10"
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {items.filter(i => i.latitude && i.longitude).map(item => (
                                        <Marker
                                            key={item.id}
                                            position={[item.latitude, item.longitude]}
                                            icon={item.status === 'LOST' ? lostIcon : foundIcon}
                                            ref={(marker) => {
                                                if (marker) markerRefs.current[item.id] = marker;
                                            }}
                                        >
                                            <Popup className="custom-popup" closeButton={false} minWidth={192} maxWidth={192}>
                                                <MapPopup item={item} />
                                            </Popup>
                                        </Marker>
                                    ))}
                                    <FocusedMarkerController focusedItem={focusedItem} />
                                    <ResizeMapController trigger={`${viewMode}-${items.length}-${focusedItemId || ''}`} />
                                </MapContainer>
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="p-3 sm:p-4 lg:p-6" style={{ minHeight: '420px' }}>
                                {loading ? (
                                    <div className="flex items-center justify-center py-24 text-slate-400 font-medium">
                                        <svg className="animate-spin w-6 h-6 mr-2 text-[#1E85FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                        </svg>
                                        {t('search.loading')}
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                        <Filter size={48} className="mb-4 opacity-20" />
                                        <p className="font-medium text-sm">{t('search.noResultsMessage')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                                            {items
                                                .slice(0, visibleCount)
                                                .map(item => {
                                                    const firstImg = item.images && item.images.length > 0 ? item.images[0].image : null;
                                                    let finalImg = firstImg;
                                                    if (finalImg && !finalImg.startsWith('http')) finalImg = `${BACKEND_URL}${finalImg}`;
                                                    return (
                                                        <HomeCart
                                                            key={item.id}
                                                            date={item.date_lost_or_found || t('common.unknown')}
                                                            title={item.title}
                                                            author={item.owner_name}
                                                            authorId={item.user}
                                                            image={finalImg}
                                                            authorImage={item.owner_picture}
                                                            onDetails={() => navigate(`/items/${item.id}`)}
                                                            onMap={() => navigate(`/items?focus=${item.id}&view=map`)}
                                                            itemId={item.id}
                                                            initialSaved={item.is_saved}
                                                            onSavedChange={handleCardSavedChange}
                                                        />
                                                    );
                                                })}
                                        </div>

                                        {/* Infinite scroll sentinel + spinner */}
                                        {visibleCount < items.length && (
                                            <div ref={sentinelRef} className="flex justify-center items-center py-8">
                                                <svg className="animate-spin w-6 h-6 text-[#1E85FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                                </svg>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT SIDE: Desktop Filter Sidebar ────────────────────── */}
                <div className="hidden lg:block w-72 xl:w-80 shrink-0">
                    <FilterPanel isMobile={false} />
                </div>

            </div>
        </div>
    );
}
