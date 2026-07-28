// src/types/user.ts
//
// Canonical `users` doc shape, reconciled from 2 independently-defined
// local interfaces (AdminUserDetailPage, AdminUsersPage) during the
// 2026-07-27 restructure. Fields are nullable/optional here to match
// the looser of the two originals — call sites with their own stricter
// guarantees (e.g. always synthesizing `id` before use) narrow this
// type locally via Omit + intersection rather than weakening it here
// for everyone.
import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "therapist" | "user";

export interface User {
  id?: string;
  email?: string | null;
  role?: UserRole | null;
  name?: string | null;
  phone?: string | null;
  createdAt?: Timestamp;
  isActive?: boolean;
  image?: string;
  username?: string;
}
