// ===============================================
// src/routes/PrivateRoute.tsx
// ===============================================

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const PrivateRoute = ({ children, requiredRoles = [] }: PrivateRouteProps) => {
  const { user, role, loading } = useAuth();

  // ยังโหลด user / role อยู่ → ห้าม render เดี๋ยวจอขาว
  if (loading) return null;

  // ไม่ได้ login → เด้งกลับ Login
  if (!user) return <Navigate to="/login" replace />;

  // ถ้าหน้าต้องการ role เฉพาะ เช่น admin
  if (requiredRoles.length > 0 && !requiredRoles.includes(role || "")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;