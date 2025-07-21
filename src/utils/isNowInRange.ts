// utils/isNowInRange.ts
export function isNowInRange(start: string, end: string): boolean {
  const now = new Date();
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startH, startM, 0, 0);

  const endDate = new Date();
  endDate.setHours(endH, endM, 0, 0);

  if (endDate <= startDate) {
    // เวลาข้ามวัน เช่น 22:00 - 05:00
    return now >= startDate || now <= endDate;
  }

  return now >= startDate && now <= endDate;
}