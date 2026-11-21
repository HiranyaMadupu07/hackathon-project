export type UserRole =
  | 'TRAINING_CENTRE'
  | 'DISTRICT_OFFICER'
  | 'QUALITY_OFFICER'
  | 'STATE_OFFICER';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleLabel: string;
  organization: string;
  district?: string;
  designation: string;
  employeeCode: string;
}

export type BatchStatus =
  | 'Draft'
  | 'Pending District Approval'
  | 'Pending Quality Review'
  | 'Pending State Approval'
  | 'Issued'
  | 'Returned'
  | 'Rejected';

export type ApprovalDecision =
  | 'Submitted'
  | 'Resubmitted'
  | 'Approved'
  | 'Returned'
  | 'Rejected'
  | 'Escalated';

export type ApprovalStage =
  | 'Centre Submission'
  | 'District Verification'
  | 'Quality Scrutiny'
  | 'State Final Approval'
  | 'Mission Escalation';

export type ApprovalPayloadDecision = 'APPROVE' | 'REJECT' | 'RETURN';

export interface ApprovalSubmissionPayload {
  decision: ApprovalPayloadDecision;
  remarks: string;
}

export interface Candidate {
  id: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  aadhaarMasked: string;
  assessmentScore: number;
  attendancePercent: number;
  result: 'Pass' | 'Distinction';
}

export interface DistrictApprovalRecord {
  officerId: string;
  officerName: string;
  officerEmail: string;
  decision: 'Approved' | 'Returned' | 'Rejected';
  remarks?: string;
  decidedAt: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  stage: ApprovalStage;
  actorName: string;
  actorRole: string;
  actorEmail: string;
  decision: ApprovalDecision;
  remarks?: string;
  timestamp: string;
  batchVersion: string;
}

export interface ActivityTimelineEntry {
  id: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface QualityFindings {
  sampleSizeReviewed: number;
  attendanceVerified: boolean;
  assessmentScoreAudit: 'Passed' | 'Discrepancy Noted';
  observations: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  batchName: string;
  trainingCentre: string;
  trainingCentreCode: string;
  centreOfficerEmail: string;
  district: string;
  courseCode: string;
  courseName: string;
  sector: string;
  trainingStartDate: string;
  trainingEndDate: string;
  submissionDate: string | null;
  candidateCount: number;
  candidates: Candidate[];
  status: BatchStatus;
  version: string;
  requiresQualityReview: boolean;
  isStuck?: boolean;
  daysInCurrentStage: number;
  districtApprovals: DistrictApprovalRecord[];
  qualityFindings?: QualityFindings;
  approvalHistory: ApprovalHistoryEntry[];
  activityTimeline: ActivityTimelineEntry[];
  lastUpdated: string;
}

export type CertificateStatus = 'Issued' | 'Cancelled';

export type WhatsAppDeliveryStatus = 'Delivered' | 'Sent' | 'Failed' | 'Pending';

export interface Certificate {
  id: string;
  certificateNumber: string;
  batchId: string;
  batchNumber: string;
  candidateId: string;
  candidateName: string;
  candidateRegNo: string;
  courseName: string;
  courseCode: string;
  sector: string;
  trainingCentre: string;
  district: string;
  issueDate: string;
  status: CertificateStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  whatsappStatus: WhatsAppDeliveryStatus;
  whatsappUpdatedAt: string;
  whatsappFailureReason?: string;
  qrVerificationCode: string;
  grade: 'Distinction' | 'Pass';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetRoles: UserRole[];
  relatedBatchId?: string;
  relatedCertificateId?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface CsvCandidateRow {
  rowNumber: number;
  registrationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  aadhaarLast4: string;
  assessmentScore: string;
  attendancePercent: string;
  errors: string[];
  isValid: boolean;
}

export interface CourseOption {
  code: string;
  name: string;
  sector: string;
  durationHours: number;
}
