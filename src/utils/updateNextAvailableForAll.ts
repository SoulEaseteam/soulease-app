// src/utils/updateNextAvailableInFirestore.ts
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { calculateNextAvailable } from './calculateNextAvailable'; // นำเข้าฟังก์ชันจากไฟล์แยก

export async function updateNextAvailableInFirestore(
  therapistId: string,
  serviceDurationMinutes: number,
  startTime: string,
  endTime: string
) {
  const nextAvailable = calculateNextAvailable(serviceDurationMinutes, startTime, endTime);

  try {
    const therapistRef = doc(db, 'therapists', therapistId);
    await updateDoc(therapistRef, { nextAvailable });
    console.log(`Updated nextAvailable for therapist ${therapistId} to ${nextAvailable}`);
  } catch (error) {
    console.error('Failed to update nextAvailable:', error);
  }
}