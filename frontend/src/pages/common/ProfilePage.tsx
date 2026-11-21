import { Building2, Mail, Shield } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { getInitials } from '../../utils/formatters';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const permissionsByRole: Record<string, string[]> = {
    TRAINING_CENTRE: [
      'Create and save draft training batches',
      'Upload and validate candidate CSV spreadsheets',
      'Submit batches for dual district verification',
      'Resubmit returned batches with updated versions',
    ],
    DISTRICT_OFFICER: [
      'Inspect pending district verification batches',
      'Record independent district approvals (1 of 2)',
      'Return or reject batches with mandatory remarks',
      'Inspect district batch submission history',
    ],
    QUALITY_OFFICER: [
      'Conduct scrutiny audits on large cohorts (25+ candidates)',
      'Record sampling findings and assessment score checks',
      'Forward cleared cohorts to State Final Approval',
      'Return non-compliant cohorts to training centres',
    ],
    STATE_OFFICER: [
      'Grant final state approval and issue digital certificates',
      'Monitor statewide batch pipeline and escalate SLA delays',
      'Cancel issued certificates with audit reason logging',
      'Retry failed WhatsApp deliveries and inspect full audit history',
    ],
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Profile" fallbackRoute={ROUTES.DASHBOARD} />

      <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 pb-5 dark:border-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#0F294D] font-display text-lg font-bold text-white dark:bg-teal-600">
            {getInitials(user.name)}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {user.name}
            </h3>
            <p className="text-xs font-medium text-[#0F294D] dark:text-teal-400">
              {user.designation} · {user.roleLabel}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                {user.email}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <div>
              <dt className="text-slate-500 dark:text-slate-400">
                Organization
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                {user.organization}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <div>
              <dt className="text-slate-500 dark:text-slate-400">
                Jurisdiction
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                {user.district ? `${user.district} District` : 'Statewide'}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
          Authorized Capabilities
        </h3>
        <ul className="mt-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
          {(permissionsByRole[user.role] ?? []).map((perm) => (
            <li key={perm} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F294D] dark:bg-teal-400 shrink-0" />
              <span>{perm}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
