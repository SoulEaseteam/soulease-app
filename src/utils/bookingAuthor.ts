// src/utils/bookingAuthor.ts
//
// 🆕 Round 28x.3 (founder: "เบอร์โทรแอดมินละ จะระบุได้ไง ใครจอง") — stamp WHO
//   created a reservation.
//
// What was there before:
//   • AdminBookingAddPage wrote `createdBy: "admin"` — the literal string. It
//     tells you a human in the back office made it, and nothing else.
//   • BookingFlowPage, which the concierge ALSO books through (isAdminBooking),
//     wrote nothing at all.
//
// With one founder that was survivable. The moment a second person can touch the
// back office it is not: a reservation with the wrong price, the wrong therapist
// or a comped total has no author, so there is no way to ask who did it and no
// way to clear the person who didn't.
//
// So every booking now carries the identity of whoever created it — uid (stable,
// survives an email change), email, and the phone the admin put on their own
// account page. The phone matters because it is what a therapist or a guest
// actually calls when something goes wrong at 2am; an email address is useless
// on a doorstep.
//
// `createdBy` is kept as-is ("admin" / "guest") so nothing reading the old field
// breaks.

export type BookingSource = "admin" | "guest";

export interface BookingAuthor {
  createdBy: BookingSource;
  /** Firebase uid of the creator. Null for a guest booking themselves. */
  createdByUid: string | null;
  createdByEmail: string | null;
  /** Admin's own phone, from users/{uid}.phone. Null if they haven't set one. */
  createdByPhone: string | null;
  createdByName: string | null;
}

export function bookingAuthor(args: {
  isAdmin: boolean;
  uid?: string | null;
  email?: string | null;
  displayName?: string | null;
  phone?: string | null;
}): BookingAuthor {
  const source: BookingSource = args.isAdmin ? "admin" : "guest";
  return {
    createdBy: source,
    createdByUid: args.uid ?? null,
    createdByEmail: args.email ?? null,
    createdByPhone: args.isAdmin ? (args.phone ?? null) : null,
    createdByName: args.displayName ?? null,
  };
}

/** Short label for admin tables: "View · 0812345678" → falls back sensibly. */
export function bookingAuthorLabel(b: {
  createdBy?: string | null;
  createdByEmail?: string | null;
  createdByPhone?: string | null;
  createdByName?: string | null;
}): string {
  if (b.createdBy !== "admin") return "ลูกค้าจองเอง";
  const who = b.createdByName || b.createdByEmail;
  // An old booking predates this stamp — say so rather than inventing an author.
  if (!who) return "แอดมิน (ไม่ระบุ)";
  return b.createdByPhone ? `${who} · ${b.createdByPhone}` : who;
}
