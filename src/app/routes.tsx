import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();

  // ระหว่างโหลด → แสดง Loading
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  // ยังไม่ login → เด้งไป login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // login แล้ว แต่ไม่ใช่ admin → block
  if (role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;