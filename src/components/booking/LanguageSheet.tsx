// src/components/booking/LanguageSheet.tsx
//
// 🎨 Phase 4 — Bottom sheet for picking the preferred language with
// the therapist. Lifted off the inline form per founder request:
// "v เปิดที่ tab ให้เลือก ทั้ง 3" — Language / Add-ons / Payment all
// move into sheets so the Confirm Order page stays compact.

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, Button, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { LANGUAGE_OPTIONS } from "@/data/bookingExtras";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  open: boolean;
  onClose: () => void;
  value: string; // language code
  onConfirm: (code: string) => void;
}

const LanguageSheet: React.FC<Props> = ({ open, onClose, value, onConfirm }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "430px",
          margin: "0 auto",
          left: 0,
          right: 0,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <SheetHeader title="Preferred language" onClose={onClose} />

      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.6)",
            marginBottom: "14px",
          }}
        >
          We&rsquo;ll match you with a therapist who speaks this language.
        </Typography>
        <Box
          role="radiogroup"
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {LANGUAGE_OPTIONS.map((l) => {
            const isActive = draft === l.code;
            return (
              <Box
                key={l.code}
                role="radio"
                aria-checked={isActive}
                tabIndex={0}
                onClick={() => setDraft(l.code)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setDraft(l.code);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  background: isActive
                    ? "rgba(254, 9, 68, 0.08)"
                    : "rgba(255, 255, 255, 0.7)",
                  border: isActive
                    ? "1.5px solid #FE0944"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                }}
              >
                <Box sx={{ fontSize: "20px" }}>{l.flag}</Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: isActive ? "#FE0944" : "#3c1e14",
                  }}
                >
                  {l.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <SheetCTA
        label="Confirm language"
        onClick={() => onConfirm(draft)}
      />
    </Drawer>
  );
};

// ─── Shared sheet chrome (header + CTA) — kept inline since the 3
//     selection sheets all need the same treatment. Could be extracted
//     to a SheetShell component later if needed.
export const SheetHeader: React.FC<{ title: string; onClose: () => void }> = ({
  title,
  onClose,
}) => (
  <Box sx={{ flexShrink: 0 }}>
    <Box
      sx={{
        position: "relative",
        padding: "10px 0 6px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 4,
          background: "rgba(60, 30, 20, 0.18)",
          borderRadius: "2px",
        }}
      />
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 6,
          right: 12,
          width: 36,
          height: 36,
          color: "rgba(60, 30, 20, 0.55)",
          "&:hover": {
            background: "rgba(60, 30, 20, 0.06)",
            color: "#3c1e14",
          },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
    <Box sx={{ padding: "0 20px 8px" }}>
      <Typography
        component="h2"
        sx={{
          fontFamily: SERIF,
          fontSize: "22px",
          fontWeight: 500,
          color: "#3c1e14",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </Typography>
    </Box>
  </Box>
);

export const SheetCTA: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, onClick, disabled }) => (
  <Box
    sx={{
      flexShrink: 0,
      padding: "12px 20px 0",
      background: "linear-gradient(180deg, transparent, #FCEBDC 30%)",
    }}
  >
    <Button
      fullWidth
      disabled={disabled}
      onClick={onClick}
      sx={{
        height: 50,
        borderRadius: "999px",
        background: "linear-gradient(135deg, #FE0944, #FE7A52)",
        color: "#fff",
        fontFamily: SANS,
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "none",
        boxShadow: "0 6px 20px rgba(254, 9, 68, 0.35)",
        "&:hover": {
          background: "linear-gradient(135deg, #E50840, #E56A47)",
        },
        "&.Mui-disabled": {
          background: "rgba(0, 0, 0, 0.12)",
          color: "rgba(0, 0, 0, 0.35)",
          boxShadow: "none",
        },
      }}
    >
      {label}
    </Button>
  </Box>
);

export default LanguageSheet;
