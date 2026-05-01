// src/pages/booking/BookingSuccessPage.tsx
//
// 🎨 Phase 3 Booking — Confirmation page after successful submission.
//
// Replaces legacy BookingConfirmationPage. Lands at /booking/success/:id.
// Reads the booking doc from Firestore on mount to show real values
// (in case the user reloads or shares the URL).
//
// Layout:
//   ┌────────────────────────────────┐
//   │  ✓                             │
//   │  Booking confirmed             │
//   │  Booking #ABC123               │
//   │                                │
//   │  Yuri is on the way            │
//   │  Estimated arrival 8:32 PM     │
//   │                                │
//   │  [Order summary card]          │
//   │  [View booking history] CTA    │
//   └────────────────────────────────┘

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, type DocumentData } from "firebase/firestore";
import dayjs from "dayjs";

import { db } from "@/lib/firebase";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const BookingSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No booking id");
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "bookings", id));
        if (!snap.exists()) {
          setError("Booking not found");
        } else {
          setBooking(snap.data());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [id]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        padding: "32px 20px 80px",
        fontFamily: SANS,
      }}
    >
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "120px",
          }}
        >
          <CircularProgress sx={{ color: "#FE0944" }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", paddingTop: "60px" }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "20px",
              color: "#3c1e14",
              marginBottom: "12px",
            }}
          >
            {error}
          </Typography>
          <Button
            onClick={() => void navigate("/")}
            sx={{ color: "#FE0944", textTransform: "none" }}
          >
            Back to home
          </Button>
        </Box>
      ) : (
        booking && (
          <>
            {/* Big check mark */}
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "20px auto 24px",
                boxShadow: "0 14px 40px rgba(254, 9, 68, 0.35)",
              }}
            >
              <CheckRoundedIcon sx={{ color: "#fff", fontSize: 48 }} />
            </Box>

            <Typography
              component="h1"
              sx={{
                fontFamily: SERIF,
                fontSize: "32px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#3c1e14",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              Booking <em style={{ fontStyle: "italic", opacity: 0.85 }}>confirmed</em>
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(60, 30, 20, 0.55)",
                textAlign: "center",
                marginTop: "6px",
                letterSpacing: "0.04em",
              }}
            >
              Booking #{id?.slice(0, 8).toUpperCase()}
            </Typography>

            {/* Therapist en route card */}
            <Box
              sx={{
                marginTop: "28px",
                padding: "18px 20px",
                borderRadius: "20px",
                background: "rgba(254, 9, 68, 0.06)",
                border: "1px solid rgba(254, 9, 68, 0.18)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <Box sx={{ fontSize: "28px" }}>🚗</Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#3c1e14",
                    lineHeight: 1.2,
                  }}
                >
                  {(booking.therapistName as string) ?? "Your therapist"} is preparing to come
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12px",
                    color: "rgba(60, 30, 20, 0.6)",
                    marginTop: "2px",
                  }}
                >
                  Estimated session start ·{" "}
                  {booking.startAt?.toDate
                    ? dayjs(booking.startAt.toDate()).format("h:mm A")
                    : (booking.time as string) ?? "—"}
                </Typography>
              </Box>
            </Box>

            {/* Summary */}
            <Box
              sx={{
                marginTop: "16px",
                padding: "18px 20px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
              }}
            >
              <SummaryLine label="Service" value={(booking.serviceName as string) ?? "—"} />
              <SummaryLine label="Duration" value={`${(booking.duration as number) ?? "—"} min`} />
              <SummaryLine
                label="Location"
                value={(booking.locationName as string) ?? (booking.address as string) ?? "—"}
              />
              <SummaryLine label="Phone" value={(booking.phone as string) ?? "—"} />
              <SummaryLine label="Payment" value={String(booking.payment ?? "—")} />

              {/* Price breakdown */}
              <Box
                sx={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px dashed rgba(0, 0, 0, 0.08)",
                }}
              >
                <SummaryLine
                  label="Service fee"
                  value={`฿${((booking.servicePrice as number) ?? 0).toLocaleString()}`}
                />
                <SummaryLine
                  label={`🚖 Taxi (round-trip${
                    booking.distanceKm != null
                      ? ` · ${(booking.distanceKm as number).toFixed(1)} km`
                      : ""
                  })`}
                  value={`฿${((booking.taxiFee as number) ?? 0).toLocaleString()}`}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                }}
              >
                <Typography
                  sx={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 600 }}
                >
                  Total
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#FE0944",
                    letterSpacing: "-0.02em",
                  }}
                >
                  ฿{((booking.totalPrice as number) ?? (booking.servicePrice as number) ?? 0).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* CTAs */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <Button
                onClick={() => void navigate("/booking/history")}
                sx={{
                  height: 48,
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                  color: "#fff",
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "14px",
                  textTransform: "none",
                  boxShadow: "0 6px 18px rgba(254, 9, 68, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #E50840, #E56A47)",
                  },
                }}
              >
                View my bookings
              </Button>
              <Button
                onClick={() => void navigate("/")}
                sx={{
                  height: 44,
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.7)",
                  color: "#3c1e14",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "13px",
                  textTransform: "none",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  "&:hover": { background: "rgba(255, 255, 255, 0.9)" },
                }}
              >
                Back to home
              </Button>
            </Box>
          </>
        )
      )}
    </Box>
  );
};

const SummaryLine: React.FC<{ label: string; value: string }> = ({
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

export default BookingSuccessPage;
