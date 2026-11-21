import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'navy' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const TONE_ICON_STYLES: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral:
    'bg-stone-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  navy: 'bg-blue-50 text-[#0F294D] dark:bg-blue-950/60 dark:text-blue-300',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
};

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'navy',
  onClick,
}: StatCardProps) {
  const baseClass =
    'rounded-md border border-stone-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#161B22]';
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:border-[#0F294D]/40 hover:shadow-xs dark:hover:border-teal-500/40 transition-all text-left w-full'
    : '';

  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {subtext}
          </p>
        )}
      </div>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE_ICON_STYLES[tone]}`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} ${interactiveClasses}`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
