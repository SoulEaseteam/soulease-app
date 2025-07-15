import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider } from './providers/AuthProvider';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';

// Lazy loaded pages
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
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));

// Admin Pages
const AdminLoginPage = React.lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminTherapistsPage = React.lazy(() => import('./pages/admin/AdminTherapistsPage'));
const AdminBookingListPage = React.lazy(() => import('./pages/admin/AdminBookingListPage'));
const AdminHolidayTogglePage = React.lazy(() => import('./pages/admin/AdminHolidayTogglePage'));
const AdminTherapistDetailPage = React.lazy(() => import('./pages/admin/AdminTherapistDetailPage'));
const AdminUserDetailPage = React.lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AdminChangePasswordPage = React.lazy(() => import('./pages/admin/AdminChangePasswordPage'));
const AddTherapistPage = React.lazy(() => import('./pages/admin/AddTherapistPage'));
const EditTherapistPage = React.lazy(() => import('./pages/admin/EditTherapistPage'));

const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <ScrollToTop />
            <Routes>

              {/* Public Pages */}
              <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
              <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
              <Route path="/therapists/:id" element={<AppLayout><TherapistDetailPage /></AppLayout>} />
              <Route path="/booking" element={<AppLayout><BookingPage /></AppLayout>} />
              <Route path="/booking/:id" element={<AppLayout><BookingPage /></AppLayout>} />
              <Route path="/booking/history" element={<AppLayout><BookingHistoryPage /></AppLayout>} />
              <Route path="/service-detail/:name" element={<AppLayout><ServiceDetailPage /></AppLayout>} />
              <Route path="/review/:id" element={<AppLayout><ReviewPage /></AppLayout>} />
              <Route path="/review/all/:id" element={<AppLayout><ReviewListPage /></AppLayout>} />
              <Route path="/saved" element={<AppLayout><SavedTherapistsPage /></AppLayout>} />
              <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
              <Route path="/edit-profile" element={<AppLayout><EditProfilePage /></AppLayout>} />
              <Route path="/location" element={<AppLayout><LocationPage /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
              <Route path="/map-select" element={<AppLayout><MapSelectPage /></AppLayout>} />
              <Route path="/select-location" element={<AppLayout><SelectLocationPage /></AppLayout>} />
              <Route path="/payment" element={<AppLayout><PaymentPage /></AppLayout>} />

              {/* Auth Pages */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Therapist Protected */}
              <Route path="/therapist/profile" element={
                <PrivateRoute requiredRoles={['therapist']}>
                  <AppLayout><TherapistProfilePage /></AppLayout>
                </PrivateRoute>
              } />
              <Route path="/update-location" element={
                <PrivateRoute requiredRoles={['therapist']}>
                  <AppLayout><UpdateLocationPage /></AppLayout>
                </PrivateRoute>
              } />

              {/* Admin Protected */}
              <Route path="/admin" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminDashboardPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/dashboard" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminDashboardPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/therapists" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminTherapistsPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/bookings" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminBookingListPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/holiday" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminHolidayTogglePage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/therapists/:id" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminTherapistDetailPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/user/:id" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminUserDetailPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/change-password" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AdminChangePasswordPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/add-therapist" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><AddTherapistPage /></AdminLayout>
                </PrivateRoute>
              } />
              <Route path="/admin/edit-therapist/:id" element={
                <PrivateRoute requiredRoles={['admin']}>
                  <AdminLayout><EditTherapistPage /></AdminLayout>
                </PrivateRoute>
              } />

              {/* Not Found */}
              <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />

            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </I18nextProvider>
  );
};

export default App;