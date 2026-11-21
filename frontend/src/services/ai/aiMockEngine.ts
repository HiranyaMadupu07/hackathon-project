import {
  Batch,
  Certificate,
  DemoUser,
} from '../../types';
import {
  AiBatchReview,
  AiChatBatchReference,
  AiChatCertificateReference,
  AiChatResponse,
  AiReviewObservation,
  AiReviewRiskIndicator,
  AnomalyReviewStatus,
  CandidateAnomaly,
  CandidateAnomalyReport,
} from '../../types/ai';

const reviewCache = new Map<string, AiBatchReview>();
const anomalyCache = new Map<string, CandidateAnomalyReport>();

const NETWORK_DELAY_MS = 450;

function delay(ms = NETWORK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(batch: Batch): string {
  return `${batch.id}::${batch.version}`;
}

function buildAnomaliesForBatch(batch: Batch): CandidateAnomaly[] {
  const anomalies: CandidateAnomaly[] = [];
  const phoneSeen = new Map<string, string>();
  const aadhaarSeen = new Map<string, string>();

  batch.candidates.forEach((cand, index) => {
    const cleanPhone = cand.phone.replace(/\s+/g, '');
    const existingPhoneReg = phoneSeen.get(cleanPhone);
    if (existingPhoneReg) {
      anomalies.push({
        id: `anom-phone-${batch.id}-${index}`,
        registrationNumber: cand.registrationNumber,
        candidateName: cand.fullName,
        category: 'POTENTIAL_DUPLICATE',
        severity: 'High',
        explanation: `Phone number matches another candidate (${existingPhoneReg}) in the same batch roster.`,
        evidenceField: 'phone',
        evidenceValue: cand.phone,
        reviewStatus: 'Needs review',
      });
    } else {
      phoneSeen.set(cleanPhone, cand.registrationNumber);
    }

    const existingAadhaarReg = aadhaarSeen.get(cand.aadhaarMasked);
    if (existingAadhaarReg) {
      anomalies.push({
        id: `anom-aadhaar-${batch.id}-${index}`,
        registrationNumber: cand.registrationNumber,
        candidateName: cand.fullName,
        category: 'POTENTIAL_DUPLICATE',
        severity: 'Medium',
        explanation: `Masked identity suffix matches candidate ${existingAadhaarReg}; manual identity verification recommended.`,
        evidenceField: 'aadhaarMasked',
        evidenceValue: cand.aadhaarMasked,
        reviewStatus: 'Needs review',
      });
    } else {
      aadhaarSeen.set(cand.aadhaarMasked, cand.registrationNumber);
    }

    if (!cand.email || !cand.email.includes('@')) {
      anomalies.push({
        id: `anom-email-${batch.id}-${index}`,
        registrationNumber: cand.registrationNumber,
        candidateName: cand.fullName,
        category: 'MISSING_INFORMATION',
        severity: 'Medium',
        explanation: 'Candidate email address is missing or incomplete for digital credential dispatch.',
        evidenceField: 'email',
        evidenceValue: cand.email || '(empty)',
        reviewStatus: 'Needs review',
      });
    }

    if (!/^\+91\s?\d{10}$/.test(cand.phone.trim())) {
      anomalies.push({
        id: `anom-fmt-${batch.id}-${index}`,
        registrationNumber: cand.registrationNumber,
        candidateName: cand.fullName,
        category: 'FORMAT_INCONSISTENCY',
        severity: 'Low',
        explanation: 'Phone number formatting deviates from standard +91 10-digit WhatsApp dispatch format.',
        evidenceField: 'phone',
        evidenceValue: cand.phone,
        reviewStatus: 'Needs review',
      });
    }

    if (cand.attendancePercent < 78 || (cand.assessmentScore >= 95 && cand.attendancePercent < 82)) {
      anomalies.push({
        id: `anom-pat-${batch.id}-${index}`,
        registrationNumber: cand.registrationNumber,
        candidateName: cand.fullName,
        category: 'UNUSUAL_PATTERN',
        severity: cand.attendancePercent < 75 ? 'High' : 'Medium',
        explanation:
          cand.attendancePercent < 78
            ? 'Attendance falls near minimum threshold; confirm biometric attendance register.'
            : 'High assessment score paired with relatively lower attendance warrants spot review.',
        evidenceField: 'attendancePercent / assessmentScore',
        evidenceValue: `${cand.attendancePercent}% attendance · ${cand.assessmentScore}% score`,
        reviewStatus: 'Needs review',
      });
    }
  });

  // Ensure realistic sample findings on batches without synthetic duplicates so officers can evaluate the workflow
  if (anomalies.length === 0 && batch.candidates.length > 0) {
    const first = batch.candidates[0];
    const mid = batch.candidates[Math.floor(batch.candidates.length / 2)];
    const last = batch.candidates[batch.candidates.length - 1];

    anomalies.push({
      id: `anom-sample-1-${batch.id}`,
      registrationNumber: first.registrationNumber,
      candidateName: first.fullName,
      category: 'UNUSUAL_PATTERN',
      severity: 'Low',
      explanation:
        'Assessment score cluster sits within ±2 points of adjacent cohort entries; verify practical evaluation sheet.',
      evidenceField: 'assessmentScore',
      evidenceValue: `${first.assessmentScore}% (${first.result})`,
      reviewStatus: 'Needs review',
    });

    if (batch.candidates.length >= 6) {
      anomalies.push({
        id: `anom-sample-2-${batch.id}`,
        registrationNumber: mid.registrationNumber,
        candidateName: mid.fullName,
        category: 'FORMAT_INCONSISTENCY',
        severity: 'Low',
        explanation:
          'Email domain uses generic personal alias rather than training portal suffix; confirm WhatsApp & email opt-in.',
        evidenceField: 'email',
        evidenceValue: mid.email,
        reviewStatus: 'Needs review',
      });
    }

    if (batch.status === 'Returned' || batch.requiresQualityReview) {
      anomalies.push({
        id: `anom-sample-3-${batch.id}`,
        registrationNumber: last.registrationNumber,
        candidateName: last.fullName,
        category: 'MISSING_INFORMATION',
        severity: 'Medium',
        explanation:
          'Secondary guardian/centre attendance counter-signature tag not attached in CSV metadata.',
        evidenceField: 'attendancePercent',
        evidenceValue: `${last.attendancePercent}% logged`,
        reviewStatus: 'Needs review',
      });
    }
  }

  return anomalies.slice(0, 12);
}

export const aiMockEngine = {
  async getBatchReview(batch: Batch): Promise<AiBatchReview | null> {
    await delay(200);
    return reviewCache.get(cacheKey(batch)) ?? null;
  },

  async analyzeBatchReview(batch: Batch): Promise<AiBatchReview> {
    await delay();

    const anomalies = buildAnomaliesForBatch(batch);
    const total = batch.candidates.length;
    const avgAttendance =
      total > 0
        ? Math.round(
            batch.candidates.reduce((sum, c) => sum + c.attendancePercent, 0) / total
          )
        : 0;
    const avgScore =
      total > 0
        ? Math.round(
            batch.candidates.reduce((sum, c) => sum + c.assessmentScore, 0) / total
          )
        : 0;
    const distinctionCount = batch.candidates.filter(
      (c) => c.result === 'Distinction'
    ).length;

    const flaggedRegNos = new Set(anomalies.map((a) => a.registrationNumber));
    const flaggedRecords = flaggedRegNos.size;
    const validRecords = Math.max(0, total - flaggedRecords);

    const observations: AiReviewObservation[] = [
      {
        id: `obs-1-${batch.id}`,
        title: 'Cohort Attendance & Score Distribution',
        detail: `Mean attendance across ${total} candidates is ${avgAttendance}% with an average assessment score of ${avgScore}% (${distinctionCount} Distinction).`,
        evidence: `${total} candidate records evaluated for ${batch.courseCode} (${batch.trainingStartDate} to ${batch.trainingEndDate}).`,
      },
      {
        id: `obs-2-${batch.id}`,
        title: batch.requiresQualityReview
          ? 'Large-Cohort Quality Scrutiny Track Active'
          : 'Standard District-to-State Governance Track',
        detail: batch.requiresQualityReview
          ? `Cohort size (${total}) exceeds the 25-candidate threshold, requiring State Quality Scrutiny after dual District verification.`
          : `Cohort size (${total}) falls under 25 candidates and advances directly to State Final Approval after dual District clearance.`,
        evidence: `Candidate count: ${batch.candidateCount} · Current status: ${batch.status}.`,
      },
    ];

    const lastReturn = [...batch.approvalHistory]
      .reverse()
      .find((h) => h.decision === 'Returned' || h.decision === 'Rejected');
    if (lastReturn) {
      observations.push({
        id: `obs-3-${batch.id}`,
        title: `Prior ${lastReturn.decision} Action Noted`,
        detail: `Previously ${lastReturn.decision.toLowerCase()} during ${lastReturn.stage} (${lastReturn.batchVersion}). Confirm corrective updates match prior remarks.`,
        evidence: lastReturn.remarks || 'No remarks attached on prior action.',
      });
    }

    const riskIndicators: AiReviewRiskIndicator[] = [];

    if ((batch.isStuck || batch.daysInCurrentStage >= 5) && batch.status !== 'Issued') {
      riskIndicators.push({
        id: `risk-sla-${batch.id}`,
        title: 'Turnaround SLA Aging',
        severity: batch.daysInCurrentStage >= 7 ? 'High' : 'Medium',
        detail: `Batch has remained in ${batch.status} for ${batch.daysInCurrentStage} days, increasing issuance delay risk.`,
        evidence: `Stage duration: ${batch.daysInCurrentStage} days · Last updated ${batch.lastUpdated.slice(0, 10)}.`,
      });
    }

    if (flaggedRecords > 0) {
      riskIndicators.push({
        id: `risk-anom-${batch.id}`,
        title: 'Candidate Roster Review Signals',
        severity: anomalies.some((a) => a.severity === 'High') ? 'High' : 'Medium',
        detail: `${flaggedRecords} candidate record(s) triggered formatting, attendance, or duplication checks requiring manual confirmation.`,
        evidence: anomalies
          .slice(0, 2)
          .map((a) => `${a.registrationNumber} (${a.category})`)
          .join(', '),
      });
    }

    if (batch.status === 'Pending District Approval' && batch.districtApprovals.length === 1) {
      riskIndicators.push({
        id: `risk-dual-${batch.id}`,
        title: 'Awaiting Second Independent District Sign-Off',
        severity: 'Low',
        detail: `1 of 2 required district approvals recorded (${batch.districtApprovals[0].officerName}).`,
        evidence: `District approval count: 1/2.`,
      });
    }

    if (riskIndicators.length === 0) {
      riskIndicators.push({
        id: `risk-low-${batch.id}`,
        title: 'Baseline Roster Integrity',
        severity: 'Low',
        detail: 'No elevated structural or SLA anomalies detected in the current batch snapshot.',
        evidence: `${validRecords}/${total} candidate records passed automated format checks.`,
      });
    }

    const recommendedActions: string[] = [
      'Cross-check biometric attendance register against lowest-attendance candidates before recording a decision.',
      batch.requiresQualityReview
        ? 'Verify at least 30% of practical assessment scorecards as part of Quality Scrutiny sampling.'
        : 'Confirm training period dates and training centre roster match uploaded CSV metadata.',
    ];

    if (flaggedRecords > 0) {
      recommendedActions.push(
        `Inspect the ${flaggedRecords} flagged candidate record(s) under the Anomaly Detection tab and mark each as Confirmed or Dismissed.`
      );
    }

    const summary = `${batch.batchNumber} (${batch.courseName}) contains ${total} candidates trained by ${batch.trainingCentre} (${batch.district}). Average attendance is ${avgAttendance}% and average score is ${avgScore}%. ${
      riskIndicators.some((r) => r.severity === 'High')
        ? 'High-priority manual checks are recommended prior to advancement.'
        : 'Metrics align with mission thresholds pending standard officer verification.'
    }`;

    const review: AiBatchReview = {
      batchNumber: batch.batchNumber,
      batchVersion: batch.version,
      analyzedAt: new Date().toISOString(),
      summary,
      validationStats: {
        totalCandidates: total,
        validRecords,
        flaggedRecords,
        avgAttendancePercent: avgAttendance,
        avgAssessmentScore: avgScore,
        distinctionCount,
      },
      observations,
      riskIndicators,
      recommendedActions,
      advisoryNotice:
        'AI findings are advisory only. Officers retain full authority for all approval, return, rejection, and issuance decisions.',
    };

    reviewCache.set(cacheKey(batch), review);
    return review;
  },

  async getBatchAnomalies(batch: Batch): Promise<CandidateAnomalyReport | null> {
    await delay(200);
    return anomalyCache.get(cacheKey(batch)) ?? null;
  },

  async analyzeBatchAnomalies(batch: Batch): Promise<CandidateAnomalyReport> {
    await delay();

    const existing = anomalyCache.get(cacheKey(batch));
    const freshAnomalies = buildAnomaliesForBatch(batch);

    // Preserve officer review decisions if re-scanned on same batch version
    const mergedAnomalies = freshAnomalies.map((item) => {
      const prev = existing?.anomalies.find(
        (e) =>
          e.registrationNumber === item.registrationNumber &&
          e.category === item.category
      );
      if (!prev) return item;
      return {
        ...item,
        reviewStatus: prev.reviewStatus,
        reviewedBy: prev.reviewedBy,
        reviewedAt: prev.reviewedAt,
      };
    });

    const report: CandidateAnomalyReport = {
      batchNumber: batch.batchNumber,
      batchVersion: batch.version,
      analyzedAt: new Date().toISOString(),
      anomalies: mergedAnomalies,
      advisoryNotice:
        'Flagged items highlight data patterns for manual review only and must not be treated as proof of candidate misconduct.',
    };

    anomalyCache.set(cacheKey(batch), report);
    return report;
  },

  async updateAnomalyStatus(
    batch: Batch,
    anomalyId: string,
    reviewStatus: AnomalyReviewStatus,
    reviewerName: string
  ): Promise<CandidateAnomalyReport | null> {
    await delay(120);
    const report = anomalyCache.get(cacheKey(batch));
    if (!report) return null;

    const updated: CandidateAnomalyReport = {
      ...report,
      anomalies: report.anomalies.map((a) =>
        a.id === anomalyId
          ? {
              ...a,
              reviewStatus,
              reviewedBy: reviewerName,
              reviewedAt: new Date().toISOString(),
            }
          : a
      ),
    };
    anomalyCache.set(cacheKey(batch), updated);
    return updated;
  },

  async sendChatQuery(params: {
    message: string;
    user: DemoUser;
    batches: Batch[];
    certificates: Certificate[];
  }): Promise<AiChatResponse> {
    await delay(500);

    const { message, user, batches, certificates } = params;
    const q = message.trim().toLowerCase();

    // Strict role-based authorization scoping
    const authorizedBatches = batches.filter((b) => {
      if (user.role === 'TRAINING_CENTRE') {
        return b.centreOfficerEmail.toLowerCase() === user.email.toLowerCase();
      }
      if (user.role === 'DISTRICT_OFFICER') {
        return (
          b.status !== 'Draft' &&
          (!user.district || b.district === user.district)
        );
      }
      if (user.role === 'QUALITY_OFFICER') {
        return (
          b.requiresQualityReview ||
          b.status === 'Pending Quality Review' ||
          b.approvalHistory.some((h) => h.stage === 'Quality Scrutiny')
        );
      }
      return true;
    });

    const canAccessCertificates = user.role === 'STATE_OFFICER';
    const authorizedCertificates = canAccessCertificates ? certificates : [];

    const toBatchRefs = (items: Batch[]): AiChatBatchReference[] =>
      items.slice(0, 6).map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        batchName: b.batchName,
        status: b.status,
      }));

    const toCertRefs = (items: Certificate[]): AiChatCertificateReference[] =>
      items.slice(0, 6).map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        candidateName: c.candidateName,
        status: c.status,
      }));

    // 1. Specific batch number mentioned
    const matchedByNumber = authorizedBatches.find((b) =>
      q.includes(b.batchNumber.toLowerCase())
    );
    if (matchedByNumber) {
      const returnEntry = [...matchedByNumber.approvalHistory]
        .reverse()
        .find((h) => h.decision === 'Returned' || h.decision === 'Rejected');
      const reasonText = returnEntry?.remarks
        ? ` Most recent return/rejection remark (${returnEntry.stage}): "${returnEntry.remarks}"`
        : '';
      return {
        reply: `Batch ${matchedByNumber.batchNumber} (${matchedByNumber.batchName}) is currently "${matchedByNumber.status}" with ${matchedByNumber.candidateCount} candidates in ${matchedByNumber.district} District.${reasonText}`,
        referencedBatches: toBatchRefs([matchedByNumber]),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 2. Why was batch returned?
    if (q.includes('return')) {
      const returned = authorizedBatches.filter((b) => b.status === 'Returned');
      if (returned.length === 0) {
        return {
          reply:
            'There are currently no returned batches within your authorized scope.',
          referencedBatches: [],
          referencedCertificates: [],
          generatedAt: new Date().toISOString(),
        };
      }
      const details = returned
        .slice(0, 4)
        .map((b) => {
          const lastRet = [...b.approvalHistory]
            .reverse()
            .find((h) => h.decision === 'Returned');
          return `• ${b.batchNumber}: ${lastRet?.remarks ?? 'Returned for correction during review.'}`;
        })
        .join('\n');

      return {
        reply: `Found ${returned.length} returned batch(es) in your scope:\n${details}`,
        referencedBatches: toBatchRefs(returned),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 3. Pending in district
    if (q.includes('district') && (q.includes('pending') || q.includes('review'))) {
      if (user.role === 'QUALITY_OFFICER') {
        return {
          reply:
            'Your Quality Officer account is scoped to large-cohort Quality Scrutiny batches rather than District Verification queues.',
          referencedBatches: [],
          referencedCertificates: [],
          generatedAt: new Date().toISOString(),
        };
      }
      const pendingDistrict = authorizedBatches.filter(
        (b) => b.status === 'Pending District Approval'
      );
      const awaitingMySignoff =
        user.role === 'DISTRICT_OFFICER'
          ? pendingDistrict.filter(
              (b) =>
                !b.districtApprovals.some(
                  (a) => a.officerEmail.toLowerCase() === user.email.toLowerCase()
                )
            )
          : pendingDistrict;

      return {
        reply:
          user.role === 'DISTRICT_OFFICER'
            ? `There are ${pendingDistrict.length} batch(es) pending District Verification in ${user.district ?? 'your'} District (${awaitingMySignoff.length} awaiting your sign-off).`
            : `There are ${pendingDistrict.length} batch(es) currently pending District Verification in your authorized scope.`,
        referencedBatches: toBatchRefs(awaitingMySignoff.length > 0 ? awaitingMySignoff : pendingDistrict),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 4. Waiting for state approval
    if (q.includes('state approval') || q.includes('final approval')) {
      const pendingState = authorizedBatches.filter(
        (b) => b.status === 'Pending State Approval'
      );
      return {
        reply:
          pendingState.length > 0
            ? `${pendingState.length} batch(es) within your authorized view are waiting for State Final Approval.`
            : 'No batches within your authorized scope are currently awaiting State Final Approval.',
        referencedBatches: toBatchRefs(pendingState),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 5. Stuck batches (>3 days or SLA stalled)
    if (q.includes('stuck') || q.includes('delay') || q.includes('sla') || q.includes('three days')) {
      const stuck = authorizedBatches.filter(
        (b) =>
          b.daysInCurrentStage > 3 &&
          b.status !== 'Issued' &&
          b.status !== 'Rejected'
      );
      return {
        reply:
          stuck.length > 0
            ? `${stuck.length} active batch(es) in your authorized scope have remained in their current stage for more than 3 days.`
            : 'No active batches in your authorized scope have been stalled for more than 3 days.',
        referencedBatches: toBatchRefs(stuck),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 6. Certificates issued / failed delivery
    if (q.includes('certificate') || q.includes('whatsapp') || q.includes('issued')) {
      if (!canAccessCertificates) {
        const myIssuedBatches = authorizedBatches.filter(
          (b) => b.status === 'Issued'
        );
        return {
          reply: `State-wide certificate registry and delivery records are restricted to State Officers. Within your authorized batch scope, ${myIssuedBatches.length} batch(es) have reached "Issued" status.`,
          referencedBatches: toBatchRefs(myIssuedBatches),
          referencedCertificates: [],
          generatedAt: new Date().toISOString(),
        };
      }

      if (q.includes('fail') || q.includes('whatsapp') || q.includes('delivery')) {
        const failed = authorizedCertificates.filter(
          (c) => c.whatsappStatus === 'Failed'
        );
        return {
          reply: `${failed.length} issued certificate(s) currently have Failed WhatsApp delivery status and are eligible for retry.`,
          referencedBatches: [],
          referencedCertificates: toCertRefs(failed),
          generatedAt: new Date().toISOString(),
        };
      }

      const issuedCerts = authorizedCertificates.filter(
        (c) => c.status === 'Issued'
      );
      const latestMonth = issuedCerts
        .map((c) => c.issueDate.slice(0, 7))
        .sort()
        .pop();
      const currentMonthIssued = latestMonth
        ? issuedCerts.filter((c) => c.issueDate.startsWith(latestMonth))
        : issuedCerts;

      return {
        reply: `There are ${issuedCerts.length} active issued certificates in the State registry (${currentMonthIssued.length} issued in the latest active cycle ${latestMonth ?? ''}).`,
        referencedBatches: [],
        referencedCertificates: toCertRefs(currentMonthIssued),
        generatedAt: new Date().toISOString(),
      };
    }

    // 7. Quality review queue
    if (q.includes('quality')) {
      const pendingQuality = authorizedBatches.filter(
        (b) => b.status === 'Pending Quality Review'
      );
      return {
        reply:
          pendingQuality.length > 0
            ? `${pendingQuality.length} large-cohort batch(es) in your authorized scope are currently in Quality Scrutiny.`
            : 'No batches in your authorized scope are currently pending Quality Scrutiny.',
        referencedBatches: toBatchRefs(pendingQuality),
        referencedCertificates: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // 8. Default role-scoped summary
    const pendingCount = authorizedBatches.filter((b) =>
      [
        'Pending District Approval',
        'Pending Quality Review',
        'Pending State Approval',
      ].includes(b.status)
    ).length;
    const issuedBatchCount = authorizedBatches.filter(
      (b) => b.status === 'Issued'
    ).length;

    return {
      reply: `In your authorized ${user.roleLabel} scope, there are ${authorizedBatches.length} accessible batch(es): ${pendingCount} pending review and ${issuedBatchCount} issued. Ask about pending queues, stuck batches, or specific batch numbers for details.`,
      referencedBatches: toBatchRefs(authorizedBatches),
      referencedCertificates: [],
      generatedAt: new Date().toISOString(),
    };
  },
};
