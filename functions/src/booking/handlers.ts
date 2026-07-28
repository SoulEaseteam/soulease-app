// functions/src/booking/handlers.ts
//
// Booking-domain Cloud Functions: the new-booking Telegram alert, the
// deprecated notifyBooking callable, and the scheduled reconcilers.

import "../_init";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
// 🆕 Round 28b21 — scheduled functions for Phases 2 + 4 (releaseExpiredHolds,
//   recoverAbandonedBookings).
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  DISPATCH_THERAPIST_DM,
} from "../config";
import { sendTelegramIfEnabled } from "../telegram/transport";
import {
  BookingDocLite,
  formatBookingForAdmin,
  formatBookingForTherapist,
} from "./format";

// ═════════════════════════════════════════════════════════════
// 1️⃣  notifyBooking — callable, ส่ง booking message เข้า Telegram
// ═════════════════════════════════════════════════════════════

interface NotifyPayload {
  message?: string;
  format?: "plain" | "markdown" | "html";
}

export const notifyBooking = onCall(
  {
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
    enforceAppCheck: false,
  },
  async (request) => {
    // 🆕 Round 28s81 (audit) — DEPRECATED. The app no longer calls this;
    //   booking alerts now come from the onBookingCreate trigger (server-
    //   side, can't be spoofed). This callable used to be open to anyone
    //   (no auth → spam vector into the admin group). Gated to signed-in
    //   callers only as a stop-gap; safe to delete on the next deploy.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const data = request.data as NotifyPayload;
    const message = (data?.message || "").toString().trim();
    if (!message) {
      throw new HttpsError("invalid-argument", "message is required");
    }
    if (message.length > 4000) {
      throw new HttpsError("invalid-argument", "message too long");
    }

    const token = TELEGRAM_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[notifyBooking] bot token missing");
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_BOT_TOKEN secret not configured"
      );
    }

    logger.info("[notifyBooking] sending", {
      uid: request.auth?.uid ?? "guest",
      messageLen: message.length,
    });

    const { ok, body } = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, message);
    if (!ok) {
      logger.error("[notifyBooking] Telegram error", { body: body.slice(0, 500) });
      throw new HttpsError("internal", `Telegram error: ${body.slice(0, 200)}`);
    }

    logger.info("[notifyBooking] OK");
    return { ok: true };
  }
);

interface TherapistDocLiteForTelegram {
  telegramChatId?: string | number | null;
}

export const onBookingCreate = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const bookingId = event.params.bookingId;
    const data = event.data?.data() as BookingDocLite | undefined;
    if (!data) {
      logger.warn("[onBookingCreate] no data", { bookingId });
      return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
      logger.error("[onBookingCreate] TELEGRAM_BOT_TOKEN missing");
      return;
    }


    let therapistBookable = true;
    let rejectReason = "";
    if (data.therapistId) {
      try {
        const tSnap = await getFirestore()
          .collection("therapists")
          .doc(data.therapistId)
          .get();
        const t = tSnap.data() as
          | {
              isHoliday?: boolean;
              statusOverride?: string | null;
              telegramChatId?: string | number | null;
            }
          | undefined;
        if (t?.isHoliday) {
          therapistBookable = false;
          rejectReason = "Holiday";
        } else if (t?.statusOverride === "resting") {
          therapistBookable = false;
          rejectReason = "StatusOverride=resting";
        }
      } catch (err) {
        logger.error("[onBookingCreate] therapist lookup failed", err);
        // Fail-OPEN — if Firestore is down, let the booking go through;
        // admin can manually reject. We don't want a single bad request
        // to block legitimate bookings.
      }
    }

    if (!therapistBookable) {

      logger.warn("[onBookingCreate] flagging booking for review", {
        bookingId,
        therapistId: data.therapistId,
        reason: rejectReason,
      });
      try {
        await event.data?.ref.update({
          needsAdminReview: true,
          reviewReason: rejectReason,
          flaggedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        logger.error("[onBookingCreate] flag write failed", err);
      }
      const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
      await sendTelegramIfEnabled(
        token,
        TELEGRAM_CHAT_ID,
        [
          `⚠️ NEEDS REVIEW · ${refCode}`,
          ``,
          `Reason: therapist unavailable (${rejectReason})`,
          `Therapist: ${data.therapistName ?? data.therapistId ?? "—"}`,
          `Customer: ${data.contactName ?? "—"} · ${data.phone ?? "—"}`,
          `🧖 ${data.serviceName ?? "—"} · ${data.duration ?? "?"} min`,
          `📅 ${data.date ?? "—"}  🕐 ${data.time ?? "—"}`,
          `📍 ${data.address ?? "—"}`,
          `💴 ฿${(data.totalPrice ?? 0).toLocaleString()}`,
          ``,
          `👉 Please CALL the customer to decide:`,
          `  · Re-assign to another therapist`,
          `  · Reschedule with this one`,
          `  · Cancel & refund`,
          ``,
          `Therapist DM was skipped to prevent wrong dispatch.`,
        ].join("\n")
      );
      return; // Skip therapist DM — admin handles from here.
    }

    // ── 1. Send to ADMIN group (existing behavior) ────────────────
    const adminText = formatBookingForAdmin(bookingId, data);
    const adminResult = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, adminText);
    try {
      await getFirestore()
        .collection("telegramLogs")
        .add({
          bookingId,
          ok: adminResult.ok,
          response: adminResult.body.slice(0, 500),
          source: "onBookingCreate.admin",
          at: FieldValue.serverTimestamp(),
        });
    } catch (err) {
      logger.error("[onBookingCreate] admin log write failed", err);
    }

    // ── 2. Send to THERAPIST personal chat (Round 28b27) ──────────
    //   Each therapist may have a `telegramChatId` field set on their
    //   doc. If present, we DM them the job notification too. The
    //   admin group still receives the master copy — therapist DM is
    //   purely a convenience channel ("Hey, you got a job").
    //   🆕 Round 28s82 — gated OFF (DISPATCH_THERAPIST_DM). For now the
    //   bot sends to View only; she dispatches manually.
    if (DISPATCH_THERAPIST_DM && data.therapistId) {
      try {
        const therapistSnap = await getFirestore()
          .collection("therapists")
          .doc(data.therapistId)
          .get();
        const therapist = therapistSnap.data() as
          | TherapistDocLiteForTelegram
          | undefined;
        const chatId = therapist?.telegramChatId;
        if (chatId) {
          const therapistText = formatBookingForTherapist(bookingId, data);
          const therapistResult = await sendTelegramIfEnabled(
            token,
            String(chatId),
            therapistText
          );
          await getFirestore()
            .collection("telegramLogs")
            .add({
              bookingId,
              therapistId: data.therapistId,
              ok: therapistResult.ok,
              response: therapistResult.body.slice(0, 500),
              source: "onBookingCreate.therapist",
              at: FieldValue.serverTimestamp(),
            });
        } else {
          logger.info("[onBookingCreate] therapist has no telegramChatId", {
            therapistId: data.therapistId,
          });
        }
      } catch (err) {
        // Fail-open — therapist notification is optional. Admin group
        // already got the master copy.
        logger.error("[onBookingCreate] therapist notify failed", err);
      }
    }
  }
);



export const releaseExpiredHolds = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
    const snap = await db
      .collection("bookings")
      .where("holdState", "==", "active")
      .where("holdExpiresAt", "<", now)
      .limit(500) // safety cap
      .get();

    if (snap.empty) {
      logger.info("[releaseExpiredHolds] no expired holds");
      return;
    }

    const batch = db.batch();
    let count = 0;
    snap.forEach((d) => {
      batch.update(d.ref, {
        holdState: "expired",
        holdExpiredAt: FieldValue.serverTimestamp(),
      });
      count += 1;
    });
    await batch.commit();
    logger.info("[releaseExpiredHolds] released", { count });
  }
);


// 🆕 Round 28s232 (Phase 3 — therapist safety) — alert the operator when an
//   in-session outcall job runs past its expected end time. The Tonight ops
//   board stamps `expectedEndAt` when "เริ่มนวด" is tapped and `dispatchState`
//   = "in_session"; if 20+ min pass without "จบงาน", the therapist is alone in
//   a guest's room past schedule — View gets a Telegram nudge to call and
//   check safety. One alert per job (overdueAlertedAt guard).
//   Single-field query (dispatchState ==) → no composite index needed.
export const alertOverdueSessions = onSchedule(
  {
    schedule: "every 10 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    const db = getFirestore();
    const graceMs = 20 * 60_000;
    const cutoffMs = Date.now() - graceMs;

    const snap = await db
      .collection("bookings")
      .where("dispatchState", "==", "in_session")
      .limit(100)
      .get();
    if (snap.empty) {
      logger.info("[alertOverdueSessions] no in-session jobs");
      return;
    }

    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
      logger.error("[alertOverdueSessions] missing token");
      return;
    }

    let sent = 0;
    for (const d of snap.docs) {
      const b = d.data();
      if (b.overdueAlertedAt) continue; // already nudged
      const exp: Timestamp | undefined = b.expectedEndAt;
      if (!exp || exp.toMillis() > cutoffMs) continue; // not overdue yet

      const refCode = `SR-${d.id.slice(0, 8).toUpperCase()}`;
      const text = [
        `🚨 OVERDUE SESSION · ${refCode}`,
        ``,
        `🧖 ${b.therapistName ?? "—"} · ${b.serviceName ?? "—"}`,
        `👤 ${b.contactName ?? b.customerName ?? "—"}  📞 ${b.phone ?? "—"}`,
        `📍 ${b.address ?? "—"}`,
        ``,
        `เริ่มนวดแล้วและเลยเวลาคาดจบเกิน 20 นาที — ยังไม่กด "จบงาน".`,
        `โทรเช็กความปลอดภัยหมอนวด 🙏`,
      ].join("\n");

      const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, text);
      if (r.ok) {
        await d.ref.update({ overdueAlertedAt: FieldValue.serverTimestamp() });
        sent += 1;
      }
    }
    logger.info("[alertOverdueSessions] sent", { sent });
  }
);


interface AbandonedBookingLite {
  status?: string;
  contactName?: string;
  phone?: string;
  therapistName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  lastActivityAt?: Timestamp;
}

export const recoverAbandonedBookings = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const cutoff = Timestamp.fromMillis(now - 15 * 60_000);

    const snap = await db
      .collection("abandoned_bookings")
      .where("status", "==", "open")
      .where("lastActivityAt", "<", cutoff)
      .limit(50)
      .get();

    if (snap.empty) {
      logger.info("[recoverAbandonedBookings] no carts to recover");
      return;
    }

    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
      logger.error("[recoverAbandonedBookings] missing token");
      return;
    }

    let alerted = 0;
    for (const d of snap.docs) {
      const data = d.data() as AbandonedBookingLite;
      if (!data.phone) {
        // No way to chase, just close it.
        await d.ref.update({ status: "abandoned-no-contact" });
        continue;
      }
      const text = [
        `🛒 CART ABANDONED`,
        ``,
        `👤 ${data.contactName ?? "—"}  📞 ${data.phone}`,
        `🧖 ${data.therapistName ?? "—"} · ${data.serviceName ?? "—"}`,
        `📅 ${data.date ?? "—"}  🕐 ${data.time ?? "—"}`,
        ``,
        `Customer started checkout 15+ min ago and never confirmed.`,
        `Consider sending a gentle LINE/WhatsApp follow-up.`,
      ].join("\n");
      const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, text);
      await d.ref.update({
        status: r.ok ? "alerted" : "alert-failed",
        alertedAt: FieldValue.serverTimestamp(),
      });
      alerted += 1;
    }
    logger.info("[recoverAbandonedBookings] alerted", { alerted });
  }
);

// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.31 (founder: "สถานะบนหน้าเว็บไม่เปลี่ยน") — sync a
//   therapist's live BUSY status from her active jobs onto her doc.
//
//   Problem: customer-facing cards read the therapist doc via
//   calculateTherapistStatus (busyUntil / activeBooking), but NOTHING ever
//   wrote those from bookings — so a practitioner who is mid-session still
//   showed a green "Available" card. The admin Tonight board knew (it reads
//   dispatchState off the bookings), but the guest didn't.
//
//   This reconciler runs every 2 minutes: any therapist with a booking in
//   an active dispatch state (assigned / arrived / in_session) is marked
//   activeBooking:true + busyUntil:expectedEndAt, so the engine returns
//   "bookable" (orange, not green) on her card. When the job finishes
//   (completed / done / cancelled → drops out of the active set) she's
//   cleared back to available. Conditional writes only — no churn.
//   (busyUntil also self-expires in the engine once its time passes.)
// ─────────────────────────────────────────────────────────────
export const syncTherapistBusyStatus = onSchedule(
  {
    schedule: "every 2 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
  },
  async () => {
    const db = getFirestore();
    const ACTIVE_STATES = ["assigned", "arrived", "in_session"];
    const snap = await db
      .collection("bookings")
      .where("dispatchState", "in", ACTIVE_STATES)
      .limit(300)
      .get();

    // therapistId → latest session end (Timestamp | null)
    const busy = new Map<string, Timestamp | null>();
    for (const d of snap.docs) {
      const b = d.data() as {
        therapistId?: string;
        expectedEndAt?: Timestamp;
        endAt?: Timestamp;
      };
      const tid = b.therapistId;
      if (!tid) continue;
      const end = b.expectedEndAt ?? b.endAt ?? null;
      if (!busy.has(tid)) {
        busy.set(tid, end);
      } else {
        const prev = busy.get(tid) ?? null;
        if (end && (!prev || end.toMillis() > prev.toMillis())) {
          busy.set(tid, end);
        }
      }
    }

    const tSnap = await db.collection("therapists").get();
    const batch = db.batch();
    let changes = 0;
    for (const t of tSnap.docs) {
      const data = t.data() as {
        id?: string;
        activeBooking?: boolean;
      };
      // bookings store therapistId as the doc id, but match the mutable
      // `id` field too, defensively.
      const key = busy.has(t.id)
        ? t.id
        : data.id && busy.has(data.id)
        ? data.id
        : null;
      if (key != null) {
        if (data.activeBooking !== true) {
          batch.update(t.ref, {
            activeBooking: true,
            busyUntil: busy.get(key) ?? null,
          });
          changes += 1;
        }
      } else if (data.activeBooking === true) {
        batch.update(t.ref, { activeBooking: false, busyUntil: null });
        changes += 1;
      }
    }
    if (changes > 0) await batch.commit();
    logger.info("[syncTherapistBusyStatus]", {
      activeBookings: snap.size,
      busyTherapists: busy.size,
      changes,
    });
  }
);
