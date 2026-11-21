export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',

  BATCHES: '/batches',
  BATCH_CREATE: '/batches/create',
  BATCH_STUCK: '/batches/stuck',
  BATCH_DETAIL: (batchId: string) => `/batches/${encodeURIComponent(batchId)}`,
  BATCH_CANDIDATES: (batchId: string) =>
    `/batches/${encodeURIComponent(batchId)}/candidates`,

  APPROVALS_DISTRICT: '/approvals/district',
  APPROVALS_DISTRICT_DECISIONS: '/approvals/district/decisions',
  APPROVALS_QUALITY: '/approvals/quality',
  APPROVALS_QUALITY_HISTORY: '/approvals/quality/history',
  APPROVALS_STATE: '/approvals/state',

  CERTIFICATES: '/certificates',
  CERTIFICATE_DETAIL: (certificateId: string) =>
    `/certificates/${encodeURIComponent(certificateId)}`,

  AUDIT_HISTORY: '/audit-history',
  NOTIFICATIONS: '/notifications',
  PROFILE: '/profile',

  VERIFY: '/verify',
  VERIFY_CERTIFICATE: (certificateNumber: string) =>
    `/verify/${encodeURIComponent(certificateNumber)}`,
} as const;
