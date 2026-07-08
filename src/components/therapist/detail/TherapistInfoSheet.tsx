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
//   98% Rebook         →  opens this she et on the "loyalty" tab
//
// The sheet content is just <TherapistProfileTabs/> — no design dup.
// The sheet itself reuses the same scroll + drag-handle layout as
// ServiceDurationSheet so the patterns stay consistent.

import React, { useEffect, useState } from "react";
// Round 28s38 — Swapped Drawer (bottom slide-up) for Dialog
// (centered modal). Founder: "StatsCard กดเเล้วจะเป็น ป๊อบอับ
// กลางจอ" — tap should open a focus modal centred on the screen,
// not a sheet that hugs the bottom edge.
import { Dialog, Box, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TherapistProfileTabs from "@/components/therapist/detail/TherapistProfileTabs";

type TabId = "profile" | "reviews" | "loyalty";

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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      // 🚨 Round 28r65 HOTFIX — same class as ServiceDurationSheet:
      //   MUI Dialog default zIndex (1300) is under BottomNavGlass
      //   (2000), so the bottom of the sheet gets covered by the nav
      //   on mobile. Raise Dialog above the nav.
      sx={{ zIndex: 2100 }}
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(20, 8, 12, 0.55)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          background:
            "#F4F6F5",
          borderRadius: "24px",
          // 🆕 Round 28r52 — Dialog paper widens on tablet/desktop so
          //   the info sheet fills its column at larger viewports.
          maxWidth: { xs: "430px", sm: "560px", md: "640px" },
          width: "calc(100% - 32px)",
          margin: "16px auto",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(20, 8, 12, 0.45)",
        },
      }}
    >
      {/* Close button row — no drag handle on a centered dialog. */}
      <Box
        sx={{
          flexShrink: 0,
          position: "relative",
          padding: "14px 14px 6px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            width: 36,
            height: 36,
            background: "rgba(184, 92, 60, 0.10)",
            color: "#1A2B2E",
            "&:hover": {
              background: "rgba(184, 92, 60, 0.18)",
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
    </Dialog>
  );
};

export default TherapistInfoSheet;
