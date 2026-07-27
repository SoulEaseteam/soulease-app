// src/types/booking.ts
//
// Canonical Booking doc shape, reconciled from 6 independently-defined
// local interfaces (TherapistLocationPage, TherapistProfilePage,
// BookingHistoryPage, AdminBookingListPage, AdminReportPage,
// TherapistProfileCard) during the 2026-07-27 restructure. All fields
// are optional here — this matches the real Firestore `bookings` doc,
// which is written by several different code paths (customer flow,
// admin-add, migrations) that don't all populate the same fields.
//
// Individual call sites that have their own defensive guarantees
// (e.g. always synthesizing `id` before use, or normalizing `status`
// to a known union) narrow this type locally via `Pick`/`Omit` rather
// than weakening the fields here for everyone.
import type { Timestamp } from "firebase/firestore";
import type { Location } from "@/types/therapist";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "in_progress"
  | "in_session"
  | "completed"
  | "done"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "no_show"
  | "rejected"
  | "failed"
  | "upcoming";

export interface Booking {
  id?: string;
  therapistId?: string;
  therapistName?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp | Date | string | null;
  endAt?: Timestamp | Date | string | null;
  start?: Timestamp | Date | string | null;
  end?: Timestamp | Date | string | null;
  location?: Location;
  locationName?: string;
  address?: string;
  placeDetail?: string;
  taxiFee?: number;
  /** WeChat/Alipay surcharge — recomputed if the payment method is edited. */
  paymentFee?: number;
  /** Needed for the shared commission calc — commission is on the post-discount price. */
  discountAmount?: number;
  /** Promo code applied at booking (e.g. FREETAXI). */
  discountCode?: string;
  /** Human-readable promo label shown alongside discountCode. */
  discountLabel?: string;
  totalPrice?: number;
  total?: number;
  /** Commission split, frozen at confirm-time (tier-aware, keyed by duration). */
  therapistShare?: number;
  shopShare?: number;
  status?: string;
  reviewed?: boolean;
  reviewText?: string;
  createdAt?: Timestamp;
  userId?: string;
  userName?: string;
  /** Customer flow writes `contactName`, admin-add writes `customerName` — bookingAuthor.ts normalizes both. */
  contactName?: string;
  customerName?: string;
  phone?: string;
  holdState?: string;
  needsAdminReview?: boolean;
  reviewReason?: string;
  /** Who created this reservation. Absent on anything booked before 28x.3 — bookingAuthorLabel() falls back rather than inventing an author. */
  createdBy?: string;
  createdByEmail?: string;
  createdByPhone?: string;
  createdByName?: string;
  /** Payment METHOD (cash/transfer/…), distinct from paid/paymentStatus below. */
  payment?: string;
  paid?: boolean;
  /** Customer-flow field, kept in sync with `paid`. */
  paymentStatus?: string;
  cancelReason?: string;
  adminNote?: string;
}
