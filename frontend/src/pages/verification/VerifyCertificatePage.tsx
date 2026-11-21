import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Ban,
  CheckCircle2,
  Info,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { verificationService } from '../../services/mockApiService';
import { Certificate } from '../../types';
import { formatDate } from '../../utils/formatters';

type VerificationState =
  | { kind: 'idle' }
  | { kind: 'valid'; certificate: Certificate }
  | { kind: 'cancelled'; certificate: Certificate }
  | { kind: 'not_found'; query: string };

export function VerifyCertificatePage() {
  const { certificateNumber: routeCertNumber } = useParams<{
    certificateNumber?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { certificates } = useWorkflow();

  const [query, setQuery] = useState(routeCertNumber ?? '');
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState<VerificationState>({ kind: 'idle' });
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const validSample = certificates.find((c) => c.status === 'Issued');
  const cancelledSample = certificates.find((c) => c.status === 'Cancelled');

  const evaluateCertificate = (inputCode: string) => {
    const clean = inputCode.trim();
    if (!clean) {
      setResult({ kind: 'idle' });
      return;
    }

    const matched = verificationService.lookupCertificate(certificates, clean);
    if (!matched) {
      setResult({ kind: 'not_found', query: clean });
      return;
    }

    if (matched.status === 'Cancelled') {
      setResult({ kind: 'cancelled', certificate: matched });
      return;
    }

    setResult({ kind: 'valid', certificate: matched });
  };

  useEffect(() => {
    if (routeCertNumber) {
      const decoded = decodeURIComponent(routeCertNumber);
      setQuery(decoded);
      setValidationError('');
      evaluateCertificate(decoded);
    } else {
      setResult({ kind: 'idle' });
    }
  }, [routeCertNumber, certificates]);

  const handleVerifyNavigate = (inputCode: string) => {
    const clean = inputCode.trim();
    if (!clean) {
      setValidationError('Please enter a certificate number.');
      return;
    }
    setValidationError('');
    navigate(ROUTES.VERIFY_CERTIFICATE(clean));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyNavigate(query);
  };

  const handleQrSimulate = (certNumber: string) => {
    setQrModalOpen(false);
    handleVerifyNavigate(certNumber);
  };

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else if (routeCertNumber) {
      navigate(ROUTES.VERIFY, { replace: true });
    } else {
      navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN, {
        replace: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-slate-900 dark:bg-[#0D1016] dark:text-slate-100 flex flex-col transition-colors">
      <header className="border-b border-stone-200 bg-white dark:border-slate-800 dark:bg-[#131720]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F294D] text-white dark:bg-teal-600">
              <Award className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              CertiFlow
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggle />
            <Link
              to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <span>{isAuthenticated ? 'Portal Dashboard' : 'Sign In'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Certificate Verification
          </h1>
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
          <div className="flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-300">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F294D] dark:text-teal-400" />
            <span>
              Certificate numbers can be checked directly without logging in.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-2.5" noValidate>
            <label
              htmlFor="verify-cert-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Certificate Number
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="verify-cert-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="Enter certificate number (e.g. PSM-CERT-2026-101001)"
                  className="h-10 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0F294D] px-5 text-sm font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Verify</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <QrCode className="h-4 w-4 text-[#0F294D] dark:text-teal-400" />
                <span>Scan QR</span>
              </button>
            </div>
            {validationError && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                {validationError}
              </p>
            )}
          </form>
        </div>

        {/* Verification Results */}
        {result.kind === 'valid' && (
          <section
            aria-label="Valid Certificate Result"
            className="mt-6 rounded-md border border-emerald-200 bg-white p-6 dark:border-emerald-800/70 dark:bg-[#161B22]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    Valid Skilling Certificate
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Active credential issued by Pragati Skills Mission.
                  </p>
                </div>
              </div>
              <StatusBadge status="Issued" size="md" />
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Certificate Number
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {result.certificate.certificateNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Issue Date
                </dt>
                <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDate(result.certificate.issueDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Credential Holder
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {result.certificate.candidateName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Course Qualification
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {result.certificate.courseName}
                </dd>
                <dd className="text-xs text-slate-500 dark:text-slate-400">
                  {result.certificate.courseCode} · {result.certificate.sector}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Training Centre
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {result.certificate.trainingCentre}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  District & Standing
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {result.certificate.district} · {result.certificate.grade}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
              <span>
                Private contact details and national identity numbers are
                withheld from public verification results.
              </span>
            </div>
          </section>
        )}

        {result.kind === 'cancelled' && (
          <section
            aria-label="Cancelled Certificate Result"
            className="mt-6 rounded-md border border-red-200 bg-white p-6 dark:border-red-900/70 dark:bg-[#161B22]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    Certificate Cancelled
                  </h2>
                  <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
                    This credential has been revoked and is no longer valid.
                  </p>
                </div>
              </div>
              <StatusBadge status="Cancelled" size="md" />
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Certificate Number
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {result.certificate.certificateNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Cancellation Date
                </dt>
                <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDate(result.certificate.cancelledAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Course Qualification
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {result.certificate.courseName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Original Issue Date
                </dt>
                <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDate(result.certificate.issueDate)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Cancellation Reason
                </dt>
                <dd className="mt-1 rounded-md border border-red-200 bg-red-50/70 p-3 text-xs leading-relaxed text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  {result.certificate.cancellationReason ??
                    'Revoked by State Certification Directorate.'}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {result.kind === 'not_found' && (
          <section
            aria-label="Certificate Not Found"
            className="mt-6 rounded-md border border-stone-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-[#161B22]"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-stone-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <XCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Certificate Not Found
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              No record matching{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {result.query}
              </span>{' '}
              was found in the registry.
            </p>
          </section>
        )}
      </main>

      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="QR Code Scanner"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-[#0D1016]">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-[#0F294D]/20 bg-white text-[#0F294D] dark:border-slate-700 dark:bg-[#161B22] dark:text-teal-400">
              <QrCode className="h-9 w-9" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Camera QR Reader
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Point device camera at the certificate QR block, or test a scan
              below.
            </p>
          </div>

          <div className="space-y-2">
            {validSample && (
              <button
                type="button"
                onClick={() => handleQrSimulate(validSample.certificateNumber)}
                className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white px-3.5 py-2.5 text-left text-xs hover:bg-stone-50 dark:border-slate-700 dark:bg-[#1C222B] dark:hover:bg-slate-800"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Scan Valid Certificate
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {validSample.certificateNumber}
                </span>
              </button>
            )}
            {cancelledSample && (
              <button
                type="button"
                onClick={() =>
                  handleQrSimulate(cancelledSample.certificateNumber)
                }
                className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white px-3.5 py-2.5 text-left text-xs hover:bg-stone-50 dark:border-slate-700 dark:bg-[#1C222B] dark:hover:bg-slate-800"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Scan Cancelled Certificate
                </span>
                <span className="font-mono text-red-700 dark:text-red-400">
                  {cancelledSample.certificateNumber}
                </span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
