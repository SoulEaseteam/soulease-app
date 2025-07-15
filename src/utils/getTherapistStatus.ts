import { Therapist } from '@/types/therapist';

export const getTherapistStatus = (t: Therapist): string => {
  switch (t.available) {
    case 'available':
      return 'พร้อมรับงาน';
    case 'bookable':
      return 'จองล่วงหน้า';
    case 'resting':
      return 'กำลังพัก'; // ❗ แสดงบนเว็บเสมอได้ ไม่กรองออก
    default:
      return 'ไม่ระบุ';
  }
};