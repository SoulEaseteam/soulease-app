import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import TherapistProfileCard from "@/components/TherapistProfileCard";

import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";

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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress color="error" />
      </Box>
    );
  }

  if (therapists.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography fontSize={18} fontWeight="bold">
          No therapists found
        </Typography>
        <Typography color="text.secondary">
          Please check back later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2} pb={8}>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        ❤️ All Therapists
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={3}>
        ระบบจัดอันดับ: VIP → HOT → NEW → สถานะ → Rating
      </Typography>

      <Stack spacing={2}>
        {therapists.map((t) => (
          <TherapistProfileCard key={t.id} therapist={t as unknown as TherapistType} />
        ))}
      </Stack>
    </Box>
  );
};

export default TherapistListPage;