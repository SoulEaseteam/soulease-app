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

/**
 * 🆕 Round 28w.99 (founder: "เปิดตรงกลางสักหน่อยก็ได้ ไม่ต้องโชว์หมด") — the
 * reference with its middle masked, for the reward dialog.
 *
 *     SR-5DYYOM2M  →  SR-5Dxxxx2M
 *
 * The head and tail are enough for the guest to recognise their own reservation
 * and for the concierge to find it once they confirm the rest; the full string
 * never sits on a screen that gets screenshotted or read over a shoulder.
 *
 * The FULL reference is unchanged everywhere it is actually needed — the booking
 * confirmation the guest receives, and every admin surface. This masks the
 * display only; it is not a new identifier, so nothing downstream has to be
 * taught about it.
 *
 * Anything that isn't a well-formed reference is returned untouched rather than
 * mangled into a misleading fake.
 */
export function maskBookingRef(ref: string | null | undefined): string {
  if (!ref) return "";
  const m = /^(SR-)([A-Z0-9]{2})([A-Z0-9]{2,})([A-Z0-9]{2})$/.exec(ref.trim());
  if (!m) return ref;
  const [, prefix, head, middle, tail] = m;
  return `${prefix}${head}${"x".repeat(middle.length)}${tail}`;
}
