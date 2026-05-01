import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryDisplayName } from '../utils/category';
import {
    AlertCircle,
    AlignLeft,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Camera,
    Camera as CameraIcon,
    CheckCircle2,
    Loader2,
    MapPin,
    Phone,
    Plus,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import api from '../service/api';
import LocationPicker from '../components/LocationPicker';

const MAX_IMAGES = 5;

const CreateItemPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const STEP_LABELS = [
      t('createItem.step1'),
      t('createItem.step2'),
      t('createItem.step3'),
      t('createItem.step4'),
      t('createItem.step5'),
    ];

    const [currentStep, setCurrentStep] = useState(1);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [suggestedCategories, setSuggestedCategories] = useState([]);
    const [isSafe, setIsSafe] = useState(true);
    const [rejectReason, setRejectReason] = useState(null);

    const [status, setStatus] = useState('LOST');
    const [title, setTitle] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [dateLost, setDateLost] = useState('');
    const [locationLost, setLocationLost] = useState('');
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
    const [contactInfo, setContactInfo] = useState('');

    const reverseGeocodeCoordinates = async (coords) => {
        if (!coords?.lat || !coords?.lng || locationLost || isEditingAddress) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=jsonv2&accept-language=${language}`
            );
            const data = await response.json();
            if (data) {
                const street = data.address?.road || data.address?.pedestrian || data.address?.suburb || data.address?.neighbourhood || '';
                const num = data.address?.house_number ? `${data.address.house_number}` : '';
                const fullAddr = street || num ? `${street} ${num}`.trim() : data.display_name || '';
                if (fullAddr) {
                    setLocationLost(fullAddr);
                }
            }
        } catch (err) {
            console.error('Reverse geocoding failed:', err);
        }
    };
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [createdItem, setCreatedItem] = useState(null);

    const getCurrentLocation = async () => {
        setLocating(true);
        setError(null);

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoordinates({ lat: latitude, lng: longitude });
                    console.log('Geolocation success:', latitude, longitude);

                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&accept-language=uz`
                        );
                        const data = await response.json();

                        if (data && data.address) {
                            const street =
                                data.address.road ||
                                data.address.pedestrian ||
                                data.address.suburb ||
                                data.address.neighbourhood ||
                                '';
                            const num = data.address.house_number ? `${data.address.house_number}` : '';
                            const fullAddr = `${street} ${num}`.trim();
                            if (fullAddr) {
                                setLocationLost(fullAddr);
                                setIsEditingAddress(false);
                            }
                        }
                    } catch (err) {
                        console.error('Reverse geocoding error:', err);
                    }

                    setLocating(false);
                },
                (error) => {
                    console.error('Geolocation error:', error.message, error.code);
                    const errorMessages = {
                        1: t('createItem.geolocationPermissionDenied'),
                        2: t('createItem.geolocationNoSignal'),
                        3: t('createItem.geolocationTimeout'),
                    };
                    setError(errorMessages[error.code] || t('createItem.geolocationNotSupported'));
                    setLocating(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setError(t('createItem.geolocationNotSupported'));
            setLocating(false);
        }
    };

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    useEffect(() => {
        return () => {
            imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const compressFiles = async (files) => {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
        };

        const selected = Array.from(files || []).slice(0, MAX_IMAGES);
        if (!selected.length) return [];

        const compressed = await Promise.all(
            selected.map(async (file, index) => {
                const blob = await imageCompression(file, options);
                return new File([blob], file.name || `photo_${Date.now()}_${index}.jpg`, {
                    type: blob.type,
                });
            })
        );

        return compressed;
    };

    const analyzeNewImageFiles = async (files) => {
        if (!files || files.length === 0) return { ok: true, suggestedCategories: [] };
        setAiAnalyzing(true);
        setError(null);

        try {
            let suggestedCategories = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('image', file);
                const response = await api.post('/api/items/analyze-image/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (response.data?.is_safe === false) {
                    setIsSafe(false);
                    setRejectReason(response.data.reject_reason || 'Nomaʼlum sabab');
                    setError(`Rasm rad etildi: ${response.data.reject_reason || 'Nomaʼlum sabab'}`);
                    return { ok: false, suggestedCategories: [] };
                }

                if (!suggestedCategories.length && response.data?.suggested_categories?.length) {
                    suggestedCategories = response.data.suggested_categories;
                }
            }

            return { ok: true, suggestedCategories };
        } catch (err) {
            console.error(err);
            setError(t('createItem.imageProcessingError'));
            return { ok: false, suggestedCategories: [] };
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleImageSelect = async (fileList) => {
        try {
            const files = await compressFiles(fileList);
            if (!files.length) return;

            const { ok, suggestedCategories: newSuggested } = await analyzeNewImageFiles(files);
            if (!ok) return;

            const mergedFiles = [...imageFiles, ...files].slice(0, MAX_IMAGES);
            imagePreviews.forEach((url) => URL.revokeObjectURL(url));
            const previews = mergedFiles.map((file) => URL.createObjectURL(file));

            setImageFiles(mergedFiles);
            setImagePreviews(previews);
            setError(null);
            setRejectReason(null);
            setIsSafe(true);
            if (newSuggested.length) setSuggestedCategories(newSuggested);
        } catch (err) {
            console.error(err);
            setError(t('createItem.imageProcessingError'));
        }
    };

    const appendCapturedImage = async (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const nextFiles = await compressFiles([file]);
        if (!nextFiles.length) return;

        const { ok, suggestedCategories: newSuggested } = await analyzeNewImageFiles(nextFiles);
        if (!ok) return;

        const mergedFiles = [...imageFiles, ...nextFiles].slice(0, MAX_IMAGES);
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        const previews = mergedFiles.map((item) => URL.createObjectURL(item));

        setImageFiles(mergedFiles);
        setImagePreviews(previews);
        setError(null);
        setRejectReason(null);
        setIsSafe(true);
        if (newSuggested.length) setSuggestedCategories(newSuggested);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;
            setShowCamera(true);
        } catch (err) {
            console.error(err);
            setError(t('createItem.cameraAccessDenied'));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (blob) {
                await appendCapturedImage(blob);
                stopCamera();
            }
        }, 'image/jpeg', 0.82);
    };

    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [showCamera]);

    const removeImage = (index) => {
        const nextFiles = imageFiles.filter((_, i) => i !== index);
        const nextPreviews = imagePreviews.filter((_, i) => i !== index);
        setImageFiles(nextFiles);
        setImagePreviews(nextPreviews);
        if (!nextFiles.length) {
            setSuggestedCategories([]);
            setIsSafe(true);
            setRejectReason(null);
        }
    };

    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('status', status);
        formData.append('title', title.trim());
        formData.append('description', description);
        formData.append('date_lost_or_found', dateLost);
        formData.append('location_address', locationLost);
        formData.append('contact_info', contactInfo);
        formData.append('suggested_categories', selectedCategories.join(','));

        imageFiles.forEach((file) => {
            formData.append('uploaded_images', file);
        });

        if (coordinates.lat && coordinates.lng) {
            formData.append('latitude', coordinates.lat);
            formData.append('longitude', coordinates.lng);
        }

        try {
            const response = await api.post('/api/items/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCreatedItem(response.data);
            setSuccess(true);
        } catch (err) {
            console.error(err);
            const backendErrors = err.response?.data;
            if (backendErrors) {
                setError(Object.values(backendErrors).flat().join(', ') || 'Xatolik yuz berdi.');
            } else {
                setError('Xatolik yuz berdi.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const postedImages =
        createdItem?.images?.map((img) => img.image).filter(Boolean) ||
        (imagePreviews.length ? imagePreviews : []);

    return (
        <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
                {!success && (
                    <div className="mb-4 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">{t('createItem.title')}</p>
                                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                                    {t('createItem.uploadSubtitle')}
                                </h1>
                            </div>
                            <div className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:block">
                                {currentStep}/{STEP_LABELS.length}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {STEP_LABELS.map((label, index) => {
                                const step = index + 1;
                                const active = step === currentStep;
                                const done = step < currentStep;
                                return (
                                    <button
                                        type="button"
                                        key={label}
                                        onClick={() => step < currentStep && setCurrentStep(step)}
                                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold transition ${
                                            active
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : done
                                                ? 'border-blue-200 bg-white text-blue-600 hover:border-blue-300'
                                                : 'border-slate-200 bg-white text-slate-400'
                                        } ${step < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <span
                                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                active
                                                    ? 'bg-blue-500 text-white'
                                                    : done
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {done ? '✓' : step}
                                        </span>
                                        <span className="hidden truncate sm:block">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                            <p className="text-sm font-medium leading-6">{error}</p>
                        </div>
                    </div>
                )}

                {success && createdItem && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.10)]">
                        <div className="border-b border-blue-50 bg-gradient-to-br from-blue-50 to-white px-4 py-8 text-center sm:px-6">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-white shadow-sm">
                                <CheckCircle2 className="h-8 w-8 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('createItem.postingSuccessTitle')}</h2>
                            <p className="mt-2 text-sm text-slate-500">{t('createItem.postingSuccessText')}</p>
                        </div>

                        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-4 p-4 sm:p-6">
                                {postedImages.length > 0 && (
                                    <div className={`grid gap-3 ${postedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {postedImages.slice(0, MAX_IMAGES).map((img, index) => (
                                            <img
                                                key={index}
                                                src={img}
                                                alt={createdItem.title}
                                                className="h-44 w-full rounded-2xl border border-blue-100 object-cover shadow-sm"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('createItem.statusLabel')}</p>
                                        <p className="mt-1 text-base font-bold text-slate-900">
                                            {createdItem.status === 'LOST' ? t('createItem.statusLostText') : t('createItem.statusFoundText')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('createItem.locationLabel')}</p>
                                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">
                                            {createdItem.location_address || locationLost}
                                        </p>
                                    </div>
                                </div>

                                {createdItem.categories?.length > 0 && (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">{t('createItem.categoriesLabel')}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {createdItem.categories.map((cat) => (
                                                <span key={cat.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                                                    {getCategoryDisplayName(cat, language)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-blue-50 bg-slate-50/60 p-4 sm:border-l sm:border-t-0 sm:p-6">
                                <div className="space-y-4">
                                    <DetailRow label={t('createItem.titleLabel')} value={createdItem.title} />
                                    {createdItem.date_lost_or_found && (
                                        <DetailRow
                                            label={t('createItem.dateLabel')}
                                            value={new Date(createdItem.date_lost_or_found).toLocaleDateString('uz-UZ')}
                                        />
                                    )}
                                    {createdItem.contact_info && <DetailRow label={t('createItem.contactLabel')} value={createdItem.contact_info} />}
                                    {createdItem.description && <DetailRow label={t('createItem.descriptionLabel')} value={createdItem.description} />}
                                </div>

                                <div className="mt-6 grid gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/items/${createdItem.id}`)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
                                    >
                                        {t('createItem.viewItemButton')} <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="inline-flex items-center justify-center rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                                    >
                                        {t('createItem.homePageButton')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!success && currentStep === 1 && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.08)]">
                        <div className="border-b border-blue-50 px-4 py-4 sm:px-6">
                                <p className="text-lg font-extrabold tracking-tight text-slate-900">{t('createItem.uploadSectionTitle')}</p>
                                <p className="mt-1 text-sm text-slate-500">{t('createItem.uploadSectionSubtitle')}</p>
                        </div>

                        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
                                    {imagePreviews.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className={`grid gap-3 ${imagePreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={preview} className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                                                        <img src={preview} alt={`Preview ${index + 1}`} className="h-44 w-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-slate-600 shadow-sm transition hover:bg-blue-500 hover:text-white"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={startCamera}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                                >
                                                    <CameraIcon className="h-4 w-4" /> {t('createItem.camera')}
                                                </button>
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
                                                    <Plus className="h-4 w-4" /> {t('createItem.addPhoto')}
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => handleImageSelect(e.target.files)}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/70">
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                                <Camera className="h-6 w-6" />
                                            </div>
                                            <p className="text-base font-bold text-slate-900">{t('createItem.uploadHeading')}</p>
                                            <p className="mt-1 text-sm text-slate-500">{t('createItem.imageFormats')}</p>
                                            <div className="mt-4 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white">
                                                <Plus className="h-4 w-4" /> {t('createItem.uploadButton')}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleImageSelect(e.target.files)}
                                            />
                                        </label>
                                    )}
                                </div>

                                {aiAnalyzing ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                                        <Loader2 className="h-4 w-4 animate-spin" /> {t('createItem.analyzing')}
                                    </div>
                                ) : rejectReason ? (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                        {rejectReason}
                                    </div>
                                ) : isSafe && imagePreviews.length > 0 ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                                        <CheckCircle2 className="h-4 w-4" /> {t('createItem.aiSafe')}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:p-5">
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('createItem.statusLabel')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setStatus('LOST')}
                                            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                                                status === 'LOST'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                            }`}
                                        >
                                            {t('createItem.lostStatus')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatus('FOUND')}
                                            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                                                status === 'FOUND'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                            }`}
                                        >
                                            {t('createItem.foundStatus')}
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
                                    <Sparkles className="mb-2 h-4 w-4 text-blue-500" />
                                    {t('createItem.aiHelpText')}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                                    >
                                        {t('createItem.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(2)}
                                        className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
                                    >
                                        {t('createItem.next')} <ArrowRight className="ml-1 inline h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!success && currentStep === 2 && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.08)]">
                        <div className="border-b border-blue-50 px-4 py-4 sm:px-6">
                                <p className="text-lg font-extrabold tracking-tight text-slate-900">{t('createItem.titleSectionTitle')}</p>
                                <p className="mt-1 text-sm text-slate-500">{t('createItem.titleSectionSubtitle')}</p>
                        </div>

                        <div className="grid gap-4 p-4 sm:p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('createItem.itemTitle')}</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={status === 'LOST' ? t('createItem.titlePlaceholderLost') : t('createItem.titlePlaceholderFound')}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-blue-500" />
                                    <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('createItem.aiHelpText')}</label>
                                </div>
                                {suggestedCategories.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {suggestedCategories.map((cat) => (
                                            <button
                                                type="button"
                                                key={cat}
                                                onClick={() => toggleCategory(cat)}
                                                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                                    selectedCategories.includes(cat)
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                                                }`}
                                            >
                                                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border border-current text-[10px]">
                                                    {selectedCategories.includes(cat) ? '✓' : ''}
                                                </span>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                                        {t('createItem.noAICategorySuggestions')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 border-t border-blue-50 bg-slate-50/60 px-4 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <ArrowLeft className="mr-1 inline h-4 w-4" /> {t('createItem.back')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                disabled={!title.trim()}
                                className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-200"
                            >
                                {t('createItem.next')} <ArrowRight className="ml-1 inline h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!success && currentStep === 3 && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.08)]">
                        <div className="border-b border-blue-50 px-4 py-4 sm:px-6">
                            <p className="text-lg font-extrabold tracking-tight text-slate-900">{t('createItem.locationSectionTitle')}</p>
                            <p className="mt-1 text-sm text-slate-500">{t('createItem.locationSectionSubtitle')}</p>
                        </div>

                        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <Calendar className="h-4 w-4 text-blue-500" /> Sana
                                </label>
                                <input
                                    type="date"
                                    value={dateLost}
                                    onChange={(e) => setDateLost(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                        <MapPin className="h-4 w-4 text-blue-500" /> Joylashuv
                                    </label>
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        disabled={locating}
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                    >
                                        {locating ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin" /> {t('createItem.locating')}
                                            </>
                                        ) : (
                                            <>
                                                <MapPin className="h-3 w-3" /> {t('createItem.useGPS')}
                                            </>
                                        )}
                                    </button>
                                </div>
                                <LocationPicker
                                    onLocationSelect={(coords) => {
                                        setCoordinates(coords);
                                        reverseGeocodeCoordinates(coords);
                                    }}
                                    externalCoordinates={coordinates}
                                    onAddressFound={(address) => {
                                        if (!isEditingAddress) {
                                            setLocationLost(address);
                                        }
                                    }}
                                />
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        value={locationLost}
                                        onFocus={() => setIsEditingAddress(true)}
                                        onBlur={() => setIsEditingAddress(false)}
                                        onChange={(e) => setLocationLost(e.target.value)}
                                        placeholder={t('createItem.locationPlaceholder')}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 border-t border-blue-50 bg-slate-50/60 px-4 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <ArrowLeft className="mr-1 inline h-4 w-4" /> {t('createItem.back')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(4)}
                                className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
                            >
                                {t('createItem.next')} <ArrowRight className="ml-1 inline h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!success && currentStep === 4 && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.08)]">
                        <div className="border-b border-blue-50 px-4 py-4 sm:px-6">
                            <p className="text-lg font-extrabold tracking-tight text-slate-900">{t('createItem.contactSectionTitle')}</p>
                            <p className="mt-1 text-sm text-slate-500">{t('createItem.contactSectionSubtitle')}</p>
                        </div>

                        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <Phone className="h-4 w-4 text-blue-500" /> {t('createItem.contactLabel')}
                                </label>
                                <input
                                    type="text"
                                    value={contactInfo}
                                    onChange={(e) => setContactInfo(e.target.value)}
                                    placeholder={t('createItem.contactPlaceholder')}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <AlignLeft className="h-4 w-4 text-blue-500" /> {t('createItem.descriptionLabel')}
                                </label>
                                <textarea
                                    rows="4"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('createItem.descriptionPlaceholder')}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 border-t border-blue-50 bg-slate-50/60 px-4 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <ArrowLeft className="mr-1 inline h-4 w-4" /> {t('createItem.back')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(5)}
                                className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
                            >
                                {t('createItem.reviewPostButton')} <ArrowRight className="ml-1 inline h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!success && currentStep === 5 && (
                    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,133,255,0.08)]">
                        <div className="border-b border-blue-50 px-4 py-4 sm:px-6">
                            <p className="text-lg font-extrabold tracking-tight text-slate-900">{t('createItem.reviewSectionTitle')}</p>
                            <p className="mt-1 text-sm text-slate-500">{t('createItem.reviewSectionSubtitle')}</p>
                        </div>

                        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-4">
                                {imagePreviews.length > 0 && (
                                    <div className={`grid gap-3 ${imagePreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {imagePreviews.map((preview, index) => (
                                            <img
                                                key={preview}
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="h-36 w-full rounded-2xl border border-blue-100 object-cover shadow-sm"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <ReviewCard label={t('createItem.statusLabel')} value={status === 'LOST' ? t('createItem.statusLostText') : t('createItem.statusFoundText')} />
                                    <ReviewCard label={t('createItem.dateLabel')} value={dateLost || t('createItem.notSelected')} />
                                    <ReviewCard label={t('createItem.locationLabel')} value={locationLost || t('createItem.notProvided')} className="sm:col-span-2" />
                                </div>

                                {selectedCategories.length > 0 && (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">{t('createItem.categoriesLabel')}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedCategories.map((cat) => (
                                                <span key={cat} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
                                <div className="space-y-3">
                                    {title && <ReviewCard label={t('createItem.titleLabel')} value={title} />}
                                    {contactInfo && <ReviewCard label={t('createItem.contactLabel')} value={contactInfo} />}
                                    {description && <ReviewCard label={t('createItem.descriptionLabel')} value={description} />}
                                </div>

                                <div className="mt-6 grid gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-200"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        {t('createItem.reviewPostButton')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(4)}
                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                                    >
                                        <ArrowLeft className="mr-1 h-4 w-4" /> {t('createItem.back')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showCamera && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-4">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-200 bg-slate-900 shadow-2xl">
                        <button
                            type="button"
                            onClick={stopCamera}
                            className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <video ref={videoRef} autoPlay playsInline className="aspect-[3/4] w-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <button
                                type="button"
                                onClick={captureImage}
                                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-blue-500 shadow-lg shadow-blue-500/30 transition hover:scale-105 active:scale-95"
                            >
                                <div className="h-11 w-11 rounded-full border border-white/60 bg-blue-400" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailRow = ({ label, value, className = '' }) => (
    <div className={`flex justify-between py-3 ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
);

const ReviewCard = ({ label, value, className = '' }) => (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 ${className}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
);

export default CreateItemPage;
