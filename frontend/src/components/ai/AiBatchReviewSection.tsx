import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { aiBatchReviewService } from '../../services/ai/aiBatchReviewService';
import { Batch } from '../../types';
import { AiBatchReview, AiRiskLevel } from '../../types/ai';
import { formatDateTime } from '../../utils/formatters';

interface AiBatchReviewSectionProps {
  batch: Batch;
  compact?: boolean;
}

const RISK_STYLE: Record<
  AiRiskLevel,
  { badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  High: {
    badge:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    icon: ShieldAlert,
  },
  Medium: {
    badge:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    icon: AlertTriangle,
  },
  Low: {
    badge:
      'bg-stone-100 text-slate-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Info,
  },
};

export function AiBatchReviewSection({
  batch,
  compact = false,
}: AiBatchReviewSectionProps) {
  const [review, setReview] = useState<AiBatchReview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    setIsCheckingCache(true);

    aiBatchReviewService
      .getReview(batch)
      .then((cached) => {
        if (!active) return;
        setReview(cached);
      })
      .catch(() => {
        if (!active) return;
        setReview(null);
      })
      .finally(() => {
        if (active) setIsCheckingCache(false);
      });

    return () => {
      active = false;
    };
  }, [batch.id, batch.version]);

  const handleAnalyze = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await aiBatchReviewService.analyzeBatch(batch);
      setReview(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete batch review analysis.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [batch]);

  return (
    <section
      aria-label="AI Batch Review Assistant"
      className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#161B22]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0F294D]/10 text-[#0F294D] dark:bg-teal-950/60 dark:text-teal-400">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              AI Batch Review Assistant
            </h3>
            {review && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Analyzed {formatDateTime(review.analyzedAt)} ·{' '}
                {review.batchVersion}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isLoading || isCheckingCache}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#173A69] disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : review ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-analyze Batch</span>
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5" />
              <span>Analyze Batch</span>
            </>
          )}
        </button>
      </div>

      {/* Advisory guardrails banner */}
      <div className="mt-4 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F294D] dark:text-teal-400" />
        <span>
          {review?.advisoryNotice ??
            'Advisory review only. Automated insights support officer checks and never approve, reject, return, or issue certificates.'}
        </span>
      </div>

      {isLoading && !review && (
        <div className="mt-4 flex items-center justify-center gap-2.5 rounded-md border border-stone-200 bg-stone-50/70 px-4 py-8 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B]/60 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-[#0F294D] dark:text-teal-400" />
          <span>Evaluating batch metrics, roster integrity, and workflow history...</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-[#161B22] dark:text-red-300 dark:hover:bg-red-950/60 whitespace-nowrap"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!isLoading && !isCheckingCache && !error && !review && (
        <div className="mt-4 rounded-md border border-dashed border-stone-300 bg-stone-50/50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-[#1C222B]/40 dark:text-slate-400">
          Click <strong className="font-semibold text-slate-700 dark:text-slate-200">Analyze Batch</strong> to generate an advisory summary, validation checks, and recommended verification steps for {batch.batchNumber}.
        </div>
      )}

      {review && (
        <div className="mt-4 space-y-5">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Batch Summary
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {review.summary}
            </p>
          </div>

          {/* Validation Stats */}
          <div
            className={`grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3.5 text-xs dark:border-slate-800 dark:bg-[#1C222B] ${
              compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
            }`}
          >
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Total Candidates
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.validationStats.totalCandidates}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Clean Records
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {review.validationStats.validRecords}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Flagged Records
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {review.validationStats.flaggedRecords}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Avg. Attendance
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.validationStats.avgAttendancePercent}%
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Avg. Score
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.validationStats.avgAssessmentScore}%
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Distinctions
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.validationStats.distinctionCount}
              </p>
            </div>
          </div>

          {/* Observations & Risk Indicators */}
          <div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Important Observations
              </h4>
              <div className="divide-y divide-stone-100 rounded-md border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                {review.observations.map((obs) => (
                  <div key={obs.id} className="p-3 text-xs">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {obs.title}
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {obs.detail}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Evidence: {obs.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Potential Risk Indicators
              </h4>
              <div className="divide-y divide-stone-100 rounded-md border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                {review.riskIndicators.map((risk) => {
                  const style = RISK_STYLE[risk.severity];
                  const RiskIcon = style.icon;
                  return (
                    <div key={risk.id} className="p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {risk.title}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${style.badge}`}
                        >
                          <RiskIcon className="h-3 w-3" aria-hidden="true" />
                          <span>{risk.severity} Risk</span>
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {risk.detail}
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Evidence: {risk.evidence}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <ClipboardList className="h-3.5 w-3.5 text-[#0F294D] dark:text-teal-400" />
              <span>Recommended Manual Review Actions</span>
            </h4>
            <ul className="mt-2 space-y-1.5">
              {review.recommendedActions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400"
                    aria-hidden="true"
                  />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
