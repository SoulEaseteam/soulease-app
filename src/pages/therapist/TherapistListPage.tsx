import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import SentimentDissatisfiedRoundedIcon from "@mui/icons-material/SentimentDissatisfiedRounded";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import TherapistProfileCard from "@/components/TherapistProfileCard";

import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Extended Type — ไม่ extend TherapistType เพื่อหลีกเลี่ยง startTime conflict
interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  gallery: string[];
  features: TherapistType["features"];
  nextAvailable?: string | null;
  todayBookings?: number;
  totalBookings?: number;
  isBooked?: boolean;
  startTime?: string;
  endTime?: string;
  statusOverride?: string | null;
  isHoliday?: boolean;
  busyUntil?: any;
  badgeKey?: "VIP" | "HOT" | "NEW" | null;
  badgeUpdatedAt?: number | null;
  computedStatus?: Avail;
  [key: string]: any;
}

const TherapistListPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "therapists"), (snap) => {
      const raw: Therapist[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data() as Therapist;

        raw.push({
          ...data,
          id: data.id || docSnap.id,
        });
      });

      // Enrich
      const enriched = raw.map((t) => {
        const { status } = calculateTherapistStatus(t as unknown as TherapistType);

        const badge = getBadgeForTherapist({
          totalBookings: t.totalBookings || 0,
          todayBookings: t.todayBookings || 0,
          badgeKey: t.badgeKey,
          badgeUpdatedAt: t.badgeUpdatedAt,
        });

        return {
          ...t,
          computedStatus: status,
          badgeKey: badge.key,
        };
      });

      // Sort
      enriched.sort((a, b) => {
        const badgeOrder: Array<"VIP" | "HOT" | "NEW" | null> = ["VIP", "HOT", "NEW", null];
        const statusOrder: Record<Avail, number> = { available: 1, bookable: 2, resting: 3 };

        const aBadge = badgeOrder.indexOf(a.badgeKey ?? null);
        const bBadge = badgeOrder.indexOf(b.badgeKey ?? null);
        if (aBadge !== bBadge) return aBadge - bBadge;

        const stA = statusOrder[a.computedStatus ?? "resting"];
        const stB = statusOrder[b.computedStatus ?? "resting"];
        if (stA !== stB) return stA - stB;

        return (b.rating || 0) - (a.rating || 0);
      });

      setTherapists(enriched as Therapist[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🆕 Round 24 (founder 2026-05-01): live count of available therapists
  //    for header social proof. Customers see at a glance how many are
  //    bookable right now — drives urgency.
  const availableNow = therapists.filter(
    (t) => t.computedStatus === "available"
  ).length;

  return (
    <Box
      sx={{
        // Phone-shell wrapper — match BookingFlowPage / HomePage rhythm.
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255, 248, 240, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
          padding: "16px 20px 12px",
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Our therapists
        </Typography>
        {!loading && therapists.length > 0 && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "3px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {availableNow > 0 && (
              <>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#16a34a",
                    boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.18)",
                    animation: "statusBlink 1.4s ease-in-out infinite",
                    "@keyframes statusBlink": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Box component="span" sx={{ color: "#16a34a", fontWeight: 700 }}>
                  {availableNow} available now
                </Box>
                <Box component="span" sx={{ opacity: 0.4 }}>·</Box>
              </>
            )}
            <Box component="span">{therapists.length} verified therapists</Box>
          </Typography>
        )}
      </Box>

      {/* Body */}
      {loading ? (
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress sx={{ color: "#FE0944" }} />
        </Box>
      ) : therapists.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            padding: "80px 24px 40px",
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(254, 9, 68, 0.08)",
              color: "#FE0944",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              "& svg": { fontSize: 32 },
            }}
          >
            <SentimentDissatisfiedRoundedIcon />
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "18px",
              fontWeight: 600,
              color: "#3c1e14",
              marginBottom: "6px",
            }}
          >
            No therapists available
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "13px",
              color: "rgba(60, 30, 20, 0.6)",
              lineHeight: 1.5,
            }}
          >
            Please check back later — we&rsquo;re onboarding new therapists
            every week.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ padding: "16px" }}>
          <Stack spacing={2}>
            {therapists.map((t) => (
              <TherapistProfileCard
                key={t.id}
                therapist={t as unknown as TherapistType}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};


export default TherapistListPage;