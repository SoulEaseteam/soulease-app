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

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Translate, Key, SignOut, CaretLeft, CaretRight } from "phosphor-react";

import { auth } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useAccountDialogs } from "@/components/account/useAccountDialogs";

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

      {dialogs}
    </Box>
  );
};

export default TherapistSettingsPage;
