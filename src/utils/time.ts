import dayjs from 'dayjs';

/**
 * Check if the current time is within a given time range.
 * Supports overnight range (e.g. 22:00 to 03:00)
 */
export function isNowInRange(startTime: string, endTime: string): boolean {
  const now = dayjs();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = now.set('hour', startHour).set('minute', startMinute).set('second', 0);
  let end = now.set('hour', endHour).set('minute', endMinute).set('second', 0);

  // If end time is before start time (e.g., 22:00 - 03:00), move end to next day
  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }

  return now.isAfter(start) && now.isBefore(end);
}

/**
 * Calculate the next available time for service
 */
export function calculateNextAvailable(
  duration: number,
  startTime: string,
  endTime: string
): string {
  const now = dayjs();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = now.set('hour', startHour).set('minute', startMinute).set('second', 0);
  let end = now.set('hour', endHour).set('minute', endMinute).set('second', 0);

  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }

  if (now.isBefore(start)) return start.format('HH:mm');

  const next = now.add(duration, 'minute');
  if (next.isAfter(end)) return 'N/A';

  return next.format('HH:mm');
}