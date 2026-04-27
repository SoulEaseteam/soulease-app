// ===============================================
// src/routes/PrivateRoute.tsx
// ===============================================

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import type { Role } from "@/providers/AuthProvider";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
}

const PrivateRoute = ({ children, requiredRoles = [] }: PrivateRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // ยังโหลด user / role อยู่ → ห้าม render เดี๋ยวจอขาว
  if (loading) return null;

  // ไม่ได้ login → เด้งกลับ Login พร้อมจำหน้าเดิมไว้ redirect กลับ
  if (!user) {
    // admin path → admin login, อื่นๆ → user login
    const loginPath = location.pathname.startsWith("/admin")
      ? "/admin/login"
      : "/login";
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // ถ้าหน้าต้องการ role เฉพาะ และ user ไม่มี → กลับหน้าหลัก (เดิม redirect ไป
  // /unauthorized ที่ไม่มีอยู่จริง = ตกไปหน้า 404 น่าสับสน)
  if (requiredRoles.length > 0 && (!role || !requiredRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
