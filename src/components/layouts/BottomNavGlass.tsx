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
// 🆕 Round 28b37 — match SunRed brand theme.
import { brand, fonts } from "@/theme";

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

  // 🆕 Round 28b37 (founder 2026-05-04) — Show on EVERY page.
  //   Previously hidden on /booking/* to avoid overlap with sticky
  //   Confirm CTAs, but with the new edge-anchored auto-hide design
  //   (slides down on scroll-down) the conflict disappears: customer
  //   scrolling toward the booking CTA naturally pushes the nav
  //   off-screen. Founder direction: "มีทุกหน้า ทั้งโปรเจค".

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
        // 🆕 Round 28b37 — Edge-anchored bottom nav (Tinder / Instagram
        //   style). Slides down off-screen when user scrolls down,
        //   slides back up on scroll-up. Respects safe-area-inset for
        //   iPhones with home-bar gesture area.
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        transform: showNav ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        pointerEvents: showNav ? "auto" : "none",
      }}
    >
      <Paper
        elevation={14}
        sx={{
          pointerEvents: "auto",
          position: "relative",
          // 🌅 Round 28b37 — SunRed brand glass: warm cream base with
          //   subtle red→coral wash so the active tab's red accent
          //   pops without screaming. Top hairline = brand red glow.
          background:
            "linear-gradient(180deg, rgba(255, 251, 248, 0.94) 0%, rgba(255, 245, 240, 0.94) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: `1px solid ${brand.red}20`,
          borderLeft: "1px solid rgba(255, 255, 255, 0.6)",
          borderRight: "1px solid rgba(255, 255, 255, 0.6)",
          borderBottom: "none",
          boxShadow:
            "0 -10px 28px rgba(254, 9, 68, 0.10), 0 -2px 6px rgba(60, 30, 20, 0.04)",
          borderRadius: "22px 22px 0 0",
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
            fontFamily: fonts.body,
            // 🌸 Round 28b37 — Brand-red active state with coral
            //   underline accent. Ripple toned down for serif feel.
            "& .Mui-selected": {
              color: brand.red,
              fontWeight: 700,
              transform: "scale(1.08)",
            },
            "& .MuiBottomNavigationAction-root": {
              color: "rgba(60, 30, 20, 0.60)",
              transition: "color 0.2s ease, transform 0.2s ease",
              fontFamily: fonts.body,
              "&:hover": {
                color: brand.coral,
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontFamily: fonts.body,
              fontSize: "11px !important",
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginTop: "2px",
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