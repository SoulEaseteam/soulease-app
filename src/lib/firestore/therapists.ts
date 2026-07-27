// src/lib/firestore/therapists.ts
//
// Additive, opt-in `therapists` collection access helpers, added during
// the 2026-07-27 restructure. Not yet used anywhere — see the note in
// bookings.ts for why existing call sites weren't migrated.
import {
  collection,
  doc,
  query,
  where,
  type CollectionReference,
  type DocumentReference,
  type Query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Therapist } from "@/types/therapist";

export const therapistsCollection: CollectionReference =
  collection(db, "therapists");

/** By Firestore doc id (the common case — most reads key off the doc id directly). */
export const therapistDocRef = (therapistId: string): DocumentReference =>
  doc(db, "therapists", therapistId);

/**
 * By the therapist doc's own `id` field, distinct from the Firestore doc id
 * (some legacy docs' doc-id and `id` field diverge — see
 * AdminTherapistDetailPage.tsx for the fallback lookup this mirrors).
 */
export const therapistByFieldId = (id: string): Query =>
  query(therapistsCollection, where("id", "==", id));

export const therapistByEmail = (email: string): Query =>
  query(therapistsCollection, where("email", "==", email.toLowerCase()));

export type { Therapist };
