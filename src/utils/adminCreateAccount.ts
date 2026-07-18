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

// 🆕 Round 28x.58 (founder: "ตั้ง SUNRED 0634350987 เป็นแอดมิน") — promote or
//   demote an existing member account. The function moves BOTH /admins/{uid}
//   (what the security rules actually check) and users/{uid}.role (what the
//   UI reads), so the two can't drift apart.
export interface SetMemberAdminResult {
  ok: boolean;
  uid: string;
  isAdmin: boolean;
}

// 🆕 Round 28x.59 — mint a dedicated admin login whose credentials aren't
//   derived from anything public (unlike a member account, where the username
//   is the SRD- code and the password is the phone).
export interface CreateAdminAccountResult {
  ok: boolean;
  uid: string;
  username: string;
}

export async function adminCreateAdminAccount(args: {
  /** 3-20 chars, starts with a letter. Must not look like an SRD- code. */
  username: string;
  /** Typed by the concierge — min 10 chars, not digits only. */
  password: string;
  name?: string;
}): Promise<CreateAdminAccountResult> {
  const functions = getFunctions(app, "asia-southeast1");
  const fn = httpsCallable<typeof args, CreateAdminAccountResult>(
    functions,
    "createAdminAccount"
  );
  const res = await fn(args);
  return res.data;
}

export async function adminSetMemberAdmin(args: {
  /** The member's phone — must already have a login account. */
  phone: string;
  /** true = grant admin, false = revoke. */
  makeAdmin: boolean;
}): Promise<SetMemberAdminResult> {
  const functions = getFunctions(app, "asia-southeast1");
  const fn = httpsCallable<typeof args, SetMemberAdminResult>(
    functions,
    "setMemberAdmin"
  );
  const res = await fn(args);
  return res.data;
}
