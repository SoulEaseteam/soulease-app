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

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";

import BottomNavGlass from "@/components/layouts/BottomNavGlass";
import useAdminPresenceHeartbeat from "@/hooks/useAdminPresenceHeartbeat";

const DRAWER_FULL      = 240;
const DRAWER_COLLAPSED = 60;

const menuItems = [
  { label: "Dashboard",    path: "/admin/dashboard",          icon: <DashboardIcon /> },
  // 🆕 Round 28r15 — Funnel analytics (self-hosted, reads
  //   `analytics_events` collection populated by Round 28r13).
  { label: "Analytics",    path: "/admin/analytics",          icon: <InsightsIcon /> },
  // 🆕 Round 28r26 — Earnings calculator (revenue · 60/40 split · CSV).
  { label: "Earnings",     path: "/admin/earnings",           icon: <PaidIcon /> },
  { label: "Reports",      path: "/admin/reports",            icon: <ReportIcon /> },
  { label: "New Booking",  path: "/admin/bookings/add",       icon: <AddBoxIcon /> },
  { label: "Bookings",     path: "/admin/bookings",           icon: <BookingIcon /> },
  { label: "Therapists",   path: "/admin/therapists",         icon: <TherapistIcon /> },
  { label: "Users",        path: "/admin/users",              icon: <UserIcon /> },
  { label: "Reviews",      path: "/admin/reviews",            icon: <ReviewIcon /> },
  { label: "Blocked",      path: "/admin/blocked-devices",    icon: <BlockIcon /> },
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

  // ── shared sidebar content ─────────────────────────────────────────
  const sidebarContent = (compact: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* brand strip */}
      <Box
        sx={{
          height: 64, // matches AppBar
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          px: compact ? 0 : 2,
          gap: 1.25,
          borderBottom: "1px solid rgba(15,23,42,0.07)",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#B4000A",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>S</Typography>
        </Box>
        {!compact && (
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: "#1a0805", lineHeight: 1.1 }}>SunRed</Typography>
            <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</Typography>
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
                color: active ? "#B4000A" : "#1A2B2E",
                "&:hover": {
                  background: "rgba(180,0,10,0.04)",
                },
                "&.Mui-selected": {
                  background: "rgba(180,0,10,0.08)",
                  color: "#B4000A",
                  "&:hover": { background: "rgba(15, 23, 42, 0.12)" },
                  "& .MuiListItemIcon-root": { color: "#B4000A" },
                },
                "& .MuiListItemIcon-root": {
                  color: active ? "#B4000A" : "rgba(15, 23, 42,0.55)",
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
            borderTop: "1px solid rgba(15,23,42,0.07)",
            display: "flex", alignItems: "center", gap: 1,
          }}
        >
          <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(15, 23, 42, 0.10)", color: "#B4000A", fontSize: 13, fontWeight: 700 }}>
            {user.email?.[0]?.toUpperCase()}
          </Avatar>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "rgba(15, 23, 42,0.60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {user.email}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const desktopWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_FULL;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f7f3f1" }}>
      <CssBaseline />

      {/* ── Top AppBar ─────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: "#B4000A",
          boxShadow: "0 2px 12px rgba(15, 23, 42, 0.25)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              color="inherit"
              onClick={isMobile ? () => setMobileOpen((v) => !v) : toggleDesktopSidebar}
            >
              {isMobile && mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
            <Typography fontWeight={700} fontSize={15} letterSpacing="-0.01em">
              SunRed Admin
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Notifications">
              <IconButton color="inherit" size="small">
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 30, height: 30, bgcolor: "#fff", color: "#B4000A", fontSize: 14, fontWeight: 700 }}>
                {user.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { void navigate("/admin/advanced-settings"); setAnchorEl(null); }}>Settings</MenuItem>
              <MenuItem onClick={() => { void navigate("/profile"); setAnchorEl(null); }}>My Profile</MenuItem>
              <MenuItem onClick={logout} sx={{ color: "#B4000A" }}>Logout</MenuItem>
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
              background: "#fff",
              boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
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
              background: "#fff",
              borderRight: "1px solid rgba(15,23,42,0.07)",
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
