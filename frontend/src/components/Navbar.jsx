import React, { useState } from 'react';
import { Search, Menu, X, User, LogOut, Settings, FileText, AlertTriangle, Globe, MessageCircle } from 'lucide-react';
import Dropdown from './DropDown';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const { unreadTotal } = useChat();
  const { language, setLanguage, t } = useLanguage();
  const BACKEND_URL = "http://127.0.0.1:8000";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const avatarLabel = (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-block font-bold text-sm">
        {user?.first_name || t('navbar.userProfile')}
      </span>
      {user?.avatar ? (
        <img
          src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
          alt={t('navbar.userProfile')}
          className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
          <User className="w-4 h-4 text-slate-500" />
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full flex flex-col shadow-sm">
      {/* Test Mode Banner */}
      <div className="bg-amber-100 border-b border-amber-200 py-1.5 flex overflow-hidden whitespace-nowrap text-amber-800 text-xs sm:text-sm font-semibold">
        <div className="animate-marquee flex items-center min-w-max">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-6">
              <AlertTriangle size={16} className="shrink-0" />
              <p>{t('navbar.testMode')}</p>
            </div>
          ))}
        </div>
      </div>

      <nav className="relative w-full bg-white border-b border-slate-100">
        <div className="w-full max-w-7xl mx-auto h-16 px-2.5 sm:px-4 lg:px-6 flex items-center justify-between font-sans gap-2 sm:gap-3">

        {/* Logo */}
        <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2 cursor-pointer min-w-0 shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            <img src="/img/logo.png" alt="Topilmalar Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-base sm:text-2xl font-extrabold text-[#1E85FF] tracking-tight truncate">Topilmalar</span>
        </Link>

        {/* Desktop Nav Links — visible from lg+ */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-[#0F172A] font-semibold text-sm flex-1 justify-center">
          <Link to="/items" className="hover:text-blue-600 transition-colors whitespace-nowrap">{t('navbar.searchLink')}</Link>
          {user && <Link to="/profile" className="hover:text-blue-600 transition-colors whitespace-nowrap">{t('navbar.profileLink')}</Link>}
          <Link to="/contact" className="hover:text-blue-600 transition-colors whitespace-nowrap">{t('footer.contact')}</Link>
        </div>

        {/* Right Side — visible from md+ */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Search */}
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              const searchVal = e.target.search.value;
              navigate(`/items?search=${encodeURIComponent(searchVal)}`);
            }}
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              name="search"
              type="text"
              placeholder={t('navbar.searchPlaceholder')}
              className="pl-10 pr-4 py-2 bg-[#EEF4FA] rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 w-40 lg:w-52 xl:w-64 text-slate-700 placeholder:text-slate-400 transition-all"
            />
          </form>

          {/* Language Switcher */}
          <Dropdown
            label={
              <div className="flex items-center gap-2 px-2 py-2">
                <Globe size={18} className="text-slate-600" />
                <span className="text-sm font-semibold text-slate-700 uppercase">{language}</span>
              </div>
            }
            items={[
              { label: '🇺🇿 Ўзбек', onClick: () => setLanguage('uz') },
              { label: '🇷🇺 Русский', onClick: () => setLanguage('ru') },
              { label: '🇬🇧 English', onClick: () => setLanguage('en') },
            ]}
          />

          {/* Post button */}
          <Link to="/create-item">
            <button className="bg-[#1E85FF] hover:bg-blue-600 text-white px-4 lg:px-6 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap">
              {t('createItem.title').split(' ').slice(0, 2).join(' ')}
            </button>
          </Link>

          {/* Chat icon */}
          {user && (
            <Link
              to="/chat"
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label={t('chat.title')}
            >
              <MessageCircle size={22} />
              {unreadTotal > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </Link>
          )}

          {/* User dropdown */}
          {user ? (
            <Dropdown
              label={avatarLabel}
              items={[
                { label: `${user?.first_name || t('dialogs.confirm')} ${user?.last_name || ''}`, href: '/profile' },
                { label: t('profile.myItems'), href: '/profile' },
                { label: t('navbar.settings'), href: '/settings' },
                { type: 'divider' },
                { type: 'button', label: t('navbar.logout'), danger: true, onClick: logoutUser },
              ]}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <Link to="/login" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">{t('navbar.loginLink')}</Link>
              <Link to="/register" className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900 whitespace-nowrap">{t('navbar.registerLink')}</Link>
            </div>
          )}
        </div>

        {/* Hamburger — visible below lg */}
        <button
          className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={t('navbar.searchLink')}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Menu Dropdown ─────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-2xl z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">

            {/* Search */}
            <form
              className="relative mb-2"
              onSubmit={(e) => {
                e.preventDefault();
                const searchVal = e.target.search.value;
                navigate(`/items?search=${encodeURIComponent(searchVal)}`);
                closeMobileMenu();
              }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="search"
                type="text"
                placeholder={t('navbar.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-3 bg-[#EEF4FA] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </form>

            {/* Language Switcher */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 mb-2">{t('navbar.language')}</p>
              <div className="flex gap-2">
                {['uz', 'ru', 'en'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      language === lang
                        ? 'bg-[#1E85FF] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Nav links */}
            <Link
              to="/items"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              {t('navbar.searchLink')}
            </Link>
            <Link
              to="/contact"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              {t('footer.contact')}
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={14} className="text-slate-500" />
                    )}
                  </div>
                  {user?.first_name || t('navbar.userProfile')} {user?.last_name || ''}
                </Link>
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  <FileText size={16} className="text-slate-400" />
                  {t('profile.myItems')}
                </Link>
                <Link
                  to="/chat"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  <MessageCircle size={16} className="text-slate-400" />
                  {t('chat.title')}
                  {unreadTotal > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadTotal > 9 ? '9+' : unreadTotal}
                    </span>
                  )}
                </Link>
                <Link
                  to="/settings"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Settings size={16} className="text-slate-400" />
                  {t('navbar.settings')}
                </Link>

                <div className="border-t border-slate-100 mt-1 pt-2">
                  <Link to="/create-item" onClick={closeMobileMenu}>
                    <button className="w-full bg-[#1E85FF] text-white py-3 rounded-xl font-bold mb-2 hover:bg-blue-600 transition-colors">
                      {t('createItem.title').split(' ').slice(0, 2).join(' ')}
                    </button>
                  </Link>
                  <button
                    onClick={() => { logoutUser(); closeMobileMenu(); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> {t('navbar.logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-slate-100 mt-1 pt-3 flex flex-col gap-2">
                <Link to="/create-item" onClick={closeMobileMenu}>
                  <button className="w-full bg-[#1E85FF] text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors">
                    {t('createItem.title').split(' ').slice(0, 2).join(' ')}
                  </button>
                </Link>
                <div className="flex gap-2">
                  <Link to="/login" onClick={closeMobileMenu} className="flex-1">
                    <button className="w-full py-3 rounded-xl font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                      {t('navbar.loginLink')}
                    </button>
                  </Link>
                  <Link to="/register" onClick={closeMobileMenu} className="flex-1">
                    <button className="w-full py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                      {t('navbar.registerLink')}
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  </header>
  );
}
