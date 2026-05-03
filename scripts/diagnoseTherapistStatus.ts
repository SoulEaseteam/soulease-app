// scripts/diagnoseTherapistStatus.ts
//
// 🔍 Round 28ar — diagnose why a therapist shows "busy" / "off duty"
// when they shouldn't.
//
// Inspects 3 sources of truth:
//   1. therapists/{id} — busyUntil, isBooked, activeBooking, statusOverride, isHoliday
//   2. bookings collection — any active (pending/confirmed/in_progress) doc
//      whose startAt..endAt window covers right-now
//   3. Cleanly suggests how to clear stale state
//
// Usage:
//   cd ~/sunred-vite/scripts
//   npx tsx diagnoseTherapistStatus.ts XingXingSunRed
//   npx tsx diagnoseTherapistStatus.ts XingXingSunRed --fix    ← clears stale state

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const FIX_MODE = process.argv.includes("--fix");
const CANCEL_ACTIVE = process.argv.includes("--cancel-active");
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
  const d = new Date(ms);
  // BKK = UTC+7
  const bkk = new Date(ms + 7 * 60 * 60 * 1000);
  return `${bkk.toISOString().replace("T", " ").slice(0, 19)} BKK · ${d.toISOString()}`;
}

async function diagnose(therapistDocIdOrCustomId: string) {
  const idArg = therapistDocIdOrCustomId;
  console.log(`\n🔍 Diagnosing "${idArg}"…\n`);

  // 1) Resolve therapist doc — try both docId and `id` field.
  let therapistDoc;
  let directRef = db.collection("therapists").doc(idArg);
  let snap = await directRef.get();
  if (snap.exists) {
    therapistDoc = snap;
  } else {
    const q = await db
      .collection("therapists")
      .where("id", "==", idArg)
      .limit(1)
      .get();
    if (q.empty) {
      console.error(`  ✗ No therapist found by docId or id=${idArg}`);
      process.exit(1);
    }
    therapistDoc = q.docs[0];
  }
  const docId = therapistDoc.id;
  const data = therapistDoc.data() as Record<string, unknown>;
  console.log(`📄 Resolved doc: therapists/${docId}`);
  console.log(`   name=${data.name ?? "—"}, id-field=${data.id ?? "—"}\n`);

  // 2) Inspect availability fields
  const nowMs = Date.now();
  const busyUntilMs = asMs(data.busyUntil);
  const busyUntilFuture = busyUntilMs !== null && busyUntilMs > nowMs;

  console.log(`🩺 Availability fields:`);
  console.log(`   statusOverride : ${JSON.stringify(data.statusOverride)}`);
  console.log(`   isHoliday      : ${JSON.stringify(data.isHoliday)}`);
  console.log(`   isBooked       : ${JSON.stringify(data.isBooked)}`);
  console.log(`   activeBooking  : ${JSON.stringify(data.activeBooking)}`);
  console.log(`   busyUntil      : ${bkkLabel(busyUntilMs)}`);
  console.log(`   busyUntil > now: ${busyUntilFuture ? "🔴 YES (causing busy)" : "✓ no"}`);
  console.log("");

  // 3) Scan bookings for ACTIVE entries covering "now"
  const bookingsSnap = await db
    .collection("bookings")
    .where("therapistId", "==", data.id ?? docId)
    .get();

  let activeNow = 0;
  let activeFuture = 0;
  let totalForId = 0;
  const triggers: string[] = [];
  const activeNowDocs: { id: string; ref: FirebaseFirestore.DocumentReference }[] =
    [];

  bookingsSnap.forEach((b) => {
    totalForId++;
    const bd = b.data() as Record<string, unknown>;
    const status = String(bd.status ?? "").toLowerCase();
    const startMs = asMs(bd.startAt);
    const endMs = asMs(bd.endAt);
    if (!ACTIVE_STATUSES.has(status)) return;
    if (startMs && endMs && startMs <= nowMs && nowMs < endMs) {
      activeNow++;
      activeNowDocs.push({ id: b.id, ref: b.ref });
      triggers.push(
        `   🔴 bookings/${b.id}  status=${status}  ${bkkLabel(startMs)} → ${bkkLabel(
          endMs
        )}`
      );
    } else if (startMs && startMs > nowMs) {
      activeFuture++;
    }
  });

  console.log(`📊 Bookings for therapistId="${data.id ?? docId}":`);
  console.log(`   total          : ${totalForId}`);
  console.log(`   active NOW     : ${activeNow} ${activeNow > 0 ? "🔴 (causing busy)" : ""}`);
  console.log(`   active future  : ${activeFuture}`);
  if (triggers.length > 0) {
    console.log("\n   Triggers:");
    triggers.forEach((t) => console.log(t));
  }
  console.log("");

  // 4) Recommend
  const causes: string[] = [];
  if (data.statusOverride && data.statusOverride !== "Auto") {
    causes.push(`statusOverride="${data.statusOverride}"`);
  }
  if (data.isHoliday === true) causes.push("isHoliday=true");
  if (data.isBooked === true) causes.push("isBooked=true (legacy field)");
  if (data.activeBooking === true) causes.push("activeBooking=true (legacy field)");
  if (busyUntilFuture) causes.push(`busyUntil set to future (${bkkLabel(busyUntilMs)})`);
  if (activeNow > 0) causes.push(`${activeNow} active booking covers now`);

  if (causes.length === 0) {
    console.log("✅ No reason to be busy — therapist should appear available.");
  } else {
    console.log("⚠️  Causes of non-Available status:");
    causes.forEach((c) => console.log(`   • ${c}`));
  }

  // 5) Fix mode — clear stale fields on the therapist doc
  if (FIX_MODE) {
    console.log("\n🔧 --fix flag detected. Clearing stale availability fields…");
    const update: Record<string, unknown> = {};
    if (data.isBooked === true) update.isBooked = false;
    if (data.activeBooking === true) update.activeBooking = false;
    if (busyUntilFuture) update.busyUntil = null;
    if (data.statusOverride && data.statusOverride !== "Auto") {
      update.statusOverride = "Auto";
    }
    if (data.isHoliday === true) update.isHoliday = false;
    update.updatedAt = FieldValue.serverTimestamp();

    if (Object.keys(update).length === 1) {
      console.log("   Nothing on the therapist doc to clear (cause is in bookings).");
    } else {
      await therapistDoc.ref.update(update);
      console.log("   ✓ Cleared:", Object.keys(update).filter((k) => k !== "updatedAt"));
    }

    if (activeNow > 0) {
      console.log(
        "   ⚠️  Active bookings detected — those need manual review (cancel or re-status)."
      );
    }
  } else if (causes.length > 0) {
    console.log(
      "\n💡 Run with --fix to auto-clear stale therapist-doc fields:"
    );
    console.log(`   npx tsx diagnoseTherapistStatus.ts ${idArg} --fix`);
  }

  // 6) --cancel-active — set status='cancelled' on every active-NOW booking
  if (CANCEL_ACTIVE && activeNowDocs.length > 0) {
    console.log(`\n🛑 --cancel-active flag detected. Cancelling ${activeNowDocs.length} active booking(s)…`);
    for (const d of activeNowDocs) {
      await d.ref.update({
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledReason: "Diagnose script: stale active booking blocking therapist availability",
      });
      console.log(`   ✓ bookings/${d.id} → status=cancelled`);
    }
    console.log(`\n✅ Done. Therapist should now appear available.`);
  } else if (activeNow > 0 && !CANCEL_ACTIVE) {
    console.log(
      `\n💡 Run with --cancel-active to mark the ${activeNow} active booking(s) as cancelled:`
    );
    console.log(`   npx tsx diagnoseTherapistStatus.ts ${idArg} --cancel-active`);
  }
}

const arg = process.argv[2];
if (!arg) {
  console.error("❌ usage: npx tsx diagnoseTherapistStatus.ts <therapistId> [--fix]");
  process.exit(1);
}

diagnose(arg)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ diagnose failed:", err);
    process.exit(1);
  });
