import dayjs from 'dayjs';

export function calculateNextAvailable(
  serviceDuration: string,
  startTime: string,
  endTime: string
): string {
  const duration = parseInt(serviceDuration); // แปลง '60 minutes' => 60
  const now = dayjs();
  const end = dayjs().hour(+endTime.split(':')[0]).minute(+endTime.split(':')[1]);
  const proposed = now.add(duration, 'minute');

  if (proposed.isAfter(end)) {
    // เลยเวลาทำงาน → รีเซ็ตเป็นเวลาทำงานพรุ่งนี้
    return startTime;
  }

  return proposed.format('HH:mm');
}