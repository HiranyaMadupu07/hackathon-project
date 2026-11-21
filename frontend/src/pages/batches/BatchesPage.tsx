import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Eye, FilePlus2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTable, TableColumn } from '../../components/common/DataTable';
import { FilterControls } from '../../components/common/FilterControls';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { COURSES, DISTRICTS } from '../../data/mockData';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { Batch, BatchStatus } from '../../types';
import { formatDate } from '../../utils/formatters';

interface BatchesPageProps {
  mode: 'batches' | 'stuck-batches';
}

const ALL_STATUSES: BatchStatus[] = [
  'Draft',
  'Pending District Approval',
  'Pending Quality Review',
  'Pending State Approval',
  'Issued',
  'Returned',
  'Rejected',
];

export function BatchesPage({ mode }: BatchesPageProps) {
  const { user } = useAuth();
  const { batches, escalateStuckBatch } = useWorkflow();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const districtFilter = searchParams.get('district') ?? 'ALL';
  const courseFilter = searchParams.get('course') ?? 'ALL';
  const dateFilter = searchParams.get('date') ?? '';

  const [escalateTarget, setEscalateTarget] = useState<Batch | null>(null);

  if (!user) return null;

  const updateParam = (key: string, value: string, defaultVal = '') => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultVal) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const baseBatches = useMemo(() => {
    if (mode === 'stuck-batches') {
      return batches.filter(
        (b) =>
          (b.isStuck || b.daysInCurrentStage >= 7) &&
          b.status !== 'Issued' &&
          b.status !== 'Rejected'
      );
    }
    if (user.role === 'TRAINING_CENTRE') {
      return batches.filter(
        (b) => b.centreOfficerEmail.toLowerCase() === user.email.toLowerCase()
      );
    }
    if (user.role === 'DISTRICT_OFFICER') {
      return batches.filter((b) => b.status !== 'Draft');
    }
    return batches;
  }, [batches, mode, user.email, user.role]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseBatches.filter((batch) => {
      if (statusFilter !== 'ALL' && batch.status !== statusFilter) return false;
      if (districtFilter !== 'ALL' && batch.district !== districtFilter)
        return false;
      if (courseFilter !== 'ALL' && batch.courseCode !== courseFilter)
        return false;
      if (dateFilter && batch.submissionDate !== dateFilter) return false;
      if (!q) return true;
      return (
        batch.batchNumber.toLowerCase().includes(q) ||
        batch.batchName.toLowerCase().includes(q) ||
        batch.trainingCentre.toLowerCase().includes(q) ||
        batch.courseName.toLowerCase().includes(q) ||
        batch.district.toLowerCase().includes(q)
      );
    });
  }, [
    baseBatches,
    search,
    statusFilter,
    districtFilter,
    courseFilter,
    dateFilter,
  ]);

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    districtFilter !== 'ALL' ||
    courseFilter !== 'ALL' ||
    dateFilter !== '';

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const pageTitle =
    mode === 'stuck-batches'
      ? 'Stuck Batches'
      : user.role === 'TRAINING_CENTRE'
        ? 'My Batches'
        : user.role === 'DISTRICT_OFFICER'
          ? 'Batch History'
          : 'All Batches';

  const columns: TableColumn<Batch>[] = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
            {row.batchNumber}
          </span>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
            {row.batchName}
          </p>
        </div>
      ),
    },
    {
      key: 'trainingCentre',
      header: 'Training Centre',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
            {row.trainingCentre}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.district}
          </p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {row.courseName}
          </p>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {row.courseCode}
          </p>
        </div>
      ),
    },
    {
      key: 'candidateCount',
      header: 'Candidates',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {row.candidateCount}
        </span>
      ),
    },
    {
      key: 'submissionDate',
      header: 'Submitted',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
          {formatDate(row.submissionDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.status} />
          {mode === 'stuck-batches' && (
            <span className="font-mono text-[11px] font-semibold text-red-700 dark:text-red-400 tabular-nums">
              {row.daysInCurrentStage}d stalled
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {mode === 'stuck-batches' && user.role === 'STATE_OFFICER' && (
            <button
              type="button"
              onClick={() => setEscalateTarget(row)}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50 whitespace-nowrap"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Escalate</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(ROUTES.BATCH_DETAIL(row.id))}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Details</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={pageTitle}
        fallbackRoute={ROUTES.DASHBOARD}
        actions={
          user.role === 'TRAINING_CENTRE' ? (
            <Link
              to={ROUTES.BATCH_CREATE}
              className="inline-flex items-center gap-2 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Create Batch</span>
            </Link>
          ) : undefined
        }
      />

      <div className="rounded-md border border-stone-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(val) => updateParam('q', val)}
            placeholder="Search batch, centre, course..."
            className="w-full sm:w-56 lg:w-52 shrink-0"
          />
          <FilterControls
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
            dateFilter={{
              id: 'batch-date-filter',
              label: 'Submission Date',
              value: dateFilter,
              onChange: (val) => updateParam('date', val),
            }}
            filters={[
              {
                id: 'batch-status-filter',
                label: 'Status',
                value: statusFilter,
                onChange: (val) => updateParam('status', val, 'ALL'),
                options: [
                  { label: 'All Statuses', value: 'ALL' },
                  ...ALL_STATUSES.map((s) => ({ label: s, value: s })),
                ],
              },
              {
                id: 'batch-district-filter',
                label: 'District',
                value: districtFilter,
                onChange: (val) => updateParam('district', val, 'ALL'),
                options: [
                  { label: 'All Districts', value: 'ALL' },
                  ...DISTRICTS.map((d) => ({ label: d, value: d })),
                ],
              },
              {
                id: 'batch-course-filter',
                label: 'Course',
                value: courseFilter,
                onChange: (val) => updateParam('course', val, 'ALL'),
                options: [
                  { label: 'All Courses', value: 'ALL' },
                  ...COURSES.map((c) => ({ label: c.code, value: c.code })),
                ],
              },
            ]}
          />
        </div>
      </div>

      <DataTable
        data={filteredBatches}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(ROUTES.BATCH_DETAIL(row.id))}
        emptyTitle="No matching batches"
        emptyDescription="Clear active filters or create a new batch submission."
        emptyActionLabel={
          hasActiveFilters
            ? 'Clear Filters'
            : user.role === 'TRAINING_CENTRE'
              ? 'Create Batch'
              : undefined
        }
        onEmptyAction={
          hasActiveFilters
            ? resetFilters
            : user.role === 'TRAINING_CENTRE'
              ? () => navigate(ROUTES.BATCH_CREATE)
              : undefined
        }
      />

      <ConfirmDialog
        isOpen={Boolean(escalateTarget)}
        onClose={() => setEscalateTarget(null)}
        title={`Escalate Batch ${escalateTarget?.batchNumber ?? ''}`}
        description={`Issue a priority SLA escalation notice for ${escalateTarget?.trainingCentre ?? 'this batch'} (${escalateTarget?.daysInCurrentStage ?? 0} days stalled).`}
        confirmLabel="Send Escalation"
        confirmTone="warning"
        requireRemarks
        remarksLabel="Escalation Directive"
        remarksPlaceholder="Specify priority review deadline or escalation instructions..."
        onConfirm={(remarks) => {
          if (!escalateTarget) return;
          escalateStuckBatch(escalateTarget.id, remarks, user);
          addToast({
            title: 'Escalation Directive Sent',
            description: `Priority notice logged for ${escalateTarget.batchNumber}.`,
            type: 'warning',
          });
        }}
      />
    </div>
  );
}
