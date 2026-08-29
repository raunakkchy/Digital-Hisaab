import { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Database,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Language, AppUser } from '../types';
import { i18n } from '../utils/formatters';

interface AccountModalProps {
  isOpen: boolean;
  user: AppUser | null;
  onClose: () => void;
  onLogout: () => void;
  lang: Language;
  totalRecordsCount: number;
}

export function AccountModal({
  isOpen,
  user,
  onClose,
  onLogout,
  lang,
  totalRecordsCount,
}: AccountModalProps) {
  const t = i18n[lang];
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      onLogout();
    }, 200);
  };

  if (!isOpen || !user) return null;

  return (
    <div
      id="account-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="account-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {lang === 'hi' ? 'उपयोगकर्ता खाता (Account)' : 'User Profile & Account'}
            </h2>
          </div>
          <button
            id="btn-close-account-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* User Info Card */}
          <div className="flex items-center gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-400 shadow-sm shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-extrabold text-xl shadow-sm shrink-0">
                {(user.displayName || user.email || user.phoneNumber || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-0.5 overflow-hidden">
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.displayName || (user.phoneNumber ? `User ${user.phoneNumber}` : 'Simple Hisaab User')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email || (user.phoneNumber ? `Mobile: ${user.phoneNumber}` : `ID: ${user.uid.slice(0, 12)}...`)}
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>
                  {user.providerId === 'google.com'
                    ? 'Google Authenticated'
                    : 'Salted SHA-256 Protected'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-300 font-semibold mb-1">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'hi' ? 'कुल हिसाब' : 'Total Records'}</span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {totalRecordsCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'hi' ? 'खाते' : 'entries'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
              <div className="flex items-center gap-1.5 text-xs text-indigo-900 dark:text-indigo-300 font-semibold mb-1">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{lang === 'hi' ? 'डेटा पृथक्करण' : 'Data Privacy'}</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                {lang === 'hi' ? 'सुरक्षित अलग खाता' : 'Dedicated Storage'}
              </div>
            </div>
          </div>

          {/* Big Primary Action: Go to Dashboard */}
          <button
            id="btn-account-continue-dashboard"
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-black text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.99] shadow-md shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'hi' ? 'डैशबोर्ड पर जाएं / हिसाब देखें' : 'Continue to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Action Buttons: Logout & Cancel */}
          <div className="pt-2 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-account-modal-logout"
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogoutClick}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'लॉग आउट करें' : 'Log Out'}</span>
            </button>

            <button
              id="btn-account-modal-close"
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {lang === 'hi' ? 'बंद करें (Close)' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
