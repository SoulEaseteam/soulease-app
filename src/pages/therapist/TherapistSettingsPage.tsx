// src/pages/therapist/TherapistSettingsPage.tsx
//
// 🆕 Round 28x.78 (founder: "settings ... มี Change password Language sign out ·
//   Notifications เอาออก") — the practitioner's account settings, styled after
//   the reference screenshot she sent.
//
//   Deliberately just three things: Language, Change password, Sign out. The
//   customer /profile carried Notifications, Discount Codes, Saved Therapists,
//   a Contact-Concierge row — none of which is a practitioner's. This is why
//   the PROFILE tab no longer routes staff through /profile at all.

import React, { useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Translate, Key, SignOut, CaretLeft, CaretRight, Warning, Sun, Moon, CircleHalf, BookOpen } from "phosphor-react";

import { auth } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useAccountDialogs } from "@/components/account/useAccountDialogs";
import { whatsappDeepLink } from "@/config/concierge";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/components/common/DayNightSync";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";
const DANGER = "#C0562E";

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}> = ({ icon, label, value, onClick }) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1.75,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
      "&:active": { background: "var(--sr-panel-2)" },
    }}
  >
    <Box sx={{ color: ROSE, display: "flex" }}>{icon}</Box>
    <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--sr-ink)" }}>
      {label}
    </Typography>
    {value && (
      <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-muted)" }}>
        {value}
      </Typography>
    )}
    <CaretRight size={16} color="var(--sr-dim)" />
  </Box>
);

const TherapistSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeLangLabel, openLanguage, openPassword, dialogs } = useAccountDialogs();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 🆕 Round 28x.106 (founder: "หน้าโปรไฟล์เพิ่มโหมดมืดสว่าง เผื่อพนักงานอยาก
  //   เปลี่ยนเอง") — DayNightSync already supported a manual override via
  //   ?theme=/localStorage, nothing in the app ever exposed it as a real
  //   control. This is that control.
  //
  // 🆕 Round 28x.111 (founder: "ธีมหน้าจอ · Display เอาไปไว้ใน ตั้งค่า") —
  //   moved here verbatim from TherapistProfilePage, which had grown a
  //   Working Status card + Working Hours card + this — Settings is where
  //   a display preference belongs, not stacked under Profile.
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>(() => getThemeChoice());
  const applyTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    setThemeChoiceState(choice);
  };

  const logout = async () => {
    await signOut(auth);
    void navigate("/staff");
  };

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 8 }}>
      {/* Header row — back + centred title, like the reference. */}
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate("/therapist/profile")} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          Settings
        </Typography>
      </Box>

      <Box
        sx={{
          mx: 2,
          mt: 1,
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          overflow: "hidden",
          "& > *:not(:last-child)": { borderBottom: "1px solid var(--sr-hairline)" },
        }}
      >
        <Row
          icon={<Translate size={20} weight="duotone" />}
          label="Language · ภาษา"
          value={activeLangLabel}
          onClick={openLanguage}
        />
        <Row
          icon={<Key size={20} weight="duotone" />}
          label="Change password · เปลี่ยนรหัสผ่าน"
          onClick={openPassword}
        />
        {/* 🆕 Round 28x.121 (founder: "ขอข้อความอธิบายการใช้งานแต่ละฟังก์ชัน") —
            the in-app manual. Lives here rather than as a 9th Home tile so the
            quick-menu grid stays the things she uses daily. */}
        <Row
          icon={<BookOpen size={20} weight="duotone" />}
          label="วิธีใช้งาน · How to use"
          onClick={() => navigate("/therapist/guide")}
        />
      </Box>

      {/* ธีมหน้าจอ · Display — manual light/dark override. Auto follows the
          Bangkok clock (06:00–17:59 = day) same as everywhere else; Light/
          Dark pin it regardless of time. Moved here from Profile, 28x.111. */}
      <Box sx={{ px: 2, mt: 2.5 }}>
        <Box
          sx={{
            borderRadius: "18px",
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
            p: "14px 16px 16px",
          }}
        >
          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)", mb: 1.25 }}>
            ธีมหน้าจอ · Display
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {(
              [
                { key: "auto" as ThemeChoice, label: "Auto", Icon: CircleHalf },
                { key: "day" as ThemeChoice, label: "Light", Icon: Sun },
                { key: "night" as ThemeChoice, label: "Dark", Icon: Moon },
              ]
            ).map(({ key, label, Icon }) => {
              const active = themeChoice === key;
              return (
                <Box
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => applyTheme(key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") applyTheme(key); }}
                  sx={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                    py: 1.25, borderRadius: "12px", cursor: "pointer",
                    background: active ? "linear-gradient(135deg, #E0708F, #B23A63)" : "#E0708F12",
                    border: active ? "1px solid #B23A63" : "1px solid #E0708F40",
                    color: active ? "#fff" : "var(--sr-ink)",
                  }}
                >
                  <Icon size={19} weight={active ? "fill" : "regular"} />
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "inherit" }}>
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-muted)", mt: 1.25, lineHeight: 1.4 }}>
            Auto เปลี่ยนตามเวลากรุงเทพ (06:00–18:00 = สว่าง) — เลือก Light/Dark เพื่อล็อกไว้เอง
          </Typography>
        </Box>
      </Box>

      {/* Log Out — full-width, tinted danger, matching the reference. */}
      <Box sx={{ px: 2, mt: 4 }}>
        <Button
          fullWidth
          onClick={() => void logout()}
          startIcon={<SignOut size={18} weight="bold" />}
          sx={{
            py: 1.5,
            borderRadius: "14px",
            textTransform: "none",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 15,
            color: DANGER,
            background: "rgba(192,86,46,0.10)",
            border: "1px solid rgba(192,86,46,0.30)",
            "&:hover": { background: "rgba(192,86,46,0.16)" },
          }}
        >
          Log Out · ออกจากระบบ
        </Button>
      </Box>

      {/* 🆕 28x.82 (founder reference screenshot: "⚠ ลบบัญชี") — REQUEST, not
          self-service. The reference app deletes instantly and irreversibly;
          that's the wrong default here — a therapist's account carries
          booking history, reviews and payout records that are business
          records, not just hers to erase. Same pattern this codebase already
          uses for "ลืมรหัสผ่าน" (28w.77): no self-serve flow, straight to the
          concierge who actually performs it. */}
      <Box sx={{ px: 2, mt: 3, textAlign: "center" }}>
        <Button
          onClick={() => setConfirmDelete(true)}
          startIcon={<Warning size={15} weight="bold" />}
          sx={{
            textTransform: "none",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 13,
            color: DANGER,
            opacity: 0.85,
          }}
        >
          ลบบัญชี · Delete account
        </Button>
      </Box>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 19, color: "var(--sr-ink)" }}>
          ลบบัญชี
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-body)", lineHeight: 1.65 }}>
            การลบบัญชีเป็นการถาวรและไม่สามารถย้อนกลับได้ ต้องให้แอดมินเป็นผู้ดำเนินการ
            กดปุ่มด้านล่างเพื่อส่งคำขอผ่าน WhatsApp — แอดมินจะติดต่อกลับเพื่อยืนยันก่อนลบจริง
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDelete(false)} sx={{ color: "var(--sr-muted)", fontFamily: SANS }}>
            ยกเลิก
          </Button>
          <Button
            href={whatsappDeepLink("สวัสดีค่ะ ฉันต้องการขอลบบัญชีพนักงานของฉัน รบกวนดำเนินการให้ด้วยค่ะ")}
            target="_blank"
            rel="noopener"
            onClick={() => setConfirmDelete(false)}
            sx={{
              textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2.5,
              background: DANGER, color: "#fff", "&:hover": { background: "#A8481F" },
            }}
          >
            ส่งคำขอทาง WhatsApp
          </Button>
        </DialogActions>
      </Dialog>

      {dialogs}
    </Box>
  );
};

export default TherapistSettingsPage;
