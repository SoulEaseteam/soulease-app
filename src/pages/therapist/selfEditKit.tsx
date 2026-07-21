// src/pages/therapist/selfEditKit.tsx
//
// 🆕 Round 28x.96 — shared chrome for the therapist self-service edit pages
// (Services / Features / Languages / Bio / Payout): back button + centered
// title + save button + dirty/saving state, styled to match
// TherapistSettingsPage's header pattern. Each page still owns its own
// field state and Firestore write — this only avoids repeating the same
// header/save-button boilerplate five times.

import React from "react";
import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CaretLeft, FloppyDisk } from "phosphor-react";
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

export const selfEditSans = SANS;
export const selfEditSerif = SERIF;

export const SelfEditShell: React.FC<{
  title: string;
  loading: boolean;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  note?: string;
  toast: { msg: string; severity: "success" | "error" } | null;
  onToastClose: () => void;
}> = ({ title, loading, children, onSave, saving, dirty, note, toast, onToastClose }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 10 }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate("/therapist/home")} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          {title}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress sx={{ color: "#E0708F" }} />
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          {note && (
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-muted)", lineHeight: 1.5, mb: 2 }}>
              {note}
            </Typography>
          )}
          <Box
            sx={{
              background: "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 45%, var(--sr-panel) 100%)",
              border: "1px solid rgba(194,24,91,0.20)",
              borderRadius: 3,
              padding: "16px",
              boxShadow: "0 8px 22px rgba(194,24,91,0.10)",
            }}
          >
            {children}
          </Box>
          <Button
            onClick={onSave}
            disabled={!dirty || saving}
            fullWidth
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <FloppyDisk size={16} weight="bold" />}
            sx={{
              mt: 2,
              py: 1.4,
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              background: "linear-gradient(135deg, #E0708F, #B23A63)",
              boxShadow: "0 6px 16px rgba(194,24,91,0.30)",
              "&:hover": { boxShadow: "0 6px 16px rgba(194,24,91,0.30)" },
              "&.Mui-disabled": { background: "var(--sr-panel-2)", color: "var(--sr-dim)", boxShadow: "none" },
            }}
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={2400} onClose={onToastClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert onClose={onToastClose} severity={toast.severity} variant="filled" sx={{ fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};
