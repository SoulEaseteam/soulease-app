// src/lib/bookingReview.ts
//
// 🆕 Round 28x.173 — booking-scoped guest review, no account required.
//
// Founder: "ถ้าอยากทำรีวิวแบบไม่ต้องสมัครหรือเป็นสมาชิกได้ไหม แค่หลังจบงาน
//   เอาลิ้งให้ลูกค้าให้คะแนนรีวิว ได้เลย".
//
// Same guest-identity problem as booking chat (src/lib/bookingChat.ts), same
// fix, reused directly: the guest holds the checkout `accessToken`, not an
// account. claimBookingReview verifies it server-side and mints a custom
// token carrying a `bookingReview` claim, which firestore.rules' reviews
// create rule reads. Signs into the SAME secondary guest Firebase app
// bookingChat.ts already set up — see ensureGuestApp's export comment for
// why that's one app, not two.

import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

import { app, db as primaryDb } from "@/lib/firebase";
import { ensureGuestApp } from "@/lib/bookingChat";
import { isInappropriate } from "@/utils/moderate";

export interface BookingReviewClaim {
  alreadyReviewed: boolean;
  therapistId: string | null;
  therapistName: string | null;
  /** True when the caller is the signed-in owner — writes go via primaryDb. */
  isOwner: boolean;
}

interface ClaimResponse {
  ok: boolean;
  customToken: string | null;
  alreadyReviewed: boolean;
  therapistId: string | null;
  therapistName: string | null;
}

/**
 * Exchange the checkout capability token for permission to review this ONE
 * booking. Throws `failed-precondition` if the job isn't marked done yet,
 * `permission-denied` for a bad token or unknown booking (deliberately
 * indistinguishable, same reasoning as claimBookingChat).
 */
export async function claimBookingReview(
  bookingId: string,
  accessToken: string
): Promise<BookingReviewClaim> {
  const fn = httpsCallable<
    { bookingId: string; token: string },
    ClaimResponse
  >(getFunctions(app, "asia-southeast1"), "claimBookingReview");
  const res = await fn({ bookingId, token: accessToken });
  const data = res.data;

  if (!data?.customToken) {
    return {
      alreadyReviewed: Boolean(data?.alreadyReviewed),
      therapistId: data?.therapistId ?? null,
      therapistName: data?.therapistName ?? null,
      isOwner: true,
    };
  }

  const { auth: gAuth } = ensureGuestApp();
  await signInWithCustomToken(gAuth, data.customToken);
  return {
    alreadyReviewed: data.alreadyReviewed,
    therapistId: data.therapistId,
    therapistName: data.therapistName,
    isOwner: false,
  };
}

/**
 * Submit the review. Writes to `reviews/{bookingId}` — the deterministic doc
 * id IS the dedup mechanism (firestore.rules requires bookingId == reviewId
 * on this path, and Firestore's own `create` semantics reject a second write
 * to the same path — no separate "already reviewed" query needed here).
 *
 * `isOwner` picks the db the same way claimBookingChat's caller does: the
 * signed-in owner's own session already satisfies the userId branch of the
 * rule, so her write goes through the PRIMARY app, not the guest one.
 */
export async function submitBookingReview(params: {
  bookingId: string;
  therapistId: string;
  rating: number;
  comment: string;
  isOwner: boolean;
}): Promise<void> {
  const { bookingId, therapistId, rating, comment } = params;
  const trimmed = comment.trim();
  if (trimmed && (await isInappropriate(trimmed))) {
    throw new Error("Review contains inappropriate content. Please revise.");
  }

  const targetDb = params.isOwner ? primaryDb : ensureGuestApp().db;
  const payload: Record<string, unknown> = {
    bookingId,
    therapistId,
    rating: Math.round(rating),
    status: "pending",
    createdAt: Timestamp.now(),
  };
  if (trimmed) payload.comment = trimmed;

  await setDoc(doc(collection(targetDb, "reviews"), bookingId), payload);
}
