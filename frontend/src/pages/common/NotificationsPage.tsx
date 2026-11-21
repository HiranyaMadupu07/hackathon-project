import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { formatDateTime } from '../../utils/formatters';

export function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useWorkflow();
  const navigate = useNavigate();

  if (!user) return null;

  const roleNotifications = notifications.filter((n) =>
    n.targetRoles.includes(user.role)
  );
  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const iconMap = {
    info: {
      Icon: Info,
      color: 'text-[#0F294D] bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60',
    },
    success: {
      Icon: CheckCircle2,
      color:
        'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
    },
    warning: {
      Icon: AlertTriangle,
      color:
        'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60',
    },
    error: {
      Icon: AlertCircle,
      color: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/60',
    },
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Notifications"
        fallbackRoute={ROUTES.DASHBOARD}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllNotificationsRead(user)}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Read</span>
            </button>
          ) : undefined
        }
      />

      {roleNotifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You are caught up on all workflow alerts."
          icon={Bell}
        />
      ) : (
        <div className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white overflow-hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-[#161B22]">
          {roleNotifications.map((item) => {
            const { Icon, color } = iconMap[item.severity];
            return (
              <div
                key={item.id}
                tabIndex={0}
                role="button"
                onClick={() => {
                  markNotificationRead(item.id);
                  if (item.relatedBatchId) {
                    navigate(ROUTES.BATCH_DETAIL(item.relatedBatchId));
                  } else if (
                    item.relatedCertificateId &&
                    user.role === 'STATE_OFFICER'
                  ) {
                    navigate(ROUTES.CERTIFICATE_DETAIL(item.relatedCertificateId));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    markNotificationRead(item.id);
                    if (item.relatedBatchId) {
                      navigate(ROUTES.BATCH_DETAIL(item.relatedBatchId));
                    } else if (
                      item.relatedCertificateId &&
                      user.role === 'STATE_OFFICER'
                    ) {
                      navigate(
                        ROUTES.CERTIFICATE_DETAIL(item.relatedCertificateId)
                      );
                    }
                  }
                }}
                className={`flex items-start gap-3.5 px-5 py-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F294D] ${
                  item.read
                    ? 'bg-white hover:bg-stone-50 dark:bg-[#161B22] dark:hover:bg-slate-800/50'
                    : 'bg-blue-50/35 hover:bg-blue-50/60 dark:bg-teal-950/20 dark:hover:bg-teal-950/35'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                      {!item.read && (
                        <span className="ml-2 font-mono text-[10px] font-semibold text-[#0F294D] dark:text-teal-400">
                          NEW
                        </span>
                      )}
                    </p>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
