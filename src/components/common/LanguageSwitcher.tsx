// src/components/common/LanguageSwitcher.tsx
// Compact language switcher — แสดงในเฮดเดอร์/นาวบาร์
// Asian-first audience: TH/EN/ZH/JA/KO/RU
import React, { useState, useRef, useEffect } from "react";
import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/app/i18n";

interface Props {
  // "compact" = ไอคอนเล็ก (สำหรับ navbar)
  // "expanded" = ปุ่มยาวๆ พร้อมข้อความ (สำหรับ hero)
  variant?: "compact" | "expanded";
  // สี — defaults match brand on dark/gradient bg
  color?: "light" | "dark";
}

const LanguageSwitcher: React.FC<Props> = ({
  variant = "compact",
  color = "light",
}) => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language.split("-")[0]) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    // อัปเดต URL ด้วย ?lang=xx เพื่อ SEO และ shareable
    const url = new URL(window.location.href);
    url.searchParams.set("lang", code);
    window.history.replaceState({}, "", url.toString());
    setAnchorEl(null);
  };

  const fg = color === "light" ? "#fff" : "#0F172A";
  const bg = color === "light" ? "rgba(255,255,255,0.18)" : "#fff";
  const border =
    color === "light" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.08)";

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          minWidth: 0,
          px: variant === "expanded" ? 1.6 : 1.1,
          py: 0.6,
          borderRadius: 99,
          color: fg,
          background: bg,
          border: `1px solid ${border}`,
          backdropFilter: "blur(8px)",
          textTransform: "none",
          fontSize: 13,
          fontWeight: 600,
          gap: 0.6,
          "&:hover": {
            background:
              color === "light" ? "rgba(255,255,255,0.28)" : "#F8FAFC",
          },
        }}
        startIcon={
          variant === "expanded" ? <Globe size={16} /> : null
        }
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{current.flag}</span>
        {variant === "expanded" && (
          <span style={{ marginLeft: 4 }}>{current.label}</span>
        )}
        <ChevronDown size={14} />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 3,
              minWidth: 180,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              overflow: "hidden",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid #F1F5F9" }}>
          <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
            Language · 语言 · 言語
          </Typography>
        </Box>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang.code === current.code;
          return (
            <MenuItem
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              sx={{
                px: 2,
                py: 1.2,
                gap: 1.5,
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? "#FE0944" : "#0F172A",
                background: active ? "rgba(254,9,68,0.06)" : "transparent",
                "&:hover": { background: "#F8FAFC" },
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</span>
              <span style={{ flex: 1 }}>{lang.label}</span>
              {active && <Check size={16} color="#FE0944" />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
