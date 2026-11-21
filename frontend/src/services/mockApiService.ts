import { DEMO_USERS } from '../data/mockData';
import { Batch, Certificate, DemoUser } from '../types';

/**
 * Service abstraction layer structured for drop-in REST API replacement.
 * Currently backed by local in-memory/React Context state.
 */
export const authService = {
  async authenticate(email: string, password: string): Promise<DemoUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = DEMO_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || user.password !== password) {
      throw new Error('Invalid email address or password. Please try again.');
    }
    return user;
  },
};

export const verificationService = {
  lookupCertificate(
    certificates: Certificate[],
    certificateNumber: string
  ): Certificate | null {
    const clean = certificateNumber.trim().toUpperCase();
    if (!clean) return null;
    return (
      certificates.find(
        (c) =>
          c.certificateNumber.toUpperCase() === clean ||
          c.qrVerificationCode.toUpperCase() === clean
      ) ?? null
    );
  },
};

export const batchMetricsService = {
  computeDistrictApprovalCount(batch: Batch): number {
    const distinctApprovers = new Set(
      batch.districtApprovals
        .filter((a) => a.decision === 'Approved')
        .map((a) => a.officerEmail.toLowerCase())
    );
    return distinctApprovers.size;
  },
};
