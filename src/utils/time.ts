// src/utils/time.ts

export function isNowInRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  return now >= start && now <= end;
}

export function calculateNextAvailable(
  duration: number,
  startTime: string,
  endTime: string
): string {
  const now = new Date();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  if (now < start) return startTime;
  if (now > end) return 'N/A';

  const next = new Date(now.getTime() + duration * 60000);
  if (next > end) return 'N/A';

  return `${next.getHours().toString().padStart(2, '0')}:${next.getMinutes().toString().padStart(2, '0')}`;
}