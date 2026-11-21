import { Award, Ban, Download, Printer, ShieldCheck } from 'lucide-react';
import { useToast } from '../../hooks/useAppState';
import { Certificate } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface CertificatePreviewModalProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export function CertificatePreviewModal({
  certificate,
  onClose,
}: CertificatePreviewModalProps) {
  const { addToast } = useToast();

  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const content = [
      'PRAGATI SKILLS MISSION — OFFICIAL SKILLING CERTIFICATE',
      '======================================================',
      `Certificate Number : ${certificate.certificateNumber}`,
      `Status             : ${certificate.status}`,
      `Candidate Name     : ${certificate.candidateName}`,
      `Registration No.   : ${certificate.candidateRegNo}`,
      `Course             : ${certificate.courseName} (${certificate.courseCode})`,
      `Sector             : ${certificate.sector}`,
      `Training Centre    : ${certificate.trainingCentre} (${certificate.district})`,
      `Batch Number       : ${certificate.batchNumber}`,
      `Result Grade       : ${certificate.grade}`,
      `Issue Date         : ${formatDate(certificate.issueDate)}`,
      certificate.status === 'Cancelled'
        ? `Cancellation Note  : ${certificate.cancellationReason ?? 'Cancelled by State Officer'}`
        : `Status             : Digitally Verified`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certificate.certificateNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast({
      title: 'Certificate Record Downloaded',
      description: `Saved official record for ${certificate.certificateNumber}.`,
      type: 'success',
    });
  };

  return (
    <Modal
      isOpen={Boolean(certificate)}
      onClose={onClose}
      title="Digital Certificate Preview"
      subtitle={certificate.certificateNumber}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Record</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-medium text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </>
      }
    >
      <div className="relative rounded-md border-2 border-[#0F294D]/25 bg-white p-5 sm:p-7 text-slate-900">
        <div className="border border-stone-200 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0F294D] text-white">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-base font-bold tracking-tight text-[#0F294D]">
                  Pragati Skills Mission
                </p>
                <p className="text-xs text-slate-500">
                  State Directorate of Vocational Skilling & Certification
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">
                Certificate Number
              </p>
              <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                {certificate.certificateNumber}
              </p>
            </div>
          </div>

          {certificate.status === 'Cancelled' && (
            <div className="mt-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Certificate Revoked / Cancelled</p>
                <p className="mt-0.5 text-red-700">
                  {certificate.cancellationReason}
                </p>
              </div>
            </div>
          )}

          <div className="py-7 text-center">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Certificate of Skill Qualification
            </p>
            <p className="mt-3 text-sm text-slate-600">
              This is to certify that
            </p>
            <h3 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
              {certificate.candidateName}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
              Registration No: {certificate.candidateRegNo}
            </p>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-700">
              has successfully completed the prescribed training curriculum and
              passed the mission assessment with{' '}
              <span className="font-semibold text-slate-900">
                {certificate.grade}
              </span>{' '}
              standing in
            </p>
            <p className="mt-2 font-display text-lg font-semibold text-[#0F294D]">
              {certificate.courseName}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {certificate.courseCode} · {certificate.sector}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-3 text-xs">
            <div>
              <p className="text-slate-500">Training Centre</p>
              <p className="mt-0.5 font-medium text-slate-900">
                {certificate.trainingCentre}
              </p>
              <p className="text-slate-500">{certificate.district} District</p>
            </div>
            <div>
              <p className="text-slate-500">Date of Issuance</p>
              <p className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                {formatDate(certificate.issueDate)}
              </p>
              <p className="text-slate-500">Batch: {certificate.batchNumber}</p>
            </div>
            <div className="sm:text-right">
              <div className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="h-4 w-4" />
                <span>Digitally Verified</span>
              </div>
              <p className="mt-1 font-medium text-slate-800">
                Joint Mission Director
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
