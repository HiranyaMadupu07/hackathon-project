import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { getInitials } from '../../utils/formatters';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.BATCHES]: 'Batches',
  [ROUTES.BATCH_CREATE]: 'Create Batch',
  [ROUTES.BATCH_STUCK]: 'Stuck Batches',
  [ROUTES.APPROVALS_DISTRICT]: 'District Verification',
  [ROUTES.APPROVALS_DISTRICT_DECISIONS]: 'My Decisions',
  [ROUTES.APPROVALS_QUALITY]: 'Quality Scrutiny',
  [ROUTES.APPROVALS_QUALITY_HISTORY]: 'Review History',
  [ROUTES.APPROVALS_STATE]: 'Final Approvals',
  [ROUTES.CERTIFICATES]: 'Certificates',
  [ROUTES.AUDIT_HISTORY]: 'Audit History',
  [ROUTES.NOTIFICATIONS]: 'Notifications',
  [ROUTES.PROFILE]: 'Profile',
};

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user } = useAuth();
  const { notifications } = useWorkflow();
  const location = useLocation();

  if (!user) return null;

  const unreadCount = notifications.filter(
    (n) => !n.read && n.targetRoles.includes(user.role)
  ).length;

  let pageTitle = ROUTE_TITLES[location.pathname] ?? 'Portal Workspace';
  if (/^\/batches\/[^/]+\/candidates$/.test(location.pathname)) {
    pageTitle = 'Batch Candidates';
  } else if (
    location.pathname.startsWith('/batches/') &&
    location.pathname !== ROUTES.BATCH_CREATE &&
    location.pathname !== ROUTES.BATCH_STUCK
  ) {
    pageTitle = 'Batch Details';
  } else if (location.pathname.startsWith('/certificates/')) {
    pageTitle = 'Certificate Details';
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-[#131720]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-slate-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
            Pragati Skills Mission
          </span>
          <span
            className="hidden sm:inline text-stone-300 dark:text-slate-700"
            aria-hidden="true"
          >
            /
          </span>
          <h1 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <ThemeToggle />

        <Link
          to={ROUTES.NOTIFICATIONS}
          aria-label="View notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-600 hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded bg-[#0F294D] px-1 font-mono text-[10px] font-semibold text-white tabular-nums dark:bg-teal-600">
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          to={ROUTES.PROFILE}
          className="flex items-center gap-2.5 rounded-md border border-stone-200 bg-stone-50/70 px-2.5 py-1.5 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#161B22] dark:hover:bg-slate-800 transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0F294D] text-[11px] font-semibold text-white dark:bg-teal-600">
            {getInitials(user.name)}
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {user.name}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {user.roleLabel}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
