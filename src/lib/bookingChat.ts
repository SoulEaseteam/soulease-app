// src/lib/bookingChat.ts
//
// 🆕 Round 28x.140 — the guest half of the booking chat.
//
// Founder: "ต้องจองแล้วเท่านั้นถึงจะแชทกับพนักงานเพื่อคอนเฟิร์มออเดอได้".
//
// WHY A SECOND FIREBASE APP (this is the part that looks odd and isn't):
//   A guest on /booking/success/:id?t=… is normally signed out. To read and
//   write her own thread she has to become SOMEBODY, so `claimBookingChat`
//   mints a custom token scoped to that one booking. Signing that token into
//   the app's primary `auth` would overwrite whatever session is already
//   there — and a practitioner or View opening a guest's link is not
//   hypothetical, it is how they check on a reservation.
//
//   Firebase allows exactly one Auth instance per app, so the only way to hold
//   a second session concurrently is a second app. That's what this module is:
//   an isolated app + auth + firestore whose entire job is one booking thread.
//   Nothing else in the codebase touches it, and the primary session never
//   notices it exists.
//
//   Persistence is deliberately IN-MEMORY. The claim is re-mintable at any
//   time from the URL token, so writing a second session to disk would add a
//   stale-token failure mode and a lingering identity on a shared device in
//   exchange for saving one callable round-trip.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInWithCustomToken,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import {
  app,
  auth as primaryAuth,
  db as primaryDb,
  firebaseConfig,
} from "@/lib/firebase";

const GUEST_APP_NAME = "sunred-guest-chat";

export interface BookingChatClaim {
  /** Firestore instance the thread must be read/written through. */
  db: Firestore;
  /** Practitioner display name, or null before she's assigned. */
  therapistName: string | null;
  /** True once a practitioner is on the job (and staff chat isn't disabled). */
  assigned: boolean;
  status: string;
}

interface ClaimResponse {
  ok: boolean;
  /** Null when the caller is the signed-in owner — her own session already works. */
  customToken: string | null;
  therapistName: string | null;
  assigned: boolean;
  status: string;
}

let guestApp: FirebaseApp | null = null;
let guestAuth: Auth | null = null;
let guestDb: Firestore | null = null;

// Exported (28x.173) so bookingReview.ts can reuse the SAME guest app
// instance instead of standing up a third Firebase app for what is
// conceptually identical: a guest's temporary anonymous identity scoped to
// one booking, no-login, in-memory persistence. Chat and review claims sign
// into the same auth instance at different times (whichever the guest is
// currently doing), which is fine — the custom token's claim, not the app,
// is what scopes each capability.
export function ensureGuestApp(): { auth: Auth; db: Firestore } {
  if (!guestApp) {
    guestApp =
      getApps().find((a) => a.name === GUEST_APP_NAME) ??
      initializeApp(firebaseConfig, GUEST_APP_NAME);
  }
  if (!guestAuth) {
    try {
      guestAuth = initializeAuth(guestApp, { persistence: inMemoryPersistence });
    } catch {
      // Already initialised (HMR / a second panel mount in the same session).
      guestAuth = getAuth(guestApp);
    }
  }
  if (!guestDb) {
    try {
      // Same long-polling auto-detect as the primary db (28s325) — the guest
      // is on the exact networks that bug shows up on (hotel wifi, LINE and
      // Telegram in-app browsers).
      guestDb = initializeFirestore(guestApp, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      guestDb = getFirestore(guestApp);
    }
  }
  // 🆕 Round 28x.164 — App Check init, mirroring src/lib/firebase.ts. App
  //   Check tokens are per-FirebaseApp-instance, not per-project — the
  //   primary app being wired does NOT cover this SEPARATE guest app.
  //   Without this, the day enforcement is turned on, guest booking chat
  //   (the one surface that talks to Firestore through THIS app) would go
  //   dark while everything else on the site kept working — exactly the
  //   kind of narrow, easy-to-miss gap this file's own header warns about.
  //   Inert no-op today: same env-var gate, same "off until a real key
  //   exists" default as the primary app.
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as
    | string
    | undefined;
  if (RECAPTCHA_SITE_KEY) {
    try {
      initializeAppCheck(guestApp, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Already initialized (HMR / repeat mount).
    }
  }
  return { auth: guestAuth, db: guestDb };
}

/**
 * Exchange the checkout capability token for a chat session.
 *
 * Returns the Firestore instance the thread must use — the PRIMARY db when the
 * caller is the signed-in owner (her own uid already satisfies the rules), the
 * guest-app db otherwise. Callers should not choose between them themselves.
 *
 * Throws whatever the callable throws — `permission-denied` for a bad token or
 * unknown booking (the two are deliberately indistinguishable server-side),
 * `failed-precondition` when View has closed chat from admin settings.
 */
export async function claimBookingChat(
  bookingId: string,
  accessToken: string
): Promise<BookingChatClaim> {
  const fn = httpsCallable<
    { bookingId: string; token: string },
    ClaimResponse
  >(getFunctions(app, "asia-southeast1"), "claimBookingChat");
  const res = await fn({ bookingId, token: accessToken });
  const data = res.data;

  if (!data?.customToken) {
    // Signed-in owner path — no second identity needed or wanted.
    return {
      db: primaryDb,
      therapistName: data?.therapistName ?? null,
      assigned: Boolean(data?.assigned),
      status: data?.status ?? "pending",
    };
  }

  const { auth: gAuth, db } = ensureGuestApp();
  // Re-signing in with a fresh token on every mount is intentional: it is one
  // request, and it removes any question of whether a cached session still
  // matches the booking currently on screen.
  await signInWithCustomToken(gAuth, data.customToken);
  return {
    db,
    therapistName: data.therapistName ?? null,
    assigned: Boolean(data.assigned),
    status: data.status ?? "pending",
  };
}

/** True when the visitor is signed in as the booking's owner. */
export function isSignedInOwner(bookingUserId: string | null | undefined): boolean {
  const uid = primaryAuth.currentUser?.uid;
  return Boolean(uid && bookingUserId && uid === bookingUserId);
}
