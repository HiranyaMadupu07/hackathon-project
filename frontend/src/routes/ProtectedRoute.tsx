import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAppState';
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage';
import { UserRole } from '../types';
import { ROUTES } from './routes';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <AppShell>
        <UnauthorizedPage />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
