import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AiBatchReviewSection } from '../../components/ai/AiBatchReviewSection';
import { DistrictApprovalProgress } from '../../components/approvals/DistrictApprovalProgress';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import {
  ApprovalSubmissionPayload,
  Batch,
  QualityFindings,
} from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface ApprovalWorkspacePageProps {
  mode: 'district' | 'quality' | 'state';
}

export function ApprovalWorkspacePage({ mode }: ApprovalWorkspacePageProps) {
  const { user } = useAuth();
  const {
    batches,
    recordDistrictDecision,
    recordQualityDecision,
    recordStateDecision,
  } = useWorkflow();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const queue = useMemo(() => {
    if (!user) return [];
    if (mode === 'district') {
      return batches.filter(
        (b) =>
          b.status === 'Pending District Approval' &&
          !b.districtApprovals.some(
            (a) => a.officerEmail.toLowerCase() === user.email.toLowerCase()
          )
      );
    }
    if (mode === 'quality') {
      return batches.filter((b) => b.status === 'Pending Quality Review');
    }
    return batches.filter((b) => b.status === 'Pending State Approval');
  }, [batches, mode, user]);

  const requestedId = searchParams.get('batch');
  const [selectedId, setSelectedId] = useState<string>(
    requestedId ?? queue[0]?.id ?? ''
  );

  useEffect(() => {
    if (requestedId && queue.some((b) => b.id === requestedId)) {
      setSelectedId(requestedId);
    } else if (!queue.some((b) => b.id === selectedId)) {
      setSelectedId(queue[0]?.id ?? '');
    }
  }, [queue, requestedId, selectedId]);

  const selectedBatch: Batch | undefined = queue.find(
    (b) => b.id === selectedId
  );

  const [sampleSize, setSampleSize] = useState(10);
  const [attendanceVerified, setAttendanceVerified] = useState(true);
  const [scoreAudit, setScoreAudit] = useState<'Passed' | 'Discrepancy Noted'>(
    'Passed'
  );
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (selectedBatch) {
      setSampleSize(Math.ceil(selectedBatch.candidateCount * 0.3));
      setAttendanceVerified(true);
      setScoreAudit('Passed');
      setObservations(selectedBatch.qualityFindings?.observations ?? '');
    }
  }, [selectedBatch?.id]);

  const [dialogAction, setDialogAction] = useState<
    'APPROVE' | 'RETURN' | 'REJECT' | null
  >(null);

  if (!user) return null;

  const meta: Record<
    ApprovalWorkspacePageProps['mode'],
    { title: string; helpText: string }
  > = {
    district: {
      title: 'District Verification',
      helpText:
        'Each batch requires approval from 2 distinct District Officers before advancing.',
    },
    quality: {
      title: 'Quality Scrutiny',
      helpText:
        'Large cohorts (25+ candidates) require quality sampling audit prior to State approval.',
    },
    state: {
      title: 'Final Approvals',
      helpText:
        'Granting Final Approve immediately issues verifiable digital certificates to all candidates.',
    },
  };

  const handleConfirm = (remarks: string) => {
    if (!selectedBatch || !dialogAction) return;

    const payload: ApprovalSubmissionPayload = {
      decision: dialogAction,
      remarks: remarks.trim(),
    };

    if (mode === 'district') {
      recordDistrictDecision(selectedBatch.id, payload);
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? 'District Approval Recorded'
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: selectedBatch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    } else if (mode === 'quality') {
      const findings: QualityFindings = {
        sampleSizeReviewed: sampleSize,
        attendanceVerified,
        assessmentScoreAudit: scoreAudit,
        observations:
          payload.remarks ||
          observations.trim() ||
          'Sample audit completed.',
      };
      recordQualityDecision(selectedBatch.id, payload, findings);
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? 'Quality Scrutiny Approved'
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: selectedBatch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    } else {
      const issued = recordStateDecision(selectedBatch.id, payload);
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? `Final Approval Granted (${issued} Certificates Issued)`
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: selectedBatch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    }
    setDialogAction(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta[mode].title}
        fallbackRoute={ROUTES.DASHBOARD}
        helpText={meta[mode].helpText}
        actions={
          mode === 'state' ? (
            <Link
              to={ROUTES.CERTIFICATES}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Award className="h-3.5 w-3.5 text-[#0F294D] dark:text-teal-400" />
              <span>Certificates</span>
            </Link>
          ) : undefined
        }
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Approval Queue Clear"
          description="There are no pending batches waiting in your review queue."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Queue List */}
          <div className="lg:col-span-4 rounded-md border border-stone-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#161B22]">
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between dark:border-slate-800 dark:bg-[#1C222B]">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Pending Queue
              </span>
              <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                {queue.length}
              </span>
            </div>
            <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto dark:divide-slate-800">
              {queue.map((batch) => {
                const isSelected = batch.id === selectedBatch?.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(batch.id);
                      setSearchParams({ batch: batch.id }, { replace: true });
                    }}
                    className={`w-full px-4 py-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-stone-100/90 border-r-2 border-[#0F294D] dark:bg-slate-800/80 dark:border-teal-500'
                        : 'hover:bg-stone-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                        {batch.batchNumber}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {batch.candidateCount} cand.
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {batch.trainingCentre}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {batch.courseName} · {batch.district}
                    </p>
                    {mode === 'district' && (
                      <div className="mt-2">
                        <DistrictApprovalProgress batch={batch} compact />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decision Panel */}
          {selectedBatch && (
            <div className="lg:col-span-8 space-y-5">
              <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedBatch.batchName}
                      </h3>
                      <StatusBadge status={selectedBatch.status} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {selectedBatch.batchNumber} · {selectedBatch.version} ·
                      Submitted {formatDate(selectedBatch.submissionDate)}
                    </p>
                  </div>
                  <Link
                    to={ROUTES.BATCH_DETAIL(selectedBatch.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span>Batch Details</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Training Centre
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {selectedBatch.trainingCentre}
                    </dd>
                    <dd className="text-slate-500 dark:text-slate-400">
                      {selectedBatch.district} District
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Course Qualification
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {selectedBatch.courseName}
                    </dd>
                    <dd className="font-mono text-slate-500 dark:text-slate-400">
                      {selectedBatch.courseCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Training Period
                    </dt>
                    <dd className="mt-1 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatDate(selectedBatch.trainingStartDate)} –{' '}
                      {formatDate(selectedBatch.trainingEndDate)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-xs dark:border-slate-800 dark:bg-[#1C222B]">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>Candidates</span>
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {selectedBatch.candidateCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Avg. Score
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {Math.round(
                        selectedBatch.candidates.reduce(
                          (acc, c) => acc + c.assessmentScore,
                          0
                        ) / (selectedBatch.candidates.length || 1)
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Avg. Attendance
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {Math.round(
                        selectedBatch.candidates.reduce(
                          (acc, c) => acc + c.attendancePercent,
                          0
                        ) / (selectedBatch.candidates.length || 1)
                      )}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <DistrictApprovalProgress batch={selectedBatch} />
                </div>

                {mode === 'quality' && (
                  <div className="mt-5 rounded-md border border-teal-200 bg-teal-50/40 p-4 space-y-3 dark:border-teal-800/60 dark:bg-teal-950/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-950 dark:text-teal-200">
                      <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      <span>Quality Scrutiny Findings</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                      <div>
                        <label
                          htmlFor="qo-sample"
                          className="block font-medium text-slate-700 dark:text-slate-300"
                        >
                          Sample Size Audited
                        </label>
                        <input
                          id="qo-sample"
                          type="number"
                          min={1}
                          max={selectedBatch.candidateCount}
                          value={sampleSize}
                          onChange={(e) =>
                            setSampleSize(Number(e.target.value) || 1)
                          }
                          className="mt-1 h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="qo-audit"
                          className="block font-medium text-slate-700 dark:text-slate-300"
                        >
                          Score Audit Result
                        </label>
                        <select
                          id="qo-audit"
                          value={scoreAudit}
                          onChange={(e) =>
                            setScoreAudit(
                              e.target.value as 'Passed' | 'Discrepancy Noted'
                            )
                          }
                          className="mt-1 h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100"
                        >
                          <option value="Passed">Passed</option>
                          <option value="Discrepancy Noted">
                            Discrepancy Noted
                          </option>
                        </select>
                      </div>
                      <div className="flex items-end pb-1.5">
                        <label className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attendanceVerified}
                            onChange={(e) =>
                              setAttendanceVerified(e.target.checked)
                            }
                            className="h-4 w-4 rounded border-stone-300 text-[#0F294D] dark:border-slate-600 dark:bg-slate-800"
                          />
                          <span>Biometric Attendance Verified</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="qo-notes"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Audit Observations (Optional)
                      </label>
                      <textarea
                        id="qo-notes"
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Optional sampling notes..."
                        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {mode === 'state' && (
                  <div className="mt-5">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Previous Verification History
                    </h4>
                    <div className="divide-y divide-stone-100 rounded-md border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                      {selectedBatch.approvalHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.stage}
                            </span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">
                              · {item.actorName}
                            </span>
                            {item.remarks && (
                              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                                {item.remarks}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <StatusBadge status={item.decision} />
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {formatDateTime(item.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Candidate Sample (First 5 of{' '}
                      {selectedBatch.candidates.length})
                    </h4>
                    <Link
                      to={ROUTES.BATCH_CANDIDATES(selectedBatch.id)}
                      className="text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400"
                    >
                      View All Candidates
                    </Link>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-stone-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
                      <thead className="bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Reg. No.</th>
                          <th className="px-3 py-2 font-semibold">Name</th>
                          <th className="px-3 py-2 font-semibold text-right">
                            Attendance
                          </th>
                          <th className="px-3 py-2 font-semibold text-right">
                            Score
                          </th>
                          <th className="px-3 py-2 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
                        {selectedBatch.candidates.slice(0, 5).map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                              {c.registrationNumber}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                              {c.fullName}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums dark:text-slate-200">
                              {c.attendancePercent}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums dark:text-slate-100">
                              {c.assessmentScore}
                            </td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                              {c.result}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-stone-200 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDialogAction('RETURN')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Return</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogAction('REJECT')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogAction('APPROVE')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {mode === 'state' ? 'Final Approve' : 'Approve'}
                    </span>
                  </button>
                </div>
              </div>

              <AiBatchReviewSection batch={selectedBatch} compact />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(dialogAction && selectedBatch)}
        onClose={() => setDialogAction(null)}
        onConfirm={handleConfirm}
        title={
          dialogAction === 'APPROVE'
            ? mode === 'state'
              ? `Final Approve ${selectedBatch?.batchNumber ?? ''}`
              : `Approve ${selectedBatch?.batchNumber ?? ''}`
            : dialogAction === 'RETURN'
              ? `Return ${selectedBatch?.batchNumber ?? ''}`
              : `Reject ${selectedBatch?.batchNumber ?? ''}`
        }
        description={
          dialogAction === 'APPROVE' && mode === 'state'
            ? `Final approval will issue ${selectedBatch?.candidateCount ?? 0} digital certificates. Comments are optional.`
            : dialogAction === 'APPROVE'
              ? `Record your approval for ${selectedBatch?.batchNumber ?? ''}. Comments are optional.`
              : 'Remarks are mandatory when rejecting or returning a batch.'
        }
        confirmLabel={
          dialogAction === 'APPROVE'
            ? 'Approve'
            : dialogAction === 'RETURN'
              ? 'Return Batch'
              : 'Reject Batch'
        }
        confirmTone={
          dialogAction === 'APPROVE'
            ? 'success'
            : dialogAction === 'REJECT'
              ? 'danger'
              : 'warning'
        }
        requireRemarks={
          dialogAction === 'RETURN' || dialogAction === 'REJECT'
        }
        initialRemarks={
          dialogAction === 'APPROVE' && mode === 'quality' ? observations : ''
        }
      />
    </div>
  );
}
