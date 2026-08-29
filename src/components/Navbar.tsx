import { Sun, Moon, Languages, Plus, ShieldCheck, LogOut } from 'lucide-react';
import { Language, ThemeMode, ActiveTab, AppUser } from '../types';
import { i18n } from '../utils/formatters';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAddModal: () => void;
  trashCount?: number;
  onOpenTrash?: () => void;
  user: AppUser | null;
  onLogout: () => void;
  onOpenAccountModal: () => void;
}

export function Navbar({
  currentTab,
  onTabChange,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  onOpenAddModal,
  user,
  onLogout,
  onOpenAccountModal,
}: NavbarProps) {
  const t = i18n[lang];

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'home', label: t.home },
    { id: 'persons', label: t.persons },
    { id: 'reports', label: t.reports },
    { id: 'settings', label: t.settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onTabChange('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                ₹
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {lang === 'hi' ? 'डिजिटल हिसाब' : 'Digital Hisaab'}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {lang === 'hi' ? 'सुरक्षित सिस्टम' : 'Secure System'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                  {lang === 'hi' ? 'डिजिटल हिसाब मैनेजमेंट सिस्टम' : 'Digital Hisaab Management System'}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  currentTab === item.id
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons: Add Hisaab, Profile/Logout, Language, Dark Mode */}
          <div className="flex items-center gap-2">
            {/* Quick Add Button */}
            <button
              id="btn-nav-add-person"
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-sm shadow-amber-500/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden xs:inline">{lang === 'hi' ? '+ नया हिसाब' : '+ Add Person'}</span>
              <span className="xs:hidden">{lang === 'hi' ? '+ नया' : '+ Add'}</span>
            </button>

            {/* Auth / Profile Button */}
            {user && (
              <button
                id="btn-nav-account-profile"
                type="button"
                onClick={onOpenAccountModal}
                className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
                title="Account Details"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || user.phoneNumber || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:inline text-xs font-bold truncate max-w-[100px]">
                  {user.displayName?.split(' ')[0] || user.phoneNumber?.slice(-4) || 'Profile'}
                </span>
              </button>
            )}

            {/* Direct Logout Button */}
            <button
              id="btn-nav-logout"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition cursor-pointer"
              title={lang === 'hi' ? 'लॉग आउट' : 'Log Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'hi' ? 'लॉग आउट' : 'Logout'}</span>
            </button>

            {/* Language Switch */}
            <button
              id="btn-toggle-lang"
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Change Language"
            >
              <Languages className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
