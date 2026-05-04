import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🆕 Round 28b26 (founder 2026-05-04) — `/account?tab=membership|rewards`
//   was 404'ing because no /account route exists. HeroSection still
//   navigates to /account?tab=… for the membership + rewards tiles.
//   This redirect bridges legacy URLs to /profile with the query
//   string preserved so the future ProfilePage can read `?tab=` and
//   show the right pane. Once ProfilePage adds tab routing, switching
//   back to a real /account page is a one-line change.
const AccountLegacyRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/profile${location.search}${location.hash}`} replace />;
};

import ScrollToTop from "@/components/common/ScrollToTop";
import LoadingSpinner from "@/components/common/LoadingSpinner";

import AdminFloatingChat from "@/components/AdminFloatingChat";

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
// 🆕 Round 22 (founder 2026-05-01): TherapistsBrowsePage merged into
//    TherapistListPage (one canonical browse page). TherapistsBrowsePage
//    file deleted along with its dependents (TherapistGrid, TherapistMap,
//    BrowseHeader, TherapistCard, FeaturedTherapists, useTherapists,
//    TherapistCardSkeleton). All used DEMO fallback data — not from DB.

// 🎨 Phase 3 — New 5-step booking wizard. Owns /booking, /booking/:id,
//    and /booking/success/:id (post-submit). Legacy confirm page kept
//    around until Task 8 cleanup; new flow uses BookingSuccessPage.
const BookingFlowPage = React.lazy(
  () => import("@/pages/booking/BookingFlowPage")
);
const BookingSuccessPage = React.lazy(
  () => import("@/pages/booking/BookingSuccessPage")
);
const SelectLocationPage = React.lazy(
  () => import("@/pages/booking/SelectLocationPage")
);
const PaymentMethodsPage = React.lazy(
  () => import("@/pages/booking/PaymentMethodsPage")
);
const NotificationsPage = React.lazy(
  () => import("@/pages/NotificationsPage")
);
const BookingHistoryPage = React.lazy(
  () => import("@/pages/BookingHistoryPage")
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

// Therapist
// 🆕 Round 25c (founder 2026-05-02): TherapistListPage no longer routed.
//    Founder asked: "therapists ทั้งหมด กลับไปหน้าหลัก" — the live list
//    now lives on HomePage as HomeTherapistGrid (2-col grid). /therapists
//    and /therapist/list redirect to / for back-compat with old links.
//    The TherapistListPage.tsx file is orphan — pending git rm on Mac.
// 🆕 Round 22b (founder 2026-05-01): TherapistStatusManager file deleted
//    along with the merge cleanup. Status overrides (holiday/forceAvail)
//    still live on therapist docs and are managed via the admin panel.
const TherapistLocationPage = React.lazy(
  () => import("@/pages/therapist/TherapistLocationPage")
);
const TherapistProfilePage = React.lazy(
  () => import("@/pages/therapist/TherapistProfilePage")
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
const AdminPagesListPage = React.lazy(
  () => import("@/pages/admin/AdminPagesListPage")
);

export default function App() {
  return (
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

      {/* ⭐ Floating Chat – แสดงทุกหน้า */}
      <AdminFloatingChat />

      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/wechat-scan" element={<WeChatScanPage />} />
        {/* ================= MAIN LAYOUT ================= */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />

          {/* 🃏 Phase 2 — Browse + Detail */}
          {/* 🆕 Round 25c: full therapist list is now on HomePage
              (HomeTherapistGrid). /therapists and /therapist/list redirect
              to / so any external/old link still lands somewhere useful.
              Detail route /therapists/:id stays — it's the per-therapist
              page that the home grid clicks into. */}
          <Route path="/therapists" element={<Navigate to="/" replace />} />
          <Route path="/therapist/list" element={<Navigate to="/" replace />} />
          <Route path="/therapists/:id" element={<TherapistDetailPage />} />

          {/* 🎨 Phase 3 — new wizard at /booking + /booking/:therapistId
              + /booking/success/:bookingId (post-submit) */}
          <Route path="/booking" element={<BookingFlowPage />} />
          <Route path="/booking/:id" element={<BookingFlowPage />} />
          <Route path="/booking/success/:id" element={<BookingSuccessPage />} />
          {/* 🆕 Phase 4 — Dedicated Select Location route opened from
              the Confirm Order Address tile. Returns the address payload
              via react-router state. */}
          <Route
            path="/booking/:id/address"
            element={<SelectLocationPage />}
          />
          {/* 🆕 Round 14 (founder 2026-05-01): Payment Methods picker.
              Opened from the Confirm Order Payment cell. Persists choice
              to localStorage. Admin still confirms via Telegram. */}
          <Route path="/payment-methods" element={<PaymentMethodsPage />} />
          {/* 🆕 Round 16 (founder 2026-05-01): customer in-app notifications.
              Reads notifications collection for the signed-in user. */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/booking/history" element={<BookingHistoryPage />} />

          <Route path="/review/:id" element={<ReviewPage />} />
          <Route path="/review/all/:id" element={<ReviewListPage />} />

          <Route path="/saved" element={<SavedTherapistsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* 🆕 Round 28b26 — legacy /account?tab=… → /profile redirect */}
          <Route path="/account" element={<AccountLegacyRedirect />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />

          {/* Legacy /select-location route removed — Phase 5A's BookingHistoryPage
              rewrites Rebook to navigate to /therapists/:id instead. */}
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
          {/* /therapist/status route removed Round 22b — TherapistStatusManager
              component was deleted in the merge cleanup. */}
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
          <Route path="add-therapist" element={<AddTherapistPage />} />
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
  );
}