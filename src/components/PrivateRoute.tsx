// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

interface PrivateRouteProps {
  requiredRoles: string[]; // รายการสิทธิ์ที่อนุญาต เช่น ['admin', 'therapist']
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRoles, children }) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    // โหลดข้อมูลสิทธิ์ผู้ใช้ รอโหลดให้เสร็จก่อน
    return <div>Loading...</div>;
  }

  if (!user) {
    // ยังไม่ login ให้ไปหน้า login
    return <Navigate to="/login" replace />;
  }

  if (!role || !requiredRoles.includes(role)) {
    // ไม่มีสิทธิ์เข้าถึง เส้นทางนี้ ให้ไปหน้า unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  // ผ่านเงื่อนไขทั้งหมด แสดง children
  return children;
};

export default PrivateRoute;