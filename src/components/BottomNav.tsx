import { Home, Users, Plus, BarChart3, Settings } from 'lucide-react';
import { ActiveTab, Language } from '../types';
import { i18n } from '../utils/formatters';

interface BottomNavProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  lang: Language;
}

export function BottomNav({
  currentTab,
  onTabChange,
  onOpenAddModal,
  lang,
}: BottomNavProps) {
  const t = i18n[lang];

  return (
    <div
      id="bottom-navigation-bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 px-3 py-1.5 shadow-lg pb-safe"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <button
          id="btn-bottom-home"
          type="button"
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'home'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.home}</span>
        </button>

        {/* Persons List */}
        <button
          id="btn-bottom-persons"
          type="button"
          onClick={() => onTabChange('persons')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'persons'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.persons}</span>
        </button>

        {/* Floating Add Center Button */}
        <button
          id="btn-bottom-add-center"
          type="button"
          onClick={onOpenAddModal}
          className="flex flex-col items-center justify-center -mt-5"
          aria-label="Add new hisaab"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1">
            {lang === 'hi' ? 'जोड़ें' : 'Add'}
          </span>
        </button>

        {/* Reports */}
        <button
          id="btn-bottom-reports"
          type="button"
          onClick={() => onTabChange('reports')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'reports'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.reports}</span>
        </button>

        {/* Settings */}
        <button
          id="btn-bottom-settings"
          type="button"
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'settings'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.settings}</span>
        </button>
      </div>
    </div>
  );
}
