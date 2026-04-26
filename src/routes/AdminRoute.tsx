import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (role !== "admin") return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
};

export default AdminRoute;