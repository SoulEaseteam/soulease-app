import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import AdminFloatingChat from './components/AdminFloatingChat';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import PrivateRoute from './components/PrivateRoute';

import { AuthProvider } from './providers/AuthProvider';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// 🌐 Lazy Load Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const BookingHistoryPage = React.lazy(() => import('./pages/BookingHistoryPage'));
const ServiceDetailPage = React.lazy(() => import('./pages/ServiceDetailPage'));
const TherapistDetailPage = React.lazy(() => import('./pages/TherapistDetailPage'));
const ReviewPage = React.lazy(() => import('./pages/ReviewPage'));
const ReviewListPage = React.lazy(() => import('./pages/ReviewListPage'));
const SavedTherapistsPage = React.lazy(() => import('./pages/SavedTherapistsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const EditProfilePage = React.lazy(() => import('./pages/EditProfilePage'));
const LocationPage = React.lazy(() => import('./pages/LocationPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const MapSelectPage = React.lazy(() => import('./pages/MapSelectPage'));
const SelectLocationPage = React.lazy(() => import('./pages/SelectLocationPage'));
const TherapistProfilePage = React.lazy(() => import('./pages/TherapistProfilePage'));
const UpdateLocationPage = React.lazy(() => import('./pages/UpdateLocationPage'));
const PaymentPage = React.lazy(() => import('./pages/PaymentPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// 🔐 Auth Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));

// 🛠️ Admin Pages
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserListPage = React.lazy(() => import('./pages/admin/AdminUserListPage'));
const AdminTherapistsPage = React.lazy(() => import('./pages/admin/AdminTherapistsPage'));
const AdminBookingListPage = React.lazy(() => import('./pages/admin/AdminBookingListPage'));
const BookingStatusPage = React.lazy(() => import('./pages/admin/BookingStatusPage'));
const AdminHolidayTogglePage = React.lazy(() => import('./pages/admin/AdminHolidayTogglePage'));
const AdminTherapistDetailPage = React.lazy(() => import('./pages/admin/AdminTherapistDetailPage'));
const AdminUserDetailPage = React.lazy(() => import('./pages/admin/AdminUserDetailPage'));

const App: React.FC = () => (
  <I18nextProvider i18n={i18n}>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <ScrollToTop />
          <Routes>
            {/* 🌟 Client Routes */}
            <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
            <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
            <Route path="/booking" element={<AppLayout><BookingPage /></AppLayout>} />
            <Route path="/booking/:id" element={<AppLayout><BookingPage /></AppLayout>} />
            <Route path="/booking/history" element={<AppLayout><BookingHistoryPage /></AppLayout>} />
            <Route path="/service-detail/:name" element={<AppLayout><ServiceDetailPage /></AppLayout>} />
            <Route path="/therapists/:id" element={<AppLayout><TherapistDetailPage /></AppLayout>} />
            <Route path="/therapist/:id" element={<AppLayout><TherapistDetailPage /></AppLayout>} />
            <Route path="/review/:id" element={<AppLayout><ReviewPage /></AppLayout>} />
            <Route path="/review-list" element={<AppLayout><ReviewListPage /></AppLayout>} />
            <Route path="/saved" element={<AppLayout><SavedTherapistsPage /></AppLayout>} />
            <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
            <Route path="/edit-profile" element={<AppLayout><EditProfilePage /></AppLayout>} />
            <Route path="/location" element={<AppLayout><LocationPage /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
            <Route path="/map-select" element={<AppLayout><MapSelectPage /></AppLayout>} />
            <Route path="/select-location" element={<AppLayout><SelectLocationPage /></AppLayout>} />
            <Route path="/therapist/profile" element={<PrivateRoute requiredRoles={['therapist']}><AppLayout><TherapistProfilePage /></AppLayout></PrivateRoute>} />
            <Route path="/update-location" element={<PrivateRoute requiredRoles={['therapist']}><AppLayout><UpdateLocationPage /></AppLayout></PrivateRoute>} />
            <Route path="/payment" element={<AppLayout><PaymentPage /></AppLayout>} />
            <Route path="/booking-status" element={<PrivateRoute requiredRoles={['therapist']}><AppLayout><BookingStatusPage /></AppLayout></PrivateRoute>} />

            {/* 🔐 Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 🛠️ Admin Routes */}
            <Route path="/admin" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminDashboardPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminUsersPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/userlist" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminUserListPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/therapists" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminTherapistsPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/bookings" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminBookingListPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/holiday" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminHolidayTogglePage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/therapists/:id" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminTherapistDetailPage /></AdminLayout></PrivateRoute>} />
            <Route path="/admin/user/:id" element={<PrivateRoute requiredRoles={['admin']}><AdminLayout><AdminUserDetailPage /></AdminLayout></PrivateRoute>} />

            {/* ❌ Not Found */}
            <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
          </Routes>

          <AdminFloatingChat />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </I18nextProvider>
);

export default App;