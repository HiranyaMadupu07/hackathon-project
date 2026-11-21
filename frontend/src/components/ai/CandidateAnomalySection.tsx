import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
} from 'lucide-react';
import { useAuth, useToast } from '../../hooks/useAppState';
import { aiAnomalyService } from '../../services/ai/aiAnomalyService';
import { Batch } from '../../types';
import {
  AnomalyCategory,
  AnomalyReviewStatus,
  AnomalySeverity,
  CandidateAnomalyReport,
} from '../../types/ai';
import { formatDateTime } from '../../utils/formatters';

interface CandidateAnomalySectionProps {
  batch: Batch;
  onAnomalyCountChange?: (count: number | null) => void;
}

const CATEGORY_LABEL: Record<AnomalyCategory, string> = {
  POTENTIAL_DUPLICATE: 'Potential Duplicate',
  MISSING_INFORMATION: 'Missing Information',
  FORMAT_INCONSISTENCY: 'Format Inconsistency',
  UNUSUAL_PATTERN: 'Unusual Pattern',
};

const SEVERITY_BADGE: Record<
  AnomalySeverity,
  { classes: string; icon: React.ComponentType<{ className?: string }> }
> = {
  High: {
    classes:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    icon: ShieldAlert,
  },
  Medium: {
    classes:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    icon: AlertTriangle,
  },
  Low: {
    classes:
      'bg-stone-100 text-slate-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Info,
  },
};

const STATUS_BADGE: Record<AnomalyReviewStatus, string> = {
  'Needs review':
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
  Confirmed:
    'bg-blue-50 text-[#0F294D] border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/70',
  Dismissed:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
};

export function CandidateAnomalySection({
  batch,
  onAnomalyCountChange,
}: CandidateAnomalySectionProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [report, setReport] = useState<CandidateAnomalyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canUpdateStatus =
    user?.role === 'DISTRICT_OFFICER' ||
    user?.role === 'QUALITY_OFFICER' ||
    user?.role === 'STATE_OFFICER';

  useEffect(() => {
    let active = true;
    setError('');
    setIsCheckingCache(true);

    aiAnomalyService
      .getAnomalies(batch)
      .then((cached) => {
        if (!active) return;
        setReport(cached);
        onAnomalyCountChange?.(cached ? cached.anomalies.length : null);
      })
      .catch(() => {
        if (!active) return;
        setReport(null);
        onAnomalyCountChange?.(null);
      })
      .finally(() => {
        if (active) setIsCheckingCache(false);
      });

    return () => {
      active = false;
    };
  }, [batch.id, batch.version]);

  const handleScan = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const next = await aiAnomalyService.analyzeAnomalies(batch);
      setReport(next);
      onAnomalyCountChange?.(next.anomalies.length);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete candidate anomaly scan.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [batch, onAnomalyCountChange]);

  const handleStatusChange = async (
    anomalyId: string,
    newStatus: AnomalyReviewStatus
  ) => {
    if (!user || !canUpdateStatus) return;
    setUpdatingId(anomalyId);
    try {
      const updated = await aiAnomalyService.updateReviewStatus(
        batch,
        anomalyId,
        newStatus,
        user.name
      );
      if (updated) {
        setReport(updated);
      }
      addToast({
        title: 'Anomaly Review Updated',
        description: `Marked as "${newStatus}".`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Update Failed',
        description:
          err instanceof Error ? err.message : 'Unable to update review status.',
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Roster Anomaly Screening
          </p>
          {report && (
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Scanned {formatDateTime(report.analyzedAt)} ·{' '}
              {report.batchVersion} · {report.anomalies.length} item(s)
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={isLoading || isCheckingCache}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#173A69] disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : report ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-run Scan</span>
            </>
          ) : (
            <>
              <ScanSearch className="h-3.5 w-3.5" />
              <span>Detect Anomalies</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F294D] dark:text-teal-400" />
        <span>
          {report?.advisoryNotice ??
            'Flagged entries highlight data patterns for manual verification only and do not imply intentional misrepresentation.'}
        </span>
      </div>

      {isLoading && !report && (
        <div className="flex items-center justify-center gap-2.5 rounded-md border border-stone-200 bg-stone-50/70 px-4 py-8 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B]/60 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-[#0F294D] dark:text-teal-400" />
          <span>Scanning candidate roster for duplicates, missing fields, and pattern outliers...</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleScan}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-[#161B22] dark:text-red-300 dark:hover:bg-red-950/60 whitespace-nowrap"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!isLoading && !isCheckingCache && !error && !report && (
        <div className="rounded-md border border-dashed border-stone-300 bg-stone-50/50 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-[#1C222B]/40 dark:text-slate-400">
          Run <strong className="font-semibold text-slate-700 dark:text-slate-200">Detect Anomalies</strong> to screen all {batch.candidateCount} candidates for duplicates, missing fields, formatting discrepancies, and unusual patterns.
        </div>
      )}

      {report && report.anomalies.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-5 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>No candidate anomalies were flagged in this batch snapshot.</span>
        </div>
      )}

      {report && report.anomalies.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-stone-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                  Reg. No.
                </th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                  Category
                </th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                  Severity
                </th>
                <th className="px-3.5 py-2.5 font-semibold">Explanation</th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Evidence / Field
                </th>
                <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                  Review Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
              {report.anomalies.map((item) => {
                const sevStyle = SEVERITY_BADGE[item.severity];
                const SevIcon = sevStyle.icon;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-stone-50 dark:hover:bg-slate-800/50 align-top"
                  >
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {item.registrationNumber}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.candidateName}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-[#0F294D] dark:text-teal-400">
                        {item.category}
                      </span>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {CATEGORY_LABEL[item.category]}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${sevStyle.classes}`}
                      >
                        <SevIcon className="h-3 w-3" aria-hidden="true" />
                        <span>{item.severity}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed">
                      {item.explanation}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">
                        {item.evidenceField}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all">
                        {item.evidenceValue}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {canUpdateStatus ? (
                        <div>
                          <select
                            aria-label={`Review status for ${item.registrationNumber}`}
                            value={item.reviewStatus}
                            disabled={updatingId === item.id}
                            onChange={(e) =>
                              handleStatusChange(
                                item.id,
                                e.target.value as AnomalyReviewStatus
                              )
                            }
                            className="h-8 rounded-md border border-stone-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 disabled:opacity-60 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-200 dark:focus:border-teal-500"
                          >
                            <option value="Needs review">Needs review</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Dismissed">Dismissed</option>
                          </select>
                          {item.reviewedBy && (
                            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                              By {item.reviewedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[item.reviewStatus]}`}
                        >
                          {item.reviewStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
