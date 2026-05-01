// src/components/booking/StepConfirm.tsx
//
// 🎨 Phase 3 Booking — Step 5 final review + payment picker.
//
// Layout:
//   ┌────────────────────────────────┐
//   │  ORDER SUMMARY                 │
//   │  Yuri · ★ 4.7                  │
//   │                                │
//   │  Service       Thai Massage    │
//   │  Duration      60 min          │
//   │  Date · Time   Tue · 22:00     │
//   │  Location      Mandarin Or…    │
//   │                                │
//   │  Total         ฿1,200          │
//   └────────────────────────────────┘
//
//   PAYMENT METHOD
//   [PaymentPicker — 5 methods]
//
// On submit, BookingFlowPage runs profanity moderation on notes, then
// writes the booking doc + increments therapist counter via runTransaction.

import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import dayjs from "dayjs";

import services from "@/data/services";
import therapistsData from "@/data/therapists";
import PaymentPicker, {
  type PaymentMethod,
} from "@/components/booking/PaymentPicker";
import type { BookingFormState } from "@/pages/booking/BookingFlowPage";
import { estimateTaxiFare } from "@/utils/taxiFare";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  form: BookingFormState;
  onChangePayment: (val: PaymentMethod) => void;
}

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      marginBottom: "8px",
    }}
  >
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "12px",
        color: "rgba(60, 30, 20, 0.6)",
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        fontWeight: 600,
        color: "#3c1e14",
        textAlign: "right",
        lineHeight: 1.3,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const StepConfirm: React.FC<Props> = ({ form, onChangePayment }) => {
  const service = services.find((s) => s.id === form.serviceId);
  const therapist = therapistsData.find((t) => t.id === form.therapistId);

  const dateLabel = form.date
    ? dayjs(form.date).format("ddd · MMM D")
    : "—";
  const timeLabel = form.time ?? "—";

  // 🚖 Taxi fare — Haversine from therapist's home → customer pinned location,
  // multiplied by Bangkok Grab approximation (parity with legacy BookingPage).
  const { distanceKm, fare: taxiFare } = estimateTaxiFare({
    therapistLat: therapist?.lat,
    therapistLng: therapist?.lng,
    customerLat: form.lat,
    customerLng: form.lng,
    durationMin: form.duration,
  });

  const servicePrice = service?.price ?? 0;
  const total = servicePrice + taxiFare;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Order summary card — Liquid Glass with red accent */}
      <Box
        sx={{
          padding: "20px",
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 8px 30px rgba(126, 30, 46, 0.08)",
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            fontWeight: 700,
            color: "#FE0944",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
          }}
        >
          Order summary
        </Typography>

        {therapist && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: `center / cover no-repeat url("${therapist.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`,
                flexShrink: 0,
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Box>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.1,
                }}
              >
                {therapist.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.6)",
                  marginTop: "2px",
                }}
              >
                ★ {therapist.rating.toFixed(1)} · Licensed (ผ.พ.)
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ marginBottom: "12px", opacity: 0.5 }} />

        <SummaryRow
          label="Service"
          value={service?.name ?? "—"}
        />
        <SummaryRow
          label="Duration"
          value={form.duration ? `${form.duration} min` : "—"}
        />
        <SummaryRow label="Date · Time" value={`${dateLabel} · ${timeLabel}`} />
        <SummaryRow
          label="Location"
          value={
            <span style={{ display: "block", maxWidth: "200px" }}>
              {form.locationName ?? "—"}
              {form.addressDetails.trim() && (
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "rgba(60, 30, 20, 0.55)",
                    marginTop: "2px",
                    fontStyle: "italic",
                  }}
                >
                  {form.addressDetails}
                </span>
              )}
            </span>
          }
        />
        <SummaryRow label="Contact" value={form.customerName || "—"} />

        <Divider sx={{ marginY: "12px", opacity: 0.5 }} />

        {/* Price breakdown */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(60, 30, 20, 0.7)",
              }}
            >
              Service
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 600,
                color: "#3c1e14",
              }}
            >
              ฿{servicePrice.toLocaleString()}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(60, 30, 20, 0.7)",
              }}
            >
              🚖 Taxi (round-trip
              {distanceKm > 0 ? ` · ${distanceKm.toFixed(1)} km` : ""})
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 600,
                color: taxiFare > 0 ? "#3c1e14" : "rgba(60, 30, 20, 0.4)",
              }}
            >
              {taxiFare > 0 ? `฿${taxiFare.toLocaleString()}` : "—"}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ marginY: "12px", opacity: 0.5 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              fontWeight: 600,
              color: "#3c1e14",
            }}
          >
            Total
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "26px",
              fontWeight: 700,
              color: "#FE0944",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            ฿{total.toLocaleString()}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "rgba(60, 30, 20, 0.5)",
            marginTop: "4px",
            textAlign: "right",
          }}
        >
          Service + round-trip taxi · Tip not required
        </Typography>
      </Box>

      {/* Payment picker */}
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "10px",
            paddingLeft: "4px",
          }}
        >
          Payment method
        </Typography>
        <PaymentPicker
          value={form.paymentMethod}
          onChange={onChangePayment}
        />
      </Box>

      {/* Cancellation policy summary */}
      <Box
        sx={{
          padding: "14px 16px",
          borderRadius: "14px",
          background: "rgba(0, 0, 0, 0.03)",
          fontFamily: SANS,
        }}
      >
        <Typography
          sx={{
            fontSize: "11.5px",
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.7)",
            marginBottom: "4px",
          }}
        >
          Cancellation policy
        </Typography>
        <Typography
          sx={{
            fontSize: "11px",
            color: "rgba(60, 30, 20, 0.6)",
            lineHeight: 1.5,
          }}
        >
          Free cancellation up to 30 minutes before the booking time.
          Cancellations after that are charged 50% of the service fee.
          By confirming, you agree to our Terms of Service.
        </Typography>
      </Box>
    </Box>
  );
};

export default StepConfirm;
