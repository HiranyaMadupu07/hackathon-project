import { AlertTriangle } from 'lucide-react';

interface LoadingStateProps {
  rows?: number;
  label?: string;
}

export function LoadingState({ rows = 5, label = 'Loading records...' }: LoadingStateProps) {
  return (
    <div
      className="rounded-md border border-stone-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#161B22]"
      aria-busy="true"
      aria-label={label}
    >
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="h-3.5 w-40 animate-pulse rounded bg-stone-200 dark:bg-slate-700" />
      </div>
      <div className="divide-y divide-stone-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="h-3.5 w-1/4 animate-pulse rounded bg-stone-200 dark:bg-slate-700" />
            <div className="h-3.5 w-1/5 animate-pulse rounded bg-stone-100 dark:bg-slate-800" />
            <div className="h-3.5 w-1/6 animate-pulse rounded bg-stone-100 dark:bg-slate-800" />
            <div className="h-5 w-24 animate-pulse rounded bg-stone-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to Load Records',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50/50 px-6 py-10 text-center dark:border-red-900/60 dark:bg-red-950/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-300">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
