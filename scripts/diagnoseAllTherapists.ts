// scripts/diagnoseAllTherapists.ts
//
// 🔍 Round 28as — bulk version of diagnoseTherapistStatus.ts
// Loops over EVERY therapist in src/data/therapists and reports:
//   • stale therapist-doc fields (isBooked, activeBooking, busyUntil,
//     statusOverride, isHoliday)
//   • active bookings (status pending/confirmed/in_progress)
//        - "active now"   = startAt ≤ now < endAt
//        - "active future"= startAt > now
//
// Flags:
//   --fix             clear stale fields on therapist docs
//   --cancel-active   set status='cancelled' on bookings covering "now"
//   --cancel-future   set status='cancelled' on future active bookings
//   --cancel-all      shorthand for --cancel-active + --cancel-future
//
// Usage:
//   cd ~/sunred-vite/scripts
//   npx tsx diagnoseAllTherapists.ts
//   npx tsx diagnoseAllTherapists.ts --fix --cancel-all

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { createRequire } from "module";

import therapists from "../src/data/therapists";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const FIX_MODE = process.argv.includes("--fix");
const CANCEL_ACTIVE =
  process.argv.includes("--cancel-active") ||
  process.argv.includes("--cancel-all");
const CANCEL_FUTURE =
  process.argv.includes("--cancel-future") ||
  process.argv.includes("--cancel-all");

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

function asMs(v: unknown): number | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function bkkLabel(ms: number | null): string {
  if (!ms) return "—";
  const bkk = new Date(ms + 7 * 60 * 60 * 1000);
  return bkk.toISOString().replace("T", " ").slice(0, 16) + " BKK";
}

interface PerTherapistResult {
  id: string;
  name: string;
  staleCleared: number;
  activeNowCancelled: number;
  futureCancelled: number;
  causes: string[];
}

async function diagnoseOne(
  therapistId: string,
  name: string
): Promise<PerTherapistResult> {
  const result: PerTherapistResult = {
    id: therapistId,
    name,
    staleCleared: 0,
    activeNowCancelled: 0,
    futureCancelled: 0,
    causes: [],
  };

  const nowMs = Date.now();

  // 1) Therapist doc — try docId then `id` field
  let therapistDoc;
  const directRef = db.collection("therapists").doc(therapistId);
  const snap = await directRef.get();
  if (snap.exists) {
    therapistDoc = snap;
  } else {
    const q = await db
      .collection("therapists")
      .where("id", "==", therapistId)
      .limit(1)
      .get();
    if (q.empty) {
      result.causes.push("doc not found");
      return result;
    }
    therapistDoc = q.docs[0];
  }
  const data = therapistDoc.data() as Record<string, unknown>;

  // 2) Stale doc fields
  const busyUntilMs = asMs(data.busyUntil);
  const busyUntilFuture = busyUntilMs !== null && busyUntilMs > nowMs;
  if (data.isBooked === true) result.causes.push("isBooked=true");
  if (data.activeBooking === true) result.causes.push("activeBooking=true");
  if (busyUntilFuture)
    result.causes.push(`busyUntil future ${bkkLabel(busyUntilMs)}`);
  if (data.isHoliday === true) result.causes.push("isHoliday=true");
  if (data.statusOverride && data.statusOverride !== "Auto") {
    result.causes.push(`statusOverride=${data.statusOverride}`);
  }

  if (FIX_MODE) {
    const update: Record<string, unknown> = {};
    if (data.isBooked === true) update.isBooked = false;
    if (data.activeBooking === true) update.activeBooking = false;
    if (busyUntilFuture) update.busyUntil = null;
    if (data.statusOverride && data.statusOverride !== "Auto") {
      update.statusOverride = "Auto";
    }
    if (data.isHoliday === true) update.isHoliday = false;
    if (Object.keys(update).length > 0) {
      update.updatedAt = FieldValue.serverTimestamp();
      await therapistDoc.ref.update(update);
      result.staleCleared = Object.keys(update).length - 1;
    }
  }

  // 3) Bookings
  const bookingsSnap = await db
    .collection("bookings")
    .where("therapistId", "==", data.id ?? therapistId)
    .get();

  const activeNow: FirebaseFirestore.DocumentReference[] = [];
  const future: FirebaseFirestore.DocumentReference[] = [];

  bookingsSnap.forEach((b) => {
    const bd = b.data() as Record<string, unknown>;
    const status = String(bd.status ?? "").toLowerCase();
    if (!ACTIVE_STATUSES.has(status)) return;
    const startMs = asMs(bd.startAt);
    const endMs = asMs(bd.endAt);
    if (startMs && endMs && startMs <= nowMs && nowMs < endMs) {
      activeNow.push(b.ref);
    } else if (startMs && startMs > nowMs) {
      future.push(b.ref);
    }
  });

  if (activeNow.length > 0)
    result.causes.push(`${activeNow.length} active-now booking(s)`);
  if (future.length > 0)
    result.causes.push(`${future.length} future booking(s)`);

  if (CANCEL_ACTIVE && activeNow.length > 0) {
    for (const ref of activeNow) {
      await ref.update({
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledReason: "Bulk diagnose: clearing active-now booking",
      });
    }
    result.activeNowCancelled = activeNow.length;
  }

  if (CANCEL_FUTURE && future.length > 0) {
    for (const ref of future) {
      await ref.update({
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledReason: "Bulk diagnose: clearing future booking",
      });
    }
    result.futureCancelled = future.length;
  }

  return result;
}

async function main() {
  console.log(
    `\n🔍 Diagnosing ${therapists.length} therapist(s) (now BKK = ${bkkLabel(
      Date.now()
    )})`
  );
  if (FIX_MODE) console.log("   --fix             ON → will clear stale doc fields");
  if (CANCEL_ACTIVE) console.log("   --cancel-active   ON → will cancel bookings covering NOW");
  if (CANCEL_FUTURE) console.log("   --cancel-future   ON → will cancel future bookings");
  if (!FIX_MODE && !CANCEL_ACTIVE && !CANCEL_FUTURE) {
    console.log("   (read-only — pass --fix and/or --cancel-all to mutate)");
  }
  console.log("");

  let totalStaleCleared = 0;
  let totalActiveNowCancelled = 0;
  let totalFutureCancelled = 0;
  let problemTherapists = 0;

  for (const t of therapists) {
    const r = await diagnoseOne(t.id, t.name);
    if (r.causes.length === 0) {
      console.log(`  ✅ ${r.name.padEnd(10)} ${r.id.padEnd(20)}  clean`);
    } else {
      problemTherapists++;
      const tag =
        FIX_MODE || CANCEL_ACTIVE || CANCEL_FUTURE
          ? `cleared:${r.staleCleared} cancelled-now:${r.activeNowCancelled} cancelled-future:${r.futureCancelled}`
          : "issues";
      console.log(`  ⚠️  ${r.name.padEnd(10)} ${r.id.padEnd(20)}  ${tag}`);
      r.causes.forEach((c) => console.log(`     • ${c}`));
    }
    totalStaleCleared += r.staleCleared;
    totalActiveNowCancelled += r.activeNowCancelled;
    totalFutureCancelled += r.futureCancelled;
  }

  console.log("");
  console.log("📊 Summary");
  console.log(`   therapists with issues   : ${problemTherapists} / ${therapists.length}`);
  if (FIX_MODE)
    console.log(`   stale fields cleared     : ${totalStaleCleared}`);
  if (CANCEL_ACTIVE)
    console.log(`   active-now bookings 🚫  : ${totalActiveNowCancelled}`);
  if (CANCEL_FUTURE)
    console.log(`   future bookings 🚫      : ${totalFutureCancelled}`);

  if (!FIX_MODE && !CANCEL_ACTIVE && !CANCEL_FUTURE && problemTherapists > 0) {
    console.log("\n💡 To clean everything in one shot:");
    console.log("   npx tsx diagnoseAllTherapists.ts --fix --cancel-all");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ failed:", err);
    process.exit(1);
  });
