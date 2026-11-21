import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAppState';
import { ApprovalWorkspacePage } from '../pages/approvals/ApprovalWorkspacePage';
import { DecisionHistoryPage } from '../pages/approvals/DecisionHistoryPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { BatchCandidatesPage } from '../pages/batches/BatchCandidatesPage';
import { BatchDetailsPage } from '../pages/batches/BatchDetailsPage';
import { BatchesPage } from '../pages/batches/BatchesPage';
import { CreateBatchPage } from '../pages/batches/CreateBatchPage';
import { CertificateDetailPage } from '../pages/certificates/CertificateDetailPage';
import { CertificatesPage } from '../pages/certificates/CertificatesPage';
import { AuditHistoryPage } from '../pages/common/AuditHistoryPage';
import { NotificationsPage } from '../pages/common/NotificationsPage';
import { ProfilePage } from '../pages/common/ProfilePage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { VerifyCertificatePage } from '../pages/verification/VerifyCertificatePage';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return (
    <Navigate
      to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN}
      replace
    />
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.ROOT} element={<RootRedirect />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.VERIFY} element={<VerifyCertificatePage />} />
        <Route
          path="/verify/:certificateNumber"
          element={<VerifyCertificatePage />}
        />

        {/* Common authenticated routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Batch Management & Details */}
        <Route
          path={ROUTES.BATCHES}
          element={
            <ProtectedRoute
              allowedRoles={[
                'TRAINING_CENTRE',
                'DISTRICT_OFFICER',
                'STATE_OFFICER',
              ]}
            >
              <BatchesPage mode="batches" />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BATCH_CREATE}
          element={
            <ProtectedRoute allowedRoles={['TRAINING_CENTRE']}>
              <CreateBatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BATCH_STUCK}
          element={
            <ProtectedRoute allowedRoles={['STATE_OFFICER']}>
              <BatchesPage mode="stuck-batches" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:batchId"
          element={
            <ProtectedRoute>
              <BatchDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:batchId/candidates"
          element={
            <ProtectedRoute>
              <BatchCandidatesPage />
            </ProtectedRoute>
          }
        />

        {/* District Officer routes */}
        <Route
          path={ROUTES.APPROVALS_DISTRICT}
          element={
            <ProtectedRoute allowedRoles={['DISTRICT_OFFICER']}>
              <ApprovalWorkspacePage mode="district" />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.APPROVALS_DISTRICT_DECISIONS}
          element={
            <ProtectedRoute allowedRoles={['DISTRICT_OFFICER']}>
              <DecisionHistoryPage mode="district-decisions" />
            </ProtectedRoute>
          }
        />

        {/* Quality Officer routes */}
        <Route
          path={ROUTES.APPROVALS_QUALITY}
          element={
            <ProtectedRoute allowedRoles={['QUALITY_OFFICER']}>
              <ApprovalWorkspacePage mode="quality" />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.APPROVALS_QUALITY_HISTORY}
          element={
            <ProtectedRoute allowedRoles={['QUALITY_OFFICER']}>
              <DecisionHistoryPage mode="quality-history" />
            </ProtectedRoute>
          }
        />

        {/* State Officer routes */}
        <Route
          path={ROUTES.APPROVALS_STATE}
          element={
            <ProtectedRoute allowedRoles={['STATE_OFFICER']}>
              <ApprovalWorkspacePage mode="state" />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CERTIFICATES}
          element={
            <ProtectedRoute allowedRoles={['STATE_OFFICER']}>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/:certificateId"
          element={
            <ProtectedRoute allowedRoles={['STATE_OFFICER']}>
              <CertificateDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.AUDIT_HISTORY}
          element={
            <ProtectedRoute allowedRoles={['STATE_OFFICER']}>
              <AuditHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Backward-compatible route redirects */}
        <Route
          path="/my-batches"
          element={<Navigate to={ROUTES.BATCHES} replace />}
        />
        <Route
          path="/batch-history"
          element={<Navigate to={ROUTES.BATCHES} replace />}
        />
        <Route
          path="/stuck-batches"
          element={<Navigate to={ROUTES.BATCH_STUCK} replace />}
        />
        <Route
          path="/pending-reviews"
          element={<Navigate to={ROUTES.APPROVALS_DISTRICT} replace />}
        />
        <Route
          path="/my-decisions"
          element={<Navigate to={ROUTES.APPROVALS_DISTRICT_DECISIONS} replace />}
        />
        <Route
          path="/quality-queue"
          element={<Navigate to={ROUTES.APPROVALS_QUALITY} replace />}
        />
        <Route
          path="/review-history"
          element={<Navigate to={ROUTES.APPROVALS_QUALITY_HISTORY} replace />}
        />
        <Route
          path="/final-approvals"
          element={<Navigate to={ROUTES.APPROVALS_STATE} replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
