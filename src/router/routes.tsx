// src/router/routes.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import TherapistProfilePage from '../pages/TherapistProfilePage';
import AdminDashboard from '../pages/admin/AdminDashboardPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import PrivateRoute from '../components/PrivateRoute';

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },

  {
    path: '/therapist-profile',
    element: (
      <PrivateRoute requiredRole="therapist">
        <TherapistProfilePage />
      </PrivateRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminDashboard />
      </PrivateRoute>
    ),
  },

{ path: '/unauthorized', element: <UnauthorizedPage /> },

  // fallback
  { path: '*', element: <Navigate to="/" /> },
];