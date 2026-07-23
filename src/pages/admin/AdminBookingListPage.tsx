// src/pages/admin/AdminBookingListPage.tsx
//
// 🆕 Round 28c18 (founder 2026-05-06) — mobile-first card layout.
//   Responsive cards, prominent Confirm/Complete/Cancel CTAs, inline note
//   editing, payment toggle, batch export.
//
// 🆕 Round 28s252 (audit) — eight fixes:
//   1. The realtime listener is now BOUNDED (limit 500, newest first). It used
//      to stream the ENTIRE bookings collection with no limit — an unbounded,
//      ever-growing Firestore read + client memory cost as history piles up.
//   2. Cancel now confirms + captures a reason (window.prompt) before flipping
//      a real customer's booking to cancelled — it was a one-tap destructive
//      action sitting next to "Mark Complete" in the drawer.
//   3. Payment is unified: the admin `paid` toggle now also keeps
//      `paymentStatus` in sync, and display reads either — the customer flow
//      wrote `paymentStatus` which nothing here ever read/updated (dead data).
//   4. Restyled onto the shared Ocean Study light tokens (was the old
//      #1A2B2E/#B4000A brand theme).
//   5. The paid toggle now leaves an audit trail (booking.mark_paid/unpaid).
//   6. `Row` hoisted to module scope (was redefined every render).
//   7. aria-labels on icon-only buttons.
//   8. Unknown statuses get a neutral badge instead of pending-red, and
//      refunded/no_show are labelled.
//
// 🆕 Round 28s253 (founder: "แก้ให้สวยขึ้น admin/bookings") — visual pass on
//   top of the 28s252 fixes, still Ocean Study, no new colors:
//   • A "what needs you" summary strip up top (pending / active / booked
//     value) so the operator reads priority before scanning cards.
//   • Search + status tabs merged into one control row (was two stacked
//     full-width rows) — tighter, and the tabs no longer eat a whole line
//     on desktop.
//   • Cards now visually RECEDE once their story is over: completed/
//     cancelled cards sit on a duller panel, skip the hover lift, and their
//     price goes ink instead of accent — so the eye lands on what's still
//     actionable, not on history.
//   • Active-status cards get a hover lift + deeper shadow (the affordance
//     was static before; nothing signalled the card was part of a live
//     board).
//
// 🆕 Round 28s254 (founder: "เพิ่มตัวกรอง" — all 3 offered) — date range,
//   therapist, and payment-status filters, same pattern as the Earnings/
//   Analytics filter rounds (28s243/244). Date range now controls the
//   Firestore query itself (a custom range replaces the flat "last 500"
//   with a proper createdAt >=/<= window); therapist + payment narrow the
//   already-loaded set client-side. The summary strip and tab counts read
//   the therapist/payment-narrowed set, so switching either updates what
//   "Needs action" etc. mean — but never react to the free-text search,
//   which is a look-up, not a persistent facet.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  InputBase,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  IconButton,
  Divider,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { db } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";
import { formatTHB, priceForDuration, durationsFor } from "@/utils/servicePricing";
// 🆕 28s263 (founder: "เปลี่ยนบริการได้ด้วยสิ มันทั้งหมดของบิล") — same
//   service catalog + pricing helpers AdminBookingAddPage uses to create a
//   booking, reused here to let the operator change one after the fact.
import services from "@/data/services";
import { getServiceLabel } from "@/utils/serviceCatalog";
import { ExportToExcel } from "@/utils/exportTools";
import { logAdminAction } from "@/utils/auditLog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
// 🆕 28s258 (founder: "ใน Booked value โชว์ยอดรายได้ร้านด้วย") — shop revenue
//   uses the SAME shared commission split as Earnings/Reports (currently
//   flat 60/40, see commission.ts) so this summary number can never drift
//   from what those two pages say — the exact bug the 28s247 audit fixed.
import { commissionBaseFor, therapistPayoutFor, stampSplit, isPayrollExcluded, noShowCompFor } from "@/utils/commission";
// 🆕 28s260 (founder: "เพิ่มวิธีการจ่ายด้วย") — WeChat/Alipay carry a 5%+฿200
//   surcharge (same rule as the customer flow + AdminBookingAddPage).
//   Editing payment method is a price-affecting edit, so the total gets
//   recomputed on save — silently leaving it stale would under-charge a
//   booking that got switched to a surcharged method.
import { paymentSurcharge } from "@/utils/paymentSurcharge";
// 🆕 Round 28x.38 — concierge can key a discount code straight on the booking
//   slip; same validator the customer flow uses, so amounts/rules match.
import { validateDiscount } from "@/utils/discount";
// 🆕 28w.59 — customer membership tiers (Bronze/Silver/Gold/BlackVIP) + no-show
//   flag, badged on each order. Full-history per-phone aggregate, tier from the
//   shared membership util (same config as the Membership admin page).
import { membershipFor, menuSpendForBooking, isReservedShopBooking, isTestLocationBooking, applyMembershipConfig, MEMBERSHIP_COLORS, type MembershipThresholds, type MembershipResult } from "@/utils/membership";
import { bookingAuthorLabel } from "@/utils/bookingAuthor";
import { normPhone } from "@/utils/phoneCountry";
import {
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Phone,
  CurrencyCircleDollar,
  NotePencil,
  Export,
  CaretDown,
  CaretUp,
  X,
  PencilSimple,
  FloppyDisk,
  Star,
  Sparkle,
  Receipt,
  ClockCounterClockwise,
  // 🆕 Round 28r44 (founder: match Dashboard visual quality) — icon-circle
  //   glyphs for the summary strip stats (Needs Action / In Progress /
  //   Booked Value / Shop Revenue), mirroring the icon set used on the
  //   AdminDashboardPage "Period Summary" row (28s241).
  Warning,
  Wallet,
  Buildings,
  Taxi,
  Tag,
  Crown,
} from "phosphor-react";

// Cap the realtime window. Pending/confirmed bookings are always recent; older
// records live in Reports/Earnings (which are date-bounded). 500 keeps the
// read bounded regardless of how big the collection grows.
const FEED_LIMIT = 500;

// 🆕 Round 28s256 (founder reference screenshot — nested-card "secondary
//   background" frame) — an 18% blend from bg (#DCEFF5) toward dim
//   (#5C6F7B), both official Ocean Study swatches (rule: 28s237, every color
//   traces to an official hex or a blend strictly between two of them).
//   `adminColor.panel3` was tried first but it's ALSO a blend toward bg (just
//   from white) — visually near-identical to `bg` itself, so it couldn't
//   read as a distinct frame behind the white card. This blend goes toward
//   the darker anchor instead, so the nesting is actually visible.
const CARD_FRAME_BG = "#C5D8DF";

// ── types ─────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  // 🆕 28x.3 (founder: "จะระบุได้ไง ใครจอง") — who created this reservation.
  //   Absent on anything booked before this round; bookingAuthorLabel() says
  //   "แอดมิน (ไม่ระบุ)" rather than inventing an author for it.
  createdBy?: string;
  createdByEmail?: string;
  createdByPhone?: string;
  createdByName?: string;
  userName?: string;
  // 🆕 Round 28s230 — customer flow writes `contactName`, admin-add writes
  //   `customerName`; `nameOf()` normalises all three.
  contactName?: string;
  customerName?: string;
  phone?: string;
  holdState?: string;
  needsAdminReview?: boolean;
  reviewReason?: string;
  userId?: string;
  therapistId?: string;
  therapistName: string;
  serviceId?: string;
  serviceName: string;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp;
  locationName?: string;
  address?: string;
  placeDetail?: string;
  servicePrice?: number;
  discountAmount?: number;  // 🆕 28s258 — needed for the shared commission calc
  discountCode?: string;    // 🆕 28w.58 — promo code applied at booking (e.g. FREETAXI)
  discountLabel?: string;   // 🆕 28w.58 — human-readable promo label
  attributionSource?: string; // 🆕 28x.99t — which channel the guest came from
  taxiFee?: number;
  paymentFee?: number;      // 🆕 28s260 — WeChat/Alipay surcharge, recomputed if payment method is edited
  totalPrice?: number;
  total?: number;
  createdAt: Timestamp;
  status: string;
  payment?: string;         // 🆕 28s260 — payment METHOD (cash/transfer/…), distinct from paid/paymentStatus below
  paid?: boolean;
  paymentStatus?: string;   // 🆕 28s252 — customer-flow field, now kept in sync
  cancelReason?: string;    // 🆕 28s252 — captured on cancel
  // 🆕 Round 28x.118 (founder: "ยกเลิกออเดอร์ แต่ยังแจกยอดจองให้พนักงานอยู่")
  //   — an admin-chosen exception: this booking is cancelled (the true
  //   status everyone internal sees — Jobs page, this list, Reports), but
  //   still counts toward the PUBLIC session total customers see on her
  //   profile. Only ever set alongside a cancelReason — see cancelBooking().
  countsAsSession?: boolean;
  adminNote?: string;
  reviewed?: boolean;
}

type TabKey = "all" | "pending" | "confirmed" | "completed" | "cancelled" | "test";

const SANS  = adminFont.sans;
const SERIF = adminFont.serif;

// 🆕 Round 28r40 — bilingual pass (matches r35 AdminDashboardPage pattern).
//   `label` = the compact English badge shown in the tiny status pill; kept
//   short so the pill never breaks the card layout. `labelTh` = the Thai
//   counterpart, joined into `bilingual` for wider contexts (tabs, Status
//   dropdown, drawer header pill where space is generous).
type StatusCfg = { label: string; labelTh: string; bilingual: string; stripe: string; badge: { bg: string; fg: string } };

const mkCfg = (label: string, labelTh: string, stripe: string, badge: { bg: string; fg: string }): StatusCfg => ({
  label, labelTh, bilingual: `${label} · ${labelTh}`, stripe, badge,
});

const STATUS_CFG: Record<string, StatusCfg> = {
  pending:   mkCfg("Pending",   "รอยืนยัน",   adminColor.accent, { bg: `${adminColor.accent}1A`, fg: adminColor.accent }),
  confirmed: mkCfg("Confirmed", "ยืนยันแล้ว", adminColor.green,  { bg: `${adminColor.green}1A`,  fg: adminColor.green  }),
  completed: mkCfg("Completed", "เสร็จสิ้น",  adminColor.dim,    { bg: adminColor.panel2,        fg: adminColor.muted  }),
  cancelled: mkCfg("Cancelled", "ยกเลิก",     adminColor.line2,  { bg: adminColor.panel2,        fg: adminColor.dim    }),
  refunded:  mkCfg("Refunded",  "คืนเงิน",    adminColor.amber,  { bg: `${adminColor.amber}1A`,  fg: adminColor.amber  }),
  no_show:   mkCfg("No-show",   "ไม่มา",     adminColor.red,    { bg: `${adminColor.red}14`,    fg: adminColor.red    }),
};

// 🆕 28s252 — neutral fallback so an unknown status doesn't render as
//   pending-red (misleading).
const cfgFor = (status: string): StatusCfg =>
  STATUS_CFG[status] ?? mkCfg(status, status, adminColor.dim, { bg: adminColor.panel2, fg: adminColor.muted });

const TABS: { key: TabKey; label: string; labelTh: string }[] = [
  { key: "all",       label: "All",       labelTh: "ทั้งหมด"    },
  { key: "pending",   label: "Pending",   labelTh: "รอยืนยัน"  },
  { key: "confirmed", label: "Confirmed", labelTh: "ยืนยันแล้ว" },
  { key: "completed", label: "Completed", labelTh: "เสร็จสิ้น"  },
  { key: "cancelled", label: "Cancelled", labelTh: "ยกเลิก"    },
  // 🆕 Round 28x.137 (founder: "admin/bookings เพิ่มตัวกรองเป็นงานเทส และดึงยอด
  //   กลับมาไปไว้ที่นั้น") — QA test bookings (the Aspire/Soi Prompan address)
  //   were excluded from every therapist stat in 28x.135 but still live in the
  //   DB. This tab pulls them into one place with a count, isolated from real
  //   work. Filters by isTestLocationBooking, NOT the reserved-shop signal —
  //   those are 126 REAL bookings, not tests.
  { key: "test",      label: "Test",      labelTh: "งานเทส"    },
];

// 🆕 Round 28s230 — canonical customer name across the two write paths.
const nameOf = (b: Booking): string =>
  b.userName || b.contactName || b.customerName || "—";

// 🆕 28s252 — single source of truth for "did the customer pay": the admin
//   `paid` boolean if set, else the customer-flow `paymentStatus`.
const isPaid = (b: Booking): boolean => b.paid ?? b.paymentStatus === "paid";

// 🆕 28w.59 — membership + no-show badges for an order (stackable). Tier pill
//   (Bronze/Silver/Gold/BlackVIP, with ↓ if demoted for inactivity) + a red
//   "No-shows" pill when the customer has any no-show history.
const MembershipBadges: React.FC<{ member: MembershipResult | null; size?: "sm" | "md" }> = ({ member, size = "sm" }) => {
  if (!member || (!member.tier && !member.hasNoShow)) return null;
  const fs = size === "md" ? 10.5 : 9.5;
  const py = size === "md" ? "3px" : "2px";
  const ic = size === "md" ? 12 : 11;
  return (
    <Box sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
      {member.tier && (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: 0.75, py, borderRadius: 999, background: `${MEMBERSHIP_COLORS[member.tier]}1A`, border: `1px solid ${MEMBERSHIP_COLORS[member.tier]}55` }}>
          <Crown size={ic} weight="fill" color={MEMBERSHIP_COLORS[member.tier]} />
          <Typography sx={{ fontFamily: SANS, fontSize: fs, fontWeight: 800, color: MEMBERSHIP_COLORS[member.tier], lineHeight: 1, letterSpacing: "0.02em" }}>
            {member.tier}{member.demoted ? " ↓" : ""}
          </Typography>
        </Box>
      )}
      {member.hasNoShow && (
        <Box sx={{ display: "inline-flex", alignItems: "center", px: 0.75, py, borderRadius: 999, background: `${adminColor.red}14`, border: `1px solid ${adminColor.red}44` }}>
          <Typography sx={{ fontFamily: SANS, fontSize: fs, fontWeight: 800, color: adminColor.red, lineHeight: 1 }}>
            No-shows
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ── shared detail row (module scope — was redefined every render, fix #6) ─
const Row: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) =>
  value ? (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, textAlign: "right", wordBreak: "break-word" }}>{value}</Typography>
    </Box>
  ) : null;

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
type DateMode = "all" | "custom";

// 🆕 28w.59 — per-customer (by phone) lifetime aggregate for membership tiers.
type CustStat = { served: number; totalSpent: number; lastVisitMs: number; noShowCount: number };

const AdminBookingListPage: React.FC = () => {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  // 🆕 28s255 (founder: "All show") — default tab is now "All", not "Pending".
  const [tab,         setTab]         = useState<TabKey>("all");
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailId,    setDetailId]    = useState<string | null>(null);
  // 🆕 Round 28s314 — deep-link: /admin/bookings?open=<id> opens that booking's
  //   detail drawer directly (used by the Pay-Therapists page's clickable
  //   amounts). If the target isn't in the current date-filtered feed, fall
  //   back to a one-doc fetch so the drawer still shows the real details.
  const [searchParams, setSearchParams] = useSearchParams();
  const [fallbackBooking, setFallbackBooking] = useState<Booking | null>(null);
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setDetailId(openId);
  }, [searchParams]);

  // 🆕 28s259 (founder audit: "เพิ่มการเปลี่ยนหมอนวดได้ภายในใบจองเดิม") —
  //   the full therapist roster, so the detail drawer's edit form can offer
  //   reassignment. Same fetch pattern as AdminBookingAddPage.
  const [therapists, setTherapists] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    void getDocs(collection(db, "therapists")).then((snap) => {
      setTherapists(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id })));
    });
  }, []);

  // 🆕 28w.59 — FULL-history per-phone aggregate for membership tiers, computed
  //   once over the whole bookings collection (NOT the paginated feed above, so
  //   a tier reflects the customer's entire history), plus the live threshold
  //   config from adminSettings/membership.
  const [custStats, setCustStats] = useState<Record<string, CustStat>>({});
  const [memberVersion, setMemberVersion] = useState(0);
  const nowMs = useMemo(() => Date.now(), []);
  useEffect(() => {
    const SERVED = new Set(["completed", "done"]);
    const NOSHOW = new Set(["no_show", "no-show", "noshow"]);
    void getDocs(collection(db, "bookings")).then((snap) => {
      const map: Record<string, CustStat> = {};
      snap.forEach((d) => {
        const b = d.data() as {
          phone?: string; status?: string; totalPrice?: number; servicePrice?: number;
          taxiFee?: number; paymentFee?: number;
          contactName?: string; customerName?: string;
          locationName?: string; address?: string;
          createdAt?: { toDate?: () => Date; seconds?: number };
          startAt?: { toDate?: () => Date; seconds?: number };
        };
        const phone = normPhone((b.phone ?? "").trim());
        if (!phone) return;
        // 🆕 28x.99u — admin's own placeholder-phone bookings aren't a real
        //   customer identity; skip so this can't show as a top-spend guest.
        // 🆕 28x.99v — plus known QA test addresses (see isTestLocationBooking).
        if (isReservedShopBooking(b) || isTestLocationBooking(b)) return;
        const row = (map[phone] ??= { served: 0, totalSpent: 0, lastVisitMs: 0, noShowCount: 0 });
        const st = b.status ?? "";
        if (NOSHOW.has(st)) row.noShowCount++;
        if (SERVED.has(st)) {
          row.served++;
          // 🆕 28x.99u — was `b.totalPrice ?? b.servicePrice ?? 0` (includes
          //   taxi/surcharge); menuSpendForBooking() matches the canonical
          //   28x.38 formula AdminMembersPage uses, so a booking's tier
          //   badge here can't disagree with the real roster.
          row.totalSpent += menuSpendForBooking(b);
          const t = b.createdAt ?? b.startAt;
          const ms = t?.toDate ? t.toDate().getTime() : (typeof t?.seconds === "number" ? t.seconds * 1000 : 0);
          if (ms > row.lastVisitMs) row.lastVisitMs = ms;
        }
      });
      setCustStats(map);
    });
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminSettings", "membership"),
      (snap) => { applyMembershipConfig((snap.data() as Partial<MembershipThresholds>) ?? null); setMemberVersion((v) => v + 1); },
      () => {},
    );
    return () => unsub();
  }, []);
  const memberForPhone = useMemo(() => {
    return (phone?: string | null) => {
      const p = normPhone((phone ?? "").trim());
      if (!p) return null;
      const s = custStats[p];
      return s ? membershipFor(s, nowMs) : null;
    };
    // memberVersion → recompute when the admin thresholds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custStats, nowMs, memberVersion]);

  // 🆕 28x.43 — redemption memory: count OTHER bookings on this phone that
  //   already carry this discount code. Reads the full in-memory bookings
  //   list (already loaded for stats) — no extra query.
  const countPriorCodeUses = useMemo(() => {
    return (phone: string, code: string, excludeId: string): number => {
      const p = normPhone((phone ?? "").trim());
      const c = (code ?? "").trim().toUpperCase();
      if (!p || !c) return 0;
      return bookings.filter(
        (bk) =>
          bk.id !== excludeId &&
          normPhone((bk.phone ?? "").trim()) === p &&
          String(bk.discountCode ?? "").trim().toUpperCase() === c,
      ).length;
    };
  }, [bookings]);

  // 🆕 28s254 — date range + therapist + payment filters.
  const [dateMode,        setDateMode]        = useState<DateMode>("all");
  const [customStart,     setCustomStart]     = useState<Dayjs>(() => dayjs().subtract(30, "day").startOf("day"));
  const [customEnd,       setCustomEnd]       = useState<Dayjs>(() => dayjs());
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");
  const [paymentFilter,   setPaymentFilter]   = useState("__ALL__"); // __ALL__ | paid | unpaid
  // 🆕 28w.56 (founder "เพิ่มตัวกรองออเดอที่ใช้ Promotions") — filter by whether
  //   the order used a promo (discountAmount > 0).
  const [promoFilter,     setPromoFilter]     = useState("__ALL__"); // __ALL__ | promo | nopromo

  // 🆕 28s257 (founder: "ทำไมจำกัดแค่ 500 ทั้งหมดไม่ได้หรอ") — the 500 cap
  //   from 28s252 was hiding real bookings once the collection passed 500
  //   docs. Fix: "Load more" pagination instead of either extreme (an
  //   unbounded fetch — the original bug — or a hard ceiling). `feedSize`
  //   starts at FEED_LIMIT and grows by FEED_LIMIT each click; it resets to
  //   FEED_LIMIT whenever the date range changes so a fresh query starts at
  //   page one, not wherever the operator had scrolled to before.
  const [feedSize, setFeedSize] = useState(FEED_LIMIT);
  useEffect(() => { setFeedSize(FEED_LIMIT); }, [dateMode, customStart, customEnd]);

  // ── realtime feed (bounded — fix #1; date-scoped when a custom range is
  //   active — 28s254; paginated via feedSize — 28s257) ─────────────────
  useEffect(() => {
    setLoading(true);
    const filters: Parameters<typeof query>[1][] = [];
    if (dateMode === "custom") {
      filters.push(where("createdAt", ">=", Timestamp.fromDate(customStart.startOf("day").toDate())));
      filters.push(where("createdAt", "<=", Timestamp.fromDate(customEnd.endOf("day").toDate())));
    }
    // 🆕 28w.44 (founder "all คือ งานทั้งหมด ไม่จำกัดไว้ที่ 500 เพราะทำให้
    //   Revenue ไม่ตรง") — no 500 cap: load EVERY booking so Booked Value /
    //   Shop Revenue + tab counts are exact. Custom date ranges are still
    //   bounded by the where() clauses above.
    filters.push(orderBy("createdAt", "desc"));
    const q = query(collection(db, "bookings"), ...filters);
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [dateMode, customStart, customEnd, feedSize]);

  // 🆕 28w.44 — the 500 cap is gone (all bookings load), so the "showing
  //   latest N" note + the Load-more button (both gated on atCap) are retired.
  const atCap = false;

  // 🆕 28s254 — therapist option list from the date-scoped set only (not
  //   further narrowed by payment), so switching one filter never collapses
  //   the other's choices.
  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.therapistId) map.set(b.therapistId, b.therapistName || b.therapistId);
    }
    return [...map.entries()];
  }, [bookings]);

  // Therapist + payment are persistent facets — they narrow what the summary
  // strip and tab counts mean. Free-text search does NOT (it's a look-up).
  const faceted = useMemo(() => {
    return bookings.filter((b) => {
      const matchTherapist = therapistFilter === "__ALL__" || b.therapistId === therapistFilter;
      const matchPayment   = paymentFilter === "__ALL__" || (paymentFilter === "paid" ? isPaid(b) : !isPaid(b));
      const usedPromo      = (b.discountAmount ?? 0) > 0;
      const matchPromo     = promoFilter === "__ALL__" || (promoFilter === "promo" ? usedPromo : !usedPromo);
      return matchTherapist && matchPayment && matchPromo;
    });
  }, [bookings, therapistFilter, paymentFilter, promoFilter]);

  // ── counts per bucket ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: faceted.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0, test: 0 };
    for (const b of faceted) {
      if (b.status in c) c[b.status as TabKey]++;
      // 🆕 28x.137 — test is orthogonal to status: a test booking can be any
      //   status, so it's counted independently, not via b.status.
      if (isTestLocationBooking(b)) c.test++;
    }
    return c;
  }, [faceted]);

  // 🆕 28s253/254/258 — summary-strip figures over the faceted (date +
  //   therapist + payment) set. "Booked value" is a real sum over what's
  //   actually loaded/selected, never a fabricated "tonight" figure.
  //   `shopRevenue` = commission base (service price − discount) minus the
  //   therapist payout — i.e. the shop's share of service revenue, same
  //   definition AdminReportPage uses. It excludes taxi (pass-through) and
  //   the per-booking overhead AdminEarningsPage subtracts for "net" — this
  //   is a quick list-page figure, not a replacement for the Earnings page.
  const valueStats = useMemo(() => {
    // 🆕 28w.55 (founder) — Booked Value & Promotions count DELIVERED jobs only
    //   (completed/done). Shop Revenue accrues over all active (non-excluded)
    //   bookings, net of split + promo + no-show taxi. No-show Taxi card also
    //   surfaces the total cancelled count.
    let successValue = 0, successCount = 0;   // delivered jobs (completed/done)
    let promoTotal = 0, promoCount = 0;        // discount handed out on delivered jobs
    let shopRevenue = 0;                        // net of therapist split + promo + no-show taxi
    let cancelledCount = 0;                     // every excluded booking (cancel/refund/no-show/…)
    let noShowTaxi = 0, noShowCount = 0;        // taxi comp the shop pays out for no-shows
    for (const b of faceted) {
      if (isPayrollExcluded(b.status)) {
        cancelledCount++;
        const comp = noShowCompFor(b);   // 🆕 28w.53 — shop bears a no-show's taxi comp
        if (comp > 0) { noShowTaxi += comp; noShowCount++; }
        shopRevenue -= comp;
        continue;
      }
      // active (non-excluded) → shop revenue accrues (base already net of promo)
      shopRevenue += commissionBaseFor(b) - therapistPayoutFor(b);
      // delivered (successful) → booked value + promo actually spent
      if (b.status === "completed" || b.status === "done") {
        successCount++;
        successValue += b.totalPrice ?? b.total ?? 0;
        const disc = b.discountAmount ?? 0;
        if (disc > 0) { promoTotal += disc; promoCount++; }
      }
    }
    return { successValue, successCount, promoTotal, promoCount, shopRevenue, cancelledCount, noShowTaxi, noShowCount };
  }, [faceted]);

  // ── filtered list (facets + tab + search) ──────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return faceted.filter((b) => {
      // 🆕 28x.137 — the Test tab filters by test-address, ignoring status
      //   (a test booking may be pending/completed/cancelled). Every other tab
      //   filters by status as before.
      const matchTab = tab === "all" ? true : tab === "test" ? isTestLocationBooking(b) : b.status === tab;
      const matchQ   = !q || [nameOf(b), b.phone, b.therapistName, b.serviceName, b.address, b.locationName, b.id, b.createdByName, b.createdByEmail, b.createdByPhone]
        .join(" ").toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [faceted, tab, search]);

  // ── write helpers ─────────────────────────────────────────────────
  const setStatus = async (id: string, status: string, reason?: string) => {
    try {
      // 🆕 Round 28s230 (FIX D) — confirming settles the 10-min hold so
      //   releaseExpiredHolds can't later stamp it "expired".
      // 🆕 28w.43 — FREEZE the shop/therapist split onto the booking the
      //   moment it's confirmed (from the current split table). The payslip
      //   reads these stamped fields verbatim, so a later split-table edit
      //   never changes this booking's payout. Un-confirmed / pre-28w.43
      //   bookings have no stamp → payroll falls back to the tier %.
      const patch: Record<string, unknown> =
        status === "confirmed"
          ? (() => {
              const b = bookings.find((x) => x.id === id);
              const split = b ? stampSplit(b) : {};
              return { status, holdState: "confirmed", holdExpiresAt: null, ...split };
            })()
          : status === "cancelled"
          // 🆕 Round 28x.134 — no more countsAsSession reset: the per-booking
          //   credit mode is retired (folded into displaySessionBonus), so a
          //   cancel just sets the status + reason.
          ? { status, ...(reason ? { cancelReason: reason } : {}) }
          : { status };
      await updateDoc(doc(db, "bookings", id), patch);
      // 🆕 28s259 — "booking.status_change" is the fallback for transitions
      //   that don't have a dedicated action name (un-cancelling, marking
      //   refunded/no_show, reverting completed→confirmed, etc.) — the
      //   Status dropdown in DetailPanel can reach any of these now.
      const auditAction =
        status === "confirmed" ? "booking.confirm" :
        status === "cancelled" ? "booking.cancel" :
        status === "completed" ? "booking.complete" : "booking.status_change";
      void logAdminAction(auditAction, { bookingId: id, status, ...(reason ? { reason } : {}) });
      const statusTh = cfgFor(status).labelTh;
      setToast({ msg: `Booking ${status} · ${statusTh}`, ok: true });
    } catch {
      setToast({ msg: "Update failed · อัปเดตล้มเหลว", ok: false });
    }
  };

  // 🆕 28s252 (fix #2) — confirm + capture a reason before cancelling.
  //
  // 🆕 Round 28x.118 (founder: "ยกเลิกออเดอร์ แต่ยังแจกยอดจองให้พนักงานอยู่
  //   เพราะถ้าไม่มียอดจองเลยพนักงานจะขายไม่ได้") — a therapist who gets
  //   assigned real jobs that then fall through (customer no-show, etc.)
  //   still shouldn't look inactive to browsing customers. Only offered
  //   when a real reason was typed, so there's always an audit trail for
  //   why the exception was made; staff/shop-facing numbers (this list,
  //   her Jobs page, Reports) are UNCHANGED — this only affects the public
  //   session total synced from AdminTherapistDetailPage's "Sync Stats".
  const cancelBooking = (id: string) => {
    const reason = window.prompt(
      "ยกเลิกการจองนี้?\nใส่เหตุผล (เว้นว่างได้) — กด Cancel เพื่อไม่ยกเลิก:",
      ""
    );
    if (reason === null) return; // operator backed out
    // 🆕 Round 28x.120 — the "still counts as a session" question used to be
    //   asked here as a second confirm() popup. It's now a persistent toggle
    //   in the detail panel's Status block instead (see DetailPanel), so
    //   cancelling stays one decision and the exception can be set — or
    //   changed, or applied to an already-cancelled booking — whenever.
    void setStatus(id, "cancelled", reason.trim() || undefined);
  };

  // 🆕 28s259 — full status-override dropdown (DetailPanel). Routes through
  //   cancelBooking so choosing "Cancelled" still prompts for a reason,
  //   same as the dedicated Cancel button.
  const changeStatus = (id: string, newStatus: string) => {
    if (newStatus === "cancelled") { cancelBooking(id); return; }
    void setStatus(id, newStatus);
  };

  // 🆕 28s259 (fix: "Awaiting review ใช้ไม่ได้") — the badge had no onClick
  //   at all; it's not even a real gate on anything downstream (grepped:
  //   `reviewed` is never written anywhere in this codebase, only ever
  //   read). Turning it into a real action lets the operator dismiss it.
  const markReviewed = async (id: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { reviewed: true });
      void logAdminAction("booking.mark_reviewed", { bookingId: id });
      setToast({ msg: "Marked reviewed · ทำเครื่องหมายว่าตรวจแล้ว", ok: true });
    } catch {
      setToast({ msg: "Update failed · อัปเดตล้มเหลว", ok: false });
    }
  };

  // 🆕 28s259/261 (fix: "full detail แก้ไขไม่ได้" + "เปลี่ยนหมอนวดได้" +
  //   "แก้ราคาได้ ทั้งหมด") — the detail drawer's edit form (customer/phone/
  //   date/time/location/therapist/payment method/price) writes through
  //   here. `auditDetail` is a SEPARATE object from `patch` — it's only for
  //   the audit-log entry (e.g. price before/after), never written onto the
  //   booking doc itself.
  const saveDetails = async (id: string, patch: Record<string, unknown>, auditDetail?: Record<string, unknown>) => {
    try {
      await updateDoc(doc(db, "bookings", id), patch);
      void logAdminAction("booking.edit_details", { bookingId: id, ...auditDetail });
      setToast({ msg: "Details saved · บันทึกแล้ว", ok: true });
    } catch {
      setToast({ msg: "Save failed · บันทึกล้มเหลว", ok: false });
    }
  };

  // 🆕 28s252 (fix #3 + #5) — keep `paid` and `paymentStatus` in sync + audit.
  const togglePaid = async (id: string, cur: boolean) => {
    const next = !cur;
    try {
      await updateDoc(doc(db, "bookings", id), {
        paid: next,
        paymentStatus: next ? "paid" : "unpaid",
      });
      void logAdminAction(next ? "booking.mark_paid" : "booking.mark_unpaid", { bookingId: id });
      setToast({ msg: next ? "Marked as paid · จ่ายแล้ว" : "Marked unpaid · ยังไม่จ่าย", ok: true });
    } catch {
      setToast({ msg: "Update failed · อัปเดตล้มเหลว", ok: false });
    }
  };

  const saveNote = async (id: string, note: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { adminNote: note });
      setToast({ msg: "Note saved · บันทึกโน้ตแล้ว", ok: true });
    } catch {
      setToast({ msg: "Save failed · บันทึกล้มเหลว", ok: false });
    }
  };

  const exportXLSX = async () => {
    const rows = visible.map((b) => ({
      ID:           b.id,
      User:         nameOf(b),
      Phone:        b.phone || "-",
      Therapist:    b.therapistName,
      Service:      getServiceLabel(b.serviceId, b.serviceName),
      Date:         b.date || (b.startAt ? fmtBKK(b.startAt.toDate(), "YYYY-MM-DD") : "-"),
      Time:         b.time || "-",
      Address:      b.locationName || b.address || "",
      BookedBy:     bookingAuthorLabel(b),
      Status:       b.status,
      Payment:      isPaid(b) ? "Paid" : "Unpaid",
      ServicePrice: b.servicePrice || 0,
      TaxiFee:      b.taxiFee     || 0,
      Total:        b.totalPrice  || b.total || 0,
      Note:         b.adminNote   || "",
    }));
    await ExportToExcel(rows, `bookings-${Date.now()}.xlsx`);
  };

  const inFeed = bookings.find((b) => b.id === detailId) ?? null;
  const detailBooking =
    inFeed ?? (fallbackBooking && fallbackBooking.id === detailId ? fallbackBooking : null);

  // 🆕 Round 28s314 — when the deep-linked booking isn't in the current feed
  //   (outside the date filter / not yet paged in), fetch it directly so the
  //   drawer isn't blank. Cleared when the drawer closes.
  useEffect(() => {
    if (!detailId || inFeed) return;
    if (fallbackBooking?.id === detailId) return;
    let alive = true;
    void getDoc(doc(db, "bookings", detailId)).then((snap) => {
      if (alive && snap.exists()) {
        setFallbackBooking({ id: snap.id, ...snap.data() } as Booking);
      }
    });
    return () => {
      alive = false;
    };
  }, [detailId, inFeed, fallbackBooking]);

  const closeDetail = () => {
    setDetailId(null);
    setFallbackBooking(null);
    if (searchParams.get("open")) {
      searchParams.delete("open");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: adminColor.bg, pb: 10 }}>

      {/* ── header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: adminColor.bg,
          borderBottom: `1px solid ${adminColor.line}`,
          px: { xs: 2, md: 3 },
          pt: 3,
          pb: 2.5,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            Bookings
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.dim, letterSpacing: "0.14em", textTransform: "uppercase", mt: 0.4 }}>
            รายการจอง
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mt: 0.6 }}>
            {counts.pending > 0
              ? `${counts.pending} pending · รอยืนยัน ${counts.pending} รายการ`
              : "All up to date · อัปเดตครบแล้ว"}
            {atCap && ` · showing latest ${feedSize} · แสดง ${feedSize} รายการล่าสุด`}
          </Typography>
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={exportXLSX}
          aria-label="Export bookings to Excel"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 40, padding: "0 18px", borderRadius: 999,
            background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
            color: adminColor.text, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Export size={15} /> Export · ส่งออก
        </motion.button>
      </Box>

      {/* 🆕 28s253 — summary strip: what needs the operator's attention first,
          before any card is scanned.
          🆕 Round 28r44 (founder: "polish to Dashboard visual quality") — the
          original 3-card left-rail strip elevated to the same icon-circle
          widget vocabulary Dashboard's "Period Summary" row uses (28s241):
          46px icon circle per stat (Warning / Clock / Wallet / Buildings) on
          top-center with inset highlight + color-tinted micro-shadow, subtle
          hover lift + tinted bg, radius 18, depth shadow. Shop Revenue split
          out of Booked Value's extra tag into its own equal-weight card so
          each stat gets its own icon and the row reads as one coherent 4-card
          hero (matches Dashboard's 4-tile period stat pattern exactly). */}
      <Box
        sx={{
          px: { xs: 2, md: 3 }, pt: 2.5,
          display: "grid",
          // 🆕 28w.47 (founder "คอลัม เรียง 2-3 แถว ประหยัดพื้นที่บนมือถือ") —
          //   2 cards per row on phones (was 1-up = a very tall strip), 3 on
          //   larger phones, auto-fit on desktop.
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(auto-fit, minmax(150px, 1fr))",
          },
          gap: { xs: 1, sm: 1.25 },
        }}
      >
        {[
          { label: "Needs Action", labelTh: "ต้องดำเนินการ",  value: String(counts.pending),           sub: "pending confirmation · รอยืนยัน", color: adminColor.amber,     icon: <Warning   size={20} weight="duotone" /> },
          { label: "In Progress",  labelTh: "กำลังดำเนินการ", value: String(counts.confirmed),         sub: "confirmed · ยืนยันแล้ว",           color: adminColor.accent,    icon: <Clock     size={20} weight="duotone" /> },
          // 🆕 28w.55 (founder "มูลค่ารวม bookings แค่ที่สำเร็จ") — delivered
          //   jobs only (completed/done), not confirmed-but-not-done.
          { label: "Booked Value", labelTh: "มูลค่ารวม",       value: formatTHB(valueStats.successValue), sub: `${valueStats.successCount} bookings · สำเร็จแล้ว`, color: adminColor.highlight, icon: <Wallet    size={20} weight="duotone" /> },
          // 🆕 28w.55 (founder "เพิ่ม Promotions โชว์ยอดที่ร้านใช้แจกโปร") —
          //   total discount handed out on delivered jobs.
          { label: "Promotions",  labelTh: "โปรโมชั่น",        value: formatTHB(valueStats.promoTotal), sub: `${valueStats.promoCount} โปร · ส่วนลดที่แจก`, color: adminColor.accent, icon: <Tag size={20} weight="duotone" /> },
          // 🆕 28w.54/55 — taxi comp the shop pays out for no-shows (real cash,
          //   unlike lost booking value). Sub also surfaces the cancelled count.
          { label: "No-show Taxi", labelTh: "ค่าแท็กซี่ No-show", value: formatTHB(valueStats.noShowTaxi), sub: `ยกเลิก ${valueStats.cancelledCount} · no-show ${valueStats.noShowCount}`, color: adminColor.amber, icon: <Taxi size={20} weight="duotone" /> },
          // 🆕 28s258 — shop's net cut. Base is post-promo, and 28w.53 subtracts
          //   the no-show taxi, so this is already net of split + promo + no-show.
          { label: "Shop Revenue", labelTh: "รายได้ร้าน",      value: formatTHB(valueStats.shopRevenue), sub: "หลังหักหมอ · โปร · No-show", color: adminColor.green,     icon: <Buildings size={20} weight="duotone" /> },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.6,
              background: adminColor.panel, border: `1px solid ${adminColor.line}`,
              borderRadius: "18px", p: "18px 12px 16px",
              boxShadow: "0 2px 10px rgba(31,41,51,0.04)",
              transition: "transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                background: `${s.color}0A`,
                boxShadow: `0 4px 14px rgba(31,41,51,0.06), 0 2px 6px ${s.color}18`,
              },
            }}
          >
            <Box
              sx={{
                width: 46, height: 46, borderRadius: "50%",
                background: `${s.color}1A`, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px ${s.color}22`,
              }}
            >
              {s.icon}
            </Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 22, color: adminColor.text, lineHeight: 1, mt: 0.5 }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1, mt: 0.1 }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, color: adminColor.dim, lineHeight: 1 }}>
              {s.labelTh}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.35, lineHeight: 1.3 }}>
              {s.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── search + status tabs (merged into one control row — 28s253) ── */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 1,
            px: 1.5, height: 44, flex: "1 1 220px",
            borderRadius: "13px",
            background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
          }}
        >
          <MagnifyingGlass size={16} color={adminColor.dim} />
          <InputBase
            placeholder="Search · ค้นหา customer, therapist, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: adminColor.text }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            flexShrink: 0,
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {/* 🆕 Round 28r44 (founder: "ตรงตัวกรองไม่ต้อง") — filter labels are
              English-only. Thai subtitles retained on the page header + summary
              strip + status badges (row state) + edit-drawer labels + actions
              per r40 bilingual policy; only the FILTER controls (tabs, date
              toggle, DatePicker labels, therapist/payment Selects) go English
              only, since they're controls the operator toggles, not content. */}
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <motion.button
                key={t.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                aria-label={t.label}
                style={{
                  flexShrink: 0,
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  background: active ? adminColor.accent : adminColor.panel,
                  border: active ? "none" : `1px solid ${adminColor.line2}`,
                  color: active ? "#fff" : adminColor.muted,
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? "0 5px 14px rgba(78,126,140,0.28)" : "none",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "border-color 0.15s ease, color 0.15s ease",
                }}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 19, height: 19, borderRadius: 999, px: "5px",
                      background: active ? "rgba(255,255,255,0.24)" : `${adminColor.accent}1F`,
                      color: active ? "#fff" : adminColor.accent,
                      fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {counts[t.key]}
                  </Box>
                )}
              </motion.button>
            );
          })}
        </Box>
      </Box>

      {/* 🆕 28s254 — date range + therapist + payment filters. */}
      <Box
        sx={{
          px: { xs: 2, md: 3 }, pt: 1.25,
          display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center",
          "& .MuiInputBase-root": { color: adminColor.text },
          "& .MuiInputLabel-root": { color: adminColor.muted },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
          "& .MuiSvgIcon-root": { color: adminColor.muted },
        }}
      >
        <ToggleButtonGroup
          value={dateMode}
          exclusive
          size="small"
          onChange={(_, v) => v && setDateMode(v as DateMode)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS, fontSize: 12.5, fontWeight: 600, textTransform: "none",
              color: adminColor.muted, borderColor: adminColor.line2, padding: "6px 14px",
              "&.Mui-selected": { color: "#fff", background: adminColor.accent, "&:hover": { background: adminColor.accentDeep } },
            },
          }}
        >
          {/* 🆕 Round 28r44 — filter labels English-only (see tabs comment). */}
          <ToggleButton value="all">All time</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {dateMode === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={customStart}
              maxDate={customEnd}
              onChange={(v) => v && setCustomStart(v)}
              slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
            />
            <DatePicker
              label="To"
              value={customEnd}
              minDate={customStart}
              maxDate={dayjs()}
              onChange={(v) => v && setCustomEnd(v)}
              slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
            />
          </LocalizationProvider>
        )}

        {therapistOptions.length > 0 && (
          <Select
            size="small"
            value={therapistFilter}
            onChange={(e) => setTherapistFilter(e.target.value)}
            sx={{ minWidth: 180, fontSize: 13 }}
            MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
          >
            <MenuItem value="__ALL__">All Therapists</MenuItem>
            {therapistOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
        )}

        <Select
          size="small"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          sx={{ minWidth: 160, fontSize: 13 }}
          MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
        >
          <MenuItem value="__ALL__">Any Payment</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="unpaid">Unpaid</MenuItem>
        </Select>

        {/* 🆕 28w.56 → 28w.57 (founder "เปลี่ยนเป็น button") — promo filter as a
            pill toggle (matches the status tabs): on = only promo orders. */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setPromoFilter((p) => (p === "promo" ? "__ALL__" : "promo"))}
          aria-pressed={promoFilter === "promo"}
          aria-label="Promotions filter · ใช้โปรฯ"
          style={{
            flexShrink: 0,
            height: 40,
            padding: "0 16px",
            borderRadius: 999,
            background: promoFilter === "promo" ? adminColor.accent : adminColor.panel,
            border: promoFilter === "promo" ? "none" : `1px solid ${adminColor.line2}`,
            color: promoFilter === "promo" ? "#fff" : adminColor.muted,
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: promoFilter === "promo" ? "0 5px 14px rgba(78,126,140,0.28)" : "none",
            display: "flex", alignItems: "center", gap: 6,
            transition: "border-color 0.15s ease, color 0.15s ease, background 0.15s ease",
          }}
        >
          <Tag size={16} weight={promoFilter === "promo" ? "fill" : "duotone"} />
          ใช้โปรฯ
        </motion.button>
      </Box>

      {/* ── card list ─────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" },
          // 🆕 28s256 — trimmed from 1.5→1: each card frame now carries its
          // own 8px padding, so the old gap on top of that read as too much
          // air between cards.
          gap: 1,
        }}
      >
        {loading ? (
          <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 6 }}>
            <CircularProgress sx={{ color: adminColor.accent }} />
          </Box>
        ) : visible.length === 0 ? (
          <Box
            sx={{
              gridColumn: "1/-1", textAlign: "center", py: 8,
              color: adminColor.dim, fontFamily: SANS, fontSize: 14,
            }}
          >
            No bookings found · ไม่พบรายการจอง
          </Box>
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              >
                <BookingCard
                  booking={b}
                  member={memberForPhone(b.phone)}
                  onConfirm={() => setStatus(b.id, "confirmed")}
                  onComplete={() => setStatus(b.id, "completed")}
                  onCancel={() => cancelBooking(b.id)}
                  onTogglePaid={() => togglePaid(b.id, isPaid(b))}
                  onSaveNote={(note) => saveNote(b.id, note)}
                  onViewDetail={() => setDetailId(b.id)}
                  onMarkReviewed={() => markReviewed(b.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* 🆕 28s257 — "Load more" instead of a hard ceiling. Only the operator
          decides to pull in another page; nothing fetches unboundedly on its
          own. */}
      {!loading && atCap && (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, textAlign: "center" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFeedSize((s) => s + FEED_LIMIT)}
            style={{
              height: 40, padding: "0 22px", borderRadius: 999,
              background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
              color: adminColor.text, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Load {FEED_LIMIT} more · โหลดเพิ่ม {FEED_LIMIT}
          </motion.button>
        </Box>
      )}

      {/* ── detail drawer ─────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!detailId}
        onClose={closeDetail}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            background: adminColor.bg,
            p: 0,
          },
        }}
      >
        {detailBooking && (
          <DetailPanel
            booking={detailBooking}
            member={memberForPhone(detailBooking.phone)}
            therapists={therapists}
            onClose={closeDetail}
            onConfirm={() => { void setStatus(detailBooking.id, "confirmed"); }}
            onComplete={() => { void setStatus(detailBooking.id, "completed"); }}
            onCancel={() => cancelBooking(detailBooking.id)}
            onTogglePaid={() => { void togglePaid(detailBooking.id, isPaid(detailBooking)); }}
            onSaveNote={(note) => { void saveNote(detailBooking.id, note); }}
            onChangeStatus={(status) => changeStatus(detailBooking.id, status)}
            onSaveDetails={(patch, auditDetail) => { void saveDetails(detailBooking.id, patch, auditDetail); }}
            countPriorCodeUses={countPriorCodeUses}
          />
        )}
      </Drawer>

      {/* ── toast ────────────────────────────────────────────────────*/}
      <Snackbar
        open={!!toast}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast?.ok ? "success" : "error"}
          variant="filled"
          sx={{ borderRadius: "12px", fontFamily: SANS, fontSize: 13 }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Booking card
// ──────────────────────────────────────────────────────────────────────
const BookingCard: React.FC<{
  booking: Booking;
  member: MembershipResult | null;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onSaveNote: (note: string) => void;
  onViewDetail: () => void;
  onMarkReviewed: () => void;
}> = ({ booking: b, member, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote, onViewDetail, onMarkReviewed }) => {
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState(b.adminNote ?? "");

  const cfg        = cfgFor(b.status);
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);
  const isPending   = b.status === "pending";
  const isConfirmed = b.status === "confirmed";
  const paid        = isPaid(b);
  // 🆕 28s253 — "terminal" bookings (done/cancelled) recede: duller panel,
  //   no hover lift, ink price instead of accent. Keeps the eye on what's
  //   still actionable rather than history.
  const isTerminal  = b.status === "completed" || b.status === "cancelled";

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "ddd D MMM · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "ddd D MMM")} · ${b.time}`
    : b.date
    ? fmtBKK(b.date, "ddd D MMM")
    : "—";

  return (
    // 🆕 Round 28s256 (founder reference screenshot: "พื้นหลังรอง กรอบและปุ่ม
    //   แบบตัวอย่างนี้" — a customer-site card style with a nested frame:
    //   duller "secondary background" box holding a white inner card. Kept
    //   Ocean Study's own accent teal on buttons per founder's explicit
    //   choice ("คง teal เดิม") — only the nested-frame STRUCTURE was
    //   adopted, not the reference's dark-navy button color.
    <Box
      sx={{
        borderRadius: "24px",
        background: CARD_FRAME_BG, // secondary background — the frame
        p: "8px",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        boxShadow: isTerminal
          ? "0 1px 2px rgba(31,41,51,0.03)"
          : "0 1px 2px rgba(31,41,51,0.04), 0 8px 22px rgba(31,41,51,0.07)",
        // 🆕 Round 28r44 — active card hover elevated slightly (~10% deeper
        //   alpha on both shadow layers) so the affordance reads a shade
        //   more clearly against the r44 elevated summary strip above.
        ...(!isTerminal && {
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 3px 6px rgba(31,41,51,0.06), 0 18px 44px rgba(31,41,51,0.14)",
          },
        }),
      }}
    >
      <Box
        sx={{
          borderRadius: "18px",
          background: isTerminal ? adminColor.panel2 : adminColor.panel,
          border: `1px solid ${adminColor.line}`,
          overflow: "hidden",
        }}
      >
      {/* accent stripe */}
      <Box sx={{ height: 3, background: cfg.stripe }} />

      <Box sx={{ p: "14px 16px 12px" }}>
        {/* row 1: therapist + status badge */}
        {/* 🆕 Round 28r40 — the compact card pill stays English-only for
            space; `cfg.bilingual` (Eng · Thai) is used in wider surfaces
            (drawer header pill + Status dropdown), where there's room. */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: isTerminal ? adminColor.muted : adminColor.text, lineHeight: 1.2 }}>
            {b.therapistName}
          </Typography>
          <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: cfg.badge.bg, flexShrink: 0 }} title={cfg.bilingual}>
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.badge.fg }}>
              {cfg.label}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 600, color: cfg.badge.fg, opacity: 0.85, textAlign: "center", lineHeight: 1, mt: "1px" }}>
              {cfg.labelTh}
            </Typography>
          </Box>
        </Box>

        {/* service */}
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mb: 0.5 }}>
          {getServiceLabel(b.serviceId, b.serviceName)}
          {b.duration && <Box component="span" sx={{ color: adminColor.dim, ml: 0.75 }}>· {b.duration} min</Box>}
        </Typography>

        {/* datetime */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
          <Clock size={12} color={adminColor.dim} />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{dateLabel}</Typography>
        </Box>

        {/* location */}
        {(b.locationName || b.address) && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mb: 0.4 }}>
            <MapPin size={12} color={adminColor.dim} style={{ flexShrink: 0, marginTop: 2 }} />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, lineHeight: 1.4 }}>
              {b.locationName || b.address}
            </Typography>
          </Box>
        )}

        {/* customer name — 🆕 28x.38 (founder: "ในใบจอง...กดเข้าดูโปรไฟล์หรือ
            ประวัติการจองหรือ เลขรหัสสมาชิกของลูกค้าได้") — tap the name to open
            the members page filtered to this guest (SRD code · ยอดสะสม · history).
            Booking phone is the key (concierge bookings carry no userId).
            stopPropagation so it doesn't also open the booking drawer. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <User size={12} color={adminColor.dim} />
          {b.phone ? (
            <Typography
              component={RouterLink}
              to={`/admin/members?q=${encodeURIComponent(normPhone(String(b.phone)))}`}
              onClick={(e) => e.stopPropagation()}
              sx={{
                fontFamily: SANS, fontSize: 12, fontWeight: 600,
                color: adminColor.accent,
                textDecoration: "underline", textDecorationStyle: "dotted",
                textUnderlineOffset: 2,
              }}
            >
              {nameOf(b)}
            </Typography>
          ) : (
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{nameOf(b)}</Typography>
          )}
        </Box>

        {/* 🆕 28w.59 — membership + no-show badges for this customer */}
        {member && (member.tier || member.hasNoShow) && (
          <Box sx={{ mt: 0.5 }}>
            <MembershipBadges member={member} />
          </Box>
        )}

        {/* customer phone, tap-to-call */}
        {b.phone && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
            <Phone size={12} color={adminColor.green} weight="fill" />
            <Typography
              component="a"
              href={`tel:${b.phone}`}
              onClick={(e) => e.stopPropagation()}
              sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.green, textDecoration: "none" }}
            >
              {b.phone}
            </Typography>
          </Box>
        )}

        {/* needs-review warning */}
        {b.needsAdminReview && (
          <Box
            sx={{
              mt: 0.6, px: 0.8, py: 0.4, borderRadius: 1,
              background: `${adminColor.red}14`, border: `1px solid ${adminColor.red}40`,
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.red }}>
              ⚠️ ต้องเช็คก่อนยืนยัน{b.reviewReason ? ` · ${b.reviewReason}` : " — หมอนวดอาจไม่ว่าง"}
            </Typography>
          </Box>
        )}

        {/* divider */}
        <Box sx={{ my: 1.25, borderTop: `1px solid ${adminColor.line}` }} />

        {/* bottom row: price + paid toggle + primary CTA */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 18, color: isTerminal ? adminColor.dim : adminColor.accent, lineHeight: 1 }}>
              {formatTHB(total)}
            </Typography>
            {b.taxiFee ? (
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.2 }}>
                incl. ฿{b.taxiFee} taxi
              </Typography>
            ) : null}
            {/* 🆕 28w.58 — promo chip so promo orders are spottable in the list */}
            {(b.discountCode || (b.discountAmount ?? 0) > 0) && (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, mt: 0.4, px: 0.75, py: "2px", borderRadius: 999, background: `${adminColor.accent}14` }}>
                <Tag size={11} weight="fill" color={adminColor.accent} />
                <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: adminColor.accent, lineHeight: 1 }}>
                  {b.discountCode || "โปรฯ"}{(b.discountAmount ?? 0) > 0 ? ` −฿${b.discountAmount}` : ""}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
            {/* paid toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onTogglePaid}
              title={paid ? "Mark unpaid · ยังไม่จ่าย" : "Mark paid · จ่ายแล้ว"}
              aria-label={paid ? "Mark unpaid" : "Mark paid"}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: paid ? `${adminColor.green}1F` : adminColor.panel2,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <CurrencyCircleDollar size={16} color={paid ? adminColor.green : adminColor.dim} weight={paid ? "fill" : "regular"} />
            </motion.button>

            {/* expand toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse · ย่อ" : "Expand · ขยาย"}
              title={expanded ? "Collapse · ย่อ" : "Expand · ขยาย"}
              aria-expanded={expanded}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: adminColor.panel2, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {expanded
                ? <CaretUp size={14} color={adminColor.muted} weight="bold" />
                : <CaretDown size={14} color={adminColor.muted} weight="bold" />}
            </motion.button>

            {/* primary action */}
            {isPending && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                aria-label="Confirm booking · ยืนยันการจอง"
                style={{
                  height: 36, padding: "0 16px", borderRadius: 999,
                  background: adminColor.accent,
                  color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(78,126,140,0.30)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <CheckCircle size={14} weight="fill" /> Confirm · ยืนยัน
              </motion.button>
            )}
            {isConfirmed && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onComplete}
                aria-label="Mark complete · เสร็จสิ้น"
                style={{
                  height: 36, padding: "0 16px", borderRadius: 999,
                  background: adminColor.green,
                  color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(22,163,74,0.28)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <CheckCircle size={14} weight="fill" /> Done · เสร็จ
              </motion.button>
            )}
          </Box>
        </Box>

        {/* expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <Box sx={{ pt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                {/* 🆕 28x.3 (founder: "จะระบุได้ไง ใครจอง") — WHO opened this
                    reservation. Tap-to-call the admin who did: when a therapist is
                    at the door and the price is wrong, the person to reach is
                    whoever booked it, and an email address is useless on a
                    doorstep. Bookings made before this round carry no author and
                    say so, rather than being attributed to someone. */}
                <Box
                  sx={{
                    display: "flex", gap: 0.75, alignItems: "center",
                    px: 1.25, py: 0.75, borderRadius: "10px",
                    background: adminColor.panel2,
                    border: `1px solid ${adminColor.line}`,
                  }}
                >
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: adminColor.dim, flexShrink: 0 }}>
                    เปิดโดย
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.text, flex: 1, minWidth: 0 }}>
                    {bookingAuthorLabel(b)}
                  </Typography>
                  {b.createdByPhone && (
                    <Box
                      component="a"
                      href={`tel:${b.createdByPhone}`}
                      sx={{
                        fontFamily: SANS, fontSize: 11.5, fontWeight: 800,
                        color: adminColor.accent, textDecoration: "none",
                        px: 1, py: "2px", borderRadius: 999,
                        border: `1px solid ${adminColor.line2}`,
                        flexShrink: 0,
                      }}
                    >
                      โทร
                    </Box>
                  )}
                </Box>

                {/* note */}
                <Box
                  sx={{
                    display: "flex", gap: 0.75, alignItems: "center",
                    px: 1.25, py: 0.75,
                    borderRadius: "10px",
                    background: adminColor.panel2,
                    border: `1px solid ${adminColor.line}`,
                  }}
                >
                  <NotePencil size={13} color={adminColor.dim} style={{ flexShrink: 0 }} />
                  <InputBase
                    placeholder="Admin note · โน้ตแอดมิน…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => onSaveNote(note)}
                    multiline
                    maxRows={3}
                    sx={{ flex: 1, fontFamily: SANS, fontSize: 12, color: adminColor.text }}
                  />
                </Box>

                {/* secondary actions */}
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onViewDetail}
                    style={{
                      flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                      background: adminColor.panel2,
                      border: `1px solid ${adminColor.line2}`,
                      color: adminColor.muted, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Full detail · ดูรายละเอียด
                  </motion.button>

                  {(isPending || isConfirmed) && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onCancel}
                      style={{
                        flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                        background: `${adminColor.red}12`,
                        border: `1px solid ${adminColor.red}33`,
                        color: adminColor.red, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <XCircle size={13} weight="fill" /> Cancel · ยกเลิก
                    </motion.button>
                  )}

                  {/* 🆕 28s259 — this used to be a plain <Box>, same border/
                      radius as "Full detail" next to it but with NO onClick —
                      looked like a button, did nothing. Real action now:
                      dismiss the "waiting on the guest's review" flag.
                      🆕 28r40 — label was "Awaiting review" (a STATE),
                      confusing: the button says one thing, the action does
                      another. Renamed to "Mark reviewed · ตรวจแล้ว" —
                      matches what tapping actually does. */}
                  {b.status === "completed" && !b.reviewed && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onMarkReviewed}
                      title="Mark as reviewed · ทำเครื่องหมายว่าตรวจแล้ว"
                      style={{
                        flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                        background: adminColor.panel2,
                        border: `1px solid ${adminColor.line}`,
                        color: adminColor.dim, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <Star size={12} /> Mark reviewed · ตรวจแล้ว
                    </motion.button>
                  )}
                </Box>

                {/* booking ID */}
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, textAlign: "right", letterSpacing: "0.04em" }}>
                  #{b.id.slice(0, 10).toUpperCase()}
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Detail panel (inside Drawer)
// ──────────────────────────────────────────────────────────────────────
// 🆕 28s259 — statuses the operator can pick from the override dropdown.
//   Same set STATUS_CFG already renders badges for.
const ALL_STATUSES = Object.keys(STATUS_CFG);

// 🆕 28s260 (founder: "เพิ่มวิธีการจ่ายด้วย") — same options AdminBookingAddPage
//   offers when creating a booking; kept in sync so the two pages never
//   disagree on what payment methods exist.
const PAYMENT_METHOD_OPTIONS = [
  { value: "cash",      label: "เงินสด (Cash)" },
  { value: "transfer",  label: "โอนเงิน (Transfer)" },
  { value: "card",      label: "บัตร (Card)" },
  { value: "promptpay", label: "PromptPay" },
  { value: "wechat",    label: "WeChat Pay" },
  { value: "alipay",    label: "Alipay" },
];
const paymentMethodLabel = (v?: string): string =>
  PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? (v || "—");

// 🆕 28x.99t — mirrors AdminBookingAddPage.tsx's SOURCE_OPTIONS (same
//   `attributionSource` field, kept as two literals since the files don't
//   share a module — update both together if this list changes).
const SOURCE_OPTIONS = [
  { value: "",              label: "ไม่ระบุ (Unknown)" },
  { value: "telegram",      label: "Telegram (@SunRed_BKK)" },
  { value: "wechat",        label: "WeChat" },
  { value: "line",          label: "LINE OA" },
  { value: "sammyboy",      label: "Sammyboy / Samsguide" },
  { value: "referral",      label: "Referral (แนะนำจากลูกค้าเก่า)" },
  { value: "repeat",        label: "Repeat guest (ลูกค้าประจำ)" },
  { value: "word_of_mouth", label: "Word of mouth / คนขับแท็กซี่" },
  { value: "google",        label: "Google" },
  { value: "direct",        label: "Direct" },
  { value: "other",         label: "Other · อื่นๆ" },
];
const sourceLabel = (v?: string | null): string =>
  SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? (v || "ไม่ระบุ (Unknown)");

// 🆕 Round 28s264 (founder: "ปรับให้หน้าแก้ไข มันสวยขึ้นและใช้งานง่าย") —
//   shared field styling for every editable control in the edit form
//   (TextField AND Select alike), so focus/hover always reads as "this
//   theme," not a native-browser blue ring. Applied consistently instead
//   of the ad-hoc one-off sx each field carried before.
const editFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px", fontFamily: SANS, fontSize: 13.5, background: adminColor.panel,
    "& fieldset": { borderColor: adminColor.line2 },
    "&:hover fieldset": { borderColor: adminColor.dim },
    "&.Mui-focused fieldset": { borderColor: adminColor.accent, borderWidth: "1.5px" },
  },
} as const;

// 🆕 Round 28s265 (founder: "dropdown ... พื้นมันบางใสจนเห็นรายละเอียดอื่น
//   ด้านหลัง") — root cause: the app's GLOBAL MUI theme
//   (`src/theme.ts` → `palette.background.paper`) is a deliberately
//   translucent `rgba(255,255,255,0.65)` for the customer site's
//   frosted-glass look. Any Select/TextField-select that doesn't override
//   its Menu Paper explicitly inherits that see-through background — which
//   is exactly what the 4 `TextField select` fields added in 28s264
//   (Therapist/Service/Duration/Payment method) were missing. Every plain
//   `<Select>` elsewhere in this file already carries an inline
//   `MenuProps` override; TextField's equivalent is `SelectProps.MenuProps`
//   — easy to forget since it's a different prop name. This constant is
//   the fix, applied to all four.
const editSelectProps = {
  MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } },
} as const;

// 🆕 28s264 — small section header (icon + label) used to group the edit
//   form into Guest & Schedule / Service / Billing / Record instead of one
//   long flat list of rows.
// 🆕 28r40 — accepts an optional `subtitle` (Thai counterpart) — mirrors the
//   r35 AdminDashboardPage eyebrow-with-Thai-tag pattern.
const SectionHeader: React.FC<{ icon: React.ReactNode; children: React.ReactNode; subtitle?: string }> = ({ icon, children, subtitle }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    <Box sx={{ color: adminColor.dim, display: "flex", lineHeight: 0 }}>{icon}</Box>
    <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1 }}>
        {children}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: adminColor.dim, mt: 0.3, letterSpacing: "0.02em" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

const DetailPanel: React.FC<{
  booking: Booking;
  member: MembershipResult | null;
  therapists: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onSaveNote: (note: string) => void;
  onChangeStatus: (status: string) => void;
  // 🆕 28x.120 — flip the "still counts as a session publicly" exception on a
  //   cancelled booking, any time, not just at the moment of cancelling.
  onSaveDetails: (patch: Record<string, unknown>, auditDetail?: Record<string, unknown>) => void;
  // 🆕 28x.43 — how many OTHER bookings this phone already has under a code
  //   (the redemption memory made visible on the slip).
  countPriorCodeUses: (phone: string, code: string, excludeId: string) => number;
}> = ({ booking: b, member, therapists, onClose, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote, onChangeStatus, onSaveDetails, countPriorCodeUses }) => {
  const [note, setNote] = useState(b.adminNote ?? "");
  const cfg        = cfgFor(b.status);
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);
  const paid        = isPaid(b);

  // 🆕 28s259/261/262 — edit-details form (customer/phone/date/time/
  //   location/therapist/payment method/price). Price was excluded in
  //   28s259, reopened in 28s261 (service+taxi editable, Total derived), and
  //   in 28s262 (founder: "ให้บิล แก้ได้ทั้งหมด บนใบจอง") Total ITSELF
  //   became a free number too — the whole bill, not just its components.
  //   Reasoning: a solo operator sometimes just agrees a number with the
  //   guest that doesn't cleanly equal service+taxi+surcharge (a one-off
  //   discount, a rounded cash amount) and needs to record reality, not be
  //   locked to a formula. The computed value is still surfaced as a
  //   one-click suggestion, never forced.
  const [editing, setEditing] = useState(false);
  const startEdit = () => {
    setEditForm({
      therapistId: b.therapistId ?? "",
      contactName: nameOf(b),
      phone: b.phone ?? "",
      date: b.date || (b.startAt?.toDate ? fmtBKK(b.startAt.toDate(), "YYYY-MM-DD") : dayjs().format("YYYY-MM-DD")),
      time: b.time || (b.startAt?.toDate ? fmtBKK(b.startAt.toDate(), "HH:mm") : "10:00"),
      location: b.locationName || b.address || "",
      payment: b.payment || "cash",
      serviceId: b.serviceId ?? "",
      duration: b.duration ?? 60,
      servicePrice: String(b.servicePrice ?? 0),
      taxiFee: String(b.taxiFee ?? 0),
      total: String(b.totalPrice ?? b.total ?? 0),
      discountCode: b.discountCode ?? "",
      attributionSource: b.attributionSource ?? "",
    });
    setEditing(true);
  };
  const [editForm, setEditForm] = useState({
    therapistId: b.therapistId ?? "",
    contactName: nameOf(b),
    phone: b.phone ?? "",
    date: b.date ?? "",
    time: b.time ?? "",
    location: b.locationName || b.address || "",
    payment: b.payment || "cash",
    serviceId: b.serviceId ?? "",
    duration: b.duration ?? 60,
    servicePrice: String(b.servicePrice ?? 0),
    taxiFee: String(b.taxiFee ?? 0),
    total: String(b.totalPrice ?? b.total ?? 0),
    discountCode: b.discountCode ?? "",
    // 🆕 28x.99t — most bookings (admin-created) never captured this;
    //   lets the operator tag it after the fact, from memory.
    attributionSource: b.attributionSource ?? "",
  });

  // 🆕 28s263 — changing Service or Duration re-fills Service price with the
  //   catalog's price for that combination (same as AdminBookingAddPage's
  //   handleServiceChange). It's still just a starting point: the Service
  //   price field stays freely editable afterward, same as 28s261.
  const editSelectedService = services.find((s) => s.id === editForm.serviceId);
  const editAvailableDurations = editSelectedService ? durationsFor(editSelectedService) : [60, 90, 120];
  const changeService = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    const tiers = svc ? durationsFor(svc) : [60, 90, 120];
    const duration = tiers.includes(editForm.duration) ? editForm.duration : tiers[0];
    setEditForm((f) => ({
      ...f,
      serviceId,
      duration,
      servicePrice: svc ? String(priceForDuration(svc, duration)) : f.servicePrice,
    }));
  };
  const changeDuration = (duration: number) => {
    setEditForm((f) => ({
      ...f,
      duration,
      servicePrice: editSelectedService ? String(priceForDuration(editSelectedService, duration)) : f.servicePrice,
    }));
  };

  // Live figures for the edit form — recomputed from whatever's currently
  // typed. `computedTotal` is a SUGGESTION only; `editForm.total` (what
  // actually gets saved) is independent and freely editable.
  const editServicePrice = Number(editForm.servicePrice) || 0;
  const editTaxiFee      = Number(editForm.taxiFee) || 0;
  const editSurcharge    = paymentSurcharge(editForm.payment, editServicePrice + editTaxiFee);
  // 🆕 28x.38 — validate the typed discount code against the menu amount
  //   (service, not taxi), same rules the customer flow enforces. Quiet
  //   invalid → 0 (UI shows a hint). Surcharge is computed on the pre-discount
  //   base, matching the customer flow (the payment fee tracks the transfer,
  //   not the promo).
  const editDiscount = validateDiscount(editForm.discountCode, editServicePrice, {
    serviceId: editForm.serviceId || null,
    bookingHourBKK: editForm.time ? parseInt(editForm.time.split(":")[0], 10) : undefined,
    taxiFareTHB: editTaxiFee,
    // 🆕 28x.43 — concierge slip can honour a code on a premium ticket (the
    //   welcome codes she hands out) — the premium block is a guest-only guard.
    adminOverride: true,
  });
  // 🆕 28x.38 — the concierge slip applies a code REGARDLESS of the customer
  //   master switch (PROMOS_ENABLED). That switch only controls what guests
  //   see / can self-apply; here the operator is deliberately keying a code to
  //   cut this bill, so it must work even while public promos are paused.
  const editDiscountAmount = editDiscount.valid ? editDiscount.amount : 0;
  // 🆕 28x.43 (founder: "ให้ระบบจำได้ว่าลูกค้าใช้โค้ดนี้ไปแล้ว") — surface the
  //   redemption memory: has THIS phone already carried THIS code on another
  //   booking? Stored discountCode is the record; this makes it visible so the
  //   concierge doesn't hand the same welcome code to a guest twice.
  const editCodeTrim = editForm.discountCode.trim().toUpperCase();
  const priorCodeUses = editCodeTrim ? countPriorCodeUses(editForm.phone, editCodeTrim, b.id) : 0;
  const computedTotal    = Math.max(0, editServicePrice + editTaxiFee + editSurcharge - editDiscountAmount);
  const editTotal        = Number(editForm.total) || 0;

  // 🆕 Round 28x.99l (founder: "ยอด ไม่ตัด ส่วนลด") — a valid discount code
  // used to only ever surface as a "Use computed" suggestion the admin had
  // to click separately (28s262's "Total is a free number" design). Enter
  // the code, see "−฿100 off", save without that extra click → the
  // UNDISCOUNTED total silently persisted, and the Telegram admin message
  // (formatBookingForAdmin) just reports whatever's saved, so it broadcast
  // the wrong total too. Auto-sync Total to the computed figure whenever a
  // discount code is actively resolving valid — this only fires on
  // discountAmount/computedTotal changes (not on every Total keystroke), so
  // a manual override typed AFTER the code is applied is still respected;
  // it only re-syncs if service/taxi/duration changes again afterward.
  // The no-discount case (a manually-agreed custom price) keeps full free
  // editability, unchanged.
  useEffect(() => {
    if (editDiscountAmount > 0) {
      setEditForm((f) =>
        f.total === String(computedTotal) ? f : { ...f, total: String(computedTotal) }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDiscountAmount, computedTotal]);

  const saveEdit = () => {
    const startAt = Timestamp.fromDate(dayjs(`${editForm.date} ${editForm.time}`, "YYYY-MM-DD HH:mm").toDate());
    const newTherapist = therapists.find((t) => t.id === editForm.therapistId);
    const oldTotal = b.totalPrice ?? b.total ?? 0;

    // 🆕 Round 28x.131 (founder: "Date & Time กับ Booked ต้องตรงกัน เมื่อแก้
    //   Date & Time") — moving a booking's appointment now moves `createdAt`
    //   with it.
    //
    //   This looks cosmetic and isn't. THIS WHOLE PAGE is keyed on createdAt,
    //   not startAt: the custom date-range filter queries
    //   `where("createdAt", ">=" ...)` and the feed is `orderBy("createdAt")`.
    //   So a booking whose job she moves to 5 May kept sorting — and
    //   filtering — by the day she happened to type it in. Search "May" and
    //   the 5 May job simply would not come back. The customer's "last visit"
    //   (which drives membership tier demotion, line ~378) reads createdAt
    //   first for the same reason.
    //
    //   Only synced when the schedule ACTUALLY changed, so editing a phone
    //   number or a price leaves a genuine lead time alone — a same-day
    //   booking taken at 18:32 for 20:00 is real information worth keeping.
    //   The superseded value goes into the audit log below, not the bin.
    const prevStartMs = b.startAt?.toDate ? b.startAt.toDate().getTime() : null;
    const scheduleChanged = prevStartMs === null || prevStartMs !== startAt.toMillis();
    const prevCreatedMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : null;

    const audit: Record<string, unknown> = {};
    if (editTotal !== oldTotal) {
      audit.priceChangedFrom = oldTotal;
      audit.priceChangedTo = editTotal;
    }
    if (scheduleChanged && prevCreatedMs !== null) {
      audit.createdAtChangedFrom = fmtBKK(new Date(prevCreatedMs), "YYYY-MM-DD HH:mm");
      audit.createdAtChangedTo = fmtBKK(startAt.toDate(), "YYYY-MM-DD HH:mm");
    }
    // 🆕 28s261 — audit detail is a SEPARATE object from the Firestore patch
    //   (a prior draft of this accidentally put priceChangedFrom/To INTO the
    //   patch, which would have written those as real fields on the booking
    //   doc — caught before shipping).
    onSaveDetails(
      {
        contactName: editForm.contactName.trim(),
        customerName: editForm.contactName.trim(),
        phone: editForm.phone.trim(),
        date: editForm.date,
        time: editForm.time,
        payment: editForm.payment,
        duration: editForm.duration,
        servicePrice: editServicePrice,
        taxiFee: editTaxiFee,
        paymentFee: editSurcharge,
        totalPrice: editTotal,
        startAt,
        // 28x.131 — see the note above saveEdit's guard: keeps the list's
        // own sort/filter key pointing at the job, not at the typing session.
        ...(scheduleChanged ? { createdAt: startAt } : {}),
        locationName: editForm.location.trim(),
        // 🆕 28x.38 — persist the discount the concierge keyed on the slip.
        //   Storing discountCode IS the redemption memory: the booking list
        //   shows the code chip + filters by promo, and a guest's history
        //   (reachable by tapping their name) shows every code they've used.
        //   Empty string clears a previously-applied code.
        discountCode: editForm.discountCode.trim().toUpperCase(),
        discountAmount: editDiscountAmount,
        discountLabel: editDiscountAmount > 0 ? editDiscount.label : "",
        // 🆕 28x.99t — lets the operator backfill/correct the channel from
        //   memory on bookings that never captured it automatically.
        attributionSource: editForm.attributionSource || null,
        ...(editForm.therapistId && editForm.therapistId !== b.therapistId
          ? { therapistId: editForm.therapistId, therapistName: newTherapist?.name ?? b.therapistName }
          : {}),
        // 🆕 28s263 — write both id + display name, same dual-write
        //   convention as therapist reassignment (28s259).
        ...(editForm.serviceId && editForm.serviceId !== b.serviceId
          ? { serviceId: editForm.serviceId, serviceName: editSelectedService?.name ?? b.serviceName }
          : {}),
      },
      Object.keys(audit).length > 0 ? audit : undefined
    );
    setEditing(false);
  };

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "dddd D MMMM YYYY · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "dddd D MMMM YYYY")} · ${b.time}`
    : b.date ? fmtBKK(b.date, "dddd D MMMM YYYY") : "—";

  const createdLabel = b.createdAt
    ? fmtBKK(b.createdAt.toDate(), "D MMM YYYY · HH:mm")
    : "—";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* header */}
      <Box
        sx={{
          background: adminColor.panel2,
          borderBottom: `1px solid ${adminColor.line}`,
          pt: 3, pb: 2.5, px: 2.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            {/* 🆕 28r40 — drawer header pill uses `bilingual` (has space);
                the compact card pill still shows just `label`. */}
            <Box sx={{ px: "10px", py: "4px", borderRadius: 999, background: cfg.badge.bg, display: "inline-flex", mb: 1 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.badge.fg }}>
                {cfg.bilingual}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em" }}>
              {b.therapistName}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mt: 0.3 }}>
              {getServiceLabel(b.serviceId, b.serviceName)}
              {b.duration && ` · ${b.duration} min`}
            </Typography>
            {/* 🆕 28w.59 — customer's membership tier + no-show flag */}
            {member && (member.tier || member.hasNoShow) && (
              <Box sx={{ mt: 1 }}>
                <MembershipBadges member={member} size="md" />
              </Box>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close · ปิด" sx={{ color: adminColor.muted, mt: -0.5 }}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* 🆕 28s264 — price strip now goes LIVE while editing (real figures
            from editForm, not the stale stored ones), so the operator sees
            the impact of what they're typing without scrolling down to the
            Billing section. */}
        <Box
          sx={{
            position: "relative",
            display: "flex", gap: 1, mt: 2,
            p: 1.5, borderRadius: "14px",
            background: adminColor.panel,
            border: `1px solid ${editing ? adminColor.accent : adminColor.line}`,
            boxShadow: editing ? `0 0 0 3px ${adminColor.accent}1F` : "none",
          }}
        >
          {editing && (
            <Box sx={{ position: "absolute", top: -9, right: 10, background: adminColor.accent, color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", px: 1, py: "3px", borderRadius: 999 }}>
              Editing · แก้ไข
            </Box>
          )}
          {[
            { label: "Service", labelTh: "บริการ",  value: formatTHB(editing ? editServicePrice : (isCancelled ? 0 : (b.servicePrice || 0))) },
            { label: "Taxi",    labelTh: "แท็กซี่",  value: formatTHB(editing ? editTaxiFee : (isCancelled ? 0 : (b.taxiFee || 0))) },
            { label: "Total",   labelTh: "รวมทั้งหมด", value: formatTHB(editing ? editTotal : total), accent: true },
          ].map((s, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
              <Typography sx={{ ...adminFigureSx, fontSize: 16, color: s.accent ? adminColor.accent : adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 8.5, color: adminColor.dim, opacity: 0.85, lineHeight: 1, mt: 0.15 }}>{s.labelTh}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* scrollable body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>

        {/* 🆕 28w.58 (founder "ดูตรงไหนว่าโปรอะไร") — promo used on this order:
            label + code + amount, from the booking's discountCode/Label. */}
        {(b.discountCode || (b.discountAmount ?? 0) > 0) && (
          <Box
            sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
              borderRadius: "14px", background: `${adminColor.accent}0D`,
              border: `1px solid ${adminColor.accent}33`, px: 1.75, py: 1.25, mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Tag size={18} weight="duotone" color={adminColor.accent} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.accent, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1 }}>
                  Promo · โปรโมชั่น
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: adminColor.text, mt: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.discountLabel || b.discountCode || "ส่วนลด"}
                </Typography>
                {b.discountCode && b.discountLabel && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.1 }}>
                    โค้ด · {b.discountCode}
                  </Typography>
                )}
              </Box>
            </Box>
            {(b.discountAmount ?? 0) > 0 && (
              <Typography sx={{ ...adminFigureSx, fontSize: 15, fontWeight: 800, color: adminColor.accent, flexShrink: 0 }}>
                −{formatTHB(b.discountAmount as number)}
              </Typography>
            )}
          </Box>
        )}

        {/* 🆕 28s259 (fix: "สถานนะ แก้ไขไม่ได้ Cancelled / Completed") —
            always-active override, works from ANY current status (un-cancel,
            mark refunded/no_show, revert completed, etc). Standalone, small —
            28s264 pulled it out of the flat field list so it doesn't compete
            with the Edit-gated sections below; a status change is a routine
            tap, not a "fix a mistake" edit. */}
        <Box
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`,
            px: 1.75, py: 1.25, mb: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>
              Status
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: adminColor.dim, mt: 0.3, letterSpacing: "0.02em" }}>
              สถานะ
            </Typography>
          </Box>
          <Select
            size="small"
            value={b.status in STATUS_CFG ? b.status : ""}
            onChange={(e) => onChangeStatus(e.target.value)}
            displayEmpty
            renderValue={() => (
              <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: cfg.badge.fg, whiteSpace: "nowrap" }}>
                {cfg.bilingual}
              </Typography>
            )}
            sx={{
              fontSize: 12, height: 30, minWidth: 160, borderRadius: 999,
              background: cfg.badge.bg,
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
            MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
          >
            {ALL_STATUSES.map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{cfgFor(s).bilingual}</MenuItem>
            ))}
          </Select>
        </Box>

        {/* 🆕 Round 28x.134 (founder chose "รวมเหลืออันเดียว") — the per-booking
            "ยังนับเป็นยอดจองให้พนักงาน" (countsAsSession) switch is REMOVED. It
            padded the customer-facing session count, which is now the single
            job of displaySessionBonus on the therapist page — one boost tool,
            not two. Existing credits were migrated into each therapist's bonus,
            so no count changed. To credit a future cancellation, bump that
            therapist's โบนัส by 1 instead. */}

        {/* 🆕 28s264 — Edit toggle now lives above the grouped sections,
            not buried inside a "Booking Info" label. */}
        {!editing && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startEdit}
              aria-label="Edit booking details · แก้ไขรายละเอียด"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                height: 28, padding: "0 12px", borderRadius: 999,
                background: adminColor.panel2, border: `1px solid ${adminColor.line2}`,
                color: adminColor.muted, fontFamily: SANS, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              }}
            >
              <PencilSimple size={12} /> Edit · แก้ไข
            </motion.button>
          </Box>
        )}

        {editing ? (
          <>
            {/* ── Guest & Schedule ─────────────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<User size={13} />} subtitle="ลูกค้าและตารางเวลา">Guest &amp; Schedule</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "13px 14px", display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    label="Customer · ลูกค้า" size="small" fullWidth value={editForm.contactName}
                    onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
                    sx={editFieldSx}
                  />
                  <TextField
                    label="Phone · เบอร์" size="small" fullWidth value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    sx={editFieldSx}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    label="Date · วันที่" type="date" size="small" fullWidth value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }} sx={editFieldSx}
                  />
                  <TextField
                    label="Time · เวลา" type="time" size="small" fullWidth value={editForm.time}
                    onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                    InputLabelProps={{ shrink: true }} sx={editFieldSx}
                  />
                </Box>
                <TextField
                  label="Location · สถานที่" size="small" fullWidth multiline minRows={2} value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  sx={editFieldSx}
                />
              </Box>
            </Box>

            {/* ── Service ──────────────────────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<Sparkle size={13} />} subtitle="บริการ">Service</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "13px 14px", display: "flex", flexDirection: "column", gap: 1.25 }}>
                <TextField
                  select label="Therapist · หมอนวด" size="small" fullWidth value={editForm.therapistId}
                  onChange={(e) => setEditForm((f) => ({ ...f, therapistId: e.target.value }))}
                  sx={editFieldSx}
                  SelectProps={editSelectProps}
                >
                  {!therapists.some((t) => t.id === editForm.therapistId) && editForm.therapistId && (
                    <MenuItem value={editForm.therapistId}>{b.therapistName}</MenuItem>
                  )}
                  {therapists.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select label="Service · บริการ" size="small" fullWidth value={editForm.serviceId}
                  onChange={(e) => changeService(e.target.value)}
                  sx={editFieldSx}
                  SelectProps={editSelectProps}
                >
                  {services.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
                {/* 🆕 28s264 (founder: "Duration ทำเป็น ดรอปดาว") — was a pill
                    row in 28s263; founder asked for a dropdown instead. */}
                <TextField
                  select label="Duration · ระยะเวลา" size="small" fullWidth value={editForm.duration}
                  onChange={(e) => changeDuration(Number(e.target.value))}
                  sx={editFieldSx}
                  SelectProps={editSelectProps}
                >
                  {editAvailableDurations.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d} min{editSelectedService ? ` · ${formatTHB(priceForDuration(editSelectedService, d))}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            {/* ── Billing — styled as the bill it is ──────────────────── */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<Receipt size={13} />} subtitle="บิล">Billing</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "13px 14px" }}>
                <Box sx={{ display: "flex", gap: 1, mb: 1.25 }}>
                  <TextField
                    label="Service price · ค่าบริการ (฿)" type="number" size="small" fullWidth value={editForm.servicePrice}
                    onChange={(e) => setEditForm((f) => ({ ...f, servicePrice: e.target.value }))}
                    sx={editFieldSx}
                  />
                  <TextField
                    label="Taxi fee · ค่าเดินทาง (฿)" type="number" size="small" fullWidth value={editForm.taxiFee}
                    onChange={(e) => setEditForm((f) => ({ ...f, taxiFee: e.target.value }))}
                    sx={editFieldSx}
                  />
                </Box>
                <TextField
                  select label="Payment method · วิธีจ่าย" size="small" fullWidth value={editForm.payment}
                  onChange={(e) => setEditForm((f) => ({ ...f, payment: e.target.value }))}
                  sx={editFieldSx}
                  SelectProps={editSelectProps}
                >
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
                {editSurcharge > 0 && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.amber, mt: 0.75, textAlign: "right" }}>
                    + {formatTHB(editSurcharge)} transfer surcharge · ค่าธรรมเนียมโอน
                  </Typography>
                )}

                {/* 🆕 28x.99t — most existing bookings never captured this;
                    lets the operator backfill it from memory. */}
                <TextField
                  select label="ลูกค้ารู้จักจากไหน · Source" size="small" fullWidth
                  value={editForm.attributionSource}
                  onChange={(e) => setEditForm((f) => ({ ...f, attributionSource: e.target.value }))}
                  sx={{ ...editFieldSx, mt: 1.25 }}
                  SelectProps={editSelectProps}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>

                {/* 🆕 28x.38 — discount code straight on the slip. Same validator
                    the customer flow uses (menu amount, premium-tier rules, min
                    spend). Feeds the computed Total via editDiscountAmount. */}
                <Box sx={{ mt: 1.25 }}>
                  <TextField
                    label="Discount code · โค้ดส่วนลด" size="small" fullWidth
                    value={editForm.discountCode}
                    onChange={(e) => setEditForm((f) => ({ ...f, discountCode: e.target.value.toUpperCase() }))}
                    sx={editFieldSx}
                    inputProps={{ style: { textTransform: "uppercase", letterSpacing: "0.04em" } }}
                  />
                  {editForm.discountCode.trim() !== "" && (
                    editDiscountAmount > 0 ? (
                      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: adminColor.green, mt: 0.6 }}>
                        −{formatTHB(editDiscountAmount)} · {editDiscount.label}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.6 }}>
                        โค้ดนี้ไม่ลดบิลนี้ (ขั้นต่ำ / เงื่อนไข / หมดอายุ) — แต่ยัง<b>บันทึกว่าลูกค้าใช้โค้ดนี้</b>เมื่อกด Save
                      </Typography>
                    )
                  )}
                  {/* 🆕 28x.43 — redemption memory: warn if this guest already used this code. */}
                  {editCodeTrim !== "" && priorCodeUses > 0 && (
                    <Box sx={{ mt: 0.6, px: 1, py: 0.6, borderRadius: "8px", background: `${adminColor.amber}18`, border: `1px solid ${adminColor.amber}55` }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.amber }}>
                        ⚠️ เบอร์นี้เคยใช้โค้ด {editCodeTrim} แล้ว {priorCodeUses} ครั้ง
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* 🆕 28s262 — Total is its OWN free number, independent of
                    service+taxi+surcharge. Computed figure is a one-click
                    suggestion, never forced. */}
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1.5px dashed ${adminColor.line2}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>Total</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.3 }}>รวมทั้งหมด</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <TextField
                      type="number" size="small" value={editForm.total}
                      onChange={(e) => setEditForm((f) => ({ ...f, total: e.target.value }))}
                      sx={{
                        width: 140,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px", fontFamily: adminFigureSx.fontFamily, fontWeight: 800, fontSize: 16,
                          color: adminColor.accent, background: `${adminColor.accent}0D`,
                          "& fieldset": { borderColor: adminColor.accent },
                          "&.Mui-focused fieldset": { borderColor: adminColor.accent, borderWidth: "2px" },
                        },
                        "& input": { textAlign: "right" },
                      }}
                    />
                    {computedTotal !== editTotal && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setEditForm((f) => ({ ...f, total: String(computedTotal) }))}
                        style={{
                          display: "block", marginTop: 4, marginLeft: "auto",
                          border: "none", background: "transparent", cursor: "pointer",
                          fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.accent, padding: 0,
                        }}
                      >
                        Use computed · ใช้ค่าคำนวณ: {formatTHB(computedTotal)}
                      </motion.button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setEditing(false)}
                style={{
                  flex: "none", width: 120, height: 44, borderRadius: 999,
                  background: adminColor.panel2, border: `1px solid ${adminColor.line2}`,
                  fontFamily: SANS, fontSize: 13, fontWeight: 600, color: adminColor.muted, cursor: "pointer",
                }}
              >
                Cancel · ยกเลิก
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveEdit}
                style={{
                  flex: 1, height: 44, borderRadius: 999,
                  background: adminColor.accent, border: "none",
                  fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(78,126,140,0.30)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <FloppyDisk size={15} /> Save · บันทึก
              </motion.button>
            </Box>
          </>
        ) : (
          <>
            {/* ── Guest & Schedule (read-only) ─────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<User size={13} />} subtitle="ลูกค้าและตารางเวลา">Guest &amp; Schedule</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, px: 1.75, py: 0.5 }}>
                <Row label="Customer · ลูกค้า" value={nameOf(b)} />
                <Divider sx={{ opacity: 0.4 }} />
                <Row
                  label="Phone · เบอร์"
                  value={
                    b.phone ? (
                      <Typography
                        component="a"
                        href={`tel:${b.phone}`}
                        sx={{ fontFamily: SANS, fontWeight: 700, color: adminColor.green, textDecoration: "none" }}
                      >
                        {b.phone}
                      </Typography>
                    ) : (
                      "—"
                    )
                  }
                />
                <Divider sx={{ opacity: 0.4 }} />
                <Row label="Date & Time · วันเวลา" value={dateLabel} />
                <Divider sx={{ opacity: 0.4 }} />
                <Row label="Location · สถานที่" value={b.locationName || b.address || "—"} />
                {b.placeDetail && <><Divider sx={{ opacity: 0.4 }} /><Row label="Detail · รายละเอียด" value={b.placeDetail} /></>}
              </Box>
            </Box>

            {/* ── Service (read-only) ──────────────────────────────────── */}
            {/* 🆕 28r40 — audit polish: this section was labelled "Service"
                but only rendered the therapist row (which is also implicit
                in the header). Symmetry with edit mode says show Service +
                Duration here too — they exist on the booking doc, they're
                editable when the operator opens Edit, so they belong. */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<Sparkle size={13} />} subtitle="บริการ">Service</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, px: 1.75, py: 0.5 }}>
                <Row label="Therapist · หมอนวด" value={b.therapistName} />
                <Divider sx={{ opacity: 0.4 }} />
                <Row label="Service · บริการ" value={getServiceLabel(b.serviceId, b.serviceName)} />
                {b.duration && (
                  <>
                    <Divider sx={{ opacity: 0.4 }} />
                    <Row label="Duration · ระยะเวลา" value={`${b.duration} min`} />
                  </>
                )}
              </Box>
            </Box>

            {/* ── Billing (read-only) ──────────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <SectionHeader icon={<Receipt size={13} />} subtitle="บิล">Billing</SectionHeader>
              <Box sx={{ borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, px: 1.75, py: 0.5 }}>
                <Row
                  label="Payment method · วิธีจ่าย"
                  value={`${paymentMethodLabel(b.payment)}${b.paymentFee ? ` (+${formatTHB(b.paymentFee)} surcharge)` : ""}`}
                />
                {/* 🆕 28x.99t — visible without opening Edit, so scanning the
                    list for "which bookings still need a source tagged" is
                    fast. */}
                <Divider sx={{ opacity: 0.4 }} />
                <Row label="Source · ที่มา" value={sourceLabel(b.attributionSource)} />
              </Box>
            </Box>
          </>
        )}

        {b.cancelReason && (
          <Box sx={{ mb: 2, borderRadius: "14px", background: `${adminColor.red}0D`, border: `1px solid ${adminColor.red}33`, px: 1.75, py: 1 }}>
            <Row label="Cancel reason · เหตุผลที่ยกเลิก" value={b.cancelReason} />
            {/* 🆕 28x.120 — the session-credit state used to be echoed here as
                a read-only row; it's now the live toggle up in the Status
                block, so repeating it would just be two places to read. */}
          </Box>
        )}

        {/* ── Record — unchanged fields, just grouped for consistency.
            Payment status (paid/unpaid) lives HERE, not gated by the Edit
            toggle — same reasoning as Status: it's a routine tap, always
            reachable, not a "fix a mistake" edit. ── */}
        <Box sx={{ mb: 2 }}>
          <SectionHeader icon={<ClockCounterClockwise size={13} />} subtitle="บันทึก">Record</SectionHeader>
          <Box sx={{ borderRadius: "14px", background: adminColor.panel2, border: `1px solid ${adminColor.line}`, px: 1.75, py: 0.5 }}>
            <Row label="Booked · จองเมื่อ" value={createdLabel} />
            <Divider sx={{ opacity: 0.4 }} />
            <Row label="Payment status · สถานะจ่าย" value={
              <Box
                component="span"
                onClick={onTogglePaid}
                role="button"
                sx={{
                  px: "10px", py: "3px", borderRadius: 999, cursor: "pointer",
                  background: paid ? `${adminColor.green}1F` : adminColor.panel2,
                  color: paid ? adminColor.green : adminColor.muted,
                  fontFamily: SANS, fontSize: 11, fontWeight: 700,
                  userSelect: "none",
                }}
              >
                {paid ? "✓ Paid · จ่ายแล้ว" : "Unpaid · แตะเพื่อทำเครื่องหมายจ่ายแล้ว"}
              </Box>
            } />
            <Divider sx={{ opacity: 0.4 }} />
            <Row label="Booking ID · รหัสจอง" value={b.id} />
          </Box>
        </Box>

        {/* admin note */}
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
            Admin Note
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: adminColor.dim, mt: 0.3, letterSpacing: "0.02em" }}>
            โน้ตแอดมิน
          </Typography>
        </Box>
        <Box
          sx={{
            borderRadius: "14px", background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
            px: 1.75, py: 1, mb: 2,
          }}
        >
          <InputBase
            placeholder="Type a note · พิมพ์โน้ต…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, width: "100%" }}
          />
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSaveNote(note)}
          style={{
            width: "100%", height: 38, borderRadius: 999,
            background: adminColor.panel2,
            border: `1px solid ${adminColor.line2}`,
            fontFamily: SANS, fontSize: 13, fontWeight: 600,
            color: adminColor.muted, cursor: "pointer", marginBottom: 12,
          }}
        >
          Save note · บันทึกโน้ต
        </motion.button>
      </Box>

      {/* sticky action footer */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5, pb: "max(env(safe-area-inset-bottom,0px),16px)", pt: 1.5,
          background: adminColor.panel,
          borderTop: `1px solid ${adminColor.line}`,
          display: "flex", gap: 1,
        }}
      >
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            style={{
              flex: 1, height: 48, borderRadius: 999,
              background: adminColor.accent,
              color: "#fff", fontFamily: SANS, fontSize: 15, fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 6px 18px rgba(78,126,140,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <CheckCircle size={18} weight="fill" /> Confirm Booking · ยืนยันการจอง
          </motion.button>
        )}
        {b.status === "confirmed" && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              style={{
                flex: 1, height: 48, borderRadius: 999,
                background: adminColor.green,
                color: "#fff", fontFamily: SANS, fontSize: 15, fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 6px 18px rgba(22,163,74,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <CheckCircle size={18} weight="fill" /> Mark Complete · เสร็จสิ้น
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              aria-label="Cancel booking · ยกเลิกการจอง"
              title="Cancel booking · ยกเลิกการจอง"
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `${adminColor.red}14`,
                border: `1px solid ${adminColor.red}33`, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XCircle size={22} color={adminColor.red} weight="fill" />
            </motion.button>
          </>
        )}
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            aria-label="Cancel booking · ยกเลิกการจอง"
            title="Cancel booking · ยกเลิกการจอง"
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${adminColor.red}14`,
              border: `1px solid ${adminColor.red}33`, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <XCircle size={22} color={adminColor.red} weight="fill" />
          </motion.button>
        )}
        {(b.status === "completed" || b.status === "cancelled") && (
          <Box sx={{ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim, fontWeight: 600 }}>
              {b.status === "completed" ? "Session completed · จบงานแล้ว" : "Booking cancelled · ยกเลิกแล้ว"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdminBookingListPage;
