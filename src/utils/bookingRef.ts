// src/utils/bookingRef.ts
//
// 🆕 Round 28w.98 (founder: "เอาเป็นหมายเลขการจองแทน เพื่อให้สามารถเปิดเผยได้") —
//   the guest-facing reservation reference.
//
// The Anniversary dialog used to identify a member by their SRD- membership code.
// That code is the credential the concierge uses to recognise a member, so it
// behaves like a card number — and the dialog is exactly the sort of screen a
// guest screenshots or has open in a hotel lobby.
//
// The BOOKING reference is the right thing to show instead: it is disclosable by
// design (we already print it on the confirmation screen), it identifies the
// reservation rather than the person, and it grants nothing to whoever reads it.
//
// The format was already in use on BookingSuccessPage — lifted here rather than
// re-derived, so the number the guest sees in the reward dialog is byte-identical
// to the one on their confirmation. Two independent slice/uppercase expressions
// is exactly how they end up disagreeing by a character.

/** `SR-` + first 8 chars of the Firestore doc id, uppercased. */
export function bookingRef(id: string | null | undefined): string {
  if (!id) return "SR-—";
  return `SR-${id.slice(0, 8).toUpperCase()}`;
}
