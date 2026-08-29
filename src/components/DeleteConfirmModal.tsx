import { AlertTriangle, Trash2, X, RotateCcw } from 'lucide-react';
import { i18n } from '../utils/formatters';
import { Language } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  subMessage?: string;
  itemName?: string;
  isTrashAction?: boolean;
  confirmBtnText?: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  message,
  subMessage,
  itemName,
  isTrashAction = false,
  confirmBtnText,
  lang,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;
  const t = i18n[lang];

  return (
    <div
      id="modal-backdrop-delete"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        id="delete-confirm-dialog"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 transform animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isTrashAction
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
              }`}
            >
              {isTrashAction ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title || (isTrashAction ? t.moveToTrashConfirmTitle : t.deleteConfirmTitle)}
              </h3>
              <p
                className={`text-xs font-medium ${
                  isTrashAction ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isTrashAction
                  ? lang === 'hi'
                    ? '✓ सुरक्षित: आप इसे बाद में कभी भी वापस ला सकते हैं'
                    : '✓ Safe: You can restore this anytime from Trash'
                  : t.deleteIrreversible}
              </p>
            </div>
          </div>
          <button
            id="btn-close-delete-modal"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium">{message}</p>
          {itemName && (
            <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {itemName}
            </p>
          )}
          {subMessage && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subMessage}</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {t.cancelBtn}
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition cursor-pointer ${
              isTrashAction
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmBtnText || (isTrashAction ? t.moveToTrashBtn : t.deleteBtn)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
