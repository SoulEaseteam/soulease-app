// src/components/common/FloatingLanguageSwitcher.tsx
//
// 🌐 Floating language switcher — visible เสมอ ตอนเข้าเว็บ
// ลูกค้าต่างชาติ (90%) เปลี่ยนภาษาได้ง่ายโดยไม่ต้องไปหา nav
//
// Style: glass pill bottom-right, expand เป็นแถวเมื่อกด

import React, { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import LanguageIcon from "@mui/icons-material/Language";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useTranslation } from "react-i18next";

interface LangOption {
  code: string;
  label: string;
  flag: string; // emoji flag
  native: string;
}

const LANGS: LangOption[] = [
  { code: "en", label: "English", flag: "🇬🇧", native: "EN" },
  { code: "th", label: "ไทย", flag: "🇹🇭", native: "TH" },
  { code: "zh", label: "中文", flag: "🇨🇳", native: "中" },
  { code: "ja", label: "日本語", flag: "🇯🇵", native: "日" },
  { code: "ko", label: "한국어", flag: "🇰🇷", native: "한" },
];

const FloatingLanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = (i18n.language || "en").split("-")[0].toLowerCase();
  const currentLang = LANGS.find((l) => l.code === current) ?? LANGS[0];

  const handleSelect = async (code: string) => {
    await i18n.changeLanguage(code);
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        // อยู่ใต้ FloatingNavBar ที่ฝั่งบน — มุมล่างขวา เหนือ bottom nav
        right: 14,
        bottom: 96,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        pointerEvents: "none", // ให้กดทะลุพื้นหลัง — แต่ children = auto
        "& > *": { pointerEvents: "auto" },
      }}
      aria-label="Language selector"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            {LANGS.map((l) => {
              const isActive = l.code === current;
              return (
                <Tooltip
                  key={l.code}
                  title={l.label}
                  placement="left"
                  arrow
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => void handleSelect(l.code)}
                    aria-label={`Switch to ${l.label}`}
                    aria-pressed={isActive}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      backgroundColor: isActive
                        ? "rgba(255, 214, 232, 0.95)"
                        : "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(10px)",
                      boxShadow: isActive
                        ? "0 6px 18px rgba(225, 29, 72, 0.25)"
                        : "0 4px 12px rgba(0,0,0,0.08)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.07)",
                      },
                    }}
                  >
                    {isActive ? (
                      <span style={{ position: "relative" }}>
                        {l.flag}
                        <CheckRoundedIcon
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            fontSize: 14,
                            color: "#E11D48",
                            backgroundColor: "white",
                            borderRadius: "50%",
                          }}
                        />
                      </span>
                    ) : (
                      l.flag
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle pill */}
      <IconButton
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close language menu" : "Open language menu"}
        aria-expanded={open}
        sx={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, #FFE5D9 0%, #FFD6E8 50%, #E5D0FF 100%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 22px rgba(225, 29, 72, 0.18)",
          backdropFilter: "blur(12px)",
          color: "#7E1F4D",
          fontWeight: 700,
          fontSize: 16,
          gap: 0.4,
          flexDirection: "column",
          "&:hover": {
            transform: "scale(1.06)",
            background:
              "linear-gradient(135deg, #FFD6E8 0%, #E5D0FF 50%, #D4F4E2 100%)",
          },
          transition: "all 0.25s ease",
        }}
      >
        {open ? (
          <LanguageIcon sx={{ fontSize: 22 }} />
        ) : (
          <>
            <span style={{ fontSize: 14, lineHeight: 1, letterSpacing: 0.5 }}>
              {currentLang.native}
            </span>
            <LanguageIcon sx={{ fontSize: 12, opacity: 0.7 }} />
          </>
        )}
      </IconButton>
    </Box>
  );
};

export default FloatingLanguageSwitcher;
