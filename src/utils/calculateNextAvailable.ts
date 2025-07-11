import dayjs from 'dayjs';

export function calculateNextAvailable(
  serviceDuration: string,
  startTime: string,
  endTime: string
): string {
  const duration = parseInt(serviceDuration); // เช่น '60' -> 60 นาที
  const now = dayjs();

  // สร้างเวลาเริ่มและสิ้นสุดจาก string
  let start = dayjs().hour(+startTime.split(':')[0]).minute(+startTime.split(':')[1]);
  let end = dayjs().hour(+endTime.split(':')[0]).minute(+endTime.split(':')[1]);

  // ✅ รองรับช่วงเวลากลางคืน เช่น 22:00 - 06:00
  if (start.isAfter(end)) {
    // หมายถึงเวลาทำงานข้ามวัน เช่น 22:00 → 06:00
    if (now.isBefore(start)) {
      end = end.add(1, 'day'); // สิ้นสุดพรุ่งนี้
    } else {
      start = start.subtract(1, 'day'); // เริ่มตั้งแต่เมื่อวาน
      end = end.add(1, 'day');
    }
  }

  const proposed = now.add(duration, 'minute');

  // ถ้าเลยเวลาทำงาน → return เวลาเริ่มรอบถัดไป (พรุ่งนี้)
  if (proposed.isAfter(end)) {
    return start.add(1, 'day').format('HH:mm');
  }

  // ยังอยู่ในช่วงเวลาทำงาน → return เวลาว่างถัดไป
  return proposed.format('HH:mm');
}