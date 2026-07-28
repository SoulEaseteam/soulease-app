// src/lib/firestore/bookings.ts
//
// Additive, opt-in `bookings` collection access helpers, added during
// the 2026-07-27 restructure. Not yet used anywhere — the 30+ existing
// call sites that build their own `collection(db, "bookings")` queries
// inline were left as-is (migrating them all in one pass isn't
// realistically verifiable). Use these for new code, and migrate an
// existing file's calls opportunistically when you're already touching
// it for other work — see CLAUDE.md for the convention.
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  type CollectionReference,
  type DocumentReference,
  type Query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/types/booking";

export const bookingsCollection: CollectionReference =
  collection(db, "bookings");

export const bookingDocRef = (bookingId: string): DocumentReference =>
  doc(db, "bookings", bookingId);

export const bookingsByTherapist = (therapistId: string): Query =>
  query(bookingsCollection, where("therapistId", "==", therapistId));

export const bookingsByStatus = (status: string | string[]): Query =>
  query(
    bookingsCollection,
    Array.isArray(status)
      ? where("status", "in", status)
      : where("status", "==", status)
  );

export const bookingsCreatedSince = (since: Date): Query =>
  query(
    bookingsCollection,
    where("createdAt", ">=", since),
    orderBy("createdAt", "desc")
  );

export type { Booking };
