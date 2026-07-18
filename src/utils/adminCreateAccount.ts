// src/utils/adminCreateAccount.ts
//
// 🆕 Round 28x.55 (founder: "ยูสเซอร์ลูกค้า SRD-V9PN4H รหัส 0641185367 ให้เข้าตามนี้")
//   — call the admin-only `createCustomerAccount` Cloud Function. Enrolling a
//   member used to only write a record; the guest still had to register
//   themselves, so most issued SRD codes were never used. This mints the login
//   for them:
//       username = their SRD- code   ·   password = their phone digits
//   The function enforces admin-only server-side; this is just the caller.

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

export interface CreateCustomerAccountResult {
  ok: boolean;
  uid: string;
  /** What the guest types as their username — the SRD- code. */
  username: string;
  /** Their password — the phone digits. */
  password: string;
}

export async function adminCreateCustomerAccount(args: {
  /** The member's phone — becomes the password (and links the membership). */
  phone: string;
  /** Their SRD- member code — becomes the username. */
  code: string;
  /** Optional display name. */
  name?: string;
}): Promise<CreateCustomerAccountResult> {
  const functions = getFunctions(app, "asia-southeast1");
  const fn = httpsCallable<typeof args, CreateCustomerAccountResult>(
    functions,
    "createCustomerAccount"
  );
  const res = await fn(args);
  return res.data;
}
