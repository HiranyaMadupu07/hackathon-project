import { RotateCcw } from 'lucide-react';

export interface FilterSelectOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
}

export interface DateFilterConfig {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface FilterControlsProps {
  filters: FilterConfig[];
  dateFilter?: DateFilterConfig;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterControls({
  filters,
  dateFilter,
  onReset,
  hasActiveFilters,
}: FilterControlsProps) {
  return (
    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 min-w-0 flex-1">
      {filters.map((filter) => (
        <select
          key={filter.id}
          id={filter.id}
          aria-label={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-9 min-w-[110px] max-w-[155px] flex-1 lg:flex-initial rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-200 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {dateFilter && (
        <input
          id={dateFilter.id}
          type="date"
          aria-label={dateFilter.label}
          value={dateFilter.value}
          onChange={(e) => dateFilter.onChange(e.target.value)}
          className="h-9 w-[136px] shrink-0 rounded-md border border-stone-300 bg-white px-2.5 font-mono text-xs text-slate-700 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-200 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
        />
      )}

      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-stone-50 px-3 text-xs font-medium text-slate-700 hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}
