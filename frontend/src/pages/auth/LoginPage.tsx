import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAuth, useToast } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    ROUTES.DASHBOARD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid official email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      const authenticated = await login(email, password);
      addToast({
        title: `Signed in as ${authenticated.name}`,
        description: authenticated.roleLabel,
        type: 'success',
      });
      navigate(fromPath === ROUTES.LOGIN ? ROUTES.DASHBOARD : fromPath, {
        replace: true,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to sign in. Please retry.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-slate-900 dark:bg-[#0D1016] dark:text-slate-100 flex flex-col transition-colors">
      <header className="border-b border-stone-200 bg-white dark:border-slate-800 dark:bg-[#131720]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to={ROUTES.LOGIN}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F294D] text-white dark:bg-teal-600">
              <Award className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              CertiFlow
            </span>
          </Link>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggle />
            <Link
              to={ROUTES.VERIFY}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span>Certificate Verification</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between rounded-md border border-[#0F294D]/20 bg-[#0F294D] p-7 text-white dark:border-slate-800 dark:bg-[#131A26]">
            <div>
              <p className="text-xs font-semibold tracking-wider text-teal-300 uppercase">
                Pragati Skills Mission
              </p>
              <h1 className="mt-3 font-display text-2xl font-bold leading-snug text-white">
                Skilling Certificate Issuance Portal
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                Governance workspace for batch submissions, multi-level
                verification, and verifiable credential issuance.
              </p>

              <dl className="mt-8 space-y-4 border-t border-white/15 pt-6 text-xs">
                <div>
                  <dt className="font-semibold text-white">
                    Dual District Verification
                  </dt>
                  <dd className="mt-0.5 text-slate-300">
                    Independent review from two district officers before
                    advancing.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">
                    Quality & State Governance
                  </dt>
                  <dd className="mt-0.5 text-slate-300">
                    Large-cohort scrutiny and state-level final issuance
                    controls.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 border-t border-white/15 pt-4 text-xs text-slate-300">
              <Link
                to={ROUTES.VERIFY}
                className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline"
              >
                <span>Verify a Certificate Publicly</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-md border border-stone-200 bg-white p-6 sm:p-8 flex flex-col justify-center dark:border-slate-800 dark:bg-[#161B22]">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Sign In
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter your Pragati Skills Mission account credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="name@organization.org"
                    className="w-full rounded-md border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your password"
                    className="w-full rounded-md border border-stone-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-[#0F294D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173A69] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/30 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 dark:focus:ring-teal-500/30 transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
