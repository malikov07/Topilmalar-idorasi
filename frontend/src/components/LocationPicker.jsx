import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Component to set map view from external coordinates
const MapViewSetter = ({ externalCoordinates }) => {
    const map = useMapEvents({});
    
    useEffect(() => {
        if (externalCoordinates?.lat && externalCoordinates?.lng && map) {
            map.setView([externalCoordinates.lat, externalCoordinates.lng], 17);
        }
    }, [externalCoordinates, map]);
    
    return null;
};

// 1. The Map Listener: This silently watches the map as the user drags it
const MapCenterObserver = ({ onCenterChange, onUserMove }) => {
    const mapRef = useRef(null);
    const isInitializing = useRef(true);
    
    const map = useMapEvents({
        // Detect when user actually interacts with the map
        dragstart: () => {
            isInitializing.current = false;
        },
        moveend: () => {
            const center = map.getCenter();
            onCenterChange({ lat: center.lat, lng: center.lng });
            
            // Only trigger address update if this is NOT the initial load
            if (!isInitializing.current && onUserMove) {
                onUserMove();
            }
        }
    });
    
    mapRef.current = map;
    return null;
};

const LocationPicker = ({ onLocationSelect, onAddressFound, externalCoordinates }) => {
    const { t, language } = useLanguage();
    // Default center set to Tashkent (fallback)
    const [centerPos, setCenterPos] = useState({ lat: 41.311081, lng: 69.240562 });
    const [isUserMove, setIsUserMove] = useState(false);
    const [locationLoading, setLocationLoading] = useState(true);
    const geolocationAttempted = useRef(false);
    const mapInitialized = useRef(false);

    // Get user's current location on mount
    useEffect(() => {
        if (geolocationAttempted.current) return;
        geolocationAttempted.current = true;

        console.log('Attempting to get geolocation...');

        if ('geolocation' in navigator) {
            const timeoutId = setTimeout(() => {
                console.warn('Geolocation timeout - using default location');
                mapInitialized.current = true;
                setLocationLoading(false);
            }, 5000); // 5 second timeout before showing geolocation failed

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    const { latitude, longitude, accuracy } = position.coords;
                    console.log('Geolocation success:', latitude, longitude, 'accuracy:', accuracy);
                    setCenterPos({ lat: latitude, lng: longitude });
                    mapInitialized.current = true;
                    
                    // Send coordinates immediately (no address update yet)
                    if (onLocationSelect) {
                        onLocationSelect({ lat: latitude, lng: longitude });
                    }
                    setLocationLoading(false);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    console.error('Geolocation denied or failed:', error.code, error.message);
                    // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
                    const errorMessages = {
                        1: t('createItem.geolocationPermissionDenied'),
                        2: t('createItem.geolocationNoSignal'),
                        3: t('createItem.geolocationTimeout')
                    };
                    console.warn(errorMessages[error.code] || t('createItem.geolocationNotSupported'));
                    // Use default Tashkent coordinates
                    mapInitialized.current = true;
                    setLocationLoading(false);
                },
                { 
                    enableHighAccuracy: true, 
                    timeout: 10000,  // 10 second timeout
                    maximumAge: 0 
                }
            );
        } else {
            console.warn('Geolocation not available in this browser');
            mapInitialized.current = true;
            setLocationLoading(false);
        }
    }, [onLocationSelect]);

    // Reset user move flag when geolocation completes
    useEffect(() => {
        if (!locationLoading) {
            // Don't auto-trigger address updates after geolocation
            setIsUserMove(false);
        }
    }, [locationLoading]);

    // Send coordinates when user moves the map
    useEffect(() => {
        if (!isUserMove) return;

        const timeoutId = setTimeout(async () => {
            if (onLocationSelect) {
                onLocationSelect(centerPos);
            }
            
            // Reverse Geocoding to fetch address name (in Uzbek language) - ONLY when user moves map
            if (onAddressFound) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${centerPos.lat}&lon=${centerPos.lng}&format=jsonv2&accept-language=${language}`);
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const street = data.address.road || data.address.pedestrian || data.address.suburb || data.address.neighbourhood || "";
                        const num = data.address.house_number ? `${data.address.house_number}` : '';
                        const fullAddr = `${street} ${num}`.trim();
                        if (fullAddr) {
                            onAddressFound(fullAddr);
                        }
                    }
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                }
            }
        }, 800); // Wait 800ms after they stop dragging to update the form
        
        return () => clearTimeout(timeoutId);
    }, [centerPos, isUserMove, onLocationSelect, onAddressFound]);

    return (
        <div className="max-w-3xl h-64 rounded-2xl overflow-hidden border border-blue-100 relative shadow-sm bg-slate-50">
            
            {/* 2. The Map Layer */}
            <MapContainer 
                center={[centerPos.lat, centerPos.lng]} 
                zoom={17} 
                scrollWheelZoom={true}
                zoomControl={true}
                className="w-full h-full z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapViewSetter externalCoordinates={externalCoordinates} />
                <MapCenterObserver onCenterChange={setCenterPos} onUserMove={() => setIsUserMove(true)} />
            </MapContainer>
            
            {/* 3. The Fixed Center Pin (Telegram Style) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                {/* The Pin Icon */}
                <MapPin className="w-10 h-10 text-[#1e85ff] drop-shadow-md" fill="#1e85ff" stroke="white" strokeWidth={1.5} />
                
                {/* A little shadow/dot under the pin to show the EXACT center point */}
                <div className="w-2 h-1 bg-blue-500/30 rounded-[100%] absolute -bottom-0.5 blur-[1px]"></div>
            </div>

            {/* Optional: Live Coordinates Display for the user */}
            <div className="absolute top-3 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
                <span className="bg-white/95 text-blue-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-blue-100">
                    {locationLoading ? t('createItem.locating') : t('createItem.mapDragHint')}
                </span>
            </div>

            <div className="absolute bottom-3 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
                <span className="bg-white/95 text-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-blue-100">
                    {centerPos.lat.toFixed(5)}, {centerPos.lng.toFixed(5)}
                </span>
            </div>
            
        </div>
    );
};

export default LocationPicker;