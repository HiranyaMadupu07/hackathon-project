import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  INITIAL_BATCHES,
  INITIAL_CERTIFICATES,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import {
  AppNotification,
  ApprovalSubmissionPayload,
  Batch,
  Candidate,
  Certificate,
  CourseOption,
  DemoUser,
  QualityFindings,
} from '../types';
import { incrementVersion } from '../utils/formatters';
import { useAuth } from './AuthContext';

interface CreateBatchInput {
  batchName: string;
  course: CourseOption;
  trainingStartDate: string;
  trainingEndDate: string;
  candidates: Candidate[];
  submitImmediately: boolean;
  user: DemoUser;
}

interface WorkflowContextValue {
  batches: Batch[];
  certificates: Certificate[];
  notifications: AppNotification[];
  createBatch: (input: CreateBatchInput) => Batch;
  submitDraftBatch: (batchId: string, user: DemoUser) => void;
  resubmitReturnedBatch: (batchId: string, remarks: string, user: DemoUser) => void;
  recordDistrictDecision: (
    batchId: string,
    payload: ApprovalSubmissionPayload
  ) => void;
  recordQualityDecision: (
    batchId: string,
    payload: ApprovalSubmissionPayload,
    findings: QualityFindings
  ) => void;
  recordStateDecision: (
    batchId: string,
    payload: ApprovalSubmissionPayload
  ) => number;
  escalateStuckBatch: (batchId: string, remarks: string, user: DemoUser) => void;
  cancelCertificate: (certificateId: string, reason: string, user: DemoUser) => void;
  retryWhatsAppDelivery: (certificateId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (user: DemoUser) => void;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

function mapPayloadDecision(
  decision: ApprovalSubmissionPayload['decision']
): 'Approved' | 'Returned' | 'Rejected' {
  if (decision === 'APPROVE') return 'Approved';
  if (decision === 'RETURN') return 'Returned';
  return 'Rejected';
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const pushNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const entry: AppNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [entry, ...prev]);
    },
    []
  );

  const createBatch = useCallback(
    (input: CreateBatchInput): Batch => {
      const now = new Date().toISOString();
      const seq = 113 + batches.length;
      const districtCode = (input.user.district ?? 'PUN').slice(0, 3).toUpperCase();
      const batchId = `batch-${seq}`;
      const batchNumber = `PSM-${districtCode}-2026-0${seq}`;
      const requiresQualityReview = input.candidates.length >= 25;

      const newBatch: Batch = {
        id: batchId,
        batchNumber,
        batchName: input.batchName.trim(),
        trainingCentre: input.user.organization,
        trainingCentreCode: input.user.employeeCode,
        centreOfficerEmail: input.user.email,
        district: input.user.district ?? 'Pune',
        courseCode: input.course.code,
        courseName: input.course.name,
        sector: input.course.sector,
        trainingStartDate: input.trainingStartDate,
        trainingEndDate: input.trainingEndDate,
        submissionDate: input.submitImmediately ? now.slice(0, 10) : null,
        candidateCount: input.candidates.length,
        candidates: input.candidates,
        status: input.submitImmediately ? 'Pending District Approval' : 'Draft',
        version: 'v1.0',
        requiresQualityReview,
        daysInCurrentStage: 0,
        districtApprovals: [],
        approvalHistory: input.submitImmediately
          ? [
              {
                id: `ah-${Date.now()}`,
                stage: 'Centre Submission',
                actorName: input.user.name,
                actorRole: input.user.roleLabel,
                actorEmail: input.user.email,
                decision: 'Submitted',
                remarks: 'Batch created and submitted with validated candidate roster.',
                timestamp: now,
                batchVersion: 'v1.0',
              },
            ]
          : [],
        activityTimeline: [
          {
            id: `act-${Date.now()}`,
            title: input.submitImmediately ? 'Batch Created & Submitted' : 'Batch Saved as Draft',
            description: input.submitImmediately
              ? `Submitted ${input.candidates.length} candidates for District Verification.`
              : `Saved draft with ${input.candidates.length} candidates.`,
            actor: input.user.name,
            timestamp: now,
            type: 'info',
          },
        ],
        lastUpdated: now,
      };

      setBatches((prev) => [newBatch, ...prev]);

      if (input.submitImmediately) {
        pushNotification({
          title: 'New Batch Submitted for Verification',
          message: `${batchNumber} (${input.candidates.length} candidates) submitted by ${input.user.organization}.`,
          targetRoles: ['DISTRICT_OFFICER'],
          relatedBatchId: batchId,
          severity: 'info',
        });
      }

      return newBatch;
    },
    [batches.length, pushNotification]
  );

  const submitDraftBatch = useCallback(
    (batchId: string, user: DemoUser) => {
      const now = new Date().toISOString();
      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId || batch.status !== 'Draft') return batch;
          return {
            ...batch,
            status: 'Pending District Approval',
            submissionDate: now.slice(0, 10),
            daysInCurrentStage: 0,
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'Centre Submission',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision: 'Submitted',
                remarks: 'Draft finalized and submitted for District Verification.',
                timestamp: now,
                batchVersion: batch.version,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title: 'Draft Submitted for Approval',
                description: 'Submitted to District Verification Queue (0/2 approvals).',
                actor: user.name,
                timestamp: now,
                type: 'info',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      pushNotification({
        title: 'Batch Submitted for District Review',
        message: 'A draft batch was finalized and queued for dual District Officer review.',
        targetRoles: ['DISTRICT_OFFICER'],
        relatedBatchId: batchId,
        severity: 'info',
      });
    },
    [pushNotification]
  );

  const resubmitReturnedBatch = useCallback(
    (batchId: string, remarks: string, user: DemoUser) => {
      const now = new Date().toISOString();
      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId || batch.status !== 'Returned') return batch;
          const nextVersion = incrementVersion(batch.version);
          return {
            ...batch,
            status: 'Pending District Approval',
            version: nextVersion,
            submissionDate: now.slice(0, 10),
            daysInCurrentStage: 0,
            isStuck: false,
            districtApprovals: [],
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'Centre Submission',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision: 'Resubmitted',
                remarks: remarks.trim() || 'Addressed officer observations and resubmitted.',
                timestamp: now,
                batchVersion: nextVersion,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title: `Resubmitted (${nextVersion})`,
                description: remarks.trim() || 'Corrected roster resubmitted for verification.',
                actor: user.name,
                timestamp: now,
                type: 'info',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      pushNotification({
        title: 'Returned Batch Resubmitted',
        message: 'A corrected batch version has been resubmitted for District Verification.',
        targetRoles: ['DISTRICT_OFFICER'],
        relatedBatchId: batchId,
        severity: 'info',
      });
    },
    [pushNotification]
  );

  const recordDistrictDecision = useCallback(
    (batchId: string, payload: ApprovalSubmissionPayload) => {
      if (!user) return;
      const decision = mapPayloadDecision(payload.decision);
      const cleanRemarks = payload.remarks.trim();
      const now = new Date().toISOString();
      let targetBatchNum = '';
      let nextStageMessage = '';

      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId || batch.status !== 'Pending District Approval') {
            return batch;
          }
          targetBatchNum = batch.batchNumber;

          if (decision === 'Approved') {
            const alreadyApproved = batch.districtApprovals.some(
              (a) =>
                a.officerEmail.toLowerCase() === user.email.toLowerCase() &&
                a.decision === 'Approved'
            );
            if (alreadyApproved) return batch;

            const updatedApprovals = [
              ...batch.districtApprovals,
              {
                officerId: user.id,
                officerName: user.name,
                officerEmail: user.email,
                decision: 'Approved' as const,
                remarks: cleanRemarks || undefined,
                decidedAt: now,
              },
            ];

            const distinctCount = new Set(
              updatedApprovals
                .filter((a) => a.decision === 'Approved')
                .map((a) => a.officerEmail.toLowerCase())
            ).size;

            let nextStatus: Batch['status'] = 'Pending District Approval';
            let timelineTitle = `District Approval Recorded (${distinctCount}/2)`;
            let timelineDesc = `${user.name} approved the batch. Awaiting second distinct district officer.`;

            if (distinctCount >= 2) {
              if (batch.requiresQualityReview) {
                nextStatus = 'Pending Quality Review';
                timelineTitle = 'District Approvals Complete (2/2) — Routed to Quality';
                timelineDesc =
                  'Two distinct district approvals received. Large cohort routed for Quality Scrutiny.';
                nextStageMessage = 'QUALITY_OFFICER';
              } else {
                nextStatus = 'Pending State Approval';
                timelineTitle = 'District Approvals Complete (2/2) — Routed to State';
                timelineDesc =
                  'Two distinct district approvals received. Forwarded for State Final Approval.';
                nextStageMessage = 'STATE_OFFICER';
              }
            }

            return {
              ...batch,
              status: nextStatus,
              isStuck: false,
              daysInCurrentStage: nextStatus === 'Pending District Approval' ? batch.daysInCurrentStage : 0,
              districtApprovals: updatedApprovals,
              lastUpdated: now,
              approvalHistory: [
                ...batch.approvalHistory,
                {
                  id: `ah-${Date.now()}`,
                  stage: 'District Verification',
                  actorName: user.name,
                  actorRole: user.roleLabel,
                  actorEmail: user.email,
                  decision: 'Approved',
                  remarks: cleanRemarks || undefined,
                  timestamp: now,
                  batchVersion: batch.version,
                },
              ],
              activityTimeline: [
                {
                  id: `act-${Date.now()}`,
                  title: timelineTitle,
                  description: cleanRemarks ? `${timelineDesc} Note: ${cleanRemarks}` : timelineDesc,
                  actor: user.name,
                  timestamp: now,
                  type: distinctCount >= 2 ? 'success' : 'info',
                },
                ...batch.activityTimeline,
              ],
            };
          }

          return {
            ...batch,
            status: decision,
            isStuck: false,
            daysInCurrentStage: 0,
            districtApprovals: [
              ...batch.districtApprovals,
              {
                officerId: user.id,
                officerName: user.name,
                officerEmail: user.email,
                decision,
                remarks: cleanRemarks,
                decidedAt: now,
              },
            ],
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'District Verification',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision,
                remarks: cleanRemarks,
                timestamp: now,
                batchVersion: batch.version,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title: `Batch ${decision} by District Officer`,
                description: cleanRemarks,
                actor: user.name,
                timestamp: now,
                type: decision === 'Rejected' ? 'danger' : 'warning',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      if (decision === 'Approved' && nextStageMessage === 'QUALITY_OFFICER') {
        pushNotification({
          title: 'Batch Ready for Quality Scrutiny',
          message: `Large batch ${targetBatchNum} completed 2/2 District Approvals.`,
          targetRoles: ['QUALITY_OFFICER'],
          relatedBatchId: batchId,
          severity: 'info',
        });
      } else if (decision === 'Approved' && nextStageMessage === 'STATE_OFFICER') {
        pushNotification({
          title: 'Batch Ready for Final State Approval',
          message: `Batch ${targetBatchNum} completed 2/2 District Approvals.`,
          targetRoles: ['STATE_OFFICER'],
          relatedBatchId: batchId,
          severity: 'info',
        });
      } else if (decision !== 'Approved') {
        pushNotification({
          title: `Batch ${decision} at District Review`,
          message: `Batch ${targetBatchNum} was ${decision.toLowerCase()} by ${user.name}.`,
          targetRoles: ['TRAINING_CENTRE'],
          relatedBatchId: batchId,
          severity: decision === 'Rejected' ? 'error' : 'warning',
        });
      }
    },
    [pushNotification, user]
  );

  const recordQualityDecision = useCallback(
    (
      batchId: string,
      payload: ApprovalSubmissionPayload,
      findings: QualityFindings
    ) => {
      if (!user) return;
      const decision = mapPayloadDecision(payload.decision);
      const cleanRemarks = payload.remarks.trim();
      const now = new Date().toISOString();
      let targetBatchNum = '';

      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId || batch.status !== 'Pending Quality Review') {
            return batch;
          }
          targetBatchNum = batch.batchNumber;
          const nextStatus: Batch['status'] =
            decision === 'Approved' ? 'Pending State Approval' : decision;

          return {
            ...batch,
            status: nextStatus,
            isStuck: false,
            daysInCurrentStage: 0,
            qualityFindings: findings,
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'Quality Scrutiny',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision,
                remarks: cleanRemarks || undefined,
                timestamp: now,
                batchVersion: batch.version,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title:
                  decision === 'Approved'
                    ? 'Quality Scrutiny Approved — Routed to State'
                    : `Batch ${decision} in Quality Scrutiny`,
                description: cleanRemarks || findings.observations,
                actor: user.name,
                timestamp: now,
                type:
                  decision === 'Approved'
                    ? 'success'
                    : decision === 'Rejected'
                      ? 'danger'
                      : 'warning',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      if (decision === 'Approved') {
        pushNotification({
          title: 'Quality Scrutiny Passed',
          message: `Batch ${targetBatchNum} passed Quality Review and awaits State Final Approval.`,
          targetRoles: ['STATE_OFFICER'],
          relatedBatchId: batchId,
          severity: 'info',
        });
      } else {
        pushNotification({
          title: `Batch ${decision} in Quality Review`,
          message: `Batch ${targetBatchNum} was ${decision.toLowerCase()} by Quality Officer ${user.name}.`,
          targetRoles: ['TRAINING_CENTRE'],
          relatedBatchId: batchId,
          severity: decision === 'Rejected' ? 'error' : 'warning',
        });
      }
    },
    [pushNotification, user]
  );

  const recordStateDecision = useCallback(
    (batchId: string, payload: ApprovalSubmissionPayload): number => {
      if (!user) return 0;
      const decision = mapPayloadDecision(payload.decision);
      const cleanRemarks = payload.remarks.trim();
      const now = new Date().toISOString();
      const targetBatch = batches.find((b) => b.id === batchId);
      if (!targetBatch || targetBatch.status !== 'Pending State Approval') {
        return 0;
      }

      let generatedCount = 0;

      if (decision === 'Approved') {
        const numericId = targetBatch.id.replace(/\D/g, '') || String(Date.now()).slice(-3);
        const newCerts: Certificate[] = targetBatch.candidates.map((cand, idx) => {
          const certNumber = `PSM-CERT-2026-${numericId}${String(idx + 1).padStart(3, '0')}`;
          const waStatus: Certificate['whatsappStatus'] =
            idx % 10 === 7 ? 'Failed' : idx % 5 === 2 ? 'Sent' : 'Delivered';
          return {
            id: `cert-${targetBatch.id}-${Date.now()}-${idx + 1}`,
            certificateNumber: certNumber,
            batchId: targetBatch.id,
            batchNumber: targetBatch.batchNumber,
            candidateId: cand.id,
            candidateName: cand.fullName,
            candidateRegNo: cand.registrationNumber,
            courseName: targetBatch.courseName,
            courseCode: targetBatch.courseCode,
            sector: targetBatch.sector,
            trainingCentre: targetBatch.trainingCentre,
            district: targetBatch.district,
            issueDate: now.slice(0, 10),
            status: 'Issued',
            whatsappStatus: waStatus,
            whatsappUpdatedAt: now,
            whatsappFailureReason:
              waStatus === 'Failed'
                ? 'Recipient WhatsApp delivery timed out; eligible for retry.'
                : undefined,
            qrVerificationCode: `QR-${certNumber}`,
            grade: cand.result,
          };
        });
        generatedCount = newCerts.length;
        setCertificates((prev) => [...newCerts, ...prev]);
      }

      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId) return batch;
          const nextStatus: Batch['status'] =
            decision === 'Approved' ? 'Issued' : decision;

          return {
            ...batch,
            status: nextStatus,
            isStuck: false,
            daysInCurrentStage: 0,
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'State Final Approval',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision,
                remarks: cleanRemarks || undefined,
                timestamp: now,
                batchVersion: batch.version,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title:
                  decision === 'Approved'
                    ? `Certificates Issued (${batch.candidates.length})`
                    : `Batch ${decision} by State Officer`,
                description:
                  decision === 'Approved'
                    ? `Final sanction approved by ${user.name}. ${cleanRemarks ? `Note: ${cleanRemarks}` : 'Certificates generated and queued for WhatsApp delivery.'}`
                    : cleanRemarks,
                actor: user.name,
                timestamp: now,
                type:
                  decision === 'Approved'
                    ? 'success'
                    : decision === 'Rejected'
                      ? 'danger'
                      : 'warning',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      pushNotification({
        title:
          decision === 'Approved'
            ? 'Certificates Issued for Batch'
            : `Batch ${decision} at State Approval`,
        message:
          decision === 'Approved'
            ? `Batch ${targetBatch.batchNumber} received Final State Approval (${generatedCount} certificates issued).`
            : `Batch ${targetBatch.batchNumber} was ${decision.toLowerCase()} by ${user.name}.`,
        targetRoles: ['TRAINING_CENTRE', 'DISTRICT_OFFICER'],
        relatedBatchId: batchId,
        severity:
          decision === 'Approved' ? 'success' : decision === 'Rejected' ? 'error' : 'warning',
      });

      return generatedCount;
    },
    [batches, pushNotification]
  );

  const escalateStuckBatch = useCallback(
    (batchId: string, remarks: string, user: DemoUser) => {
      const now = new Date().toISOString();
      const targetBatch = batches.find((b) => b.id === batchId);
      if (!targetBatch) return;

      setBatches((prev) =>
        prev.map((batch) => {
          if (batch.id !== batchId) return batch;
          return {
            ...batch,
            lastUpdated: now,
            approvalHistory: [
              ...batch.approvalHistory,
              {
                id: `ah-${Date.now()}`,
                stage: 'Mission Escalation',
                actorName: user.name,
                actorRole: user.roleLabel,
                actorEmail: user.email,
                decision: 'Escalated',
                remarks: remarks.trim() || 'SLA breach escalated for priority action within 24 hours.',
                timestamp: now,
                batchVersion: batch.version,
              },
            ],
            activityTimeline: [
              {
                id: `act-${Date.now()}`,
                title: 'Escalation Directive Issued',
                description:
                  remarks.trim() || 'State Directorate issued priority SLA escalation notice.',
                actor: user.name,
                timestamp: now,
                type: 'warning',
              },
              ...batch.activityTimeline,
            ],
          };
        })
      );

      pushNotification({
        title: `Priority Escalation: ${targetBatch.batchNumber}`,
        message:
          remarks.trim() ||
          `Batch ${targetBatch.batchNumber} escalated by State Officer for immediate review.`,
        targetRoles: ['DISTRICT_OFFICER', 'QUALITY_OFFICER'],
        relatedBatchId: batchId,
        severity: 'error',
      });
    },
    [batches, pushNotification]
  );

  const cancelCertificate = useCallback(
    (certificateId: string, reason: string, user: DemoUser) => {
      const now = new Date().toISOString();
      let certNum = '';
      setCertificates((prev) =>
        prev.map((cert) => {
          if (cert.id !== certificateId) return cert;
          certNum = cert.certificateNumber;
          return {
            ...cert,
            status: 'Cancelled',
            cancellationReason: reason.trim(),
            cancelledBy: user.name,
            cancelledAt: now,
          };
        })
      );

      if (certNum) {
        pushNotification({
          title: `Certificate Cancelled: ${certNum}`,
          message: `Cancelled by ${user.name}. Reason: ${reason.trim()}`,
          targetRoles: ['STATE_OFFICER', 'TRAINING_CENTRE'],
          relatedCertificateId: certificateId,
          severity: 'error',
        });
      }
    },
    [pushNotification]
  );

  const retryWhatsAppDelivery = useCallback((certificateId: string) => {
    const now = new Date().toISOString();
    setCertificates((prev) =>
      prev.map((cert) => {
        if (cert.id !== certificateId) return cert;
        return {
          ...cert,
          whatsappStatus: 'Delivered',
          whatsappUpdatedAt: now,
          whatsappFailureReason: undefined,
        };
      })
    );
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback((user: DemoUser) => {
    setNotifications((prev) =>
      prev.map((n) => (n.targetRoles.includes(user.role) ? { ...n, read: true } : n))
    );
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        batches,
        certificates,
        notifications,
        createBatch,
        submitDraftBatch,
        resubmitReturnedBatch,
        recordDistrictDecision,
        recordQualityDecision,
        recordStateDecision,
        escalateStuckBatch,
        cancelCertificate,
        retryWhatsAppDelivery,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return ctx;
}
