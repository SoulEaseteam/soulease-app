import React from "react";
import { Drawer, ListItemButton, ListItemIcon, ListItemText, Toolbar, Chip } from "@mui/material";
import { Dashboard, People, EventNote, RateReview, Assessment, Logout, BeachAccess } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/lib/firebase";

const menu = [
  { label: "Dashboard", icon: <Dashboard />, path: "/admin/dashboard" },
  { label: "Therapists", icon: <People />, path: "/admin/therapists" },
  // Live status toggle — เปิด/ปิด availability ของพนักงาน real-time
  { label: "Status / Holiday", icon: <BeachAccess />, path: "/admin/holiday", live: true },
  { label: "Bookings", icon: <EventNote />, path: "/admin/bookings" },
  { label: "Reviews", icon: <RateReview />, path: "/admin/reviews" },
  { label: "Reports", icon: <Assessment />, path: "/admin/reports" },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const logout = async () => {
    await auth.signOut();
    navigate("/admin/login");
  };

  return (
    <Drawer variant="permanent" sx={{ "& .MuiDrawer-paper": { width: 240 } }}>
      <Toolbar />
      {menu.map((m) => (
        <ListItemButton
          key={m.path}
          selected={pathname.startsWith(m.path)}
          onClick={() => navigate(m.path)}
        >
          <ListItemIcon>{m.icon}</ListItemIcon>
          <ListItemText primary={m.label} />
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
      ))}

      <ListItemButton onClick={logout}>
        <ListItemIcon><Logout /></ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </Drawer>
  );
}