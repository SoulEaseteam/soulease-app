// src/components/common/DevPrivacyToggle.tsx
//
// 👁️  Dev Privacy Mode — สำหรับ "ผู้เขียนระบบ" ที่เอางานออกมาทำนอกสถานที่
//
// ปัญหา: ทำงานคาเฟ่/รถไฟ → คนข้างๆ เห็นจอแล้วเห็นรูปนางแบบ ลำบากใจ
//
// วิธีใช้:
//   - คลิกไอคอน 👁️ มุมขวาบน → blur รูปทั้งเว็บทันที
//   - หรือกด Cmd/Ctrl + Shift + B
//   - ค่าจะถูกจำใน localStorage → reload ก็ยัง blur ต่อ
//   - ปิด blur ด้วยวิธีเดียวกัน
//
// CSS:
//   - body.dev-blur img         → blur(20px)
//   - body.dev-blur [role=img]  → blur(20px)
//   - ยกเว้น icon/logo/star (alt มี "icon"/"logo"/"star")
//
// หมายเหตุ: ทำงานเฉพาะ device นี้ (localStorage local) — ไม่กระทบ user คนอื่น

import React, { useCallback, useEffect, useState } from "react";
import { Box, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const STORAGE_KEY = "sunred:dev-blur";
const CSS_CLASS = "dev-blur";

/** Apply / remove the body class */
function applyBodyClass(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) {
    document.body.classList.add(CSS_CLASS);
  } else {
    document.body.classList.remove(CSS_CLASS);
  }
}

const DevPrivacyToggle: React.FC = () => {
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  // sync to body + localStorage whenever changed
  useEffect(() => {
    applyBodyClass(active);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, active ? "1" : "0");
    }
  }, [active]);

  // ⌨️ Keyboard shortcut — Cmd/Ctrl + Shift + B
  const toggle = useCallback(() => setActive((v) => !v), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === "B" || e.key === "b")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <>
      {/* 🌐 Global CSS for blur — only renders once */}
      <style>{`
        body.${CSS_CLASS} img:not([alt*="icon" i]):not([alt*="logo" i]):not([alt*="star" i]):not([alt*="badge" i]):not([alt*="flag" i]),
        body.${CSS_CLASS} [role="img"]:not([aria-label*="icon" i]):not([aria-label*="logo" i]):not([aria-label*="star" i]):not([aria-label*="badge" i]):not([aria-label*="flag" i]) {
          filter: blur(22px) saturate(0.5) !important;
          transition: filter 0.25s ease !important;
        }
        body.${CSS_CLASS} .MuiAvatar-img {
          filter: blur(22px) saturate(0.5) !important;
        }
        /* Subtle indicator — top edge glow */
        body.${CSS_CLASS}::before {
          content: "👁️ Privacy blur · Cmd+Shift+B";
          position: fixed;
          top: 0; left: 0; right: 0;
          background: linear-gradient(90deg, rgba(255, 214, 232, 0.95), rgba(229, 208, 255, 0.95));
          color: #7E1F4D;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-align: center;
          padding: 3px 8px;
          z-index: 9999;
          border-bottom: 1px solid rgba(255, 255, 255, 0.6);
          pointer-events: none;
        }
      `}</style>

      <Tooltip
        title={
          active
            ? "Privacy blur ON · click or Cmd+Shift+B to disable"
            : "Privacy blur · hide photos when working in public (Cmd+Shift+B)"
        }
        placement="bottom"
        arrow
      >
        <Box
          component="button"
          type="button"
          onClick={toggle}
          aria-label={active ? "Disable privacy blur" : "Enable privacy blur"}
          aria-pressed={active}
          sx={{
            position: "fixed",
            top: active ? 26 : 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            backgroundColor: active
              ? "rgba(229, 208, 255, 0.95)"
              : "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(10px)",
            color: active ? "#7E1F4D" : "rgba(60, 60, 80, 0.5)",
            boxShadow: active
              ? "0 4px 14px rgba(99, 102, 241, 0.25)"
              : "0 2px 6px rgba(0, 0, 0, 0.06)",
            transition: "all 0.25s ease",
            "&:hover": {
              transform: "scale(1.08)",
              backgroundColor: active
                ? "rgba(229, 208, 255, 1)"
                : "rgba(255, 255, 255, 0.85)",
              color: active ? "#5B0E3D" : "rgba(60, 60, 80, 0.85)",
            },
          }}
        >
          {active ? (
            <VisibilityOffIcon sx={{ fontSize: 16 }} />
          ) : (
            <VisibilityIcon sx={{ fontSize: 16 }} />
          )}
        </Box>
      </Tooltip>
    </>
  );
};

export default DevPrivacyToggle;
