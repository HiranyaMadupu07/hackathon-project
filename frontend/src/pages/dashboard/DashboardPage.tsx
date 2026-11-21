import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileEdit,
  FilePlus2,
  Layers,
  MessageSquareWarning,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { AiDashboardChat } from '../../components/ai/AiDashboardChat';
import { DistrictApprovalProgress } from '../../components/approvals/DistrictApprovalProgress';
import { BatchTimeline } from '../../components/batches/BatchTimeline';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatusDistributionChart } from '../../components/dashboard/StatusDistributionChart';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { formatDate } from '../../utils/formatters';

export function DashboardPage() {
  const { user } = useAuth();
  const { batches, certificates } = useWorkflow();
  const navigate = useNavigate();

  if (!user) return null;

  if (user.role === 'TRAINING_CENTRE') {
    const myBatches = batches.filter(
      (b) => b.centreOfficerEmail.toLowerCase() === user.email.toLowerCase()
    );
    const draftCount = myBatches.filter((b) => b.status === 'Draft').length;
    const pendingCount = myBatches.filter((b) =>
      [
        'Pending District Approval',
        'Pending Quality Review',
        'Pending State Approval',
      ].includes(b.status)
    ).length;
    const returnedCount = myBatches.filter((b) => b.status === 'Returned').length;

    const recentActivities = myBatches
      .flatMap((b) =>
        b.activityTimeline.map((act) => ({
          ...act,
          title: `${b.batchNumber} · ${act.title}`,
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 6);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {user.organization}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {user.district} District
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <AiDashboardChat />
            <Link
              to={ROUTES.BATCH_CREATE}
              className="inline-flex items-center gap-2 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Create Batch</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Batches"
            value={myBatches.length}
            icon={Layers}
            tone="navy"
            onClick={() => navigate(ROUTES.BATCHES)}
          />
          <StatCard
            label="Draft Batches"
            value={draftCount}
            icon={FileEdit}
            tone="neutral"
            onClick={() => navigate(`${ROUTES.BATCHES}?status=Draft`)}
          />
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            icon={Clock}
            tone="warning"
            onClick={() => navigate(ROUTES.BATCHES)}
          />
          <StatCard
            label="Returned Batches"
            value={returnedCount}
            icon={RotateCcw}
            tone="danger"
            onClick={() => navigate(`${ROUTES.BATCHES}?status=Returned`)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recent Batches
              </h3>
              <Link
                to={ROUTES.BATCHES}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {myBatches.slice(0, 5).map((batch) => (
                <div
                  key={batch.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => navigate(ROUTES.BATCH_DETAIL(batch.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(ROUTES.BATCH_DETAIL(batch.id));
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                      {batch.batchNumber}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {batch.batchName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {batch.courseName} ·{' '}
                      <span className="font-mono tabular-nums">
                        {batch.candidateCount} candidates
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={batch.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-md border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
              Recent Activity
            </h3>
            <div className="mt-4">
              <BatchTimeline entries={recentActivities} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'DISTRICT_OFFICER') {
    const pendingQueue = batches.filter(
      (b) =>
        b.status === 'Pending District Approval' &&
        !b.districtApprovals.some(
          (a) => a.officerEmail.toLowerCase() === user.email.toLowerCase()
        )
    );
    const myApprovedCount = batches.filter((b) =>
      b.districtApprovals.some(
        (a) =>
          a.officerEmail.toLowerCase() === user.email.toLowerCase() &&
          a.decision === 'Approved'
      )
    ).length;
    const myReturnedCount = batches.filter((b) =>
      b.districtApprovals.some(
        (a) =>
          a.officerEmail.toLowerCase() === user.email.toLowerCase() &&
          a.decision === 'Returned'
      )
    ).length;

    const myRecentDecisions = batches
      .flatMap((b) =>
        b.approvalHistory
          .filter(
            (h) => h.actorEmail.toLowerCase() === user.email.toLowerCase()
          )
          .map((h) => ({
            id: h.id,
            title: `${b.batchNumber} · ${h.decision}`,
            description:
              h.remarks || `${b.courseName} (${b.candidateCount} candidates)`,
            actor: h.actorName,
            timestamp: h.timestamp,
            type: (h.decision === 'Approved'
              ? 'success'
              : h.decision === 'Rejected'
                ? 'danger'
                : 'warning') as 'success' | 'danger' | 'warning',
          }))
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 6);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              District Verification Overview
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {user.designation}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <AiDashboardChat />
            <Link
              to={ROUTES.APPROVALS_DISTRICT}
              className="inline-flex items-center gap-2 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Open Review Queue</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Pending Reviews"
            value={pendingQueue.length}
            icon={Clock}
            tone="warning"
            onClick={() => navigate(ROUTES.APPROVALS_DISTRICT)}
          />
          <StatCard
            label="Approved Batches"
            value={myApprovedCount}
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate(ROUTES.APPROVALS_DISTRICT_DECISIONS)}
          />
          <StatCard
            label="Returned Batches"
            value={myReturnedCount}
            icon={RotateCcw}
            tone="danger"
            onClick={() => navigate(ROUTES.APPROVALS_DISTRICT_DECISIONS)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Batch Review Queue
              </h3>
              <Link
                to={ROUTES.APPROVALS_DISTRICT}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400"
              >
                <span>Open Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {pendingQueue.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No Pending District Reviews"
                  description="All submitted batches requiring your district sign-off have been reviewed."
                />
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {pendingQueue.map((batch) => (
                  <div
                    key={batch.id}
                    tabIndex={0}
                    role="button"
                    onClick={() =>
                      navigate(`${ROUTES.APPROVALS_DISTRICT}?batch=${batch.id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if ((e.target as HTMLElement).closest('button')) return;
                        e.preventDefault();
                        navigate(
                          `${ROUTES.APPROVALS_DISTRICT}?batch=${batch.id}`
                        );
                      }
                    }}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-stone-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                          {batch.batchNumber}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {batch.district}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {batch.trainingCentre}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {batch.courseName} ·{' '}
                        <span className="font-mono tabular-nums">
                          {batch.candidateCount} candidates
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <DistrictApprovalProgress batch={batch} compact />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `${ROUTES.APPROVALS_DISTRICT}?batch=${batch.id}`
                          );
                        }}
                        className="rounded-md bg-[#0F294D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-md border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
              Approval Activity
            </h3>
            <div className="mt-4">
              <BatchTimeline entries={myRecentDecisions} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'QUALITY_OFFICER') {
    const qualityQueue = batches.filter(
      (b) => b.status === 'Pending Quality Review'
    );
    const completedQualityCount = batches.filter((b) =>
      b.approvalHistory.some((h) => h.stage === 'Quality Scrutiny')
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Quality Assurance Overview
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {user.organization}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <AiDashboardChat />
            <Link
              to={ROUTES.APPROVALS_QUALITY}
              className="inline-flex items-center gap-2 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Open Quality Queue</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Large Batches Awaiting Scrutiny"
            value={qualityQueue.length}
            icon={ShieldCheck}
            tone="warning"
            onClick={() => navigate(ROUTES.APPROVALS_QUALITY)}
          />
          <StatCard
            label="Completed Quality Reviews"
            value={completedQualityCount}
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate(ROUTES.APPROVALS_QUALITY_HISTORY)}
          />
          <StatCard
            label="SLA Alert Batches"
            value={
              qualityQueue.filter(
                (b) => b.isStuck || b.daysInCurrentStage >= 7
              ).length
            }
            icon={AlertTriangle}
            tone="danger"
            onClick={() => navigate(ROUTES.APPROVALS_QUALITY)}
          />
        </div>

        <div className="rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-slate-800">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Quality Review Queue
            </h3>
            <Link
              to={ROUTES.APPROVALS_QUALITY}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400"
            >
              <span>Inspect All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {qualityQueue.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Quality Queue Clear"
                description="No large batches are currently awaiting quality scrutiny."
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {qualityQueue.map((batch) => (
                <div
                  key={batch.id}
                  tabIndex={0}
                  role="button"
                  onClick={() =>
                    navigate(`${ROUTES.APPROVALS_QUALITY}?batch=${batch.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if ((e.target as HTMLElement).closest('button')) return;
                      e.preventDefault();
                      navigate(`${ROUTES.APPROVALS_QUALITY}?batch=${batch.id}`);
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-stone-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                        {batch.batchNumber}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                        {batch.candidateCount} candidates
                      </span>
                      {(batch.isStuck || batch.daysInCurrentStage >= 7) && (
                        <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:border-red-800/60 dark:text-red-300">
                          {batch.daysInCurrentStage}d in queue
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {batch.trainingCentre} ({batch.district})
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {batch.courseName} · Submitted{' '}
                      {formatDate(batch.submissionDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`${ROUTES.APPROVALS_QUALITY}?batch=${batch.id}`);
                    }}
                    className="rounded-md bg-[#0F294D] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
                  >
                    Conduct Audit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // State Officer Dashboard
  const awaitingFinalCount = batches.filter(
    (b) => b.status === 'Pending State Approval'
  ).length;
  const issuedCertCount = certificates.filter(
    (c) => c.status === 'Issued'
  ).length;
  const cancelledCertCount = certificates.filter(
    (c) => c.status === 'Cancelled'
  ).length;
  const failedDeliveryCount = certificates.filter(
    (c) => c.whatsappStatus === 'Failed'
  ).length;
  const stuckBatches = batches.filter(
    (b) =>
      (b.isStuck || b.daysInCurrentStage >= 7) &&
      b.status !== 'Issued' &&
      b.status !== 'Rejected'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            State Mission Overview
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {user.organization}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <AiDashboardChat />
          <Link
            to={ROUTES.APPROVALS_STATE}
            className="inline-flex items-center gap-2 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Final Approvals ({awaitingFinalCount})</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Awaiting Final Approval"
          value={awaitingFinalCount}
          icon={ClipboardCheck}
          tone="navy"
          onClick={() => navigate(ROUTES.APPROVALS_STATE)}
        />
        <StatCard
          label="Total Batches"
          value={batches.length}
          icon={Layers}
          tone="neutral"
          onClick={() => navigate(ROUTES.BATCHES)}
        />
        <StatCard
          label="Certificates Issued"
          value={issuedCertCount}
          icon={Award}
          tone="success"
          onClick={() => navigate(`${ROUTES.CERTIFICATES}?status=Issued`)}
        />
        <StatCard
          label="Certificates Cancelled"
          value={cancelledCertCount}
          icon={Ban}
          tone="danger"
          onClick={() => navigate(`${ROUTES.CERTIFICATES}?status=Cancelled`)}
        />
        <StatCard
          label="Failed Deliveries"
          value={failedDeliveryCount}
          icon={MessageSquareWarning}
          tone="warning"
          onClick={() => navigate(`${ROUTES.CERTIFICATES}?whatsapp=Failed`)}
        />
        <StatCard
          label="Stuck Batches"
          value={stuckBatches.length}
          icon={AlertTriangle}
          tone="danger"
          onClick={() => navigate(ROUTES.BATCH_STUCK)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-6">
          <StatusDistributionChart batches={batches} />
        </div>

        <div className="lg:col-span-6 rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-slate-800">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Stuck Batches Requiring Escalation
            </h3>
            <Link
              to={ROUTES.BATCH_STUCK}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0F294D] hover:underline dark:text-teal-400"
            >
              <span>Manage All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stuckBatches.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No SLA Breaches"
                description="All active batches are progressing within mission turnaround targets."
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {stuckBatches.map((batch) => (
                <div
                  key={batch.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => navigate(ROUTES.BATCH_DETAIL(batch.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(ROUTES.BATCH_DETAIL(batch.id));
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                        {batch.batchNumber}
                      </span>
                      <span className="font-mono text-xs font-semibold text-red-700 dark:text-red-400 tabular-nums">
                        {batch.daysInCurrentStage}d stalled
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {batch.trainingCentre} · {batch.district}
                    </p>
                  </div>
                  <StatusBadge status={batch.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
