// src/components/nav/BottomNavGlass.tsx
import React, { useEffect, useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
} from "@mui/material";

import { useNavigate, useLocation } from "react-router-dom";
import { UserCircle } from "phosphor-react";
import { FaRegHeart, FaRegFileAlt } from "react-icons/fa";
import { SpaOutlined } from "@mui/icons-material";
import { useAuth } from "@/providers/AuthProvider";

const BottomNavGlass: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const currentTab = (() => {
    if (location.pathname.startsWith("/services")) return "/services";
    if (location.pathname.startsWith("/booking/history")) return "/booking/history";
    if (location.pathname.startsWith("/profile")) return "/profile";
    return "/";
  })();

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setShowNav(y < lastScrollY || y < 10);
      setLastScrollY(y);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleChange = (_event: React.SyntheticEvent, next: string) => {
    // navigate() ใน react-router v7 return Promise<void> — prefix `void` กัน floating
    if (next === "/profile") {
      if (!user) return void navigate("/login");

      if (role === "admin") return void navigate("/admin/dashboard");
      if (role === "therapist") return void navigate("/therapist/profile");

      return void navigate("/profile");
    }

    void navigate(next);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "92%",
        maxWidth: 430,
        zIndex: 2000,
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={14}
        sx={{
          pointerEvents: "auto",
          position: "relative",
          bottom: showNav ? 0 : "-130px",
          transition: "all 0.4s ease",
          // 🌅 Aurora glass — soft peach-pink-lavender tint
          background:
            "linear-gradient(135deg, rgba(255, 245, 240, 0.92) 0%, rgba(255, 240, 248, 0.92) 50%, rgba(247, 240, 255, 0.92) 100%)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.55)",
          boxShadow:
            "0 12px 32px rgba(225, 29, 72, 0.10), 0 6px 16px rgba(99, 102, 241, 0.08)",
          borderRadius: "40px",
          px: 1,
          py: 0.5,
        }}
      >
        <BottomNavigation
          value={currentTab}
          onChange={handleChange}
          showLabels
          sx={{
            background: "transparent",
            // 🌸 Aurora-themed active state
            "& .Mui-selected": {
              color: "#B91C9F", // magenta from Aurora gradient
              fontWeight: 600,
              transform: "scale(1.10)",
            },
            "& .MuiBottomNavigationAction-root": {
              color: "rgba(120, 105, 130, 0.7)",
              transition: "all 0.2s ease",
            },
          }}
        >
          <BottomNavigationAction
            label="Therapists"
            value="/"
            icon={<FaRegHeart size={24} />}
          />
          <BottomNavigationAction
            label="Services"
            value="/services"
            icon={<SpaOutlined sx={{ fontSize: 26 }} />}
          />
          <BottomNavigationAction
            label="History"
            value="/booking/history"
            icon={<FaRegFileAlt size={24} />}
          />
          <BottomNavigationAction
            label="Profile"
            value="/profile"
            icon={<UserCircle size={26} />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default BottomNavGlass;