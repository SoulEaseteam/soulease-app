// src/components/booking/ServiceDurationSheet.tsx
//
// 🎨 Phase 4 Booking — Bottom-sheet popup for picking a service duration.
//
// Triggered from a service card in StepService. Lists the duration tiers
// the service offers (typically 60/90/120 min) with the price computed
// via `priceForDuration` — single source of truth lives in
// src/utils/servicePricing.ts.
//
// Layout (mobile-native bottom sheet):
//   ┌──────────────────────────────┐
//   │           ▬▬▬▬               │  drag handle
//   │ Thai Massage          [SIG]  │
//   │ Relieve deep muscle tension. │
//   │                              │
//   │ ┌─────────────────────────┐  │
//   │ │  60 min                  │  │
//   │ │  Standard       ฿1,200  │  │
//   │ └─────────────────────────┘  │
//   │ ┌─────────────────────────┐  │
//   │ │  90 min  ⭐ RECOMMENDED  │  │
//   │ │                  ฿1,800  │  │
//   │ └─────────────────────────┘  │
//   │ ┌─────────────────────────┐  │
//   │ │  120 min  Best value    │  │
//   │ │                  ฿2,400  │  │
//   │ └─────────────────────────┘  │
//   │                              │
//   │  [ Confirm ฿1,800 ]          │
//   └──────────────────────────────┘
//
// Accessibility:
//   • Sheet is a Drawer with role="dialog" + aria-modal
//   • Each duration is role="radio" inside a radiogroup
//   • Backdrop click + drag handle dismiss

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, Button } from "@mui/material";
import type { MassageService } from "@/data/services";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  service: MassageService | null;
  /** Initial duration to highlight when sheet opens. */
  initialDuration?: number;
  open: boolean;
  onClose: () => void;
  onConfirm: (durationMin: number) => void;
}

const DURATION_LABELS: Record<number, { tag: string; tagColor?: string }> = {
  60: { tag: "Standard" },
  90: { tag: "⭐ Most popular", tagColor: "#FE0944" },
  120: { tag: "Best value" },
};

const ServiceDurationSheet: React.FC<Props> = ({
  service,
  initialDuration,
  open,
  onClose,
  onConfirm,
}) => {
  const durations = service ? durationsFor(service) : [];
  const [selected, setSelected] = useState<number>(
    initialDuration ?? durations[1] ?? durations[0] ?? 60
  );

  // Sync initialDuration each time the sheet (re-)opens for a service
  useEffect(() => {
    if (open && service) {
      setSelected(
        initialDuration ?? durationsFor(service)[1] ?? durationsFor(service)[0]
      );
    }
  }, [open, service, initialDuration]);

  if (!service) return null;

  const totalPrice = priceForDuration(service, selected);

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
        },
      }}
    >
      {/* Drag handle */}
      <Box
        sx={{
          width: 40,
          height: 4,
          background: "rgba(60, 30, 20, 0.18)",
          borderRadius: "2px",
          margin: "10px auto 16px",
        }}
      />

      <Box sx={{ padding: "0 20px 20px" }}>
        {/* Header — service name + desc */}
        <Box sx={{ marginBottom: "18px" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <Typography
              component="h2"
              sx={{
                fontFamily: SERIF,
                fontSize: "22px",
                fontWeight: 600,
                color: "#3c1e14",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {service.name}
            </Typography>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                background: "rgba(254, 9, 68, 0.95)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {service.badge}
            </Box>
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12.5px",
              color: "rgba(60, 30, 20, 0.65)",
              lineHeight: 1.4,
            }}
          >
            {service.desc}
          </Typography>
        </Box>

        {/* Duration tiers */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
            paddingLeft: "4px",
          }}
        >
          Choose duration
        </Typography>
        <Box
          role="radiogroup"
          aria-label="Service duration"
          sx={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {durations.map((min) => {
            const isActive = selected === min;
            const price = priceForDuration(service, min);
            const meta = DURATION_LABELS[min] ?? { tag: `${min} min` };
            return (
              <Box
                key={min}
                role="radio"
                aria-checked={isActive}
                tabIndex={0}
                onClick={() => setSelected(min)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelected(min);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  userSelect: "none",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  border: isActive
                    ? "2px solid #FE0944"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: isActive
                    ? "0 6px 18px rgba(254, 9, 68, 0.15)"
                    : "0 2px 6px rgba(126, 30, 46, 0.05)",
                  transition: "all 0.15s ease",
                  "&:focus-visible": {
                    outline: "2px solid #FE0944",
                    outlineOffset: "2px",
                  },
                }}
              >
                {/* Radio dot */}
                <Box
                  aria-hidden
                  sx={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: isActive
                      ? "5px solid #FE0944"
                      : "2px solid rgba(0, 0, 0, 0.2)",
                    background: isActive ? "#fff" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                />
                {/* Body */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#3c1e14",
                      lineHeight: 1.1,
                      marginBottom: "2px",
                    }}
                  >
                    {min} min
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: meta.tagColor ?? "rgba(60, 30, 20, 0.55)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {meta.tag}
                  </Typography>
                </Box>
                {/* Price */}
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: isActive ? "#FE0944" : "#3c1e14",
                    letterSpacing: "-0.02em",
                    flexShrink: 0,
                  }}
                >
                  {formatTHB(price)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Confirm CTA */}
        <Button
          fullWidth
          onClick={() => {
            onConfirm(selected);
          }}
          sx={{
            marginTop: "20px",
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
          }}
        >
          Confirm · {formatTHB(totalPrice)}
        </Button>
      </Box>
    </Drawer>
  );
};

export default ServiceDurationSheet;
