// src/layouts/AdminLayout.tsx
import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, CssBaseline, Box, Avatar, Badge,
  Menu, MenuItem, Tooltip
} from "@mui/material";
import {
  Menu as MenuIcon, Notifications as NotificationsIcon,
  Dashboard as DashboardIcon, People as UserIcon, Spa as TherapistIcon,
  EventNote as BookingIcon, Star as ReviewIcon, BarChart as ReportIcon,
  Settings as SettingsIcon, Add as AddAdminIcon, Map as MapIcon
} from "@mui/icons-material";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebase";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Outlet } from "react-router-dom";
import ListAltIcon from "@mui/icons-material/ListAlt";

const drawerWidth = 240;

const menuItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <DashboardIcon /> },
  { label: "Reports", path: "/admin/reports", icon: <ReportIcon /> },
  { label: "Therapists", path: "/admin/therapists", icon: <TherapistIcon /> },
  { label: "Users", path: "/admin/users", icon: <UserIcon /> },
  { label: "Bookings", path: "/admin/bookings", icon: <BookingIcon /> },
  { label: "Reviews", path: "/admin/reviews", icon: <ReviewIcon /> },
  { label: "Notifications", path: "/admin/notifications", icon: <NotificationsIcon /> },
  { label: "Settings", path: "/admin/settings", icon: <SettingsIcon /> },
  { label: "Add Admin", path: "/admin/add-admin", icon: <AddAdminIcon /> },
  { label: "Map", path: "/admin/map", icon: <MapIcon /> },
  { label: "Pages List", path: "/admin/pages-list", icon: <ListAltIcon /> },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ state สำหรับ Sidebar
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });

  // ✅ state สำหรับแจ้งเตือน
  const [notifications, setNotifications] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const snapshot = await getDocs(collection(db, "notifications"));
      setNotifications(snapshot.docs.length);
    };
    fetchNotifications();
  }, []);

  const handleCollapseToggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("admin_sidebar_collapsed", (!prev).toString());
      return !prev;
    });
  };

  const handleAvatarMenu = (e: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: "linear-gradient(to right, #6a11cb, #2575fc)", // ✅ Fix background
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton color="inherit" edge="start" onClick={handleCollapseToggle}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" ml={1}>
              Soulease Spa - Admin
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Tooltip title="Notifications">
              <IconButton color="inherit" component={Link} to="/admin/notifications">
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton onClick={handleAvatarMenu}>
              <Avatar sx={{ bgcolor: "#4f46e5" }}>A</Avatar>
            </IconButton>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
              <MenuItem onClick={() => navigate("/admin/settings")}>Settings</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? 70 : drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: collapsed ? 70 : drawerWidth,
            transition: "width 0.3s",
          },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menuItems.map(({ label, path, icon }) => (
            <ListItemButton
              key={path}
              component={Link}
              to={path}
              selected={location.pathname === path}
              sx={{ justifyContent: collapsed ? "center" : "flex-start" }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40 }}>{icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={label} />}
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${collapsed ? 70 : drawerWidth}px)`,
          transition: "width 0.3s",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;