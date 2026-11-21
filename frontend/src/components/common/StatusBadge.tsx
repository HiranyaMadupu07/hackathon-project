import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  FileEdit,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  ApprovalDecision,
  BatchStatus,
  CertificateStatus,
  WhatsAppDeliveryStatus,
} from '../../types';

type StatusValue =
  | BatchStatus
  | CertificateStatus
  | WhatsAppDeliveryStatus
  | ApprovalDecision;

interface StatusBadgeProps {
  status: StatusValue;
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<
  StatusValue,
  {
    classes: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Draft: {
    classes:
      'bg-stone-100 text-slate-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: FileEdit,
  },
  'Pending District Approval': {
    classes:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    icon: Clock,
  },
  'Pending Quality Review': {
    classes:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/70',
    icon: ShieldCheck,
  },
  'Pending State Approval': {
    classes:
      'bg-blue-50 text-[#0F294D] border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/70',
    icon: Clock,
  },
  Issued: {
    classes:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    icon: CheckCircle2,
  },
  Approved: {
    classes:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    icon: CheckCircle2,
  },
  Returned: {
    classes:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    icon: RotateCcw,
  },
  Rejected: {
    classes:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    icon: XCircle,
  },
  Cancelled: {
    classes:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    icon: Ban,
  },
  Delivered: {
    classes:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    icon: CheckCircle2,
  },
  Sent: {
    classes:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/70',
    icon: Send,
  },
  Pending: {
    classes:
      'bg-stone-100 text-slate-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: MessageSquare,
  },
  Failed: {
    classes:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    icon: AlertCircle,
  },
  Submitted: {
    classes:
      'bg-blue-50 text-[#0F294D] border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/70',
    icon: Send,
  },
  Resubmitted: {
    classes:
      'bg-blue-50 text-[#0F294D] border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/70',
    icon: RotateCcw,
  },
  Escalated: {
    classes:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    icon: AlertCircle,
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    classes:
      'bg-stone-100 text-slate-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Clock,
  };
  const Icon = config.icon;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-medium whitespace-nowrap shrink-0 ${padding} ${config.classes}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
