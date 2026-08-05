// scripts/auditAttributionCheckin.mjs
//
// READ-ONLY audit — Round 28x.99t follow-up (scheduled reminder
// `sammyboy-attribution-checkin`, fires 2026-08-05).
//
// Answers two separate questions:
//   1. Is `attributionSource` actually being captured on real bookings
//      since the 2026-07-22 fix? (real number, not "technically possible")
//   2. Sammyboy/Samsguide: any referrer traffic or tagged bookings since
//      the pause — i.e. has she relisted?
//
// Writes NOTHING. Only .get() calls.

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();

// The attribution fix shipped the night of 2026-07-22 (BKK).
const CUTOFF = new Date("2026-07-22T00:00:00+07:00");

// Same forum family — see CLAUDE.md §6.
const SAMMY_HOSTS = [
  "samsguide.living",
  "samsguide.services",
  "sammyboyforum.com",
  "sbf.net.nz",
  "samsforum.com",
  "sammyboy",
  "samsguide",
];

// Mirrors src/utils/membership.ts (test/placeholder exclusion). Kept
// inline because that file is TS and this script is plain node.
const isReservedShopBooking = (b) => {
  const name = `${b.contactName ?? ""} ${b.customerName ?? ""}`.toLowerCase();
  const phone = String(b.phone ?? "");
  return name.includes("sunred") || phone.includes("634350987");
};
const isTestLocationBooking = (b) => {
  const loc = `${b.locationName ?? ""} ${b.address ?? ""}`.toLowerCase();
  return (
    loc.includes("aspire") ||
    loc.includes("ซอย พร้อมพันธ์") ||
    loc.includes("qh86+45p")
  );
};
const isTest = (b) => isReservedShopBooking(b) || isTestLocationBooking(b);

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  return null;
};

const fmt = (d) => (d ? d.toISOString().slice(0, 10) : "—");

// Country code read off the raw phone string — proxy for tourist vs local.
const countryOf = (raw) => {
  const p = String(raw ?? "").replace(/[\s\-()]/g, "");
  if (!p) return "(none)";
  if (/^0\d{8,9}$/.test(p)) return "TH (local 0x)";
  const map = [
    ["+66", "TH"], ["+65", "SG"], ["+86", "CN"], ["+852", "HK"],
    ["+853", "MO"], ["+886", "TW"], ["+81", "JP"], ["+82", "KR"],
    ["+60", "MY"], ["+61", "AU"], ["+44", "UK"], ["+1", "US/CA"],
    ["+49", "DE"], ["+33", "FR"], ["+7", "RU"], ["+971", "AE"],
    ["+91", "IN"], ["+62", "ID"], ["+63", "PH"], ["+84", "VN"],
  ];
  // longest prefix first so +852 doesn't get eaten by +85/+8
  const sorted = [...map].sort((a, b) => b[0].length - a[0].length);
  for (const [pre, cc] of sorted) if (p.startsWith(pre)) return cc;
  return p.startsWith("+") ? `other (${p.slice(0, 4)})` : "unknown";
};

const tally = (arr, keyFn) => {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const main = async () => {
  console.log(`\n=== ATTRIBUTION CHECK-IN — cutoff ${fmt(CUTOFF)} ===\n`);

  // ── 1. BOOKINGS ────────────────────────────────────────────────
  const snap = await db.collection("bookings").get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Total booking docs in Firestore: ${all.length}`);

  const since = all.filter((b) => {
    const c = toDate(b.createdAt) ?? toDate(b.startAt);
    return c && c >= CUTOFF;
  });
  const sinceReal = since.filter((b) => !isTest(b));

  const hasAttr = (b) =>
    typeof b.attributionSource === "string" && b.attributionSource.trim() !== "";

  console.log(`\n--- Bookings created since ${fmt(CUTOFF)} ---`);
  console.log(`  all docs        : ${since.length}`);
  console.log(`  excluding test  : ${sinceReal.length}`);
  console.log(`  with attributionSource (all)  : ${since.filter(hasAttr).length}`);
  console.log(`  with attributionSource (real) : ${sinceReal.filter(hasAttr).length}`);
  const rate = sinceReal.length
    ? ((sinceReal.filter(hasAttr).length / sinceReal.length) * 100).toFixed(1)
    : "n/a";
  console.log(`  capture rate (real bookings)  : ${rate}%`);

  console.log(`\n  breakdown by source (real bookings since cutoff):`);
  for (const [k, n] of tally(sinceReal, (b) =>
    hasAttr(b) ? b.attributionSource.trim() : "(empty / not tagged)"
  )) {
    console.log(`    ${String(k).padEnd(26)} ${n}`);
  }

  // Baseline: before the fix
  const before = all.filter((b) => {
    const c = toDate(b.createdAt) ?? toDate(b.startAt);
    return c && c < CUTOFF;
  });
  console.log(`\n  BASELINE (before cutoff): ${before.filter(hasAttr).length} / ${before.length} tagged`);

  // ⚠️ THE DECISIVE SPLIT. A tagged booking does NOT mean the admin dropdown
  //    was used. `direct`/`google`/etc are written automatically by
  //    classifyReferrer() in src/utils/attribution.ts, which runs ONLY in the
  //    customer web flow (BookingFlowPage). And BookingFlowPage stamps
  //    createdBy:"admin" too when View books while logged in as admin — so
  //    createdBy alone can't tell them apart either. The one field that can:
  //    AdminBookingAddPage hardcodes `userId: null`, BookingFlowPage writes
  //    `user?.uid`. So: createdBy==="admin" && !userId  ⇒  the admin form.
  const ADMIN_ONLY = new Set([
    "sammyboy", "referral", "repeat", "word_of_mouth", "other", "line", "wechat",
    "telegram", // in SOURCE_OPTIONS; classifier can also emit it, so check origin
  ]);
  const AUTO_ONLY = new Set([
    "direct", "google", "bing", "baidu", "naver", "duckduckgo", "yandex",
    "xiaohongshu", "whatsapp", "facebook", "instagram", "tiktok", "travel-cn",
  ]);
  const viaAdminForm = (b) => b.createdBy === "admin" && !b.userId;

  const adminForm = sinceReal.filter(viaAdminForm);
  console.log(`\n  --- did the 28x.99t ADMIN DROPDOWN actually get used? ---`);
  console.log(`  bookings created via the admin New Booking form : ${adminForm.length}`);
  console.log(`    of those, tagged   : ${adminForm.filter(hasAttr).length}`);
  console.log(`    of those, left blank: ${adminForm.filter((b) => !hasAttr(b)).length}`);
  for (const b of adminForm) {
    const c = toDate(b.createdAt) ?? toDate(b.startAt);
    console.log(
      `      ${fmt(c)}  attr=${String(b.attributionSource ?? "— (blank)").padEnd(14)}`
    );
  }
  console.log(`\n  all-time tagged bookings: ${all.filter(hasAttr).length}`);
  console.log(`    auto-captured value (web classifier): ${all.filter((b) => hasAttr(b) && AUTO_ONLY.has(b.attributionSource.toLowerCase())).length}`);
  console.log(`    hand-picked via admin form          : ${all.filter((b) => hasAttr(b) && viaAdminForm(b) && ADMIN_ONLY.has(b.attributionSource.toLowerCase())).length}`);

  // Other attribution fields, for completeness
  const anyAttrField = (b) =>
    hasAttr(b) || b.utmSource || b.referrerHost || b.referrer;
  console.log(`  any attribution field at all (real, since): ${sinceReal.filter(anyAttrField).length}`);

  // ── 2. SAMMYBOY-TAGGED BOOKINGS ────────────────────────────────
  const sammyBookings = all.filter(
    (b) => String(b.attributionSource ?? "").toLowerCase() === "sammyboy"
  );
  console.log(`\n--- Bookings tagged attributionSource="sammyboy" (all time) ---`);
  console.log(`  count: ${sammyBookings.length}`);
  for (const b of sammyBookings) {
    const c = toDate(b.createdAt) ?? toDate(b.startAt);
    console.log(
      `    ${fmt(c)}  ${String(b.status ?? "?").padEnd(10)} ` +
        `${countryOf(b.phone).padEnd(14)} ${b.serviceName ?? "?"} ` +
        `${b.note ? `| note: ${String(b.note).slice(0, 60)}` : ""}`
    );
  }
  if (sammyBookings.length) {
    console.log(`  phone-country mix:`);
    for (const [k, n] of tally(sammyBookings, (b) => countryOf(b.phone))) {
      console.log(`    ${String(k).padEnd(16)} ${n}`);
    }
    // repeat vs one-time: same phone appearing more than once anywhere
    const phoneCounts = new Map();
    for (const b of all) {
      const p = String(b.phone ?? "").replace(/\D/g, "");
      if (p) phoneCounts.set(p, (phoneCounts.get(p) ?? 0) + 1);
    }
    const repeats = sammyBookings.filter((b) => {
      const p = String(b.phone ?? "").replace(/\D/g, "");
      return p && (phoneCounts.get(p) ?? 0) > 1;
    });
    console.log(`  of those, phone seen in >1 booking (repeat signal): ${repeats.length}`);
  }

  // ── 3. ANALYTICS — referrer traffic since cutoff ───────────────
  console.log(`\n--- analytics_events since ${fmt(CUTOFF)} ---`);
  let events = [];
  try {
    const ev = await db
      .collection("analytics_events")
      .where("ts", ">=", CUTOFF)
      .get();
    events = ev.docs.map((d) => d.data());
  } catch (e) {
    console.log(`  (indexed query failed: ${e.message}) — falling back to full scan`);
    const ev = await db.collection("analytics_events").get();
    events = ev.docs
      .map((d) => d.data())
      .filter((e2) => {
        const t = toDate(e2.ts);
        return t && t >= CUTOFF;
      });
  }
  console.log(`  total events: ${events.length}`);
  const sessions = new Set(events.map((e) => e.sid).filter(Boolean));
  console.log(`  unique sessions: ${sessions.size}`);

  console.log(`\n  top referrers (by event count):`);
  for (const [k, n] of tally(events, (e) => e.referrer ?? "(direct/none)").slice(0, 15)) {
    console.log(`    ${String(k).padEnd(34)} ${n}`);
  }

  console.log(`\n  utmSource tags seen:`);
  const utm = tally(
    events.filter((e) => e.utmSource),
    (e) => e.utmSource
  );
  if (!utm.length) console.log(`    (none)`);
  for (const [k, n] of utm) console.log(`    ${String(k).padEnd(34)} ${n}`);

  // Sammyboy-family specifically
  const isSammy = (s) => {
    const v = String(s ?? "").toLowerCase();
    return SAMMY_HOSTS.some((h) => v.includes(h));
  };
  const sammyEvents = events.filter(
    (e) => isSammy(e.referrer) || isSammy(e.utmSource)
  );
  console.log(`\n  SAMMYBOY/SAMSGUIDE family hits since cutoff: ${sammyEvents.length}`);
  if (sammyEvents.length) {
    console.log(`    unique sessions: ${new Set(sammyEvents.map((e) => e.sid)).size}`);
    for (const [k, n] of tally(sammyEvents, (e) => e.event)) {
      console.log(`    ${String(k).padEnd(24)} ${n}`);
    }
    for (const [k, n] of tally(sammyEvents, (e) => e.referrer ?? e.utmSource)) {
      console.log(`    host ${String(k).padEnd(30)} ${n}`);
    }
  }

  // For contrast: same query, all-time
  const evAll = await db.collection("analytics_events").get();
  const allEvents = evAll.docs.map((d) => d.data());
  const sammyAll = allEvents.filter(
    (e) => isSammy(e.referrer) || isSammy(e.utmSource)
  );
  const sammyDates = sammyAll.map((e) => toDate(e.ts)).filter(Boolean).sort((a, b) => a - b);
  console.log(`\n  ALL-TIME sammyboy-family hits: ${sammyAll.length}`);
  console.log(`    unique sessions: ${new Set(sammyAll.map((e) => e.sid)).size}`);
  console.log(
    `    date range: ${fmt(sammyDates[0])} → ${fmt(sammyDates[sammyDates.length - 1])}`
  );

  console.log(`\n=== done (read-only, nothing written) ===\n`);
};

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
