import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import LoadingSpinner from "./components/LoadingSpinner";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import PrivateRoute from "./components/PrivateRoute";
import AuthProvider from "@/providers/AuthProvider";
import TherapistRoutes from "@/routes/TherapistRoutes";
import TherapistLayout from "@/layouts/TherapistLayout";
import TherapistStatusPage from "@/pages/therapist/TherapistStatusPage";
import { GlobalStyles } from "@mui/material";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";



// 🌐 Public Pages
const HomePage = React.lazy(() => import("./pages/HomePage"));
const ServicesPage = React.lazy(() => import("./pages/ServicesPage"));
const ServiceDetailPage = React.lazy(() => import("./pages/ServiceDetailPage"));
const BookingPage = React.lazy(() => import("./pages/BookingPage"));
const BookingHistoryPage = React.lazy(() => import("./pages/BookingHistoryPage"));
const ReviewPage = React.lazy(() => import("./pages/ReviewPage"));
const ReviewListPage = React.lazy(() => import("./pages/ReviewListPage"));
const SavedTherapistsPage = React.lazy(() => import("./pages/SavedTherapistsPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const EditProfilePage = React.lazy(() => import("./pages/EditProfilePage"));
const LocationPage = React.lazy(() => import("./pages/LocationPage"));
const MapSelectPage = React.lazy(() => import("./pages/MapSelectPage"));
const SelectLocationPage = React.lazy(() => import("./pages/SelectLocationPage"));
const PaymentPage = React.lazy(() => import("./pages/PaymentPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const MaintenancePage = React.lazy(() => import("./pages/MaintenancePage"));
const UnauthorizedPage = React.lazy(() => import("./pages/UnauthorizedPage")); 
const TherapistDetailPage = React.lazy(() => import("./pages/TherapistDetailPage"));

// 🔐 Admin Pages
const AdminLoginPage = React.lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminDashboardPage = React.lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminTherapistsPage = React.lazy(() => import("./pages/admin/AdminTherapistsPage"));
const AdminTherapistDetailPage = React.lazy(() => import("./pages/admin/AdminTherapistDetailPage"));
const AdminUsersPage = React.lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = React.lazy(() => import("./pages/admin/AdminUserDetailPage"));
const AdminReviewListPage = React.lazy(() => import("./pages/admin/AdminReviewListPage"));
const AdminBookingListPage = React.lazy(() => import("./pages/admin/AdminBookingListPage"));
const AdminNotificationsPage = React.lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminManageAdminsPage = React.lazy(() => import("./pages/admin/AdminManageAdminsPage"));
const AdminAddAdminPage = React.lazy(() => import("./pages/admin/AdminAddAdminPage"));
const AdminSettingsPage = React.lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminReportPage = React.lazy(() => import("./pages/admin/AdminReportPage"));
const TherapistLocationMap = React.lazy(() => import("./pages/admin/TherapistLocationMap"));
const AdminPagesListPage = React.lazy(() => import("./pages/admin/AdminPagesListPage"));

// 👩‍⚕️ Therapist Pages
const TherapistBookingsPage = React.lazy(() => import("./pages/therapist/TherapistBookingsPage"));
const TherapistProfilePage = React.lazy(() => import("./pages/therapist/TherapistProfilePage"));
const TherapistLocationPage = React.lazy(() => import("./pages/therapist/TherapistLocationPage"));

function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag("config", "G-XEMLVVPN4W", {
        page_path: location.pathname,
      });
    }
  }, [location]);
}

export default function App() {
  usePageTracking(); // ✅ เพิ่มบรรทัดนี้
  
  useEffect(() => {
    document.documentElement.style.overflowX = "hidden";
    document.documentElement.style.maxWidth = "100%";
    document.body.style.overflowX = "hidden";
    document.body.style.maxWidth = "100%";
    document.body.style.touchAction = "pan-y";
  }, []);

  return (
    <>
       <GlobalStyles
        styles={{
          html: { overflowX: "hidden", maxWidth: "100%" },
          body: {
            margin: 0,
            padding: 0,
            overflowX: "hidden",
            maxWidth: "100%",
            touchAction: "pan-y",
          
          },
          "#root": { maxWidth: "100%", overflowX: "hidden" },
        }}
      />

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
            Loading...
          </div>
        }
      >
        <ScrollToTop />
      <Routes>

        {/* 🌐 Public Pages */}
        <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
        <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
        <Route path="/services/:id" element={<AppLayout><ServiceDetailPage /></AppLayout>} />
        <Route path="/therapists/:id" element={<AppLayout><TherapistDetailPage /></AppLayout>} />
        <Route path="/service-detail/:name" element={<ServiceDetailPage />} />
        <Route path="/booking" element={<AppLayout><BookingPage /></AppLayout>} />
        <Route path="/booking/:id"element={<AppLayout> <BookingPage /> </AppLayout>}/>
        <Route path="/booking/history" element={<AppLayout><BookingHistoryPage /></AppLayout>} />
        <Route path="/review/:id" element={<AppLayout><ReviewPage /></AppLayout>} />
        <Route path="/review/all/:id" element={<AppLayout><ReviewListPage /></AppLayout>} />
        <Route path="/saved" element={<AppLayout><SavedTherapistsPage /></AppLayout>} />
        <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
        <Route path="/edit-profile" element={<AppLayout><EditProfilePage /></AppLayout>} />
        <Route path="/location" element={<AppLayout><LocationPage /></AppLayout>} />
        <Route path="/map-select" element={<AppLayout><MapSelectPage /></AppLayout>} />
        <Route path="/select-location" element={<AppLayout><SelectLocationPage /></AppLayout>} />
        <Route path="/payment" element={<AppLayout><PaymentPage /></AppLayout>} />

        {/* 🔑 Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* 🔐 Therapist Protected */}
            {/* 👩‍⚕️ Therapist Protected */}
         <Route element={<PrivateRoute allowedRoles={["therapist"]} />}>
  <Route path="/therapist" element={<TherapistLayout />}>
    <Route path="profile" element={<TherapistProfilePage />} />
    <Route path="status" element={<TherapistStatusPage />} />
    <Route path="location" element={<TherapistLocationPage />} />
    <Route path="bookings" element={<TherapistBookingsPage />} />
    <Route path="TherapistRoutes" element={<TherapistRoutes />} />
  </Route>
</Route>

        {/* 🔐 Admin Protected */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="reports" element={<AdminReportPage />} />
            <Route path="therapists" element={<AdminTherapistsPage />} />
            <Route path="therapists/:id" element={<AdminTherapistDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="user/:id" element={<AdminUserDetailPage />} />
            <Route path="reviews" element={<AdminReviewListPage />} />
            <Route path="bookings" element={<AdminBookingListPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="add-admin" element={<AdminAddAdminPage />} />
            <Route path="manage-admins" element={<AdminManageAdminsPage />} />
            <Route path="map" element={<TherapistLocationMap />} />
            <Route path="pages-list" element={<AdminPagesListPage />} />
          </Route>
        </Route>

     </Routes>
      </Suspense>
    </>
  );
}