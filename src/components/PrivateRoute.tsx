// components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[]; // ต้องระบุแบบนี้
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRoles }) => {
  const { user, role } = useAuth();

  if (!user) return <Navigate to="/login" />;

  // ตรวจสอบ role (optional)
if (requiredRoles && (!role || !requiredRoles.includes(role))) {
  return <Navigate to="/" />;
}
  return <>{children}</>;
};

export default PrivateRoute;