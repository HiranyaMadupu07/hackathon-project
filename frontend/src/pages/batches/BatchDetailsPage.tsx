import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AiBatchReviewSection } from '../../components/ai/AiBatchReviewSection';
import { CandidateAnomalySection } from '../../components/ai/CandidateAnomalySection';
import { DistrictApprovalProgress } from '../../components/approvals/DistrictApprovalProgress';
import { BatchTimeline } from '../../components/batches/BatchTimeline';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { ApprovalSubmissionPayload } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { UnauthorizedPage } from '../common/UnauthorizedPage';

export function BatchDetailsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    batches,
    submitDraftBatch,
    resubmitReturnedBatch,
    recordDistrictDecision,
    recordQualityDecision,
    recordStateDecision,
    escalateStuckBatch,
  } = useWorkflow();
  const { addToast } = useToast();

  const [candidateSearch, setCandidateSearch] = useState('');
  const [rosterTab, setRosterTab] = useState<'candidates' | 'anomalies'>(
    'candidates'
  );
  const [anomalyCount, setAnomalyCount] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action:
      | 'submit_draft'
      | 'resubmit'
      | 'approve'
      | 'return'
      | 'reject'
      | 'escalate'
      | null;
  }>({ open: false, action: null });

  const batch = batches.find((b) => b.id === batchId);

  const filteredCandidates = useMemo(() => {
    if (!batch) return [];
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return batch.candidates;
    return batch.candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [batch, candidateSearch]);

  if (!user) return null;

  if (!batch) {
    return (
      <EmptyState
        title="Batch Not Found"
        description="The requested batch record could not be found."
        actionLabel="Return to Batches"
        onAction={() => navigate(ROUTES.BATCHES)}
      />
    );
  }

  if (
    user.role === 'TRAINING_CENTRE' &&
    batch.centreOfficerEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    return <UnauthorizedPage />;
  }

  const isCentreOwner =
    user.role === 'TRAINING_CENTRE' &&
    batch.centreOfficerEmail.toLowerCase() === user.email.toLowerCase();

  const districtAlreadyActed = batch.districtApprovals.some(
    (a) => a.officerEmail.toLowerCase() === user.email.toLowerCase()
  );

  const canDistrictAct =
    user.role === 'DISTRICT_OFFICER' &&
    batch.status === 'Pending District Approval' &&
    !districtAlreadyActed;

  const canQualityAct =
    user.role === 'QUALITY_OFFICER' && batch.status === 'Pending Quality Review';

  const canStateAct =
    user.role === 'STATE_OFFICER' && batch.status === 'Pending State Approval';

  const canEscalate =
    user.role === 'STATE_OFFICER' &&
    (batch.isStuck || batch.daysInCurrentStage >= 7) &&
    batch.status !== 'Issued' &&
    batch.status !== 'Rejected';

  const handleConfirmAction = (remarks: string) => {
    const action = dialogState.action;
    if (!action) return;

    if (action === 'submit_draft') {
      submitDraftBatch(batch.id, user);
      addToast({
        title: 'Batch Submitted',
        description: `${batch.batchNumber} sent to District Verification.`,
        type: 'success',
      });
      return;
    }

    if (action === 'resubmit') {
      resubmitReturnedBatch(batch.id, remarks, user);
      addToast({
        title: 'Batch Resubmitted',
        description: `${batch.batchNumber} updated and re-queued for verification.`,
        type: 'success',
      });
      return;
    }

    if (action === 'escalate') {
      escalateStuckBatch(batch.id, remarks, user);
      addToast({
        title: 'Escalation Directive Logged',
        description: `Priority escalation sent for ${batch.batchNumber}.`,
        type: 'warning',
      });
      return;
    }

    const payloadDecision: ApprovalSubmissionPayload['decision'] =
      action === 'approve' ? 'APPROVE' : action === 'return' ? 'RETURN' : 'REJECT';

    const payload: ApprovalSubmissionPayload = {
      decision: payloadDecision,
      remarks: remarks.trim(),
    };

    if (canDistrictAct) {
      recordDistrictDecision(batch.id, payload);
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? 'District Approval Recorded'
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: batch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    } else if (canQualityAct) {
      recordQualityDecision(batch.id, payload, {
        sampleSizeReviewed: Math.ceil(batch.candidateCount * 0.3),
        attendanceVerified: payload.decision === 'APPROVE',
        assessmentScoreAudit:
          payload.decision === 'APPROVE' ? 'Passed' : 'Discrepancy Noted',
        observations: payload.remarks || 'Quality sample scrutiny completed.',
      });
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? 'Quality Scrutiny Approved'
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: batch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    } else if (canStateAct) {
      const issuedCount = recordStateDecision(batch.id, payload);
      addToast({
        title:
          payload.decision === 'APPROVE'
            ? `Final Approval Granted (${issuedCount} Certificates Issued)`
            : `Batch ${payload.decision === 'RETURN' ? 'Returned' : 'Rejected'}`,
        description: batch.batchNumber,
        type: payload.decision === 'APPROVE' ? 'success' : 'warning',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batchName}
        fallbackRoute={ROUTES.BATCHES}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={batch.status} size="md" />
            {isCentreOwner && batch.status === 'Draft' && (
              <button
                type="button"
                onClick={() =>
                  setDialogState({ open: true, action: 'submit_draft' })
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Draft</span>
              </button>
            )}
            {isCentreOwner && batch.status === 'Returned' && (
              <button
                type="button"
                onClick={() =>
                  setDialogState({ open: true, action: 'resubmit' })
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Resubmit Batch</span>
              </button>
            )}
            {(canDistrictAct || canQualityAct || canStateAct) && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setDialogState({ open: true, action: 'return' })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Return</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDialogState({ open: true, action: 'reject' })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDialogState({ open: true, action: 'approve' })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {canStateAct ? 'Final Approve & Issue' : 'Approve'}
                  </span>
                </button>
              </>
            )}
            {canEscalate && (
              <button
                type="button"
                onClick={() =>
                  setDialogState({ open: true, action: 'escalate' })
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Escalate</span>
              </button>
            )}
          </div>
        }
      />

      <p className="-mt-4 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {batch.batchNumber} · {batch.version} · {batch.district} District
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
              Batch Information
            </h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Training Centre
                </dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {batch.trainingCentre}
                </dd>
                <dd className="text-slate-500 dark:text-slate-400">
                  {batch.district} District
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Course Qualification
                </dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {batch.courseName}
                </dd>
                <dd className="text-slate-500 dark:text-slate-400">
                  {batch.courseCode} · {batch.sector}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Cohort Size
                </dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {batch.candidateCount} Candidates
                </dd>
                <dd className="text-slate-500 dark:text-slate-400">
                  {batch.requiresQualityReview
                    ? 'Quality Scrutiny Required'
                    : 'Standard Track'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Training Period
                </dt>
                <dd className="mt-1 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDate(batch.trainingStartDate)} —{' '}
                  {formatDate(batch.trainingEndDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Submission Date
                </dt>
                <dd className="mt-1 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDate(batch.submissionDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  Batch Version
                </dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {batch.version}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <DistrictApprovalProgress batch={batch} />
            </div>

            {batch.qualityFindings && (
              <div className="mt-4 rounded-md border border-teal-200 bg-teal-50/50 p-4 text-xs dark:border-teal-800/60 dark:bg-teal-950/30">
                <div className="flex items-center gap-2 font-semibold text-teal-950 dark:text-teal-200">
                  <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>Quality Scrutiny Summary</span>
                </div>
                <p className="mt-1.5 text-slate-700 dark:text-slate-300">
                  {batch.qualityFindings.observations}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  Sample Audited: {batch.qualityFindings.sampleSizeReviewed}{' '}
                  candidates · Score Audit:{' '}
                  {batch.qualityFindings.assessmentScoreAudit}
                </p>
              </div>
            )}
          </div>

          <AiBatchReviewSection batch={batch} />

          <div className="rounded-md border border-stone-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#161B22]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-3.5 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="tablist"
                  aria-label="Roster and Anomaly Views"
                  className="inline-flex items-center rounded-md border border-stone-200 bg-stone-50 p-0.5 dark:border-slate-700 dark:bg-[#1C222B]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rosterTab === 'candidates'}
                    onClick={() => setRosterTab('candidates')}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      rosterTab === 'candidates'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#161B22] dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Candidates ({filteredCandidates.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rosterTab === 'anomalies'}
                    onClick={() => setRosterTab('anomalies')}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      rosterTab === 'anomalies'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#161B22] dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Anomaly Detection
                    {anomalyCount !== null ? ` (${anomalyCount})` : ''}
                  </button>
                </div>

                <Link
                  to={ROUTES.BATCH_CANDIDATES(batch.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400 whitespace-nowrap"
                >
                  <span>Full Roster</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {rosterTab === 'candidates' && (
                <SearchBar
                  value={candidateSearch}
                  onChange={setCandidateSearch}
                  placeholder="Filter by name or reg. no..."
                  className="w-full sm:w-60"
                />
              )}
            </div>

            {rosterTab === 'candidates' ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
                  <thead className="sticky top-0 bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Reg. No.</th>
                      <th className="px-4 py-2.5 font-semibold">Candidate</th>
                      <th className="px-4 py-2.5 font-semibold">Contact & ID</th>
                      <th className="px-4 py-2.5 font-semibold text-right">
                        Attendance
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-right">
                        Score
                      </th>
                      <th className="px-4 py-2.5 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
                    {filteredCandidates.map((cand) => (
                      <tr
                        key={cand.id}
                        className="hover:bg-stone-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {cand.registrationNumber}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {cand.fullName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          <div>{cand.phone}</div>
                          <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                            {cand.aadhaarMasked}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums dark:text-slate-200">
                          {cand.attendancePercent}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {cand.assessmentScore}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`font-medium ${
                              cand.result === 'Distinction'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {cand.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CandidateAnomalySection
                batch={batch}
                onAnomalyCountChange={setAnomalyCount}
              />
            )}
          </div>

          <div className="rounded-md border border-stone-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#161B22]">
            <div className="border-b border-stone-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Approval History
              </h3>
            </div>
            {batch.approvalHistory.length === 0 ? (
              <p className="px-5 py-6 text-xs text-slate-500 dark:text-slate-400">
                No approval decisions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
                  <thead className="bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Stage</th>
                      <th className="px-4 py-2.5 font-semibold">Officer</th>
                      <th className="px-4 py-2.5 font-semibold">Decision</th>
                      <th className="px-4 py-2.5 font-semibold">Remarks</th>
                      <th className="px-4 py-2.5 font-semibold">Date & Ver.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
                    {batch.approvalHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.stage}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {item.actorName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.actorRole}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.decision} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                          {item.remarks || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          <div>{formatDateTime(item.timestamp)}</div>
                          <div>{item.batchVersion}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-md border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
            Activity Timeline
          </h3>
          <div className="mt-4">
            <BatchTimeline entries={batch.activityTimeline} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialogState.open}
        onClose={() => setDialogState({ open: false, action: null })}
        onConfirm={handleConfirmAction}
        title={
          dialogState.action === 'submit_draft'
            ? 'Submit Draft Batch'
            : dialogState.action === 'resubmit'
              ? 'Resubmit Batch'
              : dialogState.action === 'escalate'
                ? 'Escalate SLA Delay'
                : dialogState.action === 'approve'
                  ? canStateAct
                    ? 'Final Approve & Issue Certificates'
                    : 'Approve Batch'
                  : dialogState.action === 'return'
                    ? 'Return Batch'
                    : 'Reject Batch'
        }
        description={
          dialogState.action === 'approve' && canStateAct
            ? `Final approval will issue ${batch.candidateCount} digital certificates for ${batch.batchNumber}.`
            : dialogState.action === 'approve'
              ? `Record your approval for ${batch.batchNumber}. Comments are optional.`
              : dialogState.action === 'return' || dialogState.action === 'reject'
                ? 'Remarks are mandatory when returning or rejecting a batch.'
                : dialogState.action === 'resubmit'
                  ? 'Resubmitting increments the batch version and restarts District Verification.'
                  : `Confirm action on batch ${batch.batchNumber}.`
        }
        confirmLabel={
          dialogState.action === 'approve'
            ? canStateAct
              ? 'Final Approve & Issue'
              : 'Approve'
            : dialogState.action === 'return'
              ? 'Return'
              : dialogState.action === 'reject'
                ? 'Reject'
                : 'Confirm'
        }
        confirmTone={
          dialogState.action === 'approve'
            ? 'success'
            : dialogState.action === 'reject'
              ? 'danger'
              : dialogState.action === 'return' || dialogState.action === 'escalate'
                ? 'warning'
                : 'primary'
        }
        requireRemarks={
          dialogState.action === 'return' ||
          dialogState.action === 'reject' ||
          dialogState.action === 'escalate' ||
          dialogState.action === 'resubmit'
        }
        showRemarksField={dialogState.action !== 'submit_draft'}
      />
    </div>
  );
}
