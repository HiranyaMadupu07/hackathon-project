import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmTone?: 'primary' | 'danger' | 'warning' | 'success';
  requireRemarks?: boolean;
  remarksLabel?: string;
  remarksPlaceholder?: string;
  showRemarksField?: boolean;
  initialRemarks?: string;
}

const TONE_BUTTON_CLASSES: Record<
  NonNullable<ConfirmDialogProps['confirmTone']>,
  string
> = {
  primary:
    'bg-[#0F294D] hover:bg-[#173A69] text-white dark:bg-teal-600 dark:hover:bg-teal-500',
  success:
    'bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500',
  warning:
    'bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-500',
  danger:
    'bg-red-700 hover:bg-red-800 text-white dark:bg-red-600 dark:hover:bg-red-500',
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmTone = 'primary',
  requireRemarks = false,
  remarksLabel,
  remarksPlaceholder,
  showRemarksField = true,
  initialRemarks = '',
}: ConfirmDialogProps) {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRemarks(initialRemarks);
      setError('');
    }
  }, [isOpen, initialRemarks]);

  const resolvedLabel =
    remarksLabel ?? (requireRemarks ? 'Remarks' : 'Comments (Optional)');
  const resolvedPlaceholder =
    remarksPlaceholder ??
    (requireRemarks
      ? 'Enter clear reason or corrective instructions...'
      : 'Add optional approval comments...');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireRemarks && remarks.trim().length === 0) {
      setError('Remarks are mandatory for this action.');
      return;
    }
    onConfirm(remarks.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="confirm-dialog-form"
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${TONE_BUTTON_CLASSES[confirmTone]}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form id="confirm-dialog-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </p>

        {showRemarksField && (
          <div>
            <label
              htmlFor="dialog-remarks"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {resolvedLabel}
              {requireRemarks && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
            </label>
            <textarea
              id="dialog-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (error) setError('');
              }}
              placeholder={resolvedPlaceholder}
              className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
            />
            {error && (
              <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
