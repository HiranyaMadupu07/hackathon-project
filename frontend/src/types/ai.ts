import { BatchStatus, CertificateStatus } from './index';

export type AiRiskLevel = 'Low' | 'Medium' | 'High';

export interface AiReviewValidationStats {
  totalCandidates: number;
  validRecords: number;
  flaggedRecords: number;
  avgAttendancePercent: number;
  avgAssessmentScore: number;
  distinctionCount: number;
}

export interface AiReviewObservation {
  id: string;
  title: string;
  detail: string;
  evidence: string;
}

export interface AiReviewRiskIndicator {
  id: string;
  title: string;
  severity: AiRiskLevel;
  detail: string;
  evidence: string;
}

export interface AiBatchReview {
  batchNumber: string;
  batchVersion: string;
  analyzedAt: string;
  summary: string;
  validationStats: AiReviewValidationStats;
  observations: AiReviewObservation[];
  riskIndicators: AiReviewRiskIndicator[];
  recommendedActions: string[];
  advisoryNotice: string;
}

export type AnomalyCategory =
  | 'POTENTIAL_DUPLICATE'
  | 'MISSING_INFORMATION'
  | 'FORMAT_INCONSISTENCY'
  | 'UNUSUAL_PATTERN';

export type AnomalySeverity = 'Low' | 'Medium' | 'High';

export type AnomalyReviewStatus = 'Needs review' | 'Confirmed' | 'Dismissed';

export interface CandidateAnomaly {
  id: string;
  registrationNumber: string;
  candidateName: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  explanation: string;
  evidenceField: string;
  evidenceValue: string;
  reviewStatus: AnomalyReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CandidateAnomalyReport {
  batchNumber: string;
  batchVersion: string;
  analyzedAt: string;
  anomalies: CandidateAnomaly[];
  advisoryNotice: string;
}

export interface AiChatBatchReference {
  id: string;
  batchNumber: string;
  batchName: string;
  status: BatchStatus;
}

export interface AiChatCertificateReference {
  id: string;
  certificateNumber: string;
  candidateName: string;
  status: CertificateStatus;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedBatches?: AiChatBatchReference[];
  referencedCertificates?: AiChatCertificateReference[];
  failedQuery?: string;
}

export interface AiChatResponse {
  reply: string;
  referencedBatches: AiChatBatchReference[];
  referencedCertificates: AiChatCertificateReference[];
  generatedAt: string;
}
