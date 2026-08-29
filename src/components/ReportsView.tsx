import {
  BarChart3,
  FileDown,
  FileSpreadsheet,
  TrendingUp,
  IndianRupee,
  CheckCircle2,
  Clock,
  PieChart,
  Percent,
  Eye,
} from 'lucide-react';
import { PersonHisaab, Language, DashboardStats } from '../types';
import { formatCurrency, i18n } from '../utils/formatters';
import { exportAllPdf, exportAllCsv } from '../utils/export';

interface ReportsViewProps {
  persons: PersonHisaab[];
  stats: DashboardStats;
  lang: Language;
  onViewPerson: (person: PersonHisaab) => void;
  onPreviewFullReport?: () => void;
}

export function ReportsView({
  persons,
  stats,
  lang,
  onViewPerson,
  onPreviewFullReport,
}: ReportsViewProps) {
  const t = i18n[lang];

  const total = stats.totalAmount || 1; // avoid / 0
  const paidPercent = Math.round((stats.totalPaidAmount / total) * 100) || 0;
  const pendingPercent = 100 - paidPercent;

  const totalBase = (stats.totalPrincipal + stats.totalInterest) || 1;
  const principalPercent = Math.round((stats.totalPrincipal / totalBase) * 100) || 0;
  const interestPercent = 100 - principalPercent;

  const pendingPersonsList = persons
    .filter((p) => p.status === 'pending')
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>{lang === 'hi' ? 'हिसाब रिपोर्ट व विश्लेषण' : 'Hisaab Financial Reports'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'hi'
              ? 'ब्याज, वसूली और कुल लेन-देन का विस्तृत विवरण'
              : 'Detailed summary of principal, interest income and recovery statistics'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onPreviewFullReport && (
            <button
              id="btn-reports-preview-pdf"
              type="button"
              onClick={onPreviewFullReport}
              disabled={persons.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/80 disabled:opacity-50 transition shadow-2xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{lang === 'hi' ? 'PDF प्रिव्यू (Preview)' : 'PDF Preview'}</span>
            </button>
          )}

          <button
            id="btn-reports-pdf"
            type="button"
            onClick={() => exportAllPdf(persons)}
            disabled={persons.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-rose-500" />
            <span>{t.exportPdf}</span>
          </button>

          <button
            id="btn-reports-csv"
            type="button"
            onClick={() => exportAllCsv(persons)}
            disabled={persons.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Principal */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase">{t.totalPrincipal}</span>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            {formatCurrency(stats.totalPrincipal)}
          </p>
          <span className="text-[11px] text-slate-400">Total Capital Outlay</span>
        </div>

        {/* Total Interest */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
            <span className="text-xs font-bold uppercase">{t.totalInterest}</span>
            <Percent className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
            {formatCurrency(stats.totalInterest)}
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            Total Profit/Interest Earned
          </span>
        </div>

        {/* Paid Amount */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 mb-1.5">
            <span className="text-xs font-bold uppercase">{t.totalPaidAmount}</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 truncate">
            {formatCurrency(stats.totalPaidAmount)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {stats.paidPersonsCount} {lang === 'hi' ? 'खाते चुकता' : 'accounts cleared'}
          </span>
        </div>

        {/* Pending Amount */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 mb-1.5">
            <span className="text-xs font-bold uppercase">{t.totalPendingAmount}</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 truncate">
            {formatCurrency(stats.totalPendingAmount)}
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            {stats.pendingPersonsCount} {lang === 'hi' ? 'खाते बाकी' : 'accounts due'}
          </span>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Paid vs Pending Recovery Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'hi' ? 'वसूली स्थिति (Paid vs Pending)' : 'Recovery Status (Paid vs Pending)'}</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {paidPercent}% Recovered
            </span>
          </div>

          {/* Visual Progress Bar Gauge */}
          <div className="space-y-2">
            <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
              <div
                style={{ width: `${paidPercent}%` }}
                className="bg-emerald-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                title={`Paid: ${paidPercent}%`}
              >
                {paidPercent > 10 ? `${paidPercent}%` : ''}
              </div>
              <div
                style={{ width: `${pendingPercent}%` }}
                className="bg-amber-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                title={`Pending: ${pendingPercent}%`}
              >
                {pendingPercent > 10 ? `${pendingPercent}%` : ''}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {lang === 'hi' ? 'चुकता' : 'Paid'}: {formatCurrency(stats.totalPaidAmount)} ({stats.paidPersonsCount} {lang === 'hi' ? 'लोग' : 'people'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {lang === 'hi' ? 'बाकी' : 'Pending'}: {formatCurrency(stats.totalPendingAmount)} ({stats.pendingPersonsCount} {lang === 'hi' ? 'लोग' : 'people'})
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
            {lang === 'hi' ? (
              <>कुल हिसाब का <strong>{paidPercent}%</strong> रुपया चुकता हो चुका है और <strong>{pendingPercent}%</strong> रुपया अभी विभिन्न व्यक्तियों से लेना बाकी है।</>
            ) : (
              <><strong>{paidPercent}%</strong> of all recorded money is settled. <strong>{pendingPercent}%</strong> remains pending for collection.</>
            )}
          </div>
        </div>

        {/* Chart 2: Principal vs Interest Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>{lang === 'hi' ? 'मूलधन बनाम ब्याज (Principal vs Interest)' : 'Principal vs Interest Share'}</span>
            </h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              +{interestPercent}% Interest
            </span>
          </div>

          {/* Visual Multi-Bar */}
          <div className="space-y-2">
            <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
              <div
                style={{ width: `${principalPercent}%` }}
                className="bg-indigo-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                title={`Principal: ${principalPercent}%`}
              >
                {principalPercent > 10 ? `${principalPercent}%` : ''}
              </div>
              <div
                style={{ width: `${interestPercent}%` }}
                className="bg-amber-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                title={`Interest: ${interestPercent}%`}
              >
                {interestPercent > 5 ? `${interestPercent}%` : ''}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-slate-700 dark:text-slate-300">
                  {lang === 'hi' ? 'मूलधन' : 'Principal'}: {formatCurrency(stats.totalPrincipal)} ({principalPercent}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {lang === 'hi' ? 'ब्याज' : 'Interest'}: +{formatCurrency(stats.totalInterest)} ({interestPercent}%)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
            {lang === 'hi' ? (
              <>कुल <strong>{formatCurrency(stats.totalPrincipal)}</strong> मूलधन पर <strong>{formatCurrency(stats.totalInterest)}</strong> ब्याज अर्जित हुआ है। कुल देय रकम <strong>{formatCurrency(stats.totalAmount)}</strong> है।</>
            ) : (
              <>On <strong>{formatCurrency(stats.totalPrincipal)}</strong> principal given, total calculated interest is <strong>{formatCurrency(stats.totalInterest)}</strong>, giving a total value of <strong>{formatCurrency(stats.totalAmount)}</strong>.</>
            )}
          </div>
        </div>
      </div>

      {/* Top Pending Recoveries Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>{lang === 'hi' ? 'शीर्ष बकायादार (Top Pending Balances)' : 'Highest Pending Borrowers'}</span>
        </h3>

        {pendingPersonsList.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3">
            {lang === 'hi' ? 'कोई बकाया राशि नहीं है।' : 'No pending balances at this time.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {pendingPersonsList.map((person, index) => {
              const barPercent = Math.min(100, Math.round((person.totalAmount / (stats.totalPendingAmount || 1)) * 100));
              return (
                <div
                  key={person.id}
                  onClick={() => onViewPerson(person)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span>{person.name}</span>
                      <span className="text-slate-400 font-normal">({person.rate}%)</span>
                    </div>
                    <span className="text-amber-700 dark:text-amber-400 font-extrabold">
                      {formatCurrency(person.totalAmount)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className="bg-amber-500 h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
