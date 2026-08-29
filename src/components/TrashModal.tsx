import { useState, useMemo } from 'react';
import {
  Trash2,
  X,
  RotateCcw,
  Search,
  AlertTriangle,
  Calendar,
  Phone,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { PersonHisaab, Language } from '../types';
import { formatCurrency, formatDate, i18n } from '../utils/formatters';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  trashList: PersonHisaab[];
  onRestore: (person: PersonHisaab) => void;
  onRestoreAll: () => void;
  onPermanentDelete: (person: PersonHisaab) => void;
  onEmptyTrash: () => void;
}

export function TrashModal({
  isOpen,
  onClose,
  lang,
  trashList,
  onRestore,
  onRestoreAll,
  onPermanentDelete,
  onEmptyTrash,
}: TrashModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [personToDeleteForever, setPersonToDeleteForever] = useState<PersonHisaab | null>(null);

  const t = i18n[lang];

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return trashList;
    const q = searchQuery.toLowerCase().trim();
    return trashList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.mobile && p.mobile.includes(q)) ||
        (p.note && p.note.toLowerCase().includes(q))
    );
  }, [trashList, searchQuery]);

  if (!isOpen) return null;

  const formatDeletedDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      id="modal-backdrop-trash"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="trash-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col transform animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t.trashBin}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  {trashList.length} {lang === 'hi' ? 'रिकॉर्ड' : 'items'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'hi'
                  ? 'हटाए गए सभी हिसाब यहाँ सुरक्षित हैं। आप कभी भी रिस्टोर (वापस) कर सकते हैं।'
                  : 'All deleted records are safely kept here. You can restore them anytime.'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-trash-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Bulk Actions Bar */}
        {trashList.length > 0 && (
          <div className="p-3 sm:p-4 border-b border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-trash-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'hi' ? 'ट्रैश में खोजें (नाम / मोबाइल)...' : 'Search in trash...'}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                id="btn-trash-restore-all"
                type="button"
                onClick={onRestoreAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                title={t.restoreAll}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restoreAll}</span>
              </button>

              <button
                id="btn-trash-empty-all"
                type="button"
                onClick={() => setConfirmEmptyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                title={t.emptyTrash}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.emptyTrash}</span>
              </button>
            </div>
          </div>
        )}

        {/* Content / Items List */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          {trashList.length === 0 ? (
            /* Empty State */
            <div className="py-14 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.trashEmptyTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t.trashEmptySubtitle}
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            /* No Search Match */
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {lang === 'hi' ? 'कोई हिसाब नहीं मिला।' : 'No records match your search in trash.'}
            </div>
          ) : (
            filteredList.map((person) => {
              const isInterestOnly = person.paymentMode === 'interest_only';
              return (
                <div
                  key={person.id}
                  id={`trash-item-${person.id}`}
                  className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 transition"
                >
                  {/* Person Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {person.name}
                      </span>
                      {person.mobile && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {person.mobile}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isInterestOnly
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                        }`}
                      >
                        {isInterestOnly
                          ? lang === 'hi'
                            ? 'केवल ब्याज'
                            : 'Interest Only'
                          : lang === 'hi'
                          ? 'साधारण'
                          : 'Standard'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 mr-1">{lang === 'hi' ? 'मूलधन:' : 'Principal:'}</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                          {formatCurrency(person.principalAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 mr-1">{lang === 'hi' ? 'दर:' : 'Rate:'}</span>
                        <span>{person.rate}% / {lang === 'hi' ? 'माह' : 'mo'}</span>
                      </div>
                      {isInterestOnly ? (
                        <div>
                          <span className="text-slate-400 mr-1">{lang === 'hi' ? 'बाकी ब्याज:' : 'Interest Due:'}</span>
                          <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                            {formatCurrency(person.currentInterestDue || 0)}
                          </strong>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-400 mr-1">{lang === 'hi' ? 'कुल देय:' : 'Total Due:'}</span>
                          <strong className="text-rose-600 dark:text-rose-400 font-semibold">
                            {formatCurrency(person.totalAmount)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Deleted Timestamp */}
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3 text-rose-400" />
                      <span>
                        {t.deletedOn}: {formatDeletedDate(person.deletedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Restore vs Delete Permanently */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                    <button
                      id={`btn-restore-${person.id}`}
                      type="button"
                      onClick={() => onRestore(person)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                      title={lang === 'hi' ? 'रीस्टोर करें' : 'Restore'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'hi' ? 'रीस्टोर' : 'Restore'}</span>
                    </button>

                    <button
                      id={`btn-permanent-delete-${person.id}`}
                      type="button"
                      onClick={() => setPersonToDeleteForever(person)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                      title={lang === 'hi' ? 'हमेशा के लिए मिटाएं' : 'Permanently Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline ml-1">{lang === 'hi' ? 'मिटाएं' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {trashList.length > 0
              ? `${trashList.length} ${lang === 'hi' ? 'आइटम कचरा पेटी में हैं' : 'items in trash'}`
              : (lang === 'hi' ? 'कचरा पेटी खाली है' : 'Trash is empty')}
          </span>
          <button
            id="btn-close-trash-footer"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            {lang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal: Empty Trash */}
      {confirmEmptyOpen && (
        <div
          id="confirm-empty-trash-backdrop"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full border border-rose-200 dark:border-rose-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'hi' ? 'पूरी कचरा पेटी खाली करें?' : 'Empty Entire Trash?'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {lang === 'hi' ? 'यह क्रिया वापस नहीं ली जा सकती' : 'This action is irreversible'}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {lang === 'hi'
                ? 'क्या आप सचमुच कचरा पेटी में मौजूद सभी हिसाब स्थायी रूप से मिटाना चाहते हैं?'
                : 'Are you sure you want to permanently delete all records currently in Trash?'}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmptyOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
              >
                {lang === 'hi' ? 'कचरा खाली करें' : 'Empty Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Sub-Modal: Permanently Delete Single Person */}
      {personToDeleteForever && (
        <div
          id="confirm-permanent-delete-backdrop"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full border border-rose-200 dark:border-rose-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'hi' ? 'स्थायी रूप से मिटाएं' : 'Permanently Delete Record'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {lang === 'hi' ? 'यह क्रिया वापस नहीं ली जा सकती' : 'This action is irreversible'}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {lang === 'hi'
                ? 'क्या आप सचमुच इस हिसाब को हमेशा के लिए मिटाना चाहते हैं? यह वापस नहीं लाया जा सकेगा।'
                : 'Are you sure you want to permanently remove this hisaab? This cannot be undone.'}
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100">
              {personToDeleteForever.name} • {formatCurrency(personToDeleteForever.principalAmount)}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPersonToDeleteForever(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDelete(personToDeleteForever);
                  setPersonToDeleteForever(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
              >
                {lang === 'hi' ? 'हमेशा के लिए मिटाएं' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
