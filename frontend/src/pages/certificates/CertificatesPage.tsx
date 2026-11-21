import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, FileText, RefreshCw } from 'lucide-react';
import { CertificatePreviewModal } from '../../components/certificates/CertificatePreviewModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTable, TableColumn } from '../../components/common/DataTable';
import { FilterControls } from '../../components/common/FilterControls';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { Certificate } from '../../types';
import { formatDate } from '../../utils/formatters';

export function CertificatesPage() {
  const { user } = useAuth();
  const { certificates, cancelCertificate, retryWhatsAppDelivery } =
    useWorkflow();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const waFilter = searchParams.get('whatsapp') ?? 'ALL';
  const dateFilter = searchParams.get('date') ?? '';

  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Certificate | null>(null);

  const updateParam = (key: string, value: string, defaultVal = '') => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultVal) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certificates.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (waFilter !== 'ALL' && c.whatsappStatus !== waFilter) return false;
      if (dateFilter && c.issueDate !== dateFilter) return false;
      if (!q) return true;
      return (
        c.certificateNumber.toLowerCase().includes(q) ||
        c.candidateName.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.batchNumber.toLowerCase().includes(q)
      );
    });
  }, [certificates, search, statusFilter, waFilter, dateFilter]);

  if (!user) return null;

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    waFilter !== 'ALL' ||
    dateFilter !== '';

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const columns: TableColumn<Certificate>[] = [
    {
      key: 'certificateNumber',
      header: 'Certificate Number',
      render: (c) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
            {c.certificateNumber}
          </span>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {c.batchNumber}
          </p>
        </div>
      ),
    },
    {
      key: 'candidateName',
      header: 'Candidate',
      render: (c) => (
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {c.candidateName}
          </p>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {c.candidateRegNo}
          </p>
        </div>
      ),
    },
    {
      key: 'courseName',
      header: 'Course',
      render: (c) => (
        <div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {c.courseName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {c.district}
          </p>
        </div>
      ),
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (c) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
          {formatDate(c.issueDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'whatsappStatus',
      header: 'WhatsApp Delivery',
      render: (c) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <StatusBadge status={c.whatsappStatus} />
          {c.whatsappStatus === 'Failed' && c.status === 'Issued' && (
            <button
              type="button"
              onClick={() => {
                retryWhatsAppDelivery(c.id);
                addToast({
                  title: 'WhatsApp Delivery Retried',
                  description: `${c.certificateNumber} delivered.`,
                  type: 'success',
                });
              }}
              title="Retry WhatsApp dispatch"
              className="inline-flex items-center gap-1 rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPreviewCert(c)}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
          {user.role === 'STATE_OFFICER' && c.status === 'Issued' && (
            <button
              type="button"
              onClick={() => setCancelTarget(c)}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50 whitespace-nowrap"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Certificates"
        fallbackRoute={ROUTES.DASHBOARD}
        actions={
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            <span>
              Issued: {certificates.filter((c) => c.status === 'Issued').length}
            </span>
            <span>·</span>
            <span>
              Cancelled:{' '}
              {certificates.filter((c) => c.status === 'Cancelled').length}
            </span>
            <span>·</span>
            <span className="text-red-700 dark:text-red-400">
              Failed:{' '}
              {certificates.filter((c) => c.whatsappStatus === 'Failed').length}
            </span>
          </div>
        }
      />

      <div className="rounded-md border border-stone-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(val) => updateParam('q', val)}
            placeholder="Search certificate, candidate, course..."
            className="w-full sm:w-56 lg:w-64 shrink-0"
          />
          <FilterControls
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
            dateFilter={{
              id: 'cert-date-filter',
              label: 'Issue Date',
              value: dateFilter,
              onChange: (val) => updateParam('date', val),
            }}
            filters={[
              {
                id: 'cert-status-filter',
                label: 'Certificate Status',
                value: statusFilter,
                onChange: (val) => updateParam('status', val, 'ALL'),
                options: [
                  { label: 'All Statuses', value: 'ALL' },
                  { label: 'Issued', value: 'Issued' },
                  { label: 'Cancelled', value: 'Cancelled' },
                ],
              },
              {
                id: 'cert-wa-filter',
                label: 'WhatsApp Status',
                value: waFilter,
                onChange: (val) => updateParam('whatsapp', val, 'ALL'),
                options: [
                  { label: 'All WhatsApp', value: 'ALL' },
                  { label: 'Delivered', value: 'Delivered' },
                  { label: 'Sent', value: 'Sent' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Failed', value: 'Failed' },
                ],
              },
            ]}
          />
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(c) => c.id}
        onRowClick={(c) => navigate(ROUTES.CERTIFICATE_DETAIL(c.id))}
        emptyTitle="No matching certificates"
        emptyDescription="No certificates matched your search or filter criteria."
        emptyActionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
        onEmptyAction={hasActiveFilters ? resetFilters : undefined}
      />

      <CertificatePreviewModal
        certificate={previewCert}
        onClose={() => setPreviewCert(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Certificate ${cancelTarget?.certificateNumber ?? ''}`}
        description={`Cancellation permanently invalidates this certificate for ${cancelTarget?.candidateName ?? ''} and updates the public verification registry immediately.`}
        confirmLabel="Cancel Certificate"
        confirmTone="danger"
        requireRemarks
        remarksLabel="Cancellation Reason"
        remarksPlaceholder="Provide audit or compliance reason for revocation..."
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          cancelCertificate(cancelTarget.id, reason, user);
          addToast({
            title: 'Certificate Cancelled',
            description: `${cancelTarget.certificateNumber} permanently invalidated.`,
            type: 'warning',
          });
        }}
      />
    </div>
  );
}
