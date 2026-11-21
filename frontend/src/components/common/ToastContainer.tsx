import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ToastItem } from '../../types';

const TOAST_STYLES: Record<
  ToastItem['type'],
  { border: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    border: 'border-emerald-200 bg-white dark:border-emerald-800/70 dark:bg-[#161B22]',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    Icon: CheckCircle2,
  },
  error: {
    border: 'border-red-200 bg-white dark:border-red-800/70 dark:bg-[#161B22]',
    iconColor: 'text-red-700 dark:text-red-400',
    Icon: AlertCircle,
  },
  warning: {
    border: 'border-amber-200 bg-white dark:border-amber-800/70 dark:bg-[#161B22]',
    iconColor: 'text-amber-700 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-200 bg-white dark:border-teal-800/70 dark:bg-[#161B22]',
    iconColor: 'text-[#0F294D] dark:text-teal-400',
    Icon: Info,
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const Icon = style.Icon;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-md border p-3.5 shadow-lg ${style.border}`}
          >
            <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${style.iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
