import React, { useEffect, useState } from "react";
import { BottomNavigation, BottomNavigationAction, Paper, Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { UserCircle } from "phosphor-react";
import { FaRegHeart, FaRegFileAlt } from "react-icons/fa";
import { SpaOutlined } from "@mui/icons-material";
import { useAuth } from "@/providers/AuthProvider";

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowNav(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleChange = (_: any, newValue: string) => {
    if (newValue === "/profile") {
      if (!user) navigate("/login");
      else if (role === "therapist") navigate("/therapist/profile");
      else if (role === "admin") navigate("/admin/dashboard");
      else navigate("/profile");
    } else navigate(newValue);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 1200,
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          pointerEvents: "auto",
          position: "relative",
          bottom: showNav ? 0 : "-100px",
          transition: "bottom 0.4s ease",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(10px)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <BottomNavigation
          value={location.pathname}
          onChange={handleChange}
          showLabels
          sx={{
            "& .MuiBottomNavigationAction-root": {
              color: "#aaa",
              transition: "color 0.3s, transform 0.2s",
            },
            "& .Mui-selected": {
              color: "#bdbdbd", // ✅ ใช้สีเดียว (เขียว)
              transform: "scale(1.1)",
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.8rem",
              fontWeight: 500,
            },
          }}
        >
          <BottomNavigationAction label="นักบำบัด" value="/" icon={<FaRegHeart size={24} />} />
          <BottomNavigationAction label="บริการ" value="/services" icon={<SpaOutlined sx={{ fontSize: 26 }} />} />
          <BottomNavigationAction label="คำสั่ง" value="/booking/history" icon={<FaRegFileAlt size={24} />} />
          <BottomNavigationAction label="โปรไฟล์" value="/profile" icon={<UserCircle size={26} />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default BottomNav;