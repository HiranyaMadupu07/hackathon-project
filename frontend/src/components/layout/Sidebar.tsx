import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Bell,
  CheckSquare,
  ClipboardCheck,
  FilePlus2,
  FileText,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { UserRole } from '../../types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  end?: boolean;
}

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const { batches, notifications } = useWorkflow();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const unreadCount = notifications.filter(
    (n) => !n.read && n.targetRoles.includes(user.role)
  ).length;

  const districtPendingCount = batches.filter(
    (b) =>
      b.status === 'Pending District Approval' &&
      !b.districtApprovals.some(
        (a) => a.officerEmail.toLowerCase() === user.email.toLowerCase()
      )
  ).length;

  const qualityPendingCount = batches.filter(
    (b) => b.status === 'Pending Quality Review'
  ).length;

  const statePendingCount = batches.filter(
    (b) => b.status === 'Pending State Approval'
  ).length;

  const stuckCount = batches.filter(
    (b) =>
      (b.isStuck || b.daysInCurrentStage >= 7) &&
      b.status !== 'Issued' &&
      b.status !== 'Rejected'
  ).length;

  const roleNavMap: Record<UserRole, NavItem[]> = {
    TRAINING_CENTRE: [
      { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { label: 'My Batches', to: ROUTES.BATCHES, icon: Layers, end: true },
      { label: 'Create Batch', to: ROUTES.BATCH_CREATE, icon: FilePlus2 },
    ],
    DISTRICT_OFFICER: [
      { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
      {
        label: 'Pending Reviews',
        to: ROUTES.APPROVALS_DISTRICT,
        icon: ClipboardCheck,
        badgeCount: districtPendingCount,
        end: true,
      },
      {
        label: 'My Decisions',
        to: ROUTES.APPROVALS_DISTRICT_DECISIONS,
        icon: CheckSquare,
      },
      { label: 'Batch History', to: ROUTES.BATCHES, icon: History, end: true },
    ],
    QUALITY_OFFICER: [
      { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
      {
        label: 'Quality Review Queue',
        to: ROUTES.APPROVALS_QUALITY,
        icon: ShieldCheck,
        badgeCount: qualityPendingCount,
        end: true,
      },
      {
        label: 'Review History',
        to: ROUTES.APPROVALS_QUALITY_HISTORY,
        icon: History,
      },
    ],
    STATE_OFFICER: [
      { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
      {
        label: 'Final Approvals',
        to: ROUTES.APPROVALS_STATE,
        icon: ClipboardCheck,
        badgeCount: statePendingCount,
      },
      { label: 'All Batches', to: ROUTES.BATCHES, icon: Layers, end: true },
      { label: 'Certificates', to: ROUTES.CERTIFICATES, icon: Award },
      {
        label: 'Stuck Batches',
        to: ROUTES.BATCH_STUCK,
        icon: AlertTriangle,
        badgeCount: stuckCount,
      },
      { label: 'Audit History', to: ROUTES.AUDIT_HISTORY, icon: FileText },
    ],
  };

  const primaryItems = roleNavMap[user.role];

  const handleLogout = () => {
    logout();
    addToast({
      title: 'Signed out',
      description: 'You have been logged out of CertiFlow.',
      type: 'info',
    });
    navigate(ROUTES.LOGIN);
  };

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            isActive
              ? 'bg-[#0F294D] text-white dark:bg-teal-600 dark:text-white'
              : 'text-slate-700 hover:bg-stone-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </span>
            {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {item.badgeCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-stone-200 bg-white dark:border-slate-800 dark:bg-[#131720]">
      <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0F294D] text-white dark:bg-teal-600">
            <Award className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              CertiFlow
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Pragati Skills Mission
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-md p-1 text-slate-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            Workspace
          </p>
          <nav className="space-y-1" aria-label="Role Navigation">
            {primaryItems.map(renderNavLink)}
          </nav>
        </div>

        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            Account & Public
          </p>
          <nav className="space-y-1" aria-label="Account Navigation">
            {renderNavLink({
              label: 'Notifications',
              to: ROUTES.NOTIFICATIONS,
              icon: Bell,
              badgeCount: unreadCount,
            })}
            {renderNavLink({
              label: 'Profile',
              to: ROUTES.PROFILE,
              icon: UserCircle,
            })}
            <NavLink
              to={ROUTES.VERIFY}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0F294D] text-white dark:bg-teal-600 dark:text-white'
                    : 'text-slate-700 hover:bg-stone-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`
              }
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
              <span className="truncate">Certificate Verification</span>
            </NavLink>
          </nav>
        </div>
      </div>

      <div className="border-t border-stone-200 p-3 dark:border-slate-800">
        <div className="mb-2.5 rounded-md bg-stone-50 px-3 py-2 border border-stone-200/80 dark:border-slate-800 dark:bg-[#181C26]">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {user.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {user.roleLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
