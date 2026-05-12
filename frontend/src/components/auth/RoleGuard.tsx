'use client';

import { ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '../../lib/types';

interface RoleGuardProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, roles, fallback = null }) => {
  const { user, hasAnyRole } = useAuth();

  if (!user || !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Specific role guards
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleGuard roles={['ADMIN']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const SellerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleGuard roles={['SELLER']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const CustomerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleGuard roles={['CUSTOMER']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const SellerOrAdmin: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleGuard roles={['SELLER', 'ADMIN']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const AdminOrCustomer: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => (
  <RoleGuard roles={['ADMIN', 'CUSTOMER']} fallback={fallback}>
    {children}
  </RoleGuard>
);