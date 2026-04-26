// src/components/admin/AdminSidebar.tsx
// Comprehensive admin nav — exposes ALL admin pages, grouped by purpose
import React from "react";
import {
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Chip,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import {
  Dashboard,
  People,
  EventNote,
  RateReview,
  Assessment,
  Logout,
  BeachAccess,
  AdminPanelSettings,
  PersonAdd,
  Block,
  Notifications,
  Settings,
  TuneRounded,
  GroupAdd,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/lib/firebase";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  live?: boolean;
}
interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", icon: <Dashboard />, path: "/admin/dashboard" },
      { label: "Bookings", icon: <EventNote />, path: "/admin/bookings" },
      {
        label: "Status / Holiday",
        icon: <BeachAccess />,
        path: "/admin/holiday",
        live: true,
      },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Therapists", icon: <People />, path: "/admin/therapists" },
      {
        label: "Add Therapist",
        icon: <PersonAdd />,
        path: "/admin/add-therapist",
      },
      { label: "Customers", icon: <People />, path: "/admin/users" },
      {
        label: "Manage Admins",
        icon: <AdminPanelSettings />,
        path: "/admin/manage-admins",
      },
      { label: "Add Admin", icon: <GroupAdd />, path: "/admin/add-admin" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reviews", icon: <RateReview />, path: "/admin/reviews" },
      { label: "Reports", icon: <Assessment />, path: "/admin/reports" },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Notifications",
        icon: <Notifications />,
        path: "/admin/notifications",
      },
      {
        label: "Blocked Devices",
        icon: <Block />,
        path: "/admin/blocked-devices",
      },
      { label: "Settings", icon: <Settings />, path: "/admin/settings" },
      {
        label: "Advanced",
        icon: <TuneRounded />,
        path: "/admin/advanced-settings",
      },
    ],
  },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const logout = async () => {
    await auth.signOut();
    navigate("/admin/login");
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        "& .MuiDrawer-paper": {
          width: 240,
          borderRight: "1px solid #E5E7EB",
        },
      }}
    >
      <Toolbar>
        <Typography
          sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: 22,
            color: "#FE0944",
          }}
        >
          SUNRED Admin
        </Typography>
      </Toolbar>
      <Divider />

      {menuGroups.map((group, gi) => (
        <Box key={group.title}>
          <Typography
            sx={{
              fontSize: 10,
              letterSpacing: 2,
              color: "#94A3B8",
              fontWeight: 700,
              textTransform: "uppercase",
              px: 2,
              pt: gi === 0 ? 1.5 : 2,
              pb: 0.5,
            }}
          >
            {group.title}
          </Typography>
          {group.items.map((m) => {
            const active = pathname.startsWith(m.path);
            return (
              <ListItemButton
                key={m.path}
                selected={active}
                onClick={() => navigate(m.path)}
                sx={{
                  py: 0.8,
                  "&.Mui-selected": {
                    bgcolor: "rgba(254,9,68,0.08)",
                    borderLeft: "3px solid #FE0944",
                    "& .MuiListItemIcon-root": { color: "#FE0944" },
                    "& .MuiListItemText-primary": {
                      color: "#FE0944",
                      fontWeight: 700,
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{m.icon}</ListItemIcon>
                <ListItemText
                  primary={m.label}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
                {m.live && (
                  <Chip
                    label="LIVE"
                    size="small"
                    sx={{
                      bgcolor: "#10B981",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 9,
                      height: 18,
                      ml: 1,
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </Box>
      ))}

      <Divider sx={{ mt: 2 }} />
      <ListItemButton onClick={logout} sx={{ py: 1.2 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Logout />
        </ListItemIcon>
        <ListItemText
          primary="Logout"
          primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
        />
      </ListItemButton>
    </Drawer>
  );
}
