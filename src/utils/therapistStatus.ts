import dayjs from 'dayjs';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';  // ปรับ path ให้ตรงกับโปรเจกต์คุณ

/**
 * คำนวณเวลา nextAvailable ของพนักงาน
 * @param serviceDurationMinutes จำนวนเวลาคอร์ส (นาที)
 * @param startTime เวลาเริ่มทำงาน เช่น '22:00'
 * @param endTime เวลาหยุดทำงาน เช่น '05:00'
 * @returns เวลา nextAvailable ในรูปแบบ 'HH:mm'
 */
export function calculateNextAvailable(
  serviceDurationMinutes: number,
  startTime: string,
  endTime: string
): string {
  const now = dayjs();
  let start = dayjs().hour(+startTime.split(':')[0]).minute(+startTime.split(':')[1]);
  let end = dayjs().hour(+endTime.split(':')[0]).minute(+endTime.split(':')[1]);

  // กรณีเวลาทำงานข้ามวัน เช่น 22:00 - 05:00
  if (start.isAfter(end)) {
    if (now.isBefore(start)) {
      end = end.add(1, 'day');
    } else {
      start = start.subtract(1, 'day');
      end = end.add(1, 'day');
    }
  }

  const proposed = now.add(serviceDurationMinutes, 'minute');

  if (proposed.isAfter(end)) {
    // ถ้าเวลาที่คำนวณเลยเวลาทำงาน จะเลื่อนเป็นวันถัดไปเริ่มต้น
    return start.add(1, 'day').format('HH:mm');
  }

  return proposed.format('HH:mm');
}

/**
 * อัปเดต nextAvailable ลงใน Firestore
 * @param therapistId ไอดีพนักงาน
 * @param serviceDurationMinutes ระยะเวลาคอร์ส (นาที)
 * @param startTime เวลาเริ่มงาน
 * @param endTime เวลาสิ้นสุดงาน
 */
export async function updateNextAvailableInFirestore(
  therapistId: string,
  serviceDurationMinutes: number,
  startTime: string,
  endTime: string
) {
  const nextAvailable = calculateNextAvailable(serviceDurationMinutes, startTime, endTime);
  const therapistRef = doc(db, 'therapists', therapistId);
  try {
    await updateDoc(therapistRef, { nextAvailable });
    console.log(`Updated nextAvailable for ${therapistId} to ${nextAvailable}`);
  } catch (error) {
    console.error('Failed to update nextAvailable:', error);
  }
}