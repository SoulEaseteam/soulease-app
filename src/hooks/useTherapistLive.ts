import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getNextBoundary, getScheduledStatus, type StatusType } from "@/utils/status";

export interface TherapistLiveInput {
  therapistId: string;
}

export function useTherapistLive({ therapistId }: TherapistLiveInput) {
  const [therapist, setTherapist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // อัพเดทเวลาแบบ real-time (ทุก 60 วินาที)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!therapistId) {
      setTherapist(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, "therapists", therapistId), (snap) => {
      setTherapist(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return () => unsub();
  }, [therapistId]);

  const status: StatusType = useMemo(() => {
    if (!therapist) return "resting";
    return getScheduledStatus(
      therapist.startTime ?? "",
      therapist.endTime ?? "",
      now,
      !!(therapist.isBooked || therapist.activeBooking),
    );
  }, [therapist, now]);

  const nextBoundary = useMemo(() => {
    if (!therapist) return null;
    return getNextBoundary(
      therapist.startTime ?? "",
      therapist.endTime ?? "",
      now,
    );
  }, [therapist, now]);

  return { therapist, loading, status, nextBoundary };
}