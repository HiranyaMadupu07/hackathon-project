import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useAppState';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-600 hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
