import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Send,
  Upload,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { COURSES } from '../../data/mockData';
import { useAuth, useToast, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { CsvCandidateRow } from '../../types';
import {
  csvRowsToCandidates,
  parseCandidateCsv,
  SAMPLE_VALID_CSV,
  SAMPLE_WITH_ERRORS_CSV,
} from '../../utils/csvParser';

export function CreateBatchPage() {
  const { user } = useAuth();
  const { createBatch } = useWorkflow();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [batchName, setBatchName] = useState('');
  const [courseCode, setCourseCode] = useState(COURSES[0].code);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-11-15');
  const [fileName, setFileName] = useState('');
  const [csvRows, setCsvRows] = useState<CsvCandidateRow[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const selectedCourse = useMemo(
    () => COURSES.find((c) => c.code === courseCode) ?? COURSES[0],
    [courseCode]
  );

  const validRows = useMemo(
    () => csvRows.filter((r) => r.isValid),
    [csvRows]
  );
  const invalidRows = useMemo(
    () => csvRows.filter((r) => !r.isValid),
    [csvRows]
  );

  const handleLoadCsvString = (raw: string, label: string) => {
    const parsed = parseCandidateCsv(raw);
    setCsvRows(parsed);
    setFileName(label);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.csv;
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFormErrors((prev) => ({
        ...prev,
        csv: 'Please upload a valid .csv spreadsheet file.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result ?? '');
      handleLoadCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_VALID_CSV], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'certiflow_candidate_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validateForm = (isSubmission: boolean): boolean => {
    const errors: Record<string, string> = {};

    if (!batchName.trim() || batchName.trim().length < 4) {
      errors.batchName = 'Batch name must be at least 4 characters.';
    }
    if (!startDate || !endDate) {
      errors.dates = 'Training start and end dates are required.';
    } else if (new Date(endDate) <= new Date(startDate)) {
      errors.dates = 'Training end date must be after the start date.';
    }
    if (csvRows.length === 0) {
      errors.csv = 'Please upload a candidate CSV file.';
    } else if (isSubmission && invalidRows.length > 0) {
      errors.csv = `Fix or remove ${invalidRows.length} invalid candidate row(s) before submitting.`;
    } else if (validRows.length === 0) {
      errors.csv = 'At least 1 valid candidate row is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = (submitImmediately: boolean) => {
    if (!validateForm(submitImmediately)) {
      addToast({
        title: 'Validation Required',
        description: 'Resolve highlighted form or CSV errors before continuing.',
        type: 'error',
      });
      return;
    }

    const candidates = csvRowsToCandidates(csvRows);
    const created = createBatch({
      batchName,
      course: selectedCourse,
      trainingStartDate: startDate,
      trainingEndDate: endDate,
      candidates,
      submitImmediately,
      user,
    });

    addToast({
      title: submitImmediately
        ? `Batch ${created.batchNumber} Submitted`
        : `Draft ${created.batchNumber} Saved`,
      description: submitImmediately
        ? 'Queued for District Verification.'
        : 'Saved to your training centre drafts.',
      type: 'success',
    });

    navigate(ROUTES.BATCH_DETAIL(created.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Batch"
        fallbackRoute={ROUTES.BATCHES}
        actions={
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV Template</span>
          </button>
        }
      />

      <section className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#161B22]">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-stone-100 dark:border-slate-800">
          Batch Details
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="batch-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Batch Name <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="batch-name"
              type="text"
              value={batchName}
              onChange={(e) => {
                setBatchName(e.target.value);
                if (formErrors.batchName) {
                  setFormErrors((prev) => ({ ...prev, batchName: '' }));
                }
              }}
              placeholder="e.g. Solar PV Cohort C — Winter 2026"
              className="mt-1.5 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500"
            />
            {formErrors.batchName && (
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                {formErrors.batchName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="course-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Course Qualification <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select
              id="course-select"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:focus:border-teal-500"
            >
              {COURSES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.durationHours}h)
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {selectedCourse.sector}
            </p>
          </div>

          <div>
            <label
              htmlFor="training-start"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Training Start Date <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="training-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (formErrors.dates) {
                  setFormErrors((prev) => ({ ...prev, dates: '' }));
                }
              }}
              className="mt-1.5 h-10 w-full rounded-md border border-stone-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:focus:border-teal-500"
            />
          </div>

          <div>
            <label
              htmlFor="training-end"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Training End Date <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="training-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (formErrors.dates) {
                  setFormErrors((prev) => ({ ...prev, dates: '' }));
                }
              }}
              className="mt-1.5 h-10 w-full rounded-md border border-stone-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:focus:border-teal-500"
            />
          </div>
        </div>
        {formErrors.dates && (
          <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">
            {formErrors.dates}
          </p>
        )}
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#161B22]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-slate-800">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Candidate Spreadsheet Upload
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleLoadCsvString(SAMPLE_VALID_CSV, 'sample_valid_cohort.csv')
              }
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              Load Valid Sample (8 rows)
            </button>
            <button
              type="button"
              onClick={() =>
                handleLoadCsvString(
                  SAMPLE_WITH_ERRORS_CSV,
                  'sample_with_validation_errors.csv'
                )
              }
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              Load Sample With Errors (6 rows)
            </button>
          </div>
        </div>

        {/* Contextual Help */}
        <div className="mt-4 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F294D] dark:text-teal-400" />
          <div className="space-y-0.5">
            <p>
              Upload a UTF-8 <span className="font-mono">.csv</span> file with
              mandatory columns:{' '}
              <span className="font-mono text-[11px]">
                registrationNumber, fullName, email, phone, aadhaarLast4,
                assessmentScore, attendancePercent
              </span>
              .
            </p>
            <p>
              The entire file is validated row-by-row before candidates can be
              imported into the batch.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-stone-300 bg-stone-50/70 px-6 py-7 text-center hover:border-[#0F294D] hover:bg-stone-100/70 dark:border-slate-700 dark:bg-[#0D1016] dark:hover:border-teal-500 dark:hover:bg-slate-900 transition-colors"
          >
            <Upload className="h-6 w-6 text-[#0F294D] dark:text-teal-400" />
            <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              {fileName
                ? `Loaded: ${fileName} (Click to replace CSV)`
                : 'Select candidate CSV file'}
            </p>
          </button>

          {formErrors.csv && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formErrors.csv}</span>
            </div>
          )}
        </div>

        {csvRows.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-[#1C222B]">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Rows
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {csvRows.length}
                </p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/30">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Valid Rows
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
                  {validRows.length}
                </p>
              </div>
              <div
                className={`rounded-md border px-4 py-3 ${
                  invalidRows.length > 0
                    ? 'border-red-200 bg-red-50/70 dark:border-red-800/60 dark:bg-red-950/30'
                    : 'border-stone-200 bg-stone-50 dark:border-slate-800 dark:bg-[#1C222B]'
                }`}
              >
                <p
                  className={`text-xs ${
                    invalidRows.length > 0
                      ? 'text-red-800 dark:text-red-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Validation Errors
                </p>
                <p
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    invalidRows.length > 0
                      ? 'text-red-900 dark:text-red-200'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {invalidRows.length}
                </p>
              </div>
            </div>

            {validRows.length >= 25 && (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-[#0F294D] dark:border-teal-800/60 dark:bg-teal-950/30 dark:text-teal-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Cohorts with 25 or more candidates require Quality Scrutiny
                  after District Approval.
                </span>
              </div>
            )}

            <div className="overflow-hidden rounded-md border border-stone-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#1C222B]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <FileSpreadsheet className="h-4 w-4 text-[#0F294D] dark:text-teal-400" />
                  <span>Spreadsheet Preview</span>
                </div>
                {invalidRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCsvRows((prev) => prev.filter((r) => r.isValid))
                    }
                    className="rounded border border-red-300 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Remove Invalid Rows ({invalidRows.length})
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left text-xs dark:divide-slate-800">
                  <thead className="bg-stone-50 text-slate-600 dark:bg-[#1C222B] dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Row</th>
                      <th className="px-3 py-2.5 font-semibold">Reg. No.</th>
                      <th className="px-3 py-2.5 font-semibold">Candidate</th>
                      <th className="px-3 py-2.5 font-semibold">Email / Phone</th>
                      <th className="px-3 py-2.5 font-semibold text-right">
                        Score
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-right">
                        Attend.
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white dark:divide-slate-800 dark:bg-[#161B22]">
                    {csvRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.isValid ? '' : 'bg-red-50/50 dark:bg-red-950/20'
                        }
                      >
                        <td className="px-3 py-2.5 font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                          {row.rowNumber}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {row.registrationNumber || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {row.fullName || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          <div>{row.email || '—'}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {row.phone || '—'} · ****{row.aadhaarLast4 || '????'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums dark:text-slate-200">
                          {row.assessmentScore || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums dark:text-slate-200">
                          {row.attendancePercent
                            ? `${row.attendancePercent}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <ul className="space-y-0.5 text-[11px] font-medium text-red-700 dark:text-red-400">
                              {row.errors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-md border border-stone-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#161B22]">
        <button
          type="button"
          onClick={() => navigate(ROUTES.BATCHES)}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleCreate(false)}
          className="rounded-md border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#1C222B] dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F294D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#173A69] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Submit for Approval</span>
        </button>
      </div>
    </div>
  );
}
