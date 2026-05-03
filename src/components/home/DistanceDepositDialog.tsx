// src/components/home/DistanceDepositDialog.tsx
//
// 📍 Distance & Deposit policy dialog — opened from the TopNav drawer.
//
// Customers (especially first-timers) repeatedly ask:
//   "Why am I being asked for a deposit?"
//   "How far is too far?"
//   "How do you calculate distance?"
//
// This dialog answers all three in one screen with REAL data:
//   1. Static policy — within 25 km no deposit, 25 km+ → 500฿ deposit
//      (verbatim from ServiceDurationSheet's SERVICE_NOTES)
//   2. "Use my location" button → useUserLocation hook → Haversine to
//      Bangkok center → shows "Your distance: X km · Deposit: needed/no"
//
// Bangkok center is taken as Siam BTS (lat 13.7456, lng 100.5346) —
// a neutral midpoint of the city's outcall coverage zone (Sukhumvit,
// Silom, Asok, Thonglor all within ~5km).

import React, { useMemo } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useTranslation } from "react-i18next";

import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineKm } from "@/utils/taxiFare";
import { brand, fonts } from "@/theme";

// Reference point: Siam BTS (central BKK landmark, neutral midpoint
// of all major hotel zones we serve).
const BKK_CENTER = { lat: 13.7456, lng: 100.5346 };

// Founder-confirmed thresholds (matches ServiceDurationSheet.SERVICE_NOTES).
const FREE_RADIUS_KM = 25;
const DEPOSIT_THB = 500;

interface Props {
  open: boolean;
  onClose: () => void;
}

const DistanceDepositDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { location, status, error, request } = useUserLocation();

  const distanceKm = useMemo(() => {
    if (!location) return null;
    return haversineKm(
      location.lat,
      location.lng,
      BKK_CENTER.lat,
      BKK_CENTER.lng
    );
  }, [location]);

  const depositRequired =
    typeof distanceKm === "number" && distanceKm > FREE_RADIUS_KM;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "0 24px 60px rgba(126, 30, 46, 0.25)",
          margin: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: fonts.heading,
          fontSize: 20,
          fontWeight: 600,
          color: brand.text,
          letterSpacing: "-0.01em",
          padding: "20px 22px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(254, 9, 68, 0.12), rgba(254, 122, 82, 0.08))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RoomRoundedIcon sx={{ fontSize: 18, color: brand.red }} />
          </Box>
          {t("distance.title", "Distance & deposit")}
        </Box>
        <IconButton
          aria-label={t("common.close", "Close")}
          onClick={onClose}
          size="small"
          sx={{ color: brand.textMuted }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: "8px 22px 22px" }}>
        {/* Policy explanation */}
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: brand.textMuted,
            lineHeight: 1.55,
            marginBottom: 2,
          }}
        >
          {t(
            "distance.intro",
            "We deliver outcall therapists across Bangkok. To keep prices fair, a small deposit applies to faraway locations."
          )}
        </Typography>

        {/* 2 rule rows — within 25km / 25km+ */}
        <Stack spacing={1.25} sx={{ marginBottom: 2.5 }}>
          {/* Rule 1: within 25 km */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
              padding: "12px 14px",
              borderRadius: "14px",
              background: "rgba(22, 163, 74, 0.08)",
              border: "1px solid rgba(22, 163, 74, 0.22)",
            }}
          >
            <CheckCircleRoundedIcon
              sx={{ fontSize: 20, color: brand.green, mt: 0.25, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 700,
                  color: brand.text,
                  lineHeight: 1.3,
                }}
              >
                {t(
                  "distance.rule.near.title",
                  `Within ${FREE_RADIUS_KM} km`
                )}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11.5,
                  color: brand.textMuted,
                  marginTop: "2px",
                  lineHeight: 1.45,
                }}
              >
                {t(
                  "distance.rule.near.body",
                  "No deposit. Pay when the therapist arrives — VISA, PromptPay, PayNow, Cash, or WeChat."
                )}
              </Typography>
            </Box>
          </Box>

          {/* Rule 2: 25 km+ */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
              padding: "12px 14px",
              borderRadius: "14px",
              background: "rgba(254, 122, 82, 0.1)",
              border: "1px solid rgba(254, 122, 82, 0.32)",
            }}
          >
            <WarningAmberRoundedIcon
              sx={{ fontSize: 20, color: brand.coral, mt: 0.25, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 700,
                  color: brand.text,
                  lineHeight: 1.3,
                }}
              >
                {t(
                  "distance.rule.far.title",
                  `Beyond ${FREE_RADIUS_KM} km`
                )}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11.5,
                  color: brand.textMuted,
                  marginTop: "2px",
                  lineHeight: 1.45,
                }}
              >
                {t(
                  "distance.rule.far.body",
                  `${DEPOSIT_THB.toLocaleString()}฿ deposit required upfront. Covers therapist transport so we can serve you outside the city.`
                )}
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* Live distance check */}
        <Box
          sx={{
            padding: "14px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(184, 92, 60, 0.15)",
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: 700,
              color: brand.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            {t("distance.checker.eyebrow", "Distance from you")}
          </Typography>

          {distanceKm == null ? (
            // Pre-permission state — invite user to share GPS
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 12.5,
                  color: brand.text,
                  lineHeight: 1.5,
                  marginBottom: 1.25,
                }}
              >
                {t(
                  "distance.checker.intro",
                  "Use your phone's location to see if a deposit applies."
                )}
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => request()}
                disabled={status === "unsupported"}
                sx={{
                  background:
                    "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                  textTransform: "none",
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 12.5,
                  padding: "8px 14px",
                  borderRadius: "10px",
                  boxShadow: "0 4px 14px rgba(254, 9, 68, 0.25)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                    boxShadow: "0 6px 18px rgba(254, 9, 68, 0.35)",
                  },
                }}
              >
                <RoomRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                {status === "prompt"
                  ? t("distance.checker.locating", "Locating…")
                  : t("distance.checker.cta", "Use my location")}
              </Button>
              {status === "denied" && (
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: brand.coral,
                    marginTop: 1,
                    lineHeight: 1.4,
                  }}
                >
                  {t(
                    "distance.checker.denied",
                    "Location permission denied. Enable it in your browser settings to estimate distance."
                  )}
                </Typography>
              )}
              {status === "unsupported" && (
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: brand.textMuted,
                    marginTop: 1,
                    lineHeight: 1.4,
                  }}
                >
                  {t(
                    "distance.checker.unsupported",
                    "Geolocation isn't available on this device."
                  )}
                </Typography>
              )}
              {error && status !== "denied" && status !== "unsupported" && (
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: brand.textMuted,
                    marginTop: 1,
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </Typography>
              )}
            </Box>
          ) : (
            // Result state — show distance + deposit verdict
            <Stack spacing={1}>
              <Stack
                direction="row"
                alignItems="baseline"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: 26,
                    fontWeight: 600,
                    color: brand.text,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {distanceKm.toFixed(1)}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: 600,
                      color: brand.textMuted,
                      ml: 0.5,
                    }}
                  >
                    km
                  </Box>
                </Typography>
                <Box
                  sx={{
                    padding: "5px 11px",
                    borderRadius: 99,
                    background: depositRequired
                      ? "rgba(254, 122, 82, 0.18)"
                      : "rgba(22, 163, 74, 0.16)",
                    border: depositRequired
                      ? "1px solid rgba(254, 122, 82, 0.4)"
                      : "1px solid rgba(22, 163, 74, 0.4)",
                    color: depositRequired ? brand.coral : brand.green,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {depositRequired
                    ? t("distance.verdict.required", "Deposit required")
                    : t("distance.verdict.free", "No deposit")}
                </Box>
              </Stack>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11.5,
                  color: brand.textMuted,
                  lineHeight: 1.45,
                }}
              >
                {depositRequired
                  ? t(
                      "distance.verdict.required.body",
                      `${DEPOSIT_THB.toLocaleString()}฿ deposit applies for this distance. Pay the remainder in cash or card on arrival.`
                    )
                  : t(
                      "distance.verdict.free.body",
                      "Within our standard delivery zone. Pay any way you like on arrival."
                    )}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 10,
                  color: brand.textMuted,
                  marginTop: 0.5,
                  fontStyle: "italic",
                }}
              >
                {t(
                  "distance.checker.disclaimer",
                  "Estimate from your location to central Bangkok (Siam). Actual fare uses the booked therapist's start point."
                )}
              </Typography>
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DistanceDepositDialog;
