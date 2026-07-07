// src/components/layouts/AdminLayout.tsx
//
// 🆕 Round 28c18 (founder 2026-05-06) — responsive sidebar.
//   Mobile (< md): temporary drawer opened via hamburger + BottomNavGlass.
//   Desktop (≥ md): permanent collapsible sidebar as before.

import React, { useState, useEffect } from "react";
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

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";

import BottomNavGlass from "@/components/layouts/BottomNavGlass";
import useAdminPresenceHeartbeat from "@/hooks/useAdminPresenceHeartbeat";
// 🆕 Round 28s234 — Control Room redesign (shared dark tokens).
import { adminColor, adminFont } from "@/theme/adminTheme";
import NightsStayIcon from "@mui/icons-material/NightsStay";

const DRAWER_FULL      = 240;
const DRAWER_COLLAPSED = 60;

// 🆕 Round 28s266 (founder: "เรียงแถบนี้อีกครั้ง") — regrouped by actual
// workflow instead of ship order: daily ops → money/numbers → people →
// content → rarely-touched system pages. Tonight still leads (control-room
// entry, 28s232); New Booking/Bookings are now adjacent (were split apart
// by Reports before).
const menuItems = [
  // Daily ops
  { label: "Tonight",      path: "/admin/tonight",            icon: <NightsStayIcon /> },
  { label: "Dashboard",    path: "/admin/dashboard",          icon: <DashboardIcon /> },
  { label: "New Booking",  path: "/admin/bookings/add",       icon: <AddBoxIcon /> },
  { label: "Bookings",     path: "/admin/bookings",           icon: <BookingIcon /> },
  // Money & numbers
  // 🆕 Round 28r26 — Earnings calculator (revenue · 60/40 split · CSV).
  { label: "Earnings",     path: "/admin/earnings",           icon: <PaidIcon /> },
  // 🆕 Round 28s313 — pay-therapist queue (non-cash bookings → shop owes cut).
  { label: "Pay Therapists", path: "/admin/pay-therapists",   icon: <PaymentsIcon /> },
  { label: "Reports",      path: "/admin/reports",            icon: <ReportIcon /> },
  // 🆕 Round 28r15 — Funnel analytics (self-hosted, reads
  //   `analytics_events` collection populated by Round 28r13).
  { label: "Analytics",    path: "/admin/analytics",          icon: <InsightsIcon /> },
  // 🆕 Round 28s298 — manage discount codes (on/off + create new) and
  //   the master promos-enabled switch. See src/utils/discount.ts.
  { label: "Promotions",   path: "/admin/promotions",         icon: <LocalOfferIcon /> },
  // People
  { label: "Therapists",   path: "/admin/therapists",         icon: <TherapistIcon /> },
  { label: "Users",        path: "/admin/users",              icon: <UserIcon /> },
  // Content
  { label: "Reviews",      path: "/admin/reviews",            icon: <ReviewIcon /> },
  // 🆕 Round 28s213 — Backfill anonymous reviews onto completed bookings
  //   that never got a guest comment.
  { label: "Seed Reviews", path: "/admin/seed-reviews",       icon: <RateReviewIcon /> },
  // System
  { label: "Blocked",      path: "/admin/blocked-devices",    icon: <BlockIcon /> },
  // 🆕 Round 28s234 — audit log viewer (Phase 4).
  { label: "Audit Log",    path: "/admin/audit-log",          icon: <ListAltIcon /> },
  { label: "Pages",        path: "/admin/pages-list",         icon: <ListAltIcon /> },
  { label: "Settings",     path: "/admin/advanced-settings",  icon: <SettingsIcon /> },
];

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

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "notifications"));
        setNotifications(snap.size);
      } catch { /* ignore */ }
    })();
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
        {menuItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== "/admin/dashboard" && location.pathname.startsWith(item.path));
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={active}
              sx={{
                justifyContent: compact ? "center" : "flex-start",
                py: 1,
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
                  primaryTypographyProps={{
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color: "inherit",
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
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
              <MenuItem onClick={() => { void navigate("/admin/advanced-settings"); setAnchorEl(null); }}>Settings</MenuItem>
              <MenuItem onClick={() => { void navigate("/profile"); setAnchorEl(null); }}>My Profile</MenuItem>
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
