// src/components/therapist/detail/TherapistInfoSheet.tsx
//
// 🎨 Phase 4 — Bottom-sheet host for the Verified Profile + Reviews tabs.
//
// User feedback: the inline TherapistProfileTabs section was still
// taking too much vertical space on the detail page. Move it behind
// tap-to-open StatsCard cells:
//
//   ★ 4.5 (0 reviews)  →  opens this sheet on the "Reviews" tab
//   8 yrs / Experience →  opens this sheet on the "Profile" tab
//   98% Rebook         →  opens this sheet on the "Profile" tab
//
// The sheet content is just <TherapistProfileTabs/> — no design dup.
// The sheet itself reuses the same scroll + drag-handle layout as
// ServiceDurationSheet so the patterns stay consistent.

import React, { useEffect, useState } from "react";
import { Drawer, Box, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TherapistProfileTabs from "@/components/therapist/detail/TherapistProfileTabs";

type TabId = "profile" | "reviews";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Which tab to land on when opened. Defaults to "profile". */
  initialTab?: TabId;
  /** Forwarded straight into TherapistProfileTabs. */
  data: React.ComponentProps<typeof TherapistProfileTabs>;
}

const TherapistInfoSheet: React.FC<Props> = ({
  open,
  onClose,
  initialTab = "profile",
  data,
}) => {
  // Track which tab the sheet should focus when re-opened. Internal
  // state lives in TherapistProfileTabs, so we re-mount that subtree
  // (key={tab}) to make the prop change effective on each open.
  const [tab, setTab] = useState<TabId>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

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
      {/* Drag handle row + close button */}
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

      {/* Content — re-mount on tab change so initialTab takes effect */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <TherapistProfileTabs key={tab} initialTab={tab} {...data} />
      </Box>
    </Drawer>
  );
};

export default TherapistInfoSheet;
