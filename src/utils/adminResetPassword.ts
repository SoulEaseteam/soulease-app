// src/utils/adminResetPassword.ts
//
// 🆕 Round 28x.29 (founder) — call the admin-only `resetCustomerPassword`
//   Cloud Function. It resets the target customer's Firebase Auth password
//   to their own phone number so a guest who forgot their password can be
//   let back in (they log in with their username/phone + phone-as-password).
//   The function enforces admin-only server-side; this is just the caller.

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

export interface ResetCustomerPasswordResult {
  ok: boolean;
  /** The new password — the customer's phone (digits only). */
  newPassword: string;
  /** Their username, if they signed up with one (else null). */
  username: string | null;
  phone: string;
}

export async function adminResetCustomerPassword(
  uid: string
): Promise<ResetCustomerPasswordResult> {
  const functions = getFunctions(app, "asia-southeast1");
  const fn = httpsCallable<{ uid: string }, ResetCustomerPasswordResult>(
    functions,
    "resetCustomerPassword"
  );
  const res = await fn({ uid });
  return res.data;
}
