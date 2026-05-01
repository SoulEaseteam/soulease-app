// src/components/booking/LocationSheet.tsx
//
// 🎨 Phase 4 — Bottom-sheet wrapper around <StepLocation/>.
// Used by the single-page Reservation Order so the Address tile opens
// the full picker (search + presets + current-location + address details)
// without navigating away.

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, Button, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StepLocation from "@/components/booking/StepLocation";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface LocationDraft {
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  addressDetails: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial: LocationDraft;
  onConfirm: (next: LocationDraft) => void;
}

const LocationSheet: React.FC<Props> = ({
  open,
  onClose,
  initial,
  onConfirm,
}) => {
  // Local draft — only commits to parent on Confirm tap
  const [draft, setDraft] = useState<LocationDraft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const canConfirm = draft.lat != null && draft.lng != null;

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
          Where should we <em>go</em>?
        </Typography>
      </Box>

      {/* Scrollable picker */}
      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        <StepLocation
          locationName={draft.locationName}
          locationAddress={draft.locationAddress}
          lat={draft.lat}
          lng={draft.lng}
          addressDetails={draft.addressDetails}
          onChange={(next) => setDraft((p) => ({ ...p, ...next }))}
          onChangeAddressDetails={(addressDetails) =>
            setDraft((p) => ({ ...p, addressDetails }))
          }
        />
      </Box>

      {/* Confirm CTA — pinned, gated on a coordinate being picked */}
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
          onClick={() => onConfirm(draft)}
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
          {canConfirm ? "Confirm location" : "Pick a place to continue"}
        </Button>
      </Box>
    </Drawer>
  );
};

export default LocationSheet;
