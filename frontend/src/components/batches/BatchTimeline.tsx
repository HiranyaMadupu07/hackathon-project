import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ActivityTimelineEntry } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface BatchTimelineProps {
  entries: ActivityTimelineEntry[];
}

const TYPE_STYLES: Record<
  ActivityTimelineEntry['type'],
  { iconBg: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    iconBg: 'bg-blue-50 dark:bg-blue-950/60',
    iconColor: 'text-[#0F294D] dark:text-blue-300',
    Icon: Info,
  },
  success: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  warning: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/60',
    iconColor: 'text-amber-700 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  danger: {
    iconBg: 'bg-red-50 dark:bg-red-950/60',
    iconColor: 'text-red-700 dark:text-red-300',
    Icon: AlertCircle,
  },
};

export function BatchTimeline({ entries }: BatchTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        No workflow activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry, idx) => {
        const style = TYPE_STYLES[entry.type];
        const Icon = style.Icon;
        return (
          <li key={entry.id} className="relative flex gap-3.5">
            {idx < entries.length - 1 && (
              <span
                className="absolute left-3.5 top-8 -bottom-4 w-px bg-stone-200 dark:bg-slate-800"
                aria-hidden="true"
              />
            )}
            <div
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.iconBg} ${style.iconColor}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {entry.title}
                </p>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {entry.description}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {entry.actor}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
