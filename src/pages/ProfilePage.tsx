import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Switch,
} from "@mui/material";
import {
  Edit,
  Notifications,
  Favorite,
  Event,
  Stars,
  AdminPanelSettings,
  Logout,
  DarkMode,
  LightMode,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../providers/AuthProvider";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = user?.role;

  // ✅ จำสถานะ Dark Mode ไว้ใน localStorage
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem("darkMode") === "true"
  );

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const handleLogout = async () => {
    await logout?.();
    localStorage.removeItem("token");
    alert("You have been logged out!");
    navigate("/login");
  };

  // ✅ เมนูตาม Role
  const renderMenuItems = () => {
    switch (role) {
      case "user":
        return (
          <>
            <ListItem button onClick={() => navigate("/edit-profile")}>
              <ListItemIcon>
                <Edit />
              </ListItemIcon>
              <ListItemText primary="Edit Profile" />
            </ListItem>
            <ListItem button onClick={() => navigate("/notifications")}>
              <ListItemIcon>
                <Notifications />
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
            <ListItem button onClick={() => navigate("/saved")}>
              <ListItemIcon>
                <Favorite />
              </ListItemIcon>
              <ListItemText primary="Favourites" />
            </ListItem>
            <ListItem button onClick={() => navigate("/booking/history")}>
              <ListItemIcon>
                <Event />
              </ListItemIcon>
              <ListItemText primary="My Bookings" />
            </ListItem>
          </>
        );
      case "therapist":
        return (
          <>
            <ListItem button onClick={() => navigate("/edit-profile")}>
              <ListItemIcon>
                <Edit />
              </ListItemIcon>
              <ListItemText primary="Edit Profile" />
            </ListItem>
            <ListItem button onClick={() => navigate("/notifications")}>
              <ListItemIcon>
                <Notifications />
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
            <ListItem button onClick={() => navigate("/my-bookings")}>
              <ListItemIcon>
                <Event />
              </ListItemIcon>
              <ListItemText primary="My Booking Schedule" />
            </ListItem>
            <ListItem button onClick={() => navigate("/reviews")}>
              <ListItemIcon>
                <Stars />
              </ListItemIcon>
              <ListItemText primary="My Reviews" />
            </ListItem>
          </>
        );
      case "admin":
        return (
          <>
            <ListItem button onClick={() => navigate("/admin")}>
              <ListItemIcon>
                <AdminPanelSettings />
              </ListItemIcon>
              <ListItemText primary="Admin Dashboard" />
            </ListItem>
            <ListItem button onClick={() => navigate("/notifications")}>
              <ListItemIcon>
                <Notifications />
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
          </>
        );
      default:
        return null;
    }
  };

  const pageBg = darkMode ? "#121212" : "#f5f5f5";
  const paperBg = darkMode ? "#1e1e1e" : "#fff";
  const textColor = darkMode ? "#fff" : "#000";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: pageBg,
        p: 2,
        pt: 8,
        pb: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.3s",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 3,
          overflow: "hidden",
          textAlign: "center",
          pb: 3,
          backgroundColor: paperBg,
          color: textColor,
        }}
      >
        {/* ✅ ส่วนหัว */}
        <Box sx={{ position: "relative", height: 130, background: "#1976d2" }}>
          <Avatar
            src={user?.image || "/images/massage/user.png"}
            sx={{
              width: 120,
              height: 120,
              position: "absolute",
              bottom: -40,
              left: "50%",
              transform: "translateX(-50%)",
              border: "4px solid #fff",
            }}
          />
        </Box>

        {/* ✅ ชื่อผู้ใช้ */}
        <Box mt={8}>
          <Typography variant="h6" fontWeight="bold">
            {user?.username || "My Profile"}
          </Typography>
          <Typography variant="body2" sx={{ color: darkMode ? "#aaa" : "#555" }}>
            {role === "therapist"
              ? "Therapist Account"
              : role === "admin"
              ? "Administrator"
              : "Customer"}
          </Typography>
        </Box>

        <List>{renderMenuItems()}</List>
        <Divider sx={{ my: 1 }} />

        {/* ✅ Toggle Dark Mode */}
        <ListItem>
          <ListItemIcon>{darkMode ? <DarkMode /> : <LightMode />}</ListItemIcon>
          <ListItemText primary="Dark Mode" />
          <Switch checked={darkMode} onChange={() => setDarkMode((prev) => !prev)} />
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {/* ✅ Logout */}
        <ListItem button onClick={handleLogout}>
          <ListItemIcon sx={{ color: "#B00020" }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Paper>

      <BottomNav />
    </Box>
  );
};

export default ProfilePage;