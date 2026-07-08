import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import i18n from "i18next";

// 🆕 Round 28s109 (SEO) — path-based locale entry points for crawlers.
//   The build emits static localized shells at /zh, /ja, /ko/<route> (see
//   scripts/prerender-routes.mjs) so Baidu/Naver index Chinese/Korean/
//   Japanese titles + content. A human landing on one of those URLs boots
//   the SPA here: we switch i18n to that language and redirect to the
//   working de-prefixed route. Purely additive — these prefixes 404'd
//   before, so existing routes are untouched.
const LocaleEntryRedirect: React.FC<{ lng: "zh" | "ja" | "ko" }> = ({
  lng,
}) => {
  const location = useLocation();
  React.useEffect(() => {
    void i18n.changeLanguage(lng);
  }, [lng]);
  const stripped = location.pathname.replace(/^\/(zh|ja|ko)(?=\/|$)/, "");
  const to = `${stripped || "/"}${location.search}${location.hash}`;
  return <Navigate to={to} replace />;
};

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
import MaintenanceGate from "@/components/common/MaintenanceGate";
import KeywordLanding from "@/components/common/KeywordLanding";

// 🆕 Round 28b29 (founder 2026-05-04, perf #66) — AdminFloatingChat
//   imports framer-motion (~100 kB) and was eagerly loaded on every
//   page. Now lazy-loaded so the homepage paint doesn't pull motion in.
const AdminFloatingChat = React.lazy(
  () => import("@/components/AdminFloatingChat")
);

// Route Guard
import PrivateRoute from "@/routes/PrivateRoute";

// Layouts
import MainLayout from "@/components/layouts/MainLayout";
// 🆕 Round 28b29 (perf) — AdminLayout is only needed under /admin/*.
//   Lazy import shaves the admin-side MUI icons + nav widgets out of
//   the customer's first-paint chunk.
const AdminLayout = React.lazy(() => import("@/components/layouts/AdminLayout"));
// 🆕 Round 28b29 (perf) — WeChatScanPage is only hit by Chinese
//   visitors scanning a QR. Lazy.
const WeChatScanPage = React.lazy(() => import("@/pages/WeChatScanPage"));

// =====================
// Lazy-loaded pages
// =====================
const HomePage = React.lazy(() => import("@/pages/HomePage"));
const ServicesPage = React.lazy(() => import("@/pages/ServicesPage"));
const ServiceDetailPage = React.lazy(() => import("@/pages/ServiceDetailPage"));
// 🆕 Round 28r70 (Rebrand Phase 1) — new /pricing route (currently a
//   Nordic-styled placeholder; Phase 2 will build the full page). The
//   route is prerendered as SEO shells in scripts/prerender-routes.mjs
//   for /pricing + /{zh,ja,ko}/pricing so external links land on
//   something even before the real page ships.
const PricingPage = React.lazy(() => import("@/pages/PricingPage"));
// 🆕 28s335 — /near-me hosts the "OR BROWSE BY LOCATION" map moved off home.
const NearMePage = React.lazy(() => import("@/pages/NearMePage"));
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
const AdminDashboardPage = React.lazy(
  () => import("@/pages/admin/AdminDashboardPage")
);
// 🆕 Round 28s232 — Tonight ops board (dispatch lifecycle control room).
const AdminTonightPage = React.lazy(
  () => import("@/pages/admin/AdminTonightPage")
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
// 🆕 Round 28s298 — manage discount codes + the promos master switch.
const AdminPromotionsPage = React.lazy(
  () => import("@/pages/admin/AdminPromotionsPage")
);
// 🆕 Round 28r15 — Funnel analytics dashboard for admin.
const AdminAnalyticsPage = React.lazy(
  () => import("@/pages/admin/AdminAnalyticsPage")
);
// 🆕 Round 28r26 — Earnings calculator (revenue + 60/40 split + CSV).
const AdminTherapistPayoutsPage = React.lazy(
  () => import("@/pages/admin/AdminTherapistPayoutsPage")
);
const AdminEarningsPage = React.lazy(
  () => import("@/pages/admin/AdminEarningsPage")
);
// 🆕 Round 28s116 — Admin panel for the @SunRedPostBot Telegram channel.
const AdminTelegramPanelPage = React.lazy(
  () => import("@/pages/admin/AdminTelegramPanelPage")
);
// 🆕 Round 28s213 — Backfill rating + reviewText on completed bookings
//   that never got a guest comment (so they surface as real reviews).
const AdminSeedReviewsPage = React.lazy(
  () => import("@/pages/admin/AdminSeedReviewsPage")
);
const AdminReportPage = React.lazy(
  () => import("@/pages/admin/AdminReportPage")
);
const AdminBlockedDevicesPage = React.lazy(
  () => import("@/pages/admin/AdminBlockedDevicesPage")
);
// 🆕 Round 28s234 (Phase 4) — Audit log viewer.
const AdminAuditLogPage = React.lazy(
  () => import("@/pages/admin/AdminAuditLogPage")
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

      {/* 🆕 Round 28b29 — AdminFloatingChat lazy + null Suspense fallback
          (so the chat bubble appears AFTER the rest of the page paints
          rather than blocking it). framer-motion no longer in main bundle. */}
      <Suspense fallback={null}>
        <AdminFloatingChat />
      </Suspense>

      <MaintenanceGate>
      <Routes>
        {/* ===== Round 28s109: localized crawler entry points ===== */}
        <Route path="/zh/*" element={<LocaleEntryRedirect lng="zh" />} />
        <Route path="/ja/*" element={<LocaleEntryRedirect lng="ja" />} />
        <Route path="/ko/*" element={<LocaleEntryRedirect lng="ko" />} />
        {/* ===== Round 28s224: district SEO landing pages ===========
            Search Console showed lost ground on "outcall massage
            sukhumvit" (-25%) and a 300% rise on "massage near me".
            These URLs ship as static prerendered shells (district-
            specific English title + LocalBusiness JSON-LD + crawlable
            noscript body); humans landing on them get the home page
            (the SPA boots and shows the practitioner roster).
            =========================================================== */}
        <Route path="/outcall-massage-sukhumvit" element={<KeywordLanding area="sukhumvit" />} />
        <Route path="/outcall-massage-silom" element={<KeywordLanding area="silom" />} />
        <Route path="/outcall-massage-asok" element={<KeywordLanding area="asok" />} />
        <Route path="/outcall-massage-thonglor" element={<KeywordLanding area="thonglor" />} />
        <Route path="/outcall-massage-near-me" element={<KeywordLanding area="near-me" />} />
        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/wechat-scan" element={<WeChatScanPage />} />
        {/* ================= MAIN LAYOUT ================= */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/near-me" element={<NearMePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          {/* 🆕 Round 28r70 (Rebrand Phase 1) — new pricing route.
              Currently renders a Nordic-styled stub with two escape
              hatches (Contact Concierge / Back to Home). Phase 2 will
              swap in the full rate card. Localized crawler entry
              points (/zh/pricing etc.) are handled by the
              LocaleEntryRedirect route above (redirects to /pricing
              after switching i18n language). */}
          <Route path="/pricing" element={<PricingPage />} />

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
          <Route path="tonight" element={<AdminTonightPage />} />
          <Route path="therapists" element={<AdminTherapistsPage />} />
          <Route
            path="therapists/:id"
            element={<AdminTherapistDetailPage />}
          />
          <Route path="add-therapist" element={<AddTherapistPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="user/:id" element={<AdminUserDetailPage />} />
          <Route path="bookings" element={<AdminBookingListPage />} />
          <Route path="bookings/add" element={<AdminBookingAddPage />} />
          <Route path="reviews" element={<AdminReviewListPage />} />
          <Route path="reports" element={<AdminReportPage />} />
          {/* 🆕 Round 28r15 — Funnel analytics dashboard */}
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          {/* 🆕 Round 28r26 — Earnings calculator */}
          <Route path="earnings" element={<AdminEarningsPage />} />
          {/* 🆕 Round 28s313 — Pay-therapist queue (non-cash bookings) */}
          <Route path="pay-therapists" element={<AdminTherapistPayoutsPage />} />
          <Route path="telegram" element={<AdminTelegramPanelPage />} />
          {/* 🆕 Round 28s213 — Seed anonymous reviews onto bookings. */}
          <Route path="seed-reviews" element={<AdminSeedReviewsPage />} />
          <Route
            path="blocked-devices"
            element={<AdminBlockedDevicesPage />}
          />
          {/* 🆕 Round 28s234 (Phase 4) — Audit log viewer. */}
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="pages-list" element={<AdminPagesListPage />} />
          <Route
            path="advanced-settings"
            element={<AdminAdvancedSettingsPage />}
          />
          <Route path="promotions" element={<AdminPromotionsPage />} />
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </MaintenanceGate>
    </Suspense>
  );
}