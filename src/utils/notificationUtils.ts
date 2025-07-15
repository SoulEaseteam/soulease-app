// src/utils/notificationUtils.ts

import { sendNotification } from '@/services/notificationService';

export const sendNotificationOnBooking = async ({
  therapistId,
  userId,
  bookingId,
  therapistName,
}: {
  therapistId: string;
  userId: string;
  bookingId: string;
  therapistName: string;
}) => {
  await sendNotification({
    userId: therapistId,
    type: 'booking',
    message: `คุณมีการจองใหม่กับ ${therapistName}`,
    link: `/therapist/profile`,
    meta: { bookingId, from: userId },
  });
};

export const sendNotificationOnPayment = async ({
  therapistId,
  userId,
  bookingId,
}: {
  therapistId: string;
  userId: string;
  bookingId: string;
}) => {
  await sendNotification({
    userId: therapistId,
    type: 'payment',
    message: `ลูกค้าได้ชำระเงินเรียบร้อยแล้ว`,
    link: `/therapist/profile`,
    meta: { bookingId, from: userId },
  });
};

export const sendNotificationOnReview = async ({
  therapistId,
  userId,
  bookingId,
}: {
  therapistId: string;
  userId: string;
  bookingId: string;
}) => {
  await sendNotification({
    userId: therapistId,
    type: 'review',
    message: `คุณได้รับรีวิวใหม่จากลูกค้า`,
    link: `/review/${therapistId}`,
    meta: { bookingId, from: userId },
  });
};
