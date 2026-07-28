// functions/src/accounts.ts
//
// Account / auth-domain Cloud Functions: role assignment on sign-up and
// the admin-only customer password reset.

import "./_init";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as functionsV1 from "firebase-functions/v1";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const setRoleOnSignup = functionsV1
  .region("asia-southeast1")
  .auth.user()
  .onCreate(async (user) => {
    const db = getFirestore();
    const auth = getAuth();
    const uid = user.uid;
    const email = (user.email ?? "").toLowerCase().trim();

    let role: "admin" | "therapist" | "customer" = "customer";
    let linkedTherapistId: string | null = null;

    try {
      // 1) admin?
      const adminSnap = await db.collection("admins").doc(uid).get();
      if (adminSnap.exists) {
        role = "admin";
      } else if (email) {
        // 2) therapist by email?
        const therapistSnap = await db
          .collection("therapists")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!therapistSnap.empty) {
          role = "therapist";
          linkedTherapistId = therapistSnap.docs[0].id;
          // Link therapist doc → uid so rules can match by docId / uid field
          await therapistSnap.docs[0].ref.update({
            uid,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      await auth.setCustomUserClaims(uid, { role });

      // Mirror role into /users/{uid} so the client UI can read it
      // without forcing an ID-token refresh.
      await db.collection("users").doc(uid).set(
        {
          uid,
          email,
          role,
          therapistId: linkedTherapistId,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("[setRoleOnSignup] OK", { uid, email, role, linkedTherapistId });
    } catch (err) {
      logger.error("[setRoleOnSignup] failed", { uid, email, err });
      // fail-open: don't block sign-up if claim assignment fails
    }
  });

// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.29 (founder) — Admin: reset a customer's login password
//   to their own phone number.
//
//   Customers sign in via Firebase Auth on a synthetic alias email
//   (0812345678@phone.sunred.vip). Phone/username guests have no real
//   mailbox, so the standard reset-link email is undeliverable and they
//   had no recovery path. Founder flow: guest forgets → tells us their
//   phone → admin taps "reset" → password becomes that phone → they log
//   in with their username (or phone) + phone-as-password.
//
//   Security: admin-only (verified against the authoritative admins/{uid}
//   doc). Phone is low-entropy on purpose — usability for low-value guest
//   logins. Every reset is written to auditLogs.
// ─────────────────────────────────────────────────────────────
export const resetCustomerPassword = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const db = getFirestore();
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
      throw new HttpsError("permission-denied", "Admin only.");
    }
    const uid = String(
      (request.data as { uid?: string } | undefined)?.uid ?? ""
    ).trim();
    if (!uid) {
      throw new HttpsError("invalid-argument", "uid is required.");
    }
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found.");
    }
    const u = userSnap.data() as {
      phone?: string;
      username?: string;
    };
    // Strip to digits; Firebase requires a password of at least 6 chars.
    const phone = String(u.phone ?? "").replace(/\D/g, "");
    if (phone.length < 6) {
      throw new HttpsError(
        "failed-precondition",
        "This customer has no valid phone number on file, so it can't be used as the new password."
      );
    }
    await getAuth().updateUser(uid, { password: phone });
    await db.collection("auditLogs").add({
      action: "user.password_reset",
      byUid: request.auth.uid,
      targetUid: uid,
      at: FieldValue.serverTimestamp(),
    });
    logger.info("[resetCustomerPassword] reset to phone", {
      targetUid: uid,
      byUid: request.auth.uid,
    });
    return {
      ok: true,
      newPassword: phone,
      username: u.username ?? null,
      phone,
    };
  }
);
