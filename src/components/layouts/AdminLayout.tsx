// src/components/layouts/AdminLayout.tsx
//
// 🆕 Round 28c18 (founder 2026-05-06) — responsive sidebar.
//   Mobile (< md): temporary drawer opened via hamburger + BottomNavGlass.
//   Desktop (≥ md): permanent collapsible sidebar as before.

import React, { useState, useEffect, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  CssBaseline,
  Box,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  People as UserIcon,
  Spa as TherapistIcon,
  EventNote as BookingIcon,
  Star as ReviewIcon,
  BarChart as ReportIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

import ListAltIcon from "@mui/icons-material/ListAlt";
import AddBoxIcon from "@mui/icons-material/AddBox";
import BlockIcon from "@mui/icons-material/Block";
import InsightsIcon from "@mui/icons-material/Insights";
import PaidIcon from "@mui/icons-material/Paid";
import PaymentsIcon from "@mui/icons-material/Payments";
import RateReviewIcon from "@mui/icons-material/RateReview";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
// 🆕 28x.88 — SunRed Bot nav group (Telegram live; LINE/WhatsApp placeholders).
import TelegramIcon from "@mui/icons-material/Telegram";
import ForumIcon from "@mui/icons-material/Forum";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
// 🆕 28x.96 (founder: "เพิ่มหน้า คำขอพนักงาน ในหน้าแอดมิน") — review queue
//   for therapist self-service gallery photo uploads.
import PendingActionsIcon from "@mui/icons-material/PendingActions";
// 🆕 Round 28w.80 — Members (sign-up) and Membership (rules) shared ONE icon,
//   so the two rows were visually identical. Give the rules page its own.
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
// 🆕 28w.39 — load the admin service-split table (admin-only) into
//   commission.ts once, so every admin payout surface (Report, Payouts,
//   Earnings) resolves the SAME fixed per-tier therapist split.
import { applyServiceSplitConfig } from "@/utils/commission";
import { useAuth } from "@/providers/AuthProvider";

import BottomNavGlass from "@/components/layouts/BottomNavGlass";
import useAdminPresenceHeartbeat from "@/hooks/useAdminPresenceHeartbeat";
// 🆕 Round 28s234 — Control Room redesign (shared dark tokens).
import { adminColor, adminFont } from "@/theme/adminTheme";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPushToggle from "@/components/admin/AdminPushToggle";

const DRAWER_FULL      = 240;
const DRAWER_COLLAPSED = 60;

// 🆕 Round 28s266 (founder: "เรียงแถบนี้อีกครั้ง") — regrouped by actual
// workflow instead of ship order: daily ops → money/numbers → people →
// content → rarely-touched system pages. Tonight still leads (control-room
// entry, 28s232); New Booking/Bookings are now adjacent (were split apart
// by Reports before).
// 🆕 Round 28w.80 (founder: "มีภาษาไทย ด้านล่างเมนู เล็กๆ ทุกเมนู และ
//   จัดเรียงตามหมวดหมู่") — the workflow grouping from 28s266 only ever
//   existed as CODE COMMENTS; the drawer rendered one flat 20-item list, so
//   the structure was invisible to the person using it. Groups are real now,
//   and every item carries a small Thai caption under its English label.
interface NavItem { label: string; th: string; path: string; icon: React.ReactNode }
interface NavGroup { title: string; th: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Daily", th: "งานประจำวัน",
    items: [
      { label: "Tonight",     th: "คืนนี้",        path: "/admin/tonight",      icon: <NightsStayIcon /> },
      { label: "Dashboard",   th: "ภาพรวม",       path: "/admin/dashboard",    icon: <DashboardIcon /> },
      { label: "New Booking", th: "เปิดออเดอร์ใหม่", path: "/admin/bookings/add", icon: <AddBoxIcon /> },
      { label: "Bookings",    th: "รายการจอง",     path: "/admin/bookings",     icon: <BookingIcon /> },
    ],
  },
  {
    title: "Money", th: "เงิน & ตัวเลข",
    items: [
      // 🆕 Round 28r26 — Earnings calculator (revenue · split · CSV).
      { label: "Earnings",       th: "รายได้ร้าน",     path: "/admin/earnings",       icon: <PaidIcon /> },
      // 🆕 Round 28s313 — pay-therapist queue (non-cash bookings → shop owes cut).
      { label: "Pay Therapists", th: "จ่ายหมอนวด",    path: "/admin/pay-therapists", icon: <PaymentsIcon /> },
      { label: "Reports",        th: "รายงาน",        path: "/admin/reports",        icon: <ReportIcon /> },
      // 🆕 Round 28r15 — funnel analytics (reads `analytics_events`).
      { label: "Analytics",      th: "สถิติการใช้งาน", path: "/admin/analytics",      icon: <InsightsIcon /> },
      // 🆕 Round 28s298 — discount codes + the master promos switch.
      { label: "Promotions",     th: "ราคา & โปรโมชั่น", path: "/admin/promotions",   icon: <LocalOfferIcon /> },
    ],
  },
  {
    title: "People", th: "คน",
    items: [
      { label: "Therapists", th: "หมอนวด",         path: "/admin/therapists", icon: <TherapistIcon /> },
      // 🆕 28x.96 — photo uploads a therapist files from /therapist/gallery
      //   wait here for approval before they touch the live public gallery.
      { label: "Staff Requests", th: "คำขอพนักงาน", path: "/admin/staff-requests", icon: <PendingActionsIcon /> },
      { label: "Users",      th: "ผู้ใช้งาน",       path: "/admin/users",      icon: <UserIcon /> },
      { label: "Members",    th: "สมัครสมาชิก",     path: "/admin/members",    icon: <CardMembershipIcon /> },
      { label: "Membership", th: "กติกาสมาชิก & โบนัส", path: "/admin/membership", icon: <WorkspacePremiumIcon /> },
    ],
  },
  {
    title: "Content", th: "เนื้อหา",
    items: [
      { label: "Reviews",      th: "รีวิวลูกค้า",   path: "/admin/reviews",      icon: <ReviewIcon /> },
      // 🆕 Round 28s213 — backfill anon reviews onto completed bookings.
      { label: "Seed Reviews", th: "เติมรีวิวย้อนหลัง", path: "/admin/seed-reviews", icon: <RateReviewIcon /> },
      { label: "Pages",        th: "หน้าเว็บทั้งหมด", path: "/admin/pages-list",   icon: <ListAltIcon /> },
    ],
  },
  {
    // 🆕 Round 28x.88 (founder: "สร้างเมนูใน หลังบ้านแอดมิน ว่า SunRed bot
    //   ... จะมีเมนูแยก line OA bot / WhatsApp bot / Telegram bot") —
    //   Telegram Bot is live (consolidated AdminTelegramPanelPage); LINE OA
    //   and WhatsApp are placeholders until those integrations exist.
    title: "SunRed Bot", th: "บอท SunRed",
    items: [
      { label: "Telegram Bot", th: "บอท Telegram",  path: "/admin/telegram",     icon: <TelegramIcon /> },
      { label: "LINE OA Bot",  th: "บอท LINE OA",    path: "/admin/bot/line",     icon: <ForumIcon /> },
      { label: "WhatsApp Bot", th: "บอท WhatsApp",   path: "/admin/bot/whatsapp", icon: <WhatsAppIcon /> },
    ],
  },
  {
    title: "System", th: "ระบบ",
    items: [
      { label: "Blocked",   th: "อุปกรณ์ที่บล็อก",     path: "/admin/blocked-devices",   icon: <BlockIcon /> },
      // 🆕 Round 28s234 — audit log viewer (Phase 4).
      { label: "Audit Log", th: "ประวัติการทำงานแอดมิน", path: "/admin/audit-log",         icon: <ListAltIcon /> },
      { label: "My Account", th: "บัญชีของฉัน · เปลี่ยนรหัสผ่าน", path: "/admin/account",          icon: <AccountCircleIcon /> },
      { label: "Settings",   th: "ตั้งค่าขั้นสูง",              path: "/admin/advanced-settings", icon: <SettingsIcon /> },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const AdminLayout: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down("md"));

  const { user, role, loading } = useAuth();

  const [collapsed,    setCollapsed]    = useState<boolean>(() =>
    localStorage.getItem("admin_sidebar_collapsed") === "true"
  );
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [anchorEl,     setAnchorEl]     = useState<null | HTMLElement>(null);

  useAdminPresenceHeartbeat(Boolean(user) && role === "admin");

  // 🆕 Round 28w.80 — active-row detection used a bare `startsWith`, so any
  //   path that PREFIXES another lit up two rows at once: on /admin/membership
  //   both "Members" and "Membership" highlighted, and on /admin/bookings/add
  //   both "New Booking" and "Bookings" did. Resolve to the single longest
  //   matching path instead, so the most specific page always wins.
  const activePath = useMemo(() => {
    let best = "";
    for (const it of ALL_NAV_ITEMS) {
      const hit =
        location.pathname === it.path || location.pathname.startsWith(`${it.path}/`);
      if (hit && it.path.length > best.length) best = it.path;
    }
    return best;
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "notifications"));
        setNotifications(snap.size);
      } catch { /* ignore */ }
    })();
  }, []);

  // 🆕 28w.39 — keep commission.ts's split config in sync for all admin
  //   payout surfaces (defaults apply until this lands; edits propagate live).
  useEffect(() => {
    return onSnapshot(
      doc(db, "adminSettings", "earnings"),
      (snap) => {
        applyServiceSplitConfig(
          (snap.data()?.serviceSplits ?? {}) as Record<string, Record<number, number>>,
        );
      },
      () => { /* admin-only doc may be absent — defaults still apply */ },
    );
  }, []);

  // close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) return null;
  if (!user || role !== "admin") return null;

  const toggleDesktopSidebar = () => {
    setCollapsed((prev) => {
      localStorage.setItem("admin_sidebar_collapsed", (!prev).toString());
      return !prev;
    });
  };

  const logout = async () => {
    if (!window.confirm("Logout?")) return;
    try {
      await signOut(auth);
      void navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ── shared sidebar content — Round 28s234 Control Room redesign ────
  const sidebarContent = (compact: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", background: adminColor.panel }}>
      {/* brand strip */}
      <Box
        sx={{
          height: 64, // matches AppBar
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          px: compact ? 0 : 2,
          gap: 1.25,
          borderBottom: `1px solid ${adminColor.line}`,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 32, height: 32, borderRadius: "50%",
            background: adminColor.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: adminFont.serif }}>S</Typography>
        </Box>
        {!compact && (
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: adminColor.text, lineHeight: 1.1, fontFamily: adminFont.serif, letterSpacing: "0.02em" }}>SunRed</Typography>
            {/* 🆕 Round 28s239 — was adminColor.highlight here but
                adminColor.accent in the topbar wordmark below; unified on
                accent so "Control" reads the same color everywhere. */}
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: adminColor.accent, letterSpacing: "0.18em", textTransform: "uppercase" }}>Control</Typography>
          </Box>
        )}
      </Box>

      {/* nav items */}
      <List sx={{ pt: 1, px: 0.75, flex: 1, overflowY: "auto" }}>
        {NAV_GROUPS.map((group, gi) => (
          <React.Fragment key={group.title}>
            {/* Group heading — hidden when the rail is collapsed to icons; a
                hairline keeps the grouping legible there instead. */}
            {compact ? (
              gi > 0 && <Divider sx={{ my: 0.75, borderColor: adminColor.line }} />
            ) : (
              <Box sx={{ px: 1.5, pt: gi === 0 ? 0.25 : 1.5, pb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: adminColor.dim,
                  }}
                >
                  {group.title} · {group.th}
                </Typography>
              </Box>
            )}

            {group.items.map((item) => {
              const active = item.path === activePath;
              return (
                <ListItemButton
                  key={item.path}
                  component={Link}
                  to={item.path}
                  selected={active}
                  title={compact ? `${item.label} · ${item.th}` : undefined}
                  sx={{
                    justifyContent: compact ? "center" : "flex-start",
                    py: compact ? 1 : 0.75,
                    px: compact ? 1 : 1.5,
                    borderRadius: "10px",
                    mb: 0.25,
                    color: active ? adminColor.accent : adminColor.muted,
                    "&:hover": {
                      background: adminColor.panel2,
                      color: adminColor.text,
                    },
                    "&.Mui-selected": {
                      background: "rgba(78,126,140,0.16)",
                      color: adminColor.accent,
                      "&:hover": { background: "rgba(78,126,140,0.22)" },
                      "& .MuiListItemIcon-root": { color: adminColor.accent },
                    },
                    "& .MuiListItemIcon-root": {
                      color: active ? adminColor.accent : adminColor.dim,
                      minWidth: compact ? "auto" : 38,
                    },
                  }}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  {!compact && (
                    <ListItemText
                      primary={item.label}
                      secondary={item.th}
                      primaryTypographyProps={{
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 500,
                        color: "inherit",
                        lineHeight: 1.25,
                      }}
                      secondaryTypographyProps={{
                        fontSize: 10.5,
                        // Not "inherit": the caption must stay quiet even on the
                        // active row, or the two lines compete for attention.
                        color: active ? adminColor.accent : adminColor.dim,
                        lineHeight: 1.3,
                        sx: { opacity: active ? 0.85 : 1 },
                      }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </React.Fragment>
        ))}
      </List>

      {/* bottom: user info */}
      {!compact && (
        <Box
          sx={{
            px: 2, py: 1.5,
            borderTop: `1px solid ${adminColor.line}`,
            display: "flex", alignItems: "center", gap: 1,
          }}
        >
          <Avatar sx={{ width: 28, height: 28, bgcolor: adminColor.panel3, color: adminColor.accent, fontSize: 13, fontWeight: 700 }}>
            {user.email?.[0]?.toUpperCase()}
          </Avatar>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: adminColor.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {user.email}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const desktopWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_FULL;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: adminColor.bg }}>
      <CssBaseline />

      {/* ── Top AppBar — Round 28s234 Control Room redesign ─────────── */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: adminColor.panel,
          borderBottom: `1px solid ${adminColor.line}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              sx={{ color: adminColor.text }}
              onClick={isMobile ? () => setMobileOpen((v) => !v) : toggleDesktopSidebar}
            >
              {isMobile && mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
            <Typography fontWeight={600} fontSize={15} letterSpacing="0.02em" fontFamily={adminFont.serif} color={adminColor.text}>
              SunRed <Box component="span" sx={{ color: adminColor.accent }}>Control</Box>
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {/* 🆕 28x.193 — per-device web-push switch for new-booking
                alerts (see AdminPushToggle). */}
            <AdminPushToggle />
            <Tooltip title="Notifications">
              <IconButton size="small" sx={{ color: adminColor.text }}>
                <Badge badgeContent={notifications} sx={{ "& .MuiBadge-badge": { background: adminColor.accent, color: "#fff" } }}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 30, height: 30, bgcolor: adminColor.panel3, color: adminColor.accent, fontSize: 14, fontWeight: 700 }}>
                {user.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              slotProps={{ paper: { sx: { background: adminColor.panel2, color: adminColor.text, border: `1px solid ${adminColor.line}` } } }}
            >
              {/* 🆕 28x.2 (founder: "admin ไม่มี Settings ของตัวเอง หรอ ว่าเป็นใคร")
                  — "My Profile" used to send an admin to /profile, the CUSTOMER
                  page (booking history, saved therapists). It now goes to their
                  OWN account. "Settings" is renamed to what it actually is: the
                  system config, not anything personal. */}
              <MenuItem onClick={() => { void navigate("/admin/account"); setAnchorEl(null); }}>My Account</MenuItem>
              <MenuItem onClick={() => { void navigate("/admin/advanced-settings"); setAnchorEl(null); }}>System Settings</MenuItem>
              <MenuItem onClick={logout} sx={{ color: adminColor.accent }}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Mobile: temporary drawer ───────────────────────────────── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_FULL,
              boxSizing: "border-box",
              background: adminColor.panel,
              boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
            },
          }}
        >
          {sidebarContent(false)}
        </Drawer>
      )}

      {/* ── Desktop: permanent collapsible drawer ─────────────────── */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: desktopWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: desktopWidth,
              transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
              overflowX: "hidden",
              boxSizing: "border-box",
              background: adminColor.panel,
              borderRight: `1px solid ${adminColor.line}`,
            },
          }}
        >
          {sidebarContent(collapsed)}
        </Drawer>
      )}

      {/* ── Page content ───────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: "64px", // AppBar height
          pb: { xs: "80px", md: 3 }, // room for BottomNavGlass on mobile
          px: 0,
          minWidth: 0,
          overflow: "hidden",
          // 🆕 Round 28s240 — the dark-mode "ambient glow" gradient is
          //   pointless on a light surface (both ends are near-identical
          //   pale tints now); flat bg reads cleaner in light mode.
          background: adminColor.bg,
          color: adminColor.text,
        }}
      >
        <Outlet />
      </Box>

      {/* ── BottomNavGlass: visible on mobile only ─────────────────── */}
      {isMobile && <BottomNavGlass />}
    </Box>
  );
};

export default AdminLayout;
