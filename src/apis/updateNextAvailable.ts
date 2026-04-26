// src/apis/updateNextAvailable.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calcNextAvailable } from "@/utils/calculateNextAvailable";

export async function updateTherapistNextAvailable(
  therapistId: string,
  serviceDurationMin: number,
  startTime: string,
  endTime: string
) {
  const now = new Date();
  const next = calcNextAvailable(now, serviceDurationMin, 0, { startTime, endTime });
  const ref = doc(db, "therapists", therapistId);
  await updateDoc(ref, {
    nextAvailable: next
  });
  return next;
}