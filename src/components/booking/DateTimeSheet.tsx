// src/components/booking/DateTimeSheet.tsx
//
// 🎨 Phase 4 — Bottom-sheet wrapper for the StepDateTime picker so the
// detail page can show a compact "Date & time" cell instead of an
// always-expanded date+slot grid that ate ~700px of vertical space.
//
// Layout: drag handle → header → embedded <StepDateTime/> → Confirm CTA
// pinned to bottom. Same scroll + flex pattern as ServiceDurationSheet.

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, Button, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StepDateTime from "@/components/booking/StepDateTime";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  open: boolean;
  onClose: () => void;
  date: string | null;
  time: string | null;
  durationMin: number | null;
  therapistId: string | null;
  /** Called when user taps Confirm — receives the picked date+time. */
  onConfirm: (date: string, time: string) => void;
}

const DateTimeSheet: React.FC<Props> = ({
  open,
  onClose,
  date,
  time,
  durationMin,
  therapistId,
  onConfirm,
}) => {
  // Local draft state — only commits to parent on Confirm tap, so users
  // can dismiss the sheet without saving an accidental tap.
  const [draftDate, setDraftDate] = useState<string | null>(date);
  const [draftTime, setDraftTime] = useState<string | null>(time);

  useEffect(() => {
    if (open) {
      setDraftDate(date);
      setDraftTime(time);
    }
  }, [open, date, time]);

  const canConfirm = !!draftDate && !!draftTime;

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
      {/* Drag handle + close */}
      <Box
        sx={{
          flexShrink: 0,
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

      {/* Header */}
      <Box sx={{ flexShrink: 0, padding: "0 20px 8px" }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 500,
            color: "#3c1e14",
            letterSpacing: "-0.02em",
            "& em": { color: "#FE0944", fontStyle: "italic" },
          }}
        >
          When works <em>for you</em>?
        </Typography>
      </Box>

      {/* Scrollable picker */}
      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        <StepDateTime
          date={draftDate}
          time={draftTime}
          durationMin={durationMin}
          therapistId={therapistId}
          onChange={({ date, time }) => {
            setDraftDate(date);
            setDraftTime(time);
          }}
        />
      </Box>

      {/* Confirm CTA — pinned, gated on date+time */}
      <Box
        sx={{
          flexShrink: 0,
          padding: "12px 20px 0",
          background: "linear-gradient(180deg, transparent, #FCEBDC 30%)",
        }}
      >
        <Button
          fullWidth
          disabled={!canConfirm}
          onClick={() => {
            if (draftDate && draftTime) onConfirm(draftDate, draftTime);
          }}
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
          {canConfirm ? "Confirm time" : "Pick a date and time"}
        </Button>
      </Box>
    </Drawer>
  );
};

export default DateTimeSheet;
