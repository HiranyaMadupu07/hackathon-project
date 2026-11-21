import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { ROUTES } from '../../routes/routes';

export function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-stone-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#161B22]">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
        Access Restricted
      </h2>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Your current role does not have permission to view this page.
      </p>
      <Link
        to={ROUTES.DASHBOARD}
        className="mt-5 rounded-md bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
