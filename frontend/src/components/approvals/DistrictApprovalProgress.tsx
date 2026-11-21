import { CheckCircle2, Clock } from 'lucide-react';
import { batchMetricsService } from '../../services/mockApiService';
import { Batch } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface DistrictApprovalProgressProps {
  batch: Batch;
  compact?: boolean;
}

export function DistrictApprovalProgress({
  batch,
  compact = false,
}: DistrictApprovalProgressProps) {
  const approvedRecords = batch.districtApprovals.filter(
    (a) => a.decision === 'Approved'
  );
  const distinctCount = batchMetricsService.computeDistrictApprovalCount(batch);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
        <span
          className={`font-semibold ${
            distinctCount >= 2
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-[#0F294D] dark:text-teal-400'
          }`}
        >
          {Math.min(distinctCount, 2)} / 2
        </span>
        <span className="font-sans text-slate-500 dark:text-slate-400">
          approved
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-800 dark:bg-[#1C222B]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Dual District Officer Verification
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Requires independent approval from 2 distinct district officers
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-base font-bold text-[#0F294D] dark:text-teal-400 tabular-nums">
            {Math.min(distinctCount, 2)} / 2
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Approvals
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1].map((slotIdx) => {
          const record = approvedRecords[slotIdx];
          return (
            <div
              key={slotIdx}
              className={`rounded-md border px-3 py-2.5 text-xs ${
                record
                  ? 'border-emerald-200 bg-white dark:border-emerald-800/60 dark:bg-[#161B22]'
                  : 'border-dashed border-stone-300 bg-white/60 dark:border-slate-700 dark:bg-[#161B22]/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                {record ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                )}
                <span className="truncate">
                  {record ? record.officerName : `Reviewer Slot ${slotIdx + 1}`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {record
                  ? `Approved · ${formatDateTime(record.decidedAt)}`
                  : 'Awaiting independent verification'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
