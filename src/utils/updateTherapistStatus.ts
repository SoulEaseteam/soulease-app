import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { isNowInRange } from './time';
import { Therapist } from '@/types/therapist';

export function getAvailableStatus(therapist: Partial<Therapist>): Therapist['available'] {
  if (therapist.manualStatus === 'holiday') return 'holiday';
  const start = therapist.startTime ?? '10:00';
  const end = therapist.endTime ?? '22:00';
  const inWorkingHours = isNowInRange(start, end);
  return inWorkingHours ? 'available' : 'resting';
}

export async function updateTherapistAvailability(therapist: Therapist) {
  if (!therapist || !therapist.id) return therapist;

  const available = getAvailableStatus(therapist);
  const isAvailableNow = available === 'available';

  try {
    const ref = doc(db, 'therapists', therapist.id);
    await updateDoc(ref, { available, isAvailableNow });
    console.log(`🕐 Updated ${therapist.name} to ${available}`);
  } catch (error) {
    console.error('❌ Failed to update therapist availability:', error);
  }
  return { ...therapist, available, isAvailableNow };
}