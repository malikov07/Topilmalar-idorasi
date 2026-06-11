import React from 'react';
import { MapPin, Phone, Clock, Instagram, Send, Facebook, Twitter } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useLanguage } from '../context/LanguageContext';

// Fix Leaflet's default marker icon under bundlers.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ───────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — replace with the real details. Everything the page shows lives
// here, so you only edit this one object.
// ───────────────────────────────────────────────────────────────────────────
const CONTACT = {
  address: "Kichik halqa yo'li 17, Toshkent, O'zbekiston",
  coordinates: [41.3507034, 69.2210652], // [latitude, longitude]
  phones: ['+998 93 509 36 36'],
  telegram: '@Khamidullaa',
  hours: "Dushanba–Juma, 9:00–18:00",
  socials: {
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
    facebook: 'https://facebook.com/',
    twitter: 'https://x.com/',
  },
};

export default function Contact() {
  const { t } = useLanguage();

  const infoCards = [
    {
      icon: MapPin,
      label: t('contact.address'),
      content: <span>{CONTACT.address}</span>,
    },
    {
      icon: Phone,
      label: t('contact.phone'),
      content: (
        <div className="flex flex-col">
          {CONTACT.phones.map((p) => (
            <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="hover:text-[#1E85FF] transition-colors">{p}</a>
          ))}
        </div>
      ),
    },
    {
      icon: Send,
      label: 'Telegram',
      content: <a href={`https://t.me/${CONTACT.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#1E85FF] transition-colors">{CONTACT.telegram}</a>,
    },
    {
      icon: Clock,
      label: t('contact.hours'),
      content: <span>{CONTACT.hours}</span>,
    },
  ];

  const socialLinks = [
    { key: 'instagram', icon: Instagram, url: CONTACT.socials.instagram },
    { key: 'telegram', icon: Send, url: CONTACT.socials.telegram },
    { key: 'facebook', icon: Facebook, url: CONTACT.socials.facebook },
    { key: 'twitter', icon: Twitter, url: CONTACT.socials.twitter },
  ].filter((s) => s.url);

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{t('contact.title')}</h1>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* Contact info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-900 mb-6">{t('contact.infoTitle')}</h2>

            <div className="space-y-5 flex-1">
              {infoCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="flex items-start gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-[#1E85FF] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                      <div className="text-slate-700 font-medium mt-0.5">{card.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('contact.followUs')}</p>
                <div className="flex gap-3">
                  {socialLinks.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.key}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.key}
                        className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-[#1E85FF] hover:text-white transition-colors"
                      >
                        <Icon size={18} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-900 mb-3 lg:hidden">{t('contact.mapTitle')}</h2>
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-72 lg:h-full min-h-[320px] relative z-0">
              <MapContainer
                center={CONTACT.coordinates}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={CONTACT.coordinates}>
                  <Popup>{CONTACT.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
