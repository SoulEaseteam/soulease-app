// src/components/booking/ServiceDurationSheet.tsx
//
// 🎨 Phase 4 Booking — Bottom-sheet popup for picking a service duration
//                      WITH full service details (Description + Benefits +
//                      Notices) so the user has everything in one screen
//                      instead of needing a separate detail page.
//
// Layout (mobile bottom sheet — scrollable):
//   ┌──────────────────────────────────┐
//   │            ▬▬▬▬                   │  drag handle
//   │  ┌────────────────────────────┐  │
//   │  │ [SIGNATURE]                │  │  hero image
//   │  │                            │  │  + badge overlay
//   │  └────────────────────────────┘  │
//   │  Thai Massage                    │
//   │  ฿1,200 · 60 mins · ⭐ 62 used  │
//   │                                  │
//   │  [ Details | Notices ]           │  tab switcher
//   │  ───────────────────────────     │
//   │  ▼ Description                   │
//   │     A timeless healing ritual…   │
//   │  ▼ Benefits                      │
//   │     • Eases chronic tension      │
//   │     • Improves posture …         │
//   │                                  │
//   │  CHOOSE DURATION                 │
//   │  [60 min ฿1,200]                 │
//   │  [90 min ⭐ ฿1,800]               │
//   │  [120 min ฿2,400]                │
//   │                                  │
//   │  [ Confirm ฿1,800 ]              │
//   └──────────────────────────────────┘

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, Button, Tabs, Tab } from "@mui/material";
import type { MassageService } from "@/data/services";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Service notes shown under the "Notices" tab. Identical for all services
// today — when notes need to be per-service, lift these to services.ts.
const SERVICE_NOTES: string[] = [
  "Please send your booking ID to customer service after completing the reservation.",
  "If your location is nearby, you may pay in cash.",
  "If the travel distance is far (over 25 km), a 500 THB deposit may be required.",
  "Supported payment: VISA, PromptPay, PayNow, Cash, WeChat.",
];

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

const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(254, 9, 68, 0.95)", fg: "#fff" },
  "BEST SELLER": { bg: "rgba(254, 122, 82, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(184, 92, 60, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(60, 30, 20, 0.95)", fg: "#FEC9A7" },
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
  const [tab, setTab] = useState<"details" | "notices">("details");

  // Sync state each time the sheet (re-)opens for a service
  useEffect(() => {
    if (open && service) {
      setSelected(
        initialDuration ?? durationsFor(service)[1] ?? durationsFor(service)[0]
      );
      setTab("details");
    }
  }, [open, service, initialDuration]);

  if (!service) return null;

  const totalPrice = priceForDuration(service, selected);
  const badgeColor = BADGE_COLORS[service.badge];

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
      {/* Drag handle (sticky top) */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          padding: "10px 0 6px",
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
      </Box>

      {/* Scrollable content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 20px 20px",
        }}
      >
        {/* Hero image with badge overlay */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: "320px",
            borderRadius: "20px",
            overflow: "hidden",
            background: `center / cover no-repeat url("${service.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`,
            boxShadow: "0 8px 24px rgba(126, 30, 46, 0.12)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: badgeColor.bg,
              color: badgeColor.fg,
              padding: "4px 10px",
              borderRadius: "999px",
              textTransform: "uppercase",
            }}
          >
            {service.badge}
          </Box>
        </Box>

        {/* Name + base price + duration + usage */}
        <Box sx={{ marginTop: "16px", marginBottom: "20px" }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: SERIF,
              fontSize: "24px",
              fontWeight: 600,
              color: "#3c1e14",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "6px",
            }}
          >
            {service.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: SERIF,
                fontSize: "16px",
                fontWeight: 600,
                color: "#3c1e14",
                letterSpacing: "-0.01em",
              }}
            >
              {service.price.toLocaleString()}฿
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(60, 30, 20, 0.6)",
              }}
            >
              | ⏱ {service.duration} mins.
            </Typography>
          </Box>
          {service.count > 0 && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(60, 30, 20, 0.55)",
                marginTop: "4px",
              }}
            >
              ⭐ Used by {service.count.toLocaleString()} customers
            </Typography>
          )}
        </Box>

        {/* Tabs — Details / Notices */}
        <Box
          sx={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "18px",
            boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v: "details" | "notices") => setTab(v)}
            variant="fullWidth"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                fontFamily: SANS,
                fontSize: "14px",
                fontWeight: 600,
                textTransform: "none",
                color: "rgba(60, 30, 20, 0.55)",
                minHeight: 44,
                "&.Mui-selected": { color: "#FE0944" },
              },
              "& .MuiTabs-indicator": {
                background: "#14b8a6",
                height: "3px",
                borderRadius: "2px 2px 0 0",
              },
            }}
          >
            <Tab value="details" label="Details" />
            <Tab value="notices" label="Notices" />
          </Tabs>

          {/* Tab content */}
          <Box sx={{ padding: "16px 18px 18px" }}>
            {tab === "details" ? (
              <>
                <Section title="Description">
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "13px",
                      lineHeight: 1.6,
                      color: "rgba(60, 30, 20, 0.78)",
                      textIndent: "16px",
                    }}
                  >
                    {service.detail}
                  </Typography>
                </Section>
                <Section title="Benefits">
                  <Box component="ul" sx={{ paddingLeft: "20px", margin: 0 }}>
                    {service.benefit.map((b) => (
                      <Typography
                        key={b}
                        component="li"
                        sx={{
                          fontFamily: SANS,
                          fontSize: "13px",
                          lineHeight: 1.7,
                          color: "rgba(60, 30, 20, 0.78)",
                        }}
                      >
                        {b}
                      </Typography>
                    ))}
                  </Box>
                </Section>
              </>
            ) : (
              <>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#3c1e14",
                    textAlign: "center",
                    marginBottom: "12px",
                  }}
                >
                  • Service Notes •
                </Typography>
                {SERVICE_NOTES.map((note, i) => (
                  <Typography
                    key={i}
                    sx={{
                      fontFamily: SANS,
                      fontSize: "13px",
                      lineHeight: 1.6,
                      color: "rgba(60, 30, 20, 0.78)",
                      marginBottom: "10px",
                      paddingLeft: "16px",
                      textIndent: "-16px",
                    }}
                  >
                    {i + 1}.&nbsp;&nbsp;{note}
                  </Typography>
                ))}
              </>
            )}
          </Box>
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
            margin: "20px 0 10px",
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
      </Box>

      {/* Confirm CTA — pinned to bottom (outside scroll area) */}
      <Box
        sx={{
          flexShrink: 0,
          padding: "12px 20px 0",
          background: "linear-gradient(180deg, transparent, #FCEBDC 30%)",
        }}
      >
        <Button
          fullWidth
          onClick={() => {
            onConfirm(selected);
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
          }}
        >
          Confirm · {formatTHB(totalPrice)}
        </Button>
      </Box>
    </Drawer>
  );
};

// ─── Collapsible-looking section header for the Details tab ───
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box sx={{ marginBottom: "16px", "&:last-child": { marginBottom: 0 } }}>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "15px",
        fontWeight: 700,
        color: "#3c1e14",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <Box component="span" sx={{ fontSize: "10px", color: "#3c1e14" }}>
        ▼
      </Box>
      {title}
    </Typography>
    {children}
  </Box>
);

export default ServiceDurationSheet;
