// src/utils/updateNextAvailableInFirestore.ts
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calcNextAvailable, nowThai, toDateLike } from "./timeUtils";

export async function updateNextAvailableInFirestore(
  therapistDocId: string,
  serviceDurationMinutes: number
) {
  try {
    const ref = doc(db, "therapists", therapistDocId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.error("Therapist not found:", therapistDocId);
      return;
    }

    const t = snap.data();

    const startTime = t.startTime || "00:00";
    const endTime = t.endTime || "23:59";

    const busyUntil = toDateLike(t.busyUntil);

    // ใช้เวลาที่จะเริ่มนับ (งานค้าง → ต้องต่อจาก busyUntil)
    const baseStart =
      busyUntil && busyUntil > nowThai() ? busyUntil : nowThai();

    const nextAvailable = calcNextAvailable(
      baseStart,
      serviceDurationMinutes,
      10,
      {
        startTime,
        endTime,
        busyUntil,
      }
    );

    await updateDoc(ref, {
      nextAvailable,
      updatedAt: Timestamp.now(),
    });

    console.log(
      `✔ nextAvailable updated for ${therapistDocId}: ${nextAvailable}`
    );
  } catch (err) {
    console.error("❌ Failed to update nextAvailable:", err);
  }
}

export default updateNextAvailableInFirestore;