import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { UnauthorizedPage } from '../common/UnauthorizedPage';

export function BatchCandidatesPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { batches } = useWorkflow();
  const [search, setSearch] = useState('');

  const batch = batches.find((b) => b.id === batchId);

  const filtered = useMemo(() => {
    if (!batch) return [];
    const q = search.trim().toLowerCase();
    if (!q) return batch.candidates;
    return batch.candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [batch, search]);

  if (!user) return null;

  if (!batch) {
    return (
      <EmptyState
        title="Batch Not Found"
        description="The requested batch could not be found."
        actionLabel="Return to Batches"
        onAction={() => navigate(ROUTES.BATCHES)}
      />
    );
  }

  if (
    user.role === 'TRAINING_CENTRE' &&
    batch.centreOfficerEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Candidates · ${batch.batchNumber}`}
        fallbackRoute={ROUTES.BATCH_DETAIL(batch.id)}
      />

      <div className="rounded-md border border-stone-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search registration number, name, or email..."
            className="w-full sm:w-72"
          />
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {filtered.length} of {batch.candidates.length}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Reg. No.</th>
                <th className="px-4 py-3 font-semibold">Full Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Aadhaar</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Attendance
                </th>
                <th className="px-4 py-3 font-semibold text-right">Score</th>
                <th className="px-4 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-stone-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    {c.registrationNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {c.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {c.email}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                    {c.phone}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                    {c.aadhaarMasked}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums dark:text-slate-200">
                    {c.attendancePercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {c.assessmentScore}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        c.result === 'Distinction'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
