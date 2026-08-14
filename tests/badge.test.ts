// tests/badge.test.ts — run: npm run test:badge
//
// 🆕 28x.164. The badge engine broke silently and stayed broken: the admin
// "Badge" dropdown wrote therapists.badge while the engine and card read
// badgeKey, so picking NEW did nothing and nobody noticed until a founder
// screenshot. These cases pin the precedence, the 48h lifetime, and the
// 21-day NEW window (which a careless BADGE_TTL bump would silently double).
import { getBadgeForTherapist, businessDayBKK } from "@/utils/getTherapistBadge";

const H = 3_600_000;
const now = Date.now();
const today = businessDayBKK();
let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  got=${String(got)} want=${String(want)}`);
};

// 1. The founder's actual bug: admin picks NEW in the dropdown.
eq("admin pin NEW shows", getBadgeForTherapist({ badge: "NEW", badgeSetAt: now }).key, "NEW");
eq("admin pin NEW (legacy, no stamp) shows", getBadgeForTherapist({ badge: "NEW" }).key, "NEW");
eq("legacy pin has no expiry", getBadgeForTherapist({ badge: "NEW" }).expiresAt, undefined);
eq("admin pin TOP_RATED shows", getBadgeForTherapist({ badge: "TOP_RATED", badgeSetAt: now }).key, "TOP_RATED");
eq("empty pin -> none", getBadgeForTherapist({ badge: "" }).key, null);
eq("junk pin -> none", getBadgeForTherapist({ badge: "sparkly" }).key, null);

// 2. 48h lifetime.
eq("pin alive at 47h", getBadgeForTherapist({ badge: "NEW", badgeSetAt: now - 47 * H }).key, "NEW");
eq("pin dead at 49h", getBadgeForTherapist({ badge: "NEW", badgeSetAt: now - 49 * H }).key, null);
eq("auto badge alive at 47h", getBadgeForTherapist({ badgeKey: "VIP", badgeUpdatedAt: now - 47 * H }).key, "VIP");
eq("auto badge dead at 49h", getBadgeForTherapist({ badgeKey: "VIP", badgeUpdatedAt: now - 49 * H }).key, null);
eq("earned TOP_RATED survives day rollover",
   getBadgeForTherapist({ badgeKey: "TOP_RATED", badgeUpdatedAt: now - 30 * H, todayBookings: 0 }).key, "TOP_RATED");

// 3. Live daily thresholds still hold (28x.100 founder spec 2/3/4).
eq("4 jobs -> TOP_RATED", getBadgeForTherapist({ todayBookings: 4, todayBookingsDate: today }).key, "TOP_RATED");
eq("3 jobs -> VIP", getBadgeForTherapist({ todayBookings: 3, todayBookingsDate: today }).key, "VIP");
eq("2 jobs -> HOT", getBadgeForTherapist({ todayBookings: 2, todayBookingsDate: today }).key, "HOT");
eq("1 job -> none", getBadgeForTherapist({ todayBookings: 1, todayBookingsDate: today }).key, null);
eq("stale day stamp ignored", getBadgeForTherapist({ todayBookings: 4, todayBookingsDate: "2020-01-01" }).key, null);

// 4. Precedence: manual pin beats auto (founder rule 28x.106b).
eq("pin beats live count",
   getBadgeForTherapist({ badge: "NEW", badgeSetAt: now, todayBookings: 4, todayBookingsDate: today }).key, "NEW");
eq("expired pin falls through to live count",
   getBadgeForTherapist({ badge: "NEW", badgeSetAt: now - 60 * H, todayBookings: 4, todayBookingsDate: today }).key, "TOP_RATED");

// 5. NEW-by-roster-age window is 21 DAYS, not 42 (the DAY_MS/BADGE_TTL split).
const D = 24 * H;
eq("created 20d ago -> NEW", getBadgeForTherapist({ createdAt: now - 20 * D }).key, "NEW");
eq("created 22d ago -> none", getBadgeForTherapist({ createdAt: now - 22 * D }).key, null);
eq("created 30d ago -> none (would be NEW if window doubled)", getBadgeForTherapist({ createdAt: now - 30 * D }).key, null);
eq("missing createdAt -> none", getBadgeForTherapist({}).key, null);

console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
