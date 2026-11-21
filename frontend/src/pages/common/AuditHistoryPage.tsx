import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { DataTable, TableColumn } from '../../components/common/DataTable';
import { FilterControls } from '../../components/common/FilterControls';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { ApprovalDecision, ApprovalStage } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface AuditRow {
  id: string;
  batchId: string;
  batchNumber: string;
  stage: ApprovalStage;
  actorName: string;
  actorRole: string;
  decision: ApprovalDecision;
  remarks: string;
  timestamp: string;
  batchVersion: string;
}

export function AuditHistoryPage() {
  const { batches } = useWorkflow();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const stageFilter = searchParams.get('stage') ?? 'ALL';
  const decisionFilter = searchParams.get('decision') ?? 'ALL';
  const dateFilter = searchParams.get('date') ?? '';

  const updateParam = (key: string, value: string, defaultVal = '') => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultVal) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const auditRows = useMemo<AuditRow[]>(() => {
    const entries: AuditRow[] = [];
    batches.forEach((batch) => {
      batch.approvalHistory.forEach((h) => {
        entries.push({
          id: h.id,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          stage: h.stage,
          actorName: h.actorName,
          actorRole: h.actorRole,
          decision: h.decision,
          remarks: h.remarks || '—',
          timestamp: h.timestamp,
          batchVersion: h.batchVersion,
        });
      });
    });
    return entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [batches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditRows.filter((r) => {
      if (stageFilter !== 'ALL' && r.stage !== stageFilter) return false;
      if (decisionFilter !== 'ALL' && r.decision !== decisionFilter)
        return false;
      if (dateFilter && r.timestamp.slice(0, 10) !== dateFilter) return false;
      if (!q) return true;
      return (
        r.batchNumber.toLowerCase().includes(q) ||
        r.actorName.toLowerCase().includes(q) ||
        r.stage.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q)
      );
    });
  }, [auditRows, search, stageFilter, decisionFilter, dateFilter]);

  const hasActiveFilters =
    search !== '' ||
    stageFilter !== 'ALL' ||
    decisionFilter !== 'ALL' ||
    dateFilter !== '';

  const columns: TableColumn<AuditRow>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (r) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
          {formatDateTime(r.timestamp)}
        </span>
      ),
    },
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
      key: 'stage',
      header: 'Stage',
      render: (r) => (
        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
          {r.stage}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Officer',
      render: (r) => (
        <div>
          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
            {r.actorName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {r.actorRole}
          </p>
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Action',
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
      key: 'view',
      header: 'Details',
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
      <PageHeader title="Audit History" fallbackRoute={ROUTES.DASHBOARD} />

      <div className="rounded-md border border-stone-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(val) => updateParam('q', val)}
            placeholder="Search batch, officer, or remarks..."
            className="w-full sm:w-56 lg:w-64 shrink-0"
          />
          <FilterControls
            hasActiveFilters={hasActiveFilters}
            onReset={() => setSearchParams({}, { replace: true })}
            dateFilter={{
              id: 'audit-date-filter',
              label: 'Action Date',
              value: dateFilter,
              onChange: (val) => updateParam('date', val),
            }}
            filters={[
              {
                id: 'audit-stage-filter',
                label: 'Stage',
                value: stageFilter,
                onChange: (val) => updateParam('stage', val, 'ALL'),
                options: [
                  { label: 'All Stages', value: 'ALL' },
                  { label: 'Centre Submission', value: 'Centre Submission' },
                  { label: 'District Verification', value: 'District Verification' },
                  { label: 'Quality Scrutiny', value: 'Quality Scrutiny' },
                  { label: 'State Final Approval', value: 'State Final Approval' },
                  { label: 'Mission Escalation', value: 'Mission Escalation' },
                ],
              },
              {
                id: 'audit-decision-filter',
                label: 'Action',
                value: decisionFilter,
                onChange: (val) => updateParam('decision', val, 'ALL'),
                options: [
                  { label: 'All Actions', value: 'ALL' },
                  { label: 'Submitted', value: 'Submitted' },
                  { label: 'Resubmitted', value: 'Resubmitted' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Returned', value: 'Returned' },
                  { label: 'Rejected', value: 'Rejected' },
                  { label: 'Escalated', value: 'Escalated' },
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
        emptyTitle="No matching audit events"
        emptyDescription="Adjust your search or filters to view results."
        emptyActionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
        onEmptyAction={
          hasActiveFilters
            ? () => setSearchParams({}, { replace: true })
            : undefined
        }
      />
    </div>
  );
}
