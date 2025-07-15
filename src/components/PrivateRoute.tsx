// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

interface PrivateRouteProps {
  requiredRoles: string[];
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRoles, children }) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = role && requiredRoles.includes(role);
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;