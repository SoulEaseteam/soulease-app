// src/lib/firestore/adminSettings.ts
//
// Additive, opt-in `adminSettings` collection access helpers, added
// during the 2026-07-27 restructure. Not yet used anywhere — see the
// note in bookings.ts for why existing call sites weren't migrated.
//
// `adminSettings` is a small fixed set of singleton config docs (not a
// growing collection), each keyed by a hardcoded doc id that ~10 admin
// pages currently spell out independently as a bare string. Centralizing
// the id list here at least makes the known set discoverable and typo-safe
// for new code, even before any existing call site is migrated.
import { doc, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ADMIN_SETTINGS_IDS = [
  "advanced",
  "earnings",
  "members",
  "membership",
  "publicRules",
] as const;

export type AdminSettingId = (typeof ADMIN_SETTINGS_IDS)[number];

export const adminSettingDocRef = (id: AdminSettingId): DocumentReference =>
  doc(db, "adminSettings", id);
