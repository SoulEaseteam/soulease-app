// src/utils/bookingFormStorage.ts
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage
//   as part of the file-split refactor.
//
// Why sessionStorage (not localStorage):
//   When the customer navigates Confirm Order → Payment Methods →
//   back, BookingFlowPage unmounts + remounts. Without persistence
//   the WIP form (location pin, address, contact name, etc.) is wiped
//   because it lived in `useState`. Mirroring to sessionStorage keyed
//   by therapistId means a single therapist's WIP booking survives
//   a side-trip but a fresh booking for a different therapist starts
//   clean — and everything auto-clears when the tab closes (privacy +
//   no stale state on next visit).

export interface BookingFormState {
  serviceId: string | null;
  duration: number | null;
  date: string | null;
  time: string | null;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  addressDetails: string;
  /** Customer's contact name — required, captured on Select Location page */
  contactName: string;
  customerPhone: string;
  /** Note attached to the address (Floor/Room/Landmarks) */
  addressNote: string;
  /** Optional meeting-point convention (lobby / lift / direct) */
  meetingPoint: string | null;
  /** Optional building category (hotel / condo / house / office / other) */
  locationType: string | null;
  /** Auto-generated Google Maps deep-link to the pinned location */
  mapUrl: string | null;
  language: string;
  selectedAddons: string[];
  notes: string;
  /** Customer-entered discount code (no backend validation yet — admin
   *  applies it manually after seeing the booking). */
  discountCode: string;
  therapistId: string | null;
}

export const initialFormState: BookingFormState = {
  serviceId: null,
  duration: null,
  date: null,
  time: null,
  locationName: null,
  locationAddress: null,
  lat: null,
  lng: null,
  addressDetails: "",
  contactName: "",
  customerPhone: "",
  addressNote: "",
  meetingPoint: null,
  locationType: null,
  mapUrl: null,
  language: "en",
  selectedAddons: [],
  notes: "",
  discountCode: "",
  therapistId: null,
};

const FORM_STORAGE_PREFIX = "sunred.booking.form.";

function formStorageKey(
  therapistId: string | null | undefined
): string | null {
  if (!therapistId) return null;
  return `${FORM_STORAGE_PREFIX}${therapistId}`;
}

export function readPersistedForm(
  therapistId: string | null | undefined
): Partial<BookingFormState> | null {
  if (typeof window === "undefined") return null;
  const key = formStorageKey(therapistId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BookingFormState>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writePersistedForm(
  therapistId: string | null | undefined,
  form: BookingFormState
): void {
  if (typeof window === "undefined") return;
  const key = formStorageKey(therapistId);
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(form));
  } catch {
    /* ignore quota / privacy mode failures */
  }
}

export function clearPersistedForm(
  therapistId: string | null | undefined
): void {
  if (typeof window === "undefined") return;
  const key = formStorageKey(therapistId);
  if (!key) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
