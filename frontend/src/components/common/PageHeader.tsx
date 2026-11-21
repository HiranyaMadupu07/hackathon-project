import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { ROUTES } from '../../routes/routes';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  fallbackRoute?: string;
  helpText?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  showBack = true,
  fallbackRoute = ROUTES.DASHBOARD,
  helpText,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallbackRoute, { replace: true });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-700 hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h2>
            {helpText && (
              <span
                title={helpText}
                className="inline-flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-help"
              >
                <Info className="h-4 w-4" aria-label={helpText} />
              </span>
            )}
          </div>
          {helpText && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {helpText}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
