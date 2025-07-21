export function isNowInRange(start: string, end: string): boolean {
  const now = new Date();
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date(now);
  startDate.setHours(startH, startM, 0, 0);

  const endDate = new Date(now);
  endDate.setHours(endH, endM, 0, 0);

  if (endDate <= startDate) {
    // กรณีข้ามวัน เช่น 22:00 - 05:00
    const endNextDay = new Date(endDate);
    endNextDay.setDate(endNextDay.getDate() + 1);

    return now >= startDate || now <= endNextDay;
  }

  return now >= startDate && now <= endDate;
}
