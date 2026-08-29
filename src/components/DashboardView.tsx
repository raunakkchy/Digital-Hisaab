import { useState } from 'react';
import {
  Users,
  IndianRupee,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Plus,
  ArrowRight,
  Phone,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  MessageCircle,
  Eye,
  FileText,
} from 'lucide-react';
import { PersonHisaab, Language, DashboardStats } from '../types';
import {
  formatCurrency,
  formatDate,
  generateProfessionalWhatsAppMessage,
  getWhatsAppUrl,
  i18n,
} from '../utils/formatters';
import { exportAllPdf, exportAllCsv } from '../utils/export';

interface DashboardViewProps {
  persons: PersonHisaab[];
  stats: DashboardStats;
  lang: Language;
  onOpenAddModal: () => void;
  onViewPerson: (person: PersonHisaab) => void;
  onToggleStatus: (person: PersonHisaab) => void;
  onNavigateToPersons: (initialFilter?: 'pending' | 'paid' | 'all') => void;
  onLoadSample: () => void;
  onPreviewFullReport?: () => void;
  onPreviewPersonPdf?: (person: PersonHisaab) => void;
}

export function DashboardView({
  persons,
  stats,
  lang,
  onOpenAddModal,
  onViewPerson,
  onToggleStatus,
  onNavigateToPersons,
  onLoadSample,
  onPreviewFullReport,
  onPreviewPersonPdf,
}: DashboardViewProps) {
  const t = i18n[lang];
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered persons based on quick search
  const filteredPersons = persons.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.mobile && p.mobile.includes(term)) ||
      (p.note && p.note.toLowerCase().includes(term))
    );
  });

  const pendingPersonsList = persons.filter((p) => p.status === 'pending').slice(0, 5);
  const recentPersonsList = filteredPersons.slice(0, 6);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Background decorative pattern */}
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'दैनिक बहीखाता' : 'Active Ledger'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === 'hi' ? 'सरल हिसाब डैशबोर्ड' : 'Simple Hisaab Overview'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {lang === 'hi'
                ? 'दिए गए रुपये, ब्याज और बकाये की संपूर्ण जानकारी एक नज़र में।'
                : 'Fast, offline and mobile-friendly interest & money management.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-dash-add-person"
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 shadow-lg shadow-amber-500/25 transition cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>{lang === 'hi' ? '+ नया हिसाब जोड़ें' : '+ Add Person'}</span>
            </button>

            {persons.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {onPreviewFullReport && (
                  <button
                    id="btn-dash-preview-pdf"
                    type="button"
                    onClick={onPreviewFullReport}
                    className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 backdrop-blur-xs transition cursor-pointer"
                    title={lang === 'hi' ? 'PDF रिपोर्ट प्रिव्यू देखें' : 'Preview PDF Report'}
                  >
                    <Eye className="w-4 h-4 text-rose-400" />
                    <span>{lang === 'hi' ? 'PDF प्रिव्यू' : 'Preview PDF'}</span>
                  </button>
                )}

                <button
                  id="btn-dash-export-pdf"
                  type="button"
                  onClick={() => exportAllPdf(persons)}
                  className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xs transition"
                  title="Download PDF Report"
                >
                  <FileDown className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">PDF</span>
                </button>

                <button
                  id="btn-dash-export-csv"
                  type="button"
                  onClick={() => exportAllCsv(persons)}
                  className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xs transition"
                  title="Download CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards Grid (6 primary cards as requested) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Persons */}
        <div
          id="card-total-persons"
          onClick={() => onNavigateToPersons('all')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.totalPersons}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.totalPersons}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.paidPersonsCount} {lang === 'hi' ? 'चुकता' : 'paid'} • {stats.pendingPersonsCount} {lang === 'hi' ? 'बाकी' : 'pending'}
          </p>
        </div>

        {/* Total Principal Amount */}
        <div
          id="card-total-principal"
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.totalPrincipal}</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            {formatCurrency(stats.totalPrincipal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === 'hi' ? 'मूल रुपया दिया गया' : 'Principal given'}
          </p>
        </div>

        {/* Total Amount (Principal + Interest) */}
        <div
          id="card-total-amount"
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.totalAmount}</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            {formatCurrency(stats.totalAmount)}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
            +{formatCurrency(stats.totalInterest)} {lang === 'hi' ? 'ब्याज' : 'interest'}
          </p>
        </div>

        {/* Total Paid Amount */}
        <div
          id="card-total-paid"
          onClick={() => onNavigateToPersons('paid')}
          className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs cursor-pointer hover:border-emerald-300 transition"
        >
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.totalPaidAmount}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 truncate">
            {formatCurrency(stats.totalPaidAmount)}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
            {stats.paidPersonsCount} {lang === 'hi' ? 'व्यक्तियों से प्राप्त' : 'persons paid'}
          </p>
        </div>

        {/* Total Pending Amount */}
        <div
          id="card-total-pending"
          onClick={() => onNavigateToPersons('pending')}
          className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs cursor-pointer hover:border-amber-300 transition"
        >
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.totalPendingAmount}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 truncate">
            {formatCurrency(stats.totalPendingAmount)}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
            {lang === 'hi' ? 'बाकी वसूली रकम' : 'Pending recovery'}
          </p>
        </div>

        {/* Pending Persons Count */}
        <div
          id="card-pending-persons-count"
          onClick={() => onNavigateToPersons('pending')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t.pendingPersons}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.pendingPersonsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === 'hi' ? 'लोग जिनका भुगतान बाकी है' : 'people with balance'}
          </p>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="input-quick-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* If No Records Exist - Clean Empty State */}
      {persons.length === 0 ? (
        <div
          id="dashboard-empty-state"
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <IndianRupee className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.noDataTitle}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t.noDataSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              id="btn-empty-add-person"
              type="button"
              onClick={onOpenAddModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/30 transition cursor-pointer"
            >
              {t.addFirstPerson}
            </button>

            <button
              id="btn-empty-load-sample"
              type="button"
              onClick={onLoadSample}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {t.loadSampleData}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Hisaab Entries (2 Columns on Large) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {t.recentPersons}
              </h2>
              <button
                id="btn-dash-view-all-persons"
                type="button"
                onClick={() => onNavigateToPersons('all')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{t.viewAll}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentPersonsList.map((person) => (
                <div
                  key={person.id}
                  id={`recent-person-${person.id}`}
                  onClick={() => onViewPerson(person)}
                  className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 transition shadow-2xs flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {person.name}
                      </h3>
                      {person.paymentMode === 'interest_only' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 shrink-0">
                          {lang === 'hi' ? 'केवल ब्याज' : 'Int Only'}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          person.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {person.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{formatDate(person.denaDate, lang)}</span>
                      <span>•</span>
                      <span>{person.rate}% {lang === 'hi' ? 'ब्याज' : 'rate'}</span>
                      {person.mobile && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{person.mobile}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(person.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Mool: {formatCurrency(person.principalAmount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Payments Alert Column (1 Column) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{t.pendingPayments}</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateToPersons('pending')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {stats.pendingPersonsCount} {lang === 'hi' ? 'बाकी' : 'due'}
              </button>
            </div>

            <div className="bg-amber-50/40 dark:bg-slate-900/80 rounded-2xl border border-amber-200/60 dark:border-slate-800 p-3.5 space-y-2.5">
              {pendingPersonsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{t.noPending}</p>
                </div>
              ) : (
                pendingPersonsList.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-amber-100 dark:border-slate-700/60 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                        {formatCurrency(p.totalAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {p.mobile && (
                        <>
                          <a
                            href={`tel:${p.mobile}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              const msg = generateProfessionalWhatsAppMessage(p, lang);
                              const url = getWhatsAppUrl(p.mobile, msg);
                              window.open(url, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800"
                            title={lang === 'hi' ? 'व्हाट्सएप पर तगादा भेजें' : 'Send WhatsApp Reminder'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleStatus(p)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                      >
                        {lang === 'hi' ? 'जमा' : 'Paid'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
