// src/utils/calculateNextAvailable.ts
import dayjs from 'dayjs';

export function calculateNextAvailable(
  serviceDurationMinutes: number,
  startTime: string,
  endTime: string
): string {
  const now = dayjs();

  let start = dayjs().hour(+startTime.split(':')[0]).minute(+startTime.split(':')[1]).second(0);
  let end = dayjs().hour(+endTime.split(':')[0]).minute(+endTime.split(':')[1]).second(0);

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
    return start.add(1, 'day').format('HH:mm');
  }

  return proposed.format('HH:mm');
}