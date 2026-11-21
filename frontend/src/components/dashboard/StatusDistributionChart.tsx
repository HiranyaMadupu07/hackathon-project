import { Batch } from '../../types';

interface StatusDistributionChartProps {
  batches: Batch[];
  title?: string;
}

const CHART_BUCKETS: Array<{
  label: string;
  statuses: Batch['status'][];
  barColor: string;
}> = [
  {
    label: 'Issued',
    statuses: ['Issued'],
    barColor: 'bg-emerald-700 dark:bg-emerald-500',
  },
  {
    label: 'Pending State Approval',
    statuses: ['Pending State Approval'],
    barColor: 'bg-[#0F294D] dark:bg-blue-500',
  },
  {
    label: 'Pending Quality Review',
    statuses: ['Pending Quality Review'],
    barColor: 'bg-teal-700 dark:bg-teal-500',
  },
  {
    label: 'Pending District Approval',
    statuses: ['Pending District Approval'],
    barColor: 'bg-amber-600 dark:bg-amber-500',
  },
  {
    label: 'Returned / Draft',
    statuses: ['Returned', 'Draft'],
    barColor: 'bg-slate-400 dark:bg-slate-500',
  },
  {
    label: 'Rejected',
    statuses: ['Rejected'],
    barColor: 'bg-red-700 dark:bg-red-500',
  },
];

export function StatusDistributionChart({
  batches,
  title = 'Batch Pipeline Distribution',
}: StatusDistributionChartProps) {
  const total = batches.length || 1;

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-stone-100 dark:border-slate-800">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Total: {batches.length}
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        {CHART_BUCKETS.map((bucket) => {
          const count = batches.filter((b) =>
            bucket.statuses.includes(b.status)
          ).length;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={bucket.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {bucket.label}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-sm bg-stone-100 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${bucket.barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
