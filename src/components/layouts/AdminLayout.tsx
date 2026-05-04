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
} from "@mui/material";

import {
  Menu as MenuIcon,
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

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";

// ⭐ Bottom Navigation (Admin only)
import BottomNavGlass from "@/components/layouts/BottomNavGlass";
// 🆕 Round 28b21 — Phase 3: heartbeat to adminPresence/global so the
//   customer-side "Admin online" badge can light up.
import useAdminPresenceHeartbeat from "@/hooks/useAdminPresenceHeartbeat";

const drawerWidth = 240;

// ================= MENU =================
const menuItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <DashboardIcon /> },
  { label: "Reports", path: "/admin/reports", icon: <ReportIcon /> },
  { label: "New Booking", path: "/admin/bookings/add", icon: <AddBoxIcon /> },
  { label: "Therapists", path: "/admin/therapists", icon: <TherapistIcon /> },
  { label: "Users", path: "/admin/users", icon: <UserIcon /> },
  { label: "Bookings", path: "/admin/bookings", icon: <BookingIcon /> },
  { label: "Reviews", path: "/admin/reviews", icon: <ReviewIcon /> },
  { label: "Blocked Devices", path: "/admin/blocked-devices", icon: <BlockIcon /> },
  { label: "Pages List", path: "/admin/pages-list", icon: <ListAltIcon /> },
  {
    label: "Settings",
    path: "/admin/advanced-settings",
    icon: <SettingsIcon />,
  },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading } = useAuth();

  // ⚠️ Rules of Hooks: hooks ทุกตัวต้องเรียกก่อน early return เสมอ
  // (เดิมประกาศ useState ภายหลัง if-return → React จะ throw บน render ถัดไป)
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem("admin_sidebar_collapsed") === "true"
  );

  const [notifications, setNotifications] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 🆕 Round 28b21 — Phase 3: while AdminLayout is mounted AND admin is
  //   authenticated, heartbeat to adminPresence/global every 30s. The
  //   customer-side useAdminPresence hook lights up the "Admin online"
  //   green pill. Hook is a no-op when `active` is false.
  useAdminPresenceHeartbeat(Boolean(user) && role === "admin");

  // 🔔 load notifications
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "notifications"));
        setNotifications(snap.size);
      } catch {
        setNotifications(0);
      }
    };
    void load();
  }, []);

  // ⏳ auth loading
  if (loading) return null;

  // 🔒 admin only
  if (!user || role !== "admin") return null;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      localStorage.setItem("admin_sidebar_collapsed", (!prev).toString());
      return !prev;
    });
  };

  const logout = async () => {
    if (!window.confirm("Logout?")) return;
    try {
      await signOut(auth);
      void navigate("/admin/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#fafafa" }}>
      <CssBaseline />

      {/* ================= TOP BAR ================= */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: "linear-gradient(to right, #FE0944, #FE7E6D)",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton color="inherit" onClick={toggleSidebar}>
              <MenuIcon />
            </IconButton>
            <Typography fontWeight="bold">SunRed | Admin</Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ bgcolor: "#fff", color: "#FE0944" }}>
                {user.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => navigate("/admin/advanced-settings")}>
                Settings
              </MenuItem>
              <MenuItem onClick={logout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ================= SIDEBAR ================= */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? 70 : drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: collapsed ? 70 : drawerWidth,
            transition: "0.3s",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <Divider />

        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                justifyContent: collapsed ? "center" : "flex-start",
                py: 1.3,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40 }}>
                {item.icon}
              </ListItemIcon>

              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              )}
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* ================= CONTENT ================= */}
      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          width: `calc(100% - ${collapsed ? 70 : drawerWidth}px)`,
        }}
      >
        <Outlet />
      </Box>

      {/* ================= BOTTOM NAV (ADMIN ONLY) ================= */}
      <BottomNavGlass />
    </Box>
  );
};

export default AdminLayout;