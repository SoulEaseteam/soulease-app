// src/lib/bookingChatShared.ts
//
// 🆕 Round 28x.167 — tiny shared constants for the booking-chat unread dot.
//
// Extracted out of BookingChatThread.tsx so BookingChatThread and
// useBookingChatUnread can each import from here instead of from EACH
// OTHER. They used to form a circular import (the hook imported
// `chatSeenKey` from the component); that happened to work while the hook
// only needed a function (hoisted), but adding a `const` export the other
// direction would put it at real risk of a temporal-dead-zone `undefined`
// depending on module evaluation order. Not worth relying on.

/** localStorage key for the staff-side unread dot (see useBookingChatUnread). */
export const chatSeenKey = (bookingId: string) => `sunred.chat.seen.${bookingId}`;

/** Fired by BookingChatThread right after it writes chatSeenKey. */
export const BOOKING_CHAT_SEEN_EVENT = "sunred:bookingChatSeen";
