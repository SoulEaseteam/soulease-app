// functions/src/therapists.ts
//
// Therapist-domain Cloud Functions: the audit-log trigger on therapist
// doc edits.

import "./_init";

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// 🆕 Round 28w.78 (founder: "audit-log มันอัปเดตตลอดเวลาเกินไป ให้เก็บเฉพาะ
//   การกระทำจริงก็พอ") — this trigger logged an audit row for ANY therapist
//   field change, so it was recording machine churn, not decisions:
//
//     • `viewCount` is bumped by EVERY public profile view (firestore.rules
//       lets an anonymous visitor do viewCount + 1). That single key was
//       generating ~all of the ~100 rows/day the founder was seeing.
//     • GPS / presence / booking-state fields are written continuously by the
//       therapist app and the booking flow — nobody "did" them.
//     • Derived aggregates (rating, counts) are recomputed, not decided.
//
//   Keep only fields a human deliberately changes.
const AUDIT_IGNORE_KEYS = new Set([
  // bookkeeping
  "updatedAt",
  "createdAt",
  "bioGeneratedAt",
  "badgeUpdatedAt",
  "updatedBy",
  // pure telemetry — THE spammer: one row per profile view
  "viewCount",
  "views",
  // live presence / GPS churn (therapist app writes these constantly)
  "currentLocation",
  "lat",
  "lng",
  "area",
  "lastSeen",
  "lastActiveAt",
  "online",
  // auto-maintained by the booking flow, not a human action
  "activeBooking",
  "busyUntil",
  // derived aggregates — recomputed, never "decided"
  "rating",
  "reviewCount",
  "reviews",
  "totalSessions",
  "sessions",
]);

/** Truncate large values so audit log row stays small. */
function truncateValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    return v.length > 200 ? v.slice(0, 200) + "…" : v;
  }
  if (Array.isArray(v)) {
    return v.length > 20 ? `[array len ${v.length}]` : v;
  }
  if (typeof v === "object") {
    try {
      const json = JSON.stringify(v);
      return json.length > 400 ? `[object ${json.length} chars]` : v;
    } catch {
      return "[unserializable]";
    }
  }
  return v;
}

interface TherapistDocLite {
  [key: string]: unknown;
  updatedBy?: string;
}

export const onTherapistUpdate = onDocumentUpdated(
  {
    document: "therapists/{therapistId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const before = (event.data?.before.data() ?? {}) as TherapistDocLite;
    const after = (event.data?.after.data() ?? {}) as TherapistDocLite;
    const therapistId = event.params.therapistId;

    // Compute changed keys (skip ignored)
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of allKeys) {
      if (AUDIT_IGNORE_KEYS.has(key)) continue;
      const b = before[key];
      const a = after[key];
      if (JSON.stringify(b) === JSON.stringify(a)) continue;
      changes[key] = {
        before: truncateValue(b),
        after: truncateValue(a),
      };
    }

    if (Object.keys(changes).length === 0) {
      logger.info("[onTherapistUpdate] no meaningful change, skip", {
        therapistId,
      });
      return;
    }

    // updatedBy is best-effort — client should write it on self-edits.
    const updatedBy =
      typeof after.updatedBy === "string" ? after.updatedBy : null;

    try {
      await getFirestore()
        .collection("auditLogs")
        .add({
          // 🆕 28w.78 — this write had NO `action` field, so every one of these
          //   rows rendered as "ไม่ทราบประเภท" in /admin/audit-log (the page
          //   falls back to that label only when `action` isn't a string).
          //   Stamp the same action the admin UI uses, and put the actor where
          //   the page expects it.
          action: "therapist.update",
          actorId: updatedBy,
          actorEmail: null,
          collection: "therapists",
          docId: therapistId,
          updatedBy,
          changedKeys: Object.keys(changes),
          changes,
          detail: { therapistId, changedKeys: Object.keys(changes) },
          at: FieldValue.serverTimestamp(),
        });
      logger.info("[onTherapistUpdate] logged", {
        therapistId,
        keys: Object.keys(changes),
      });
    } catch (err) {
      logger.error("[onTherapistUpdate] write failed", { therapistId, err });
    }
  }
);
