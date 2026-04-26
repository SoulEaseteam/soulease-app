import React, { Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import ScrollToTop from "@/components/common/ScrollToTop";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorFallback from "@/components/common/ErrorFallback";

import ContactFloater from "@/components/ContactFloater";

// Route Guard
import PrivateRoute from "@/routes/PrivateRoute";

// Layouts
import MainLayout from "@/components/layouts/MainLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import WeChatScanPage from "@/pages/WeChatScanPage";

// =====================
// Lazy-loaded pages
// =====================
const HomePage = React.lazy(() => import("@/pages/HomePage"));
const ServicesPage = React.lazy(() => import("@/pages/ServicesPage"));
const ServiceDetailPage = React.lazy(() => import("@/pages/ServiceDetailPage"));
const TherapistDetailPage = React.lazy(
  () => import("@/pages/TherapistDetailPage")
);

const BookingPage = React.lazy(() => import("@/pages/BookingPage"));
const BookingHistoryPage = React.lazy(
  () => import("@/pages/BookingHistoryPage")
);
const BookingConfirmationPage = React.lazy(
  () => import("@/pages/BookingConfirmationPage")
);

const ReviewPage = React.lazy(() => import("@/pages/ReviewPage"));
const ReviewListPage = React.lazy(() => import("@/pages/ReviewListPage"));

const SavedTherapistsPage = React.lazy(
  () => import("@/pages/user/SavedTherapistsPage")
);

const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const EditProfilePage = React.lazy(
  () => import("@/pages/user/EditProfilePage")
);

const SelectLocationPage = React.lazy(
  () => import("@/pages/SelectLocationPage")
);
const UpdateLocationPage = React.lazy(
  () => import("@/pages/UpdateLocationPage")
);

// Auth
const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/RegisterPage"));
const MaintenancePage = React.lazy(
  () => import("@/pages/MaintenancePage")
);
const NotFoundPage = React.lazy(() => import("@/pages/NotFoundPage"));
const LandingPage = React.lazy(() => import("@/pages/LandingPage"));

// Therapist
const TherapistListPage = React.lazy(
  () => import("@/pages/therapist/TherapistListPage")
);
const TherapistStatusManagerPage = React.lazy(
  () => import("@/components/therapist/TherapistStatusManager")
);
const TherapistLocationPage = React.lazy(
  () => import("@/pages/therapist/TherapistLocationPage")
);
const TherapistProfilePage = React.lazy(
  () => import("@/pages/therapist/TherapistProfilePage")
);
const TherapistAvailabilityPage = React.lazy(
  () => import("@/pages/therapist/TherapistAvailabilityPage")
);

// Admin
const AdminLoginPage = React.lazy(
  () => import("@/pages/admin/AdminLoginPage")
);
const AdminDashboardPage = React.lazy(
  () => import("@/pages/admin/AdminDashboardPage")
);
const AdminTherapistsPage = React.lazy(
  () => import("@/pages/admin/AdminTherapistsPage")
);
const AdminTherapistDetailPage = React.lazy(
  () => import("@/pages/admin/AdminTherapistDetailPage")
);
const AdminTherapistHolidayPage = React.lazy(
  () => import("@/pages/admin/AdminTherapistHolidayPage")
);
const AdminUserDetailPage = React.lazy(
  () => import("@/pages/admin/AdminUserDetailPage")
);
const AddTherapistPage = React.lazy(
  () => import("@/pages/admin/AddTherapistPage")
);
const EditTherapistPage = React.lazy(
  () => import("@/pages/admin/EditTherapistPage")
);
const AdminReviewListPage = React.lazy(
  () => import("@/pages/admin/AdminReviewListPage")
);
const AdminBookingListPage = React.lazy(
  () => import("@/pages/admin/AdminBookingListPage")
);
const AdminBookingAddPage = React.lazy(
  () => import("@/pages/admin/AdminBookingAddPage")
);
const AdminAdvancedSettingsPage = React.lazy(
  () => import("@/pages/admin/AdminAdvancedSettingsPage")
);
const AdminReportPage = React.lazy(
  () => import("@/pages/admin/AdminReportPage")
);
const AdminBlockedDevicesPage = React.lazy(
  () => import("@/pages/admin/AdminBlockedDevicesPage")
);
const AdminUsersPage = React.lazy(
  () => import("@/pages/admin/AdminUsersPage")
);
const AdminManageAdminsPage = React.lazy(
  () => import("@/pages/admin/AdminManageAdminsPage")
);
const AdminNotificationsPage = React.lazy(
  () => import("@/pages/admin/AdminNotificationsPage")
);
const AdminSettingsPage = React.lazy(
  () => import("@/pages/admin/AdminSettingsPage")
);
const AdminAddAdminPage = React.lazy(
  () => import("@/pages/admin/AdminAddAdminPage")
);
const AdminPagesListPage = React.lazy(
  () => import("@/pages/admin/AdminPagesListPage")
);

export default function App() {
  // ใช้ pathname เป็น key ให้ ErrorBoundary reset ทุกครั้งที่เปลี่ยนหน้า
  // (กันสถานการณ์ที่ user navigate ออกจาก error page แล้ว state ค้าง)
  const location = useLocation();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[location.pathname]}
    >
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <LoadingSpinner />
          </div>
        }
      >
        <ScrollToTop />

        {/* ⭐ Premium contact floater — ลูกค้าเห็นทุกหน้า, ซ่อนใน /admin */}
        <ContactFloater />

        <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/wechat-scan" element={<WeChatScanPage />} />

        {/* SEO landing pages — services + areas */}
        <Route path="/services/:slug" element={<LandingPage />} />
        <Route path="/areas/:slug" element={<LandingPage />} />
        {/* ================= MAIN LAYOUT ================= */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />

          <Route path="/therapists/:id" element={<TherapistDetailPage />} />
          <Route path="/therapist/list" element={<TherapistListPage />} />

          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:id" element={<BookingPage />} />
          <Route path="/booking/history" element={<BookingHistoryPage />} />
          <Route
            path="/booking/confirm"
            element={<BookingConfirmationPage />}
          />

          <Route path="/review/:id" element={<ReviewPage />} />
          <Route path="/review/all/:id" element={<ReviewListPage />} />

          <Route path="/saved" element={<SavedTherapistsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />

          <Route path="/select-location" element={<SelectLocationPage />} />
        </Route>

        {/* ================= THERAPIST ================= */}
        <Route
          element={
            <PrivateRoute requiredRoles={["therapist"]}>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route
            path="/therapist/profile"
            element={<TherapistProfilePage />}
          />
          <Route
            path="/therapist/status"
            element={<TherapistStatusManagerPage />}
          />
          <Route
            path="/therapist/availability"
            element={<TherapistAvailabilityPage />}
          />
          <Route path="/update-location" element={<UpdateLocationPage />} />
          <Route path="/location" element={<TherapistLocationPage />} />
        </Route>

        {/* ================= ADMIN ================= */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute requiredRoles={["admin"]}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="therapists" element={<AdminTherapistsPage />} />
          <Route
            path="therapists/:id"
            element={<AdminTherapistDetailPage />}
          />
          {/* Holiday/availability toggle — owner & admin can change therapist status */}
          <Route path="holiday" element={<AdminTherapistHolidayPage />} />
          <Route path="status" element={<AdminTherapistHolidayPage />} />
          <Route path="add-therapist" element={<AddTherapistPage />} />
          {/* Admin self-management */}
          <Route path="manage-admins" element={<AdminManageAdminsPage />} />
          <Route path="add-admin" element={<AdminAddAdminPage />} />
          {/* Notifications + general settings */}
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route
            path="edit-therapist/:id"
            element={<EditTherapistPage />}
          />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="user/:id" element={<AdminUserDetailPage />} />
          <Route path="bookings" element={<AdminBookingListPage />} />
          <Route path="bookings/add" element={<AdminBookingAddPage />} />
          <Route path="reviews" element={<AdminReviewListPage />} />
          <Route path="reports" element={<AdminReportPage />} />
          <Route
            path="blocked-devices"
            element={<AdminBlockedDevicesPage />}
          />
          <Route path="pages-list" element={<AdminPagesListPage />} />
          <Route
            path="advanced-settings"
            element={<AdminAdvancedSettingsPage />}
          />
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}