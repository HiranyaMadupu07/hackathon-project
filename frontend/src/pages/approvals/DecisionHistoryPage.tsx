import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { DataTable, TableColumn } from '../../components/common/DataTable';
import { FilterControls } from '../../components/common/FilterControls';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { ApprovalDecision, BatchStatus } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface DecisionRow {
  id: string;
  batchId: string;
  batchNumber: string;
  trainingCentre: string;
  courseName: string;
  decision: ApprovalDecision;
  remarks: string;
  timestamp: string;
  currentStatus: BatchStatus;
}

interface DecisionHistoryPageProps {
  mode: 'district-decisions' | 'quality-history';
}

export function DecisionHistoryPage({ mode }: DecisionHistoryPageProps) {
  const { user } = useAuth();
  const { batches } = useWorkflow();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const decisionFilter = searchParams.get('decision') ?? 'ALL';

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

  const rows = useMemo<DecisionRow[]>(() => {
    const collected: DecisionRow[] = [];
    batches.forEach((batch) => {
      batch.approvalHistory.forEach((entry) => {
        const matchesDistrict =
          mode === 'district-decisions' &&
          entry.actorEmail.toLowerCase() === user.email.toLowerCase();
        const matchesQuality =
          mode === 'quality-history' && entry.stage === 'Quality Scrutiny';

        if (matchesDistrict || matchesQuality) {
          collected.push({
            id: entry.id,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            trainingCentre: batch.trainingCentre,
            courseName: batch.courseName,
            decision: entry.decision,
            remarks: entry.remarks || '—',
            timestamp: entry.timestamp,
            currentStatus: batch.status,
          });
        }
      });
    });
    return collected.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [batches, mode, user.email]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (decisionFilter !== 'ALL' && r.decision !== decisionFilter) return false;
      if (!q) return true;
      return (
        r.batchNumber.toLowerCase().includes(q) ||
        r.trainingCentre.toLowerCase().includes(q) ||
        r.courseName.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q)
      );
    });
  }, [rows, search, decisionFilter]);

  const hasActiveFilters = search !== '' || decisionFilter !== 'ALL';

  const columns: TableColumn<DecisionRow>[] = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
          {r.batchNumber}
        </span>
      ),
    },
    {
      key: 'centre',
      header: 'Training Centre & Course',
      render: (r) => (
        <div>
          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
            {r.trainingCentre}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {r.courseName}
          </p>
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (r) => <StatusBadge status={r.decision} />,
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">
          {r.remarks}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Date & Time',
      render: (r) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
          {formatDateTime(r.timestamp)}
        </span>
      ),
    },
    {
      key: 'currentStatus',
      header: 'Batch Status',
      render: (r) => <StatusBadge status={r.currentStatus} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(ROUTES.BATCH_DETAIL(r.batchId))}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
        title={
          mode === 'district-decisions'
            ? 'My Decisions'
            : 'Review History'
        }
        fallbackRoute={ROUTES.DASHBOARD}
      />

      <div className="rounded-md border border-stone-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(val) => updateParam('q', val)}
            placeholder="Search batch, centre, course, or remarks..."
            className="w-full sm:w-64 lg:w-72 shrink-0"
          />
          <FilterControls
            hasActiveFilters={hasActiveFilters}
            onReset={() => setSearchParams({}, { replace: true })}
            filters={[
              {
                id: 'decision-filter',
                label: 'Decision',
                value: decisionFilter,
                onChange: (val) => updateParam('decision', val, 'ALL'),
                options: [
                  { label: 'All Decisions', value: 'ALL' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Returned', value: 'Returned' },
                  { label: 'Rejected', value: 'Rejected' },
                ],
              },
            ]}
          />
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => navigate(ROUTES.BATCH_DETAIL(r.batchId))}
        emptyTitle="No recorded decisions"
        emptyDescription="Decisions submitted in your approval queue will appear here."
      />
    </div>
  );
}
