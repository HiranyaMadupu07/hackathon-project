import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Ban,
  ExternalLink,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { CertificatePreviewModal } from '../../components/certificates/CertificatePreviewModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { formatDate, formatDateTime } from '../../utils/formatters';

export function CertificateDetailPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { certificates, cancelCertificate, retryWhatsAppDelivery } =
    useWorkflow();
  const { addToast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const certificate = certificates.find((c) => c.id === certificateId);

  if (!user) return null;

  if (!certificate) {
    return (
      <EmptyState
        title="Certificate Not Found"
        description="The requested certificate record could not be found."
        actionLabel="Return to Certificates"
        onAction={() => navigate(ROUTES.CERTIFICATES)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={certificate.certificateNumber}
        fallbackRoute={ROUTES.CERTIFICATES}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={certificate.status} size="md" />
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Preview / PDF</span>
            </button>
            {user.role === 'STATE_OFFICER' &&
              certificate.status === 'Issued' && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel Certificate</span>
                </button>
              )}
          </div>
        }
      />

      <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
          Credential Summary
        </h3>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              Certificate Number
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {certificate.certificateNumber}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Issue Date</dt>
            <dd className="mt-1 font-mono text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
              {formatDate(certificate.issueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              Candidate Name
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {certificate.candidateName}
            </dd>
            <dd className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Reg. No: {certificate.candidateRegNo}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              Course Qualification
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {certificate.courseName}
            </dd>
            <dd className="text-[11px] text-slate-500 dark:text-slate-400">
              {certificate.courseCode} · {certificate.sector}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              Training Centre
            </dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {certificate.trainingCentre}
            </dd>
            <dd className="text-slate-500 dark:text-slate-400">
              {certificate.district} District
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Batch Number</dt>
            <dd className="mt-1">
              <Link
                to={ROUTES.BATCH_DETAIL(certificate.batchId)}
                className="inline-flex items-center gap-1 font-mono font-semibold text-[#0F294D] hover:underline dark:text-teal-400"
              >
                <span>{certificate.batchNumber}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-xs dark:border-slate-800 dark:bg-[#1C222B]">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              WhatsApp Delivery Tracking
            </p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              Updated {formatDateTime(certificate.whatsappUpdatedAt)}
              {certificate.whatsappFailureReason
                ? ` · ${certificate.whatsappFailureReason}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusBadge status={certificate.whatsappStatus} />
            {certificate.whatsappStatus === 'Failed' &&
              certificate.status === 'Issued' && (
                <button
                  type="button"
                  onClick={() => {
                    retryWhatsAppDelivery(certificate.id);
                    addToast({
                      title: 'WhatsApp Delivery Retried',
                      description: `${certificate.certificateNumber} delivered.`,
                      type: 'success',
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              )}
          </div>
        </div>

        {certificate.status === 'Cancelled' && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50/70 p-4 text-xs dark:border-red-900/60 dark:bg-red-950/30">
            <p className="font-semibold text-red-900 dark:text-red-300">
              Revoked on {formatDateTime(certificate.cancelledAt)} by{' '}
              {certificate.cancelledBy}
            </p>
            <p className="mt-1 text-red-800 dark:text-red-200">
              {certificate.cancellationReason}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Cancellation permanently invalidates the certificate across public
              verification.
            </span>
          </div>
          <Link
            to={ROUTES.VERIFY_CERTIFICATE(certificate.certificateNumber)}
            className="inline-flex items-center gap-1.5 font-medium text-[#0F294D] hover:underline dark:text-teal-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Open Public Verification Record</span>
          </Link>
        </div>
      </div>

      <CertificatePreviewModal
        certificate={previewOpen ? certificate : null}
        onClose={() => setPreviewOpen(false)}
      />

      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel Certificate ${certificate.certificateNumber}`}
        description={`Cancellation permanently invalidates this certificate for ${certificate.candidateName}.`}
        confirmLabel="Cancel Certificate"
        confirmTone="danger"
        requireRemarks
        remarksLabel="Cancellation Reason"
        remarksPlaceholder="Provide audit or compliance reason for revocation..."
        onConfirm={(reason) => {
          cancelCertificate(certificate.id, reason, user);
          addToast({
            title: 'Certificate Cancelled',
            description: `${certificate.certificateNumber} permanently invalidated.`,
            type: 'warning',
          });
        }}
      />
    </div>
  );
}
