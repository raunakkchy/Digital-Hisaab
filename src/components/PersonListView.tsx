import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileDown,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Filter,
  MessageCircle,
  Printer,
  FileText,
} from 'lucide-react';
import { PersonHisaab, Language, StatusFilterOption, DateFilterOption } from '../types';
import {
  formatCurrency,
  formatDate,
  generateProfessionalWhatsAppMessage,
  getWhatsAppUrl,
  i18n,
} from '../utils/formatters';
import { exportAllCsv, exportAllPdf } from '../utils/export';

interface PersonListViewProps {
  key?: string;
  persons: PersonHisaab[];
  lang: Language;
  initialFilter?: StatusFilterOption;
  trashCount?: number;
  onOpenTrash?: () => void;
  onOpenAddModal: () => void;
  onViewPerson: (person: PersonHisaab) => void;
  onEditPerson: (person: PersonHisaab) => void;
  onDeletePerson: (person: PersonHisaab) => void;
  onToggleStatus: (person: PersonHisaab) => void;
  onPreviewPersonPdf?: (person: PersonHisaab) => void;
  onPreviewFullPdf?: () => void;
}

export function PersonListView({
  persons,
  lang,
  initialFilter = 'all',
  trashCount,
  onOpenTrash,
  onOpenAddModal,
  onViewPerson,
  onEditPerson,
  onDeletePerson,
  onToggleStatus,
  onPreviewPersonPdf,
  onPreviewFullPdf,
}: PersonListViewProps) {
  const t = i18n[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>(initialFilter);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'interest_desc' | 'name_asc' | 'name_desc'
  >('date_desc');

  // Filter and sort computation
  const filteredAndSortedPersons = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    return persons
      .filter((person) => {
        // 1. Search Query (Name or Mobile or Note)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchName = person.name.toLowerCase().includes(term);
          const matchMobile = person.mobile && person.mobile.includes(term);
          const matchNote = person.note && person.note.toLowerCase().includes(term);
          if (!matchName && !matchMobile && !matchNote) return false;
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
          if (person.status !== statusFilter) return false;
        }

        // 3. Date Filter
        if (dateFilter === 'today') {
          if (person.denaDate !== todayStr) return false;
        } else if (dateFilter === 'this_month') {
          if (!person.denaDate || !person.denaDate.startsWith(currentMonthPrefix)) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && person.denaDate < customStartDate) return false;
          if (customEndDate && person.denaDate > customEndDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return b.denaDate.localeCompare(a.denaDate);
        if (sortBy === 'date_asc') return a.denaDate.localeCompare(b.denaDate);
        if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
        if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
        if (sortBy === 'interest_desc') return (b.monthlyInterest || 0) - (a.monthlyInterest || 0);
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [persons, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate, sortBy]);

  const paidCount = persons.filter((p) => p.status === 'paid').length;
  const pendingCount = persons.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {lang === 'hi' ? 'खाता सूची (Persons Hisaab)' : 'Persons Hisaab List'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'hi'
              ? `कुल ${persons.length} व्यक्ति दर्ज हैं (${pendingCount} बाकी, ${paidCount} चुकता)`
              : `Total ${persons.length} records (${pendingCount} pending, ${paidCount} paid)`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-list-add-person"
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-sm shadow-amber-500/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'hi' ? '+ नया हिसाब' : '+ Add Person'}</span>
          </button>

          {persons.length > 0 && (
            <>
              {onPreviewFullPdf && (
                <button
                  id="btn-list-preview-pdf"
                  type="button"
                  onClick={onPreviewFullPdf}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition text-xs font-bold"
                  title={lang === 'hi' ? 'PDF रिपोर्ट प्रिव्यू देखें' : 'Preview Full PDF Report'}
                >
                  <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="hidden sm:inline">{lang === 'hi' ? 'PDF प्रिव्यू' : 'PDF Preview'}</span>
                </button>
              )}

              <button
                id="btn-list-export-pdf"
                type="button"
                onClick={() => exportAllPdf(filteredAndSortedPersons)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                title="Download PDF"
              >
                <FileDown className="w-4 h-4 text-rose-500" />
              </button>

              <button
                id="btn-list-export-csv"
                type="button"
                onClick={() => exportAllCsv(filteredAndSortedPersons)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                title="Download CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter Bar Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-person-list-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
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

        {/* Filter Pills & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              id="filter-status-all"
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t.all} ({persons.length})
            </button>

            <button
              id="filter-status-pending"
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{t.statusPending} ({pendingCount})</span>
            </button>

            <button
              id="filter-status-paid"
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{t.statusPaid} ({paidCount})</span>
            </button>
          </div>

          {/* Date Filter Selection & Sort Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">{t.all} Dates</option>
                <option value="today">{t.today}</option>
                <option value="this_month">{t.thisMonth}</option>
                <option value="custom">{t.customRange}</option>
              </select>
            </div>

            {/* Sort Selection */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="date_desc">{lang === 'hi' ? 'तारीख (नई से पुरानी)' : 'Newest Date'}</option>
                <option value="date_asc">{lang === 'hi' ? 'तारीख (पुरानी से नई)' : 'Oldest Date'}</option>
                <option value="amount_desc">{lang === 'hi' ? 'रकम (ज्यादा से कम)' : 'Highest Amount'}</option>
                <option value="amount_asc">{lang === 'hi' ? 'रकम (कम से ज्यादा)' : 'Lowest Amount'}</option>
                <option value="interest_desc">{lang === 'hi' ? 'मासिक ब्याज (अधिक)' : 'Highest Monthly Interest'}</option>
                <option value="name_asc">{lang === 'hi' ? 'नाम (A से Z)' : 'Name (A to Z)'}</option>
                <option value="name_desc">{lang === 'hi' ? 'नाम (Z से A)' : 'Name (Z to A)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Date Range Pickers if selected */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">{t.startDate}</label>
              <input
                id="input-custom-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">{t.endDate}</label>
              <input
                id="input-custom-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main List Rendering */}
      {filteredAndSortedPersons.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800">
          <Filter className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {lang === 'hi' ? 'कोई हिसाब रिकॉर्ड नहीं मिला' : 'No Hisaab Records Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Try changing search keywords or active filters.'
              : 'Add your first person to get started.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition"
            >
              + Add Person
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Cards View (sm:hidden) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAndSortedPersons.map((person) => (
              <div
                key={person.id}
                id={`person-card-mobile-${person.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        onClick={() => onViewPerson(person)}
                        className="text-base font-extrabold text-slate-900 dark:text-slate-100 cursor-pointer active:text-amber-600 transition"
                      >
                        {person.name}
                      </h3>
                      {person.paymentMode === 'interest_only' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                          {lang === 'hi' ? 'केवल ब्याज' : 'Interest Only'}
                        </span>
                      )}
                    </div>
                    {person.mobile && (
                      <a
                        href={`tel:${person.mobile}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5"
                      >
                        <Phone className="w-3 h-3 text-amber-500" />
                        <span>{person.mobile}</span>
                      </a>
                    )}
                  </div>

                  {/* Status Badge & 1-Click Toggle */}
                  <button
                    id={`btn-toggle-status-${person.id}`}
                    type="button"
                    onClick={() => onToggleStatus(person)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 shrink-0 ${
                      person.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {person.status === 'paid' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PAID</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>PENDING</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Amounts Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {lang === 'hi' ? 'मूलधन' : 'Principal'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(person.principalAmount, false)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block truncate">
                      {person.rate}% ({person.totalMonths || (person.completedMonths + 1)}m) {lang === 'hi' ? 'ब्याज' : 'Int'}
                    </span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      +{formatCurrency(person.interestAmount, false)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase block">
                      {lang === 'hi' ? 'कुल देय' : 'Total'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(person.totalAmount, false)}
                    </span>
                  </div>
                </div>

                {/* Date & Action Controls */}
                <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(person.denaDate, lang)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onPreviewPersonPdf && (
                      <button
                        id={`btn-card-pdf-preview-${person.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewPersonPdf(person);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition border border-rose-200 dark:border-rose-900/60"
                        title={lang === 'hi' ? 'PDF वाउचर प्रिव्यू व प्रिंट' : 'Preview Voucher PDF'}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {person.mobile && (
                      <button
                        id={`btn-card-wa-${person.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const msg = generateProfessionalWhatsAppMessage(person, lang);
                          const url = getWhatsAppUrl(person.mobile, msg);
                          window.open(url, '_blank');
                        }}
                        className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition border border-emerald-200 dark:border-emerald-800"
                        title={lang === 'hi' ? 'व्हाट्सएप पर हिसाब भेजें' : 'Send WhatsApp Reminder'}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      id={`btn-view-${person.id}`}
                      type="button"
                      onClick={() => onViewPerson(person)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`btn-edit-${person.id}`}
                      type="button"
                      onClick={() => onEditPerson(person)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`btn-delete-${person.id}`}
                      type="button"
                      onClick={() => onDeletePerson(person)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on mobile, visible md+) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3.5 px-4">{t.personName}</th>
                    <th className="py-3.5 px-4">{t.mobileNumber}</th>
                    <th className="py-3.5 px-4 text-center">{t.ratePercent}</th>
                    <th className="py-3.5 px-4 text-center">{t.denaDate}</th>
                    <th className="py-3.5 px-4 text-right">{t.principalAmount}</th>
                    <th className="py-3.5 px-4 text-right">{t.calculatedInterest}</th>
                    <th className="py-3.5 px-4 text-right">{t.calculatedTotal}</th>
                    <th className="py-3.5 px-4 text-center">{t.paymentStatus}</th>
                    <th className="py-3.5 px-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAndSortedPersons.map((person) => (
                    <tr
                      key={person.id}
                      id={`person-table-row-${person.id}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onViewPerson(person)}
                            className="hover:text-amber-600 dark:hover:text-amber-400 text-left cursor-pointer"
                          >
                            {person.name}
                          </button>
                          {person.paymentMode === 'interest_only' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                              {lang === 'hi' ? 'केवल ब्याज' : 'Int Only'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {person.mobile ? (
                          <a
                            href={`tel:${person.mobile}`}
                            className="hover:text-amber-600 dark:hover:text-amber-400 font-medium"
                          >
                            {person.mobile}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Rate */}
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-700 dark:text-amber-400">
                        {person.rate}%
                      </td>

                      {/* Dena Date */}
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                        {formatDate(person.denaDate, lang)}
                      </td>

                      {/* Principal */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(person.principalAmount)}
                      </td>

                      {/* Interest */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-amber-700 dark:text-amber-400 block">
                          +{formatCurrency(person.interestAmount)}
                        </span>
                        <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 block">
                          {person.totalMonths || (person.completedMonths + 1)}m
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(person.totalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(person)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase transition cursor-pointer ${
                            person.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {person.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {onPreviewPersonPdf && (
                            <button
                              id={`btn-desktop-preview-${person.id}`}
                              type="button"
                              onClick={() => onPreviewPersonPdf(person)}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title={lang === 'hi' ? 'PDF वाउचर प्रिव्यू व प्रिंट' : 'Preview Voucher PDF'}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {person.mobile && (
                            <button
                              id={`btn-desktop-wa-${person.id}`}
                              type="button"
                              onClick={() => {
                                const msg = generateProfessionalWhatsAppMessage(person, lang);
                                const url = getWhatsAppUrl(person.mobile, msg);
                                window.open(url, '_blank');
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                              title={lang === 'hi' ? 'व्हाट्सएप भेजें' : 'Send WhatsApp'}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            id={`btn-desktop-view-${person.id}`}
                            type="button"
                            onClick={() => onViewPerson(person)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title={t.viewBtn}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-desktop-edit-${person.id}`}
                            type="button"
                            onClick={() => onEditPerson(person)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title={t.editBtn}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-desktop-delete-${person.id}`}
                            type="button"
                            onClick={() => onDeletePerson(person)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title={t.deleteBtn}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
