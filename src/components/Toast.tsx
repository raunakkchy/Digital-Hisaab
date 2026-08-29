import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { key?: string; toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColors = {
    success: 'bg-emerald-600 text-white shadow-emerald-900/20',
    error: 'bg-rose-600 text-white shadow-rose-900/20',
    info: 'bg-slate-800 dark:bg-slate-700 text-white shadow-slate-900/20',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-200" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-200" />,
    info: <Info className="w-5 h-5 flex-shrink-0 text-slate-300" />,
  };

  return (
    <div
      id={`toast-${toast.id}`}
      className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border border-white/10 text-sm font-medium transition-all transform animate-in slide-in-from-top-2 duration-200 gap-2 ${bgColors[toast.type]}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icons[toast.type]}
        <span className="truncate">{toast.message}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white text-slate-900 hover:bg-slate-100 active:scale-95 shadow-xs transition cursor-pointer"
          >
            {toast.action.label}
          </button>
        )}
        <button
          id={`toast-close-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
