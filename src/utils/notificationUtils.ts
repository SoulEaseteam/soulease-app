// src/utils/notificationUtils.ts
import { sendNotification } from "@/types/services/notificationService";

export const sendNotificationOnBooking = async (p: {
  therapistId: string;
  userId: string;
  bookingId: string;
  therapistName: string;
}) => {
  await sendNotification({
    userId: p.therapistId,
    type: "booking",
    message: `You have a new booking with ${p.therapistName}`,
    link: `/therapist/profile`,
    meta: { bookingId: p.bookingId, from: p.userId },
  });
};

export const sendNotificationOnPayment = async (p: {
  therapistId: string;
  userId: string;
  bookingId: string;
}) => {
  await sendNotification({
    userId: p.therapistId,
    type: "payment",
    message: `Customer payment is completed.`,
    link: `/therapist/profile`,
    meta: { bookingId: p.bookingId, from: p.userId },
  });
};

export const sendNotificationOnReview = async (p: {
  therapistId: string;
  userId: string;
  bookingId: string;
}) => {
  await sendNotification({
    userId: p.therapistId,
    type: "review",
    message: `You received a new review.`,
    link: `/review/${p.therapistId}`,
    meta: { bookingId: p.bookingId, from: p.userId },
  });
};