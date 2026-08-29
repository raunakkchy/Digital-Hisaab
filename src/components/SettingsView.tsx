import { useState, useRef, type ChangeEvent } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Languages,
  Download,
  Upload,
  Trash2,
  Database,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Code,
  User as UserIcon,
  LogIn,
  LogOut,
  Cloud,
  Mail,
  Phone,
} from 'lucide-react';
import { Language, ThemeMode, AppUser } from '../types';
import { i18n } from '../utils/formatters';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';

interface SettingsViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  lang: Language;
  onSetLang: (lang: Language) => void;
  onDataRestored: () => void;
  onRequestClearAll: () => void;
  onLoadSample: () => void;
  totalRecordsCount: number;
  trashCount: number;
  onOpenTrash: () => void;
  onRestoreAllTrash: () => void;
  onEmptyTrash: () => void;
  user: AppUser | null;
  onOpenAccountModal: () => void;
}

export function SettingsView({
  theme,
  onToggleTheme,
  lang,
  onSetLang,
  onDataRestored,
  onRequestClearAll,
  onLoadSample,
  totalRecordsCount,
  trashCount,
  onOpenTrash,
  onRestoreAllTrash,
  onEmptyTrash,
  user,
  onOpenAccountModal,
}: SettingsViewProps) {
  const t = i18n[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExportBackup = () => {
    exportBackupJSON(user?.uid, user?.displayName || user?.email || user?.phoneNumber || 'account');
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importBackupJSON(content, user?.uid);
        if (result.success) {
          setImportStatus(
            lang === 'hi'
              ? `सफलतापूर्वक ${result.count} हिसाब रीस्टोर किए गए!`
              : `Successfully restored ${result.count} records!`
          );
          onDataRestored();
        } else {
          setImportStatus(result.error || 'Failed to import JSON backup');
        }
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-500" />
          <span>{t.settings}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {lang === 'hi'
            ? 'खाता, थीम, भाषा, डेटा बैकअप और सुरक्षा सेटिंग्स'
            : 'Manage account login, appearance, language, backup & cloud safety'}
        </p>
      </div>

      {/* 0. User Account & Authentication Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-amber-500" />
          <span>{lang === 'hi' ? 'उपयोगकर्ता खाता व क्लाउड सिंक (User Account)' : 'User Account & Cloud Sync'}</span>
        </h2>

        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                  {(user.displayName || user.email || user.phoneNumber || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {user.displayName || (user.phoneNumber ? `Mobile ${user.phoneNumber}` : 'Simple Hisaab User')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 flex items-center gap-0.5">
                    <Cloud className="w-2.5 h-2.5" />
                    {t.cloudSynced}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user.email || user.phoneNumber || 'Cloud Connected'}
                </div>
              </div>
            </div>

            <button
              id="btn-settings-view-account"
              type="button"
              onClick={onOpenAccountModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/80 hover:bg-emerald-50 transition shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              {lang === 'hi' ? 'खाता प्रबंधित करें' : 'Manage Account'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/60">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {lang === 'hi' ? 'आप अभी ऑफलाइन/गेस्ट मोड में हैं' : 'You are currently in Offline / Guest Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-md leading-relaxed">
                {lang === 'hi'
                  ? 'Google (Gmail) से लॉगिन करें ताकि आपका डेटा क्लाउड में हमेशा सुरक्षित रहे और फोन बदलने पर भी न खोए।'
                  : 'Log in with Google (Gmail) to ensure all your data is permanently backed up and synced to the cloud.'}
              </p>
            </div>

            <button
              id="btn-settings-login"
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'खाता बदलें / लॉगिन' : 'Switch / Login'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Appearance & Theme Setting */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>{lang === 'hi' ? 'दिखावट व थीम (Appearance)' : 'Appearance & Theme'}</span>
        </h2>

        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className="text-[11px] text-slate-500">
              {lang === 'hi' ? 'आंखों के लिए आरामदायक थीम' : 'Easy on the eyes in low light'}
            </span>
          </div>

          <button
            id="btn-settings-toggle-theme"
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Switch to Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span>Switch to Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Language Preference */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Languages className="w-4 h-4 text-amber-500" />
          <span>{lang === 'hi' ? 'भाषा चयन (Language Selection)' : 'Language Selection'}</span>
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            id="btn-lang-en"
            type="button"
            onClick={() => onSetLang('en')}
            className={`p-3.5 rounded-xl border text-left transition ${
              lang === 'en'
                ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 font-bold'
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-sm font-bold">English</div>
            <div className="text-[11px] text-slate-500">Standard English UI</div>
          </button>

          <button
            id="btn-lang-hi"
            type="button"
            onClick={() => onSetLang('hi')}
            className={`p-3.5 rounded-xl border text-left transition ${
              lang === 'hi'
                ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 font-bold'
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-sm font-bold">हिन्दी (Hindi)</div>
            <div className="text-[11px] text-slate-500">सरल ग्रामीण व स्थानीय भाषा</div>
          </button>
        </div>
      </div>

      {/* 3. Backup & Restore Data (LocalStorage) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'hi' ? 'डेटा बैकअप व सुरक्षा (Backup & Restore)' : 'Data Backup & Restore'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'hi'
              ? `वर्तमान में इस डिवाइस पर ${totalRecordsCount} हिसाब रिकॉर्ड सुरक्षित हैं।`
              : `Currently ${totalRecordsCount} records stored securely in browser LocalStorage.`}
          </p>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export JSON Backup */}
          <button
            id="btn-settings-export-backup"
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                {t.backupData}
              </span>
              <span className="text-[10px] text-slate-500">Save `hisaab_backup.json` to device</span>
            </div>
          </button>

          {/* Import JSON Backup */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
              id="input-file-restore"
            />
            <button
              id="btn-settings-import-backup"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {t.restoreData}
                </span>
                <span className="text-[10px] text-slate-500">Upload JSON backup file</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Demo Sample Data Loader */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {t.loadSampleData}
            </span>
            <span className="text-[10px] text-slate-500">
              {lang === 'hi' ? 'परीक्षण के लिए 5 डेमो रिकॉर्ड लोड करें' : 'Load 5 sample entries for testing'}
            </span>
          </div>

          <button
            id="btn-settings-load-sample"
            type="button"
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'डेमो डेटा' : 'Load Sample'}</span>
          </button>
        </div>

        {/* Clear All Data */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
              {t.clearAllData}
            </span>
            <span className="text-[10px] text-slate-500">
              {lang === 'hi' ? 'इस डिवाइस से सभी हिसाब मिटाएं' : 'Permanently remove all local hisaab'}
            </span>
          </div>

          <button
            id="btn-settings-clear-all"
            type="button"
            onClick={onRequestClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAllData}</span>
          </button>
        </div>
      </div>

      {/* 4. Trash & Recycle Bin (कचरा पेटी व डेटा रिकवरी) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{t.trashRecoveryTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'hi'
                ? `ट्रैश में वर्तमान में ${trashCount} हिसाब सुरक्षित रखे गए हैं। आप उन्हें जब चाहें वापस ला सकते हैं।`
                : `Currently ${trashCount} deleted records stored in Trash. You can restore or delete them forever.`}
            </p>
          </div>

          <button
            id="btn-settings-open-trash"
            type="button"
            onClick={onOpenTrash}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.trashBin} ({trashCount})</span>
          </button>
        </div>

        {trashCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-settings-restore-all-trash"
              type="button"
              onClick={onRestoreAllTrash}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.restoreAll} ({trashCount})</span>
            </button>

            <button
              id="btn-settings-empty-trash"
              type="button"
              onClick={onEmptyTrash}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.emptyTrash}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500">
            ✓ {t.trashEmptyTitle} — {t.trashEmptySubtitle}
          </div>
        )}
      </div>

      {/* 4. Village/Offline Usage & Local Server Help */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'hi' ? 'स्थानीय व ग्रामीण उपयोग की विशेषताएं' : 'Village & Local Features'}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <Smartphone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-slate-200 block">100% Offline Ready:</strong>
              Works without active internet after loading. Data stored in your browser.
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <Code className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-slate-200 block">Single-Click PDF & WhatsApp:</strong>
              Download professional receipts or send courteous WhatsApp reminders directly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
