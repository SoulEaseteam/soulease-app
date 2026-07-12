// src/pages/admin/AdminPromotionsPage.tsx
//
// 🆕 Round 28s298 (founder: "เพิ่ม เมนู โปรโมชั่น") — discount codes
// (FIRST10, WELCOME20, TONIGHT500, SAMMY200, VIP100, FREETAXI, referral
// SUN-XXX) were 100% hardcoded in src/utils/discount.ts with zero admin
// UI. Asked what this page should actually do; founder picked all
// three:
//   1. See the real codes + turn any of them on/off.
//   2. Create brand-new custom codes without a code change.
//   3. See real usage stats pulled from actual bookings.
//
// Important context surfaced here, not buried in a comment: promos are
// currently OFF site-wide (src/config/featureFlags.ts's PROMOS_ENABLED,
// founder's own earlier call: "ยังไม่ได้คิด โปร กัน เสี่ยง"). Nothing
// below has ANY visible effect on the live site until the master switch
// at the top is flipped on — that flag is now live-controllable from
// here too (was hardcoded `false`), otherwise this whole page would be
// as decorative as /admin/advanced-settings was before 28s296/297.
//
// Data model: one doc per code in `promoCodes/{CODE}` —
//   • builtin override:  { kind: "builtin", enabled: boolean }
//   • custom code:       { kind: "custom", enabled, type, amount,
//                          capThb?, label, expiresAt?, createdAt }
// Read live by MaintenanceGate.tsx into discount.ts's module-level
// cache (same live-binding pattern as taxiFare.ts's pricing overrides)
// — validateDiscount() itself stays a pure, synchronous function.
//
// 🆕 Round 28r49 (founder 2026-07-08 — "Built-in Codes · โค้ดมาตรฐาน
// แก้ไขและลบได้") — full edit + delete on each built-in code, backed by a
// new field on the same public doc: `publicRules.builtinCodeOverrides`
// (map keyed by UPPERCASE code, or the pseudo-key "REFERRAL" for the
// SUN-XXXX referral pattern). Per-code override entries can carry
// amount / percent / cap / minSpend / startsAt / expiryDate / label — or
// `deleted: true` to hide the code entirely (soft-delete, restorable).
// Read live by the same MaintenanceGate listener (no new listener, no
// rules change: publicRules is already admin-write from 28s296). The
// legacy `disabledBuiltinCodes` on/off gate (28s298) stays alongside so
// admin can still "pause" a code without editing/deleting.
//
// 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม เอาออกจาก
// ทุกที่ที่มี") — the add-ons editor + customer picker (28s302) are fully
// removed from this page and BookingFlowPage. The `AddOn` / `ADDONS`
// reference data survives in src/data/bookingExtras.ts for legacy
// booking-doc lookups but is not surfaced anywhere.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Typography, Switch, TextField, MenuItem, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Checkbox,
  Autocomplete, Avatar,
} from "@mui/material";
import { app, db } from "@/lib/firebase";
import {
  collection, doc, getDoc, onSnapshot, setDoc, deleteDoc, getDocs, query, where,
  limit as fbLimit, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Tag, Percent, Ticket, ChartBar, Plus, Trash, Warning, ShareNetwork, Copy, Storefront, FloppyDisk, Camera, CaretUp, CaretDown, NotePencil, PencilSimple, ArrowCounterClockwise, Package, Calendar, Printer, Sliders, ClockCounterClockwise, Flask, ShieldCheck, TrendUp, MagnifyingGlass } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { SectionCard, fieldSx, downscaleImage } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";
import type { MassageService } from "@/data/services";
import services from "@/data/services";
import { priceForDuration, type LiveServiceOverride, type CustomServiceInput } from "@/utils/servicePricing";
import { therapistPctFor } from "@/utils/commission";
// 🆕 Round 28r50 (Promotions Phase 1) — Bundle Packages helpers.
// 🆕 Round 28r60 — + BUNDLE_CATEGORY_TAGS for the Autocomplete freeSolo picker.
import { bundleSavings, BUNDLE_CATEGORY_TAGS, type Bundle } from "@/utils/bundles";
// 🆕 Round 28r59 (Phase 4 feature #5 "Discount validator preview") — debug
//   variant of the discount validator + tier helper for feature #6 UI.
import { validateDiscountDebug, type ReferralTier } from "@/utils/discount";

const BADGE_OPTIONS: MassageService["badge"][] = ["SIGNATURE", "POPULAR", "RECOMMEND", "EXCLUSIVE"];

const SANS = adminFont.sans;

// Kept in sync BY HAND with src/utils/discount.ts's hardcoded branches —
// this page can't introspect that file's conditional logic as data, so
// these descriptions are a snapshot of the real rules at write time.
// "REFERRAL" is a pseudo-code (matches the SUN-XXXX pattern, not one
// literal string) — see discount.ts's disable check for why.
//
// 🆕 Round 28r49 — enriched with per-code metadata so the shared "Edit"
//   dialog can render the right fields (percent vs fixed vs uneditable-
//   amount FREETAXI) and reset back to the real hardcoded defaults from
//   discount.ts. Any change to those defaults must be mirrored here.
type BuiltinKind = "percent" | "fixed" | "freetaxi";
interface BuiltinCodeMeta {
  code: string;
  label: string;
  desc: string;
  kind: BuiltinKind;
  /** Hardcoded default. For percent codes = %, for fixed = THB, for
   *  freetaxi = unused (amount always = real taxi fare). */
  defaultAmount: number;
  /** Hardcoded cap on percent codes; unused otherwise. */
  defaultCap?: number;
}
const BUILTIN_CODES: BuiltinCodeMeta[] = [
  { code: "FIRST10",    label: "First booking",              desc: "ลูกค้าจองครั้งแรก ลด 10% (สูงสุด ฿200)",                 kind: "percent", defaultAmount: 10, defaultCap: 200 },
  { code: "WELCOME20",  label: "Welcome",                    desc: "โปรเปิดตัว ลด 10% (สูงสุด ฿300)",                         kind: "percent", defaultAmount: 10, defaultCap: 300 },
  { code: "TONIGHT500", label: "Late-night",                 desc: "จองช่วง 22:00–04:00 เท่านั้น · ลด ฿200",                    kind: "fixed",   defaultAmount: 200 },
  { code: "SAMMY200",   label: "Sammyboy forum",             desc: "โค้ดจากฟอรัม Sammyboy · ลด ฿200 ไม่มีเงื่อนไข",             kind: "fixed",   defaultAmount: 200 },
  { code: "VIP100",     label: "VIP (premium only)",         desc: "เฉพาะบริการพรีเมียม (Gentleman/B2B) · ลด ฿100",           kind: "fixed",   defaultAmount: 100 },
  { code: "FREETAXI",   label: "Free travel (premium only)", desc: "เฉพาะบริการพรีเมียม · ฟรีค่าเดินทาง",                       kind: "freetaxi", defaultAmount: 0 },
  { code: "REFERRAL",   label: "Referral (SUN-XXXX)",        desc: "โค้ดแนะนำเพื่อน รูปแบบ SUN-XXXX · ลด ฿200",                kind: "fixed",   defaultAmount: 200 },
];

// 🆕 Round 28r49 — override map = `publicRules.builtinCodeOverrides`. Keys
//   are UPPERCASE built-in codes (or "REFERRAL"). Value shape mirrors
//   discount.ts's BuiltinPromoOverride but with Firestore Timestamps.
interface BuiltinOverrideDoc {
  deleted?: boolean;
  amount?: number;
  percent?: number;
  cap?: number;
  minSpend?: number;
  label?: string;
  startsAt?: Timestamp | null;
  expiryDate?: Timestamp | null;
  // 🆕 Round 28r50 — schedule the OVERRIDE's activation (feature #2).
  scheduledFor?: Timestamp | null;
  // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — only
  //   set on the "REFERRAL" pseudo-key override. Empty/absent = flat
  //   referral discount. Each tier: { minRedeems, amount, label? }.
  tiers?: ReferralTier[] | null;
}

interface PromoDoc {
  id: string;
  kind: "builtin" | "custom";
  enabled: boolean;
  type?: "percent" | "fixed";
  amount?: number;
  capThb?: number;
  label?: string;
  expiresAt?: Timestamp | null;
  startsAt?: Timestamp | null;
  minSpendThb?: number | null;
  maxRedemptions?: number | null;
  perPhoneLimit?: number | null;
  // 🆕 Round 28r50 — custom code's own activation schedule.
  scheduledFor?: Timestamp | null;
}

// 🆕 Round 28r50 — Firestore-side shape for bundle docs (Timestamps land as
//   Timestamps here; the utils/bundles.ts Bundle type carries them as ms).
// 🆕 Round 28r60 — + optional imageUrl / categoryTag / subtitle presentation
//   fields. All optional so pre-r60 docs render byte-identical to before.
interface BundleDoc {
  name: string;
  sessionCount: number;
  discountPct: number;
  serviceId?: string | null;
  enabled: boolean;
  expiresAt?: Timestamp | null;
  label?: string;
  createdAt?: Timestamp | null;
  imageUrl?: string;
  categoryTag?: string;
  subtitle?: string;
}

// 🆕 Round 28r50 — bulk adjustment shape.
type BulkAdjustMode = "pct_up" | "pct_down" | "thb_up" | "thb_down" | "fixed";
interface BulkDurationScope { d60: boolean; d90: boolean; d120: boolean }

interface UsageStat {
  count: number;
  totalDiscount: number;
}

// 🆕 Round 28s300 — one editable row per catalog service.
// 🆕 Round 28s302 — + image/detail/benefit presentation fields.
interface SvcRow {
  id: string;
  name: string;
  enabled: boolean;
  p60: number;
  p90: number;
  p120: number;
  image: string;
  detail: string;
  benefit: string; // newline-separated in the editor
  // 🆕 Round 28r103 — badge editable for standard services too (was
  //   custom-service-only). ServicesPage reads this to render the amber
  //   BESTSELLER pill on the featured card + the rose pill on mini cards.
  badge: MassageService["badge"];
  // 🆕 Round 28r50 — per-row schedule (feature #2). Epoch ms when the
  //   pending override should ACTIVATE for customers; null/undefined =
  //   active immediately. Row shows a "Scheduled" badge when set + future.
  scheduledForMs?: number | null;
}

// 🆕 Round 28s301 — one editable row per admin-created custom service.
interface CustomSvcRow extends SvcRow {
  desc: string;
  badge: MassageService["badge"];
}

// 🆕 Round 28r50 — YYYY-MM-DDTHH:mm helpers for the "Activate on" pickers.
//   Kept local so no cross-file dependency on dayjs formatting conventions.
const tsToInputDT = (t?: Timestamp | null | undefined): string => {
  if (!t?.toDate) return "";
  const d = t.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const msToInputDT = (ms?: number | null | undefined): string => {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const inputDTToTimestamp = (s: string): Timestamp | null => {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
};
const inputDTToMs = (s: string): number | null => {
  const ts = inputDTToTimestamp(s);
  return ts ? ts.toMillis() : null;
};
const isFutureMs = (ms?: number | null | undefined): boolean => !!ms && ms > Date.now();
const fmtScheduledLabel = (ms?: number | null | undefined): string => {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
};

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: adminColor.accent },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: adminColor.accent },
} as const;

// 🆕 Round 28r48 (bilingual pass) — opaque menu for `<TextField select>`. MUI's
//   default paper is translucent (theme.ts frosted-glass, kept for the customer
//   site) — same 28s265 transparency bug pattern. `<TextField select>` needs
//   `SelectProps.MenuProps`, NOT `MenuProps` directly.
const selectMenuProps = {
  MenuProps: {
    PaperProps: {
      sx: {
        background: adminColor.panel,
        boxShadow: "0 8px 24px rgba(31,41,51,0.14)",
        borderRadius: "12px",
        border: `1px solid ${adminColor.line}`,
      },
    },
  },
} as const;

const AdminPromotionsPage: React.FC = () => {
  const [promosEnabled, setPromosEnabled] = useState(false);
  const [promosSaving, setPromosSaving] = useState(false);
  const [promoDocs, setPromoDocs] = useState<Record<string, PromoDoc>>({});
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [usageLoading, setUsageLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addType, setAddType] = useState<"percent" | "fixed">("fixed");
  const [addAmount, setAddAmount] = useState(100);
  const [addCap, setAddCap] = useState(300);
  const [addLabel, setAddLabel] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addExpiry, setAddExpiry] = useState("");
  const [addMinSpend, setAddMinSpend] = useState(0);
  const [addMaxRedemptions, setAddMaxRedemptions] = useState(0);
  const [addPerPhone, setAddPerPhone] = useState(0);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PromoDoc | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 🆕 Round 28s299 — share link + QR dialog (any code, builtin or custom).
  const [shareCode, setShareCode] = useState<string | null>(null);

  // 🆕 Round 28s300 — editable price/name/availability per service.
  const [svcRows, setSvcRows] = useState<SvcRow[]>([]);
  const [svcSaving, setSvcSaving] = useState(false);

  // 🆕 Round 28s302 — display order (ids) + the per-service details
  //   dialog (image/detail/benefits). The add-on rows/dialog that
  //   originally lived here were removed in Round 28r49 (founder:
  //   "Add-ons · บริการเสริม เอาออกจากทุกที่ที่มี").
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsUploading, setDetailsUploading] = useState(false);

  // 🆕 Round 28r49 — per-code overrides for the 7 built-in discount
  //   codes, live-synced from `publicRules.builtinCodeOverrides`. Empty
  //   entry / missing key = hardcoded default in discount.ts. `deleted:
  //   true` hides the code (quiet-invalid, mirrors disable).
  const [builtinOverrides, setBuiltinOverridesState] = useState<Record<string, BuiltinOverrideDoc>>({});
  const [builtinEditCode, setBuiltinEditCode] = useState<string | null>(null);
  const [builtinEditAmount, setBuiltinEditAmount] = useState<string>("");
  const [builtinEditCap, setBuiltinEditCap] = useState<string>("");
  const [builtinEditMinSpend, setBuiltinEditMinSpend] = useState<string>("");
  const [builtinEditLabel, setBuiltinEditLabel] = useState<string>("");
  const [builtinEditStart, setBuiltinEditStart] = useState<string>("");
  const [builtinEditExpiry, setBuiltinEditExpiry] = useState<string>("");
  const [builtinEditSubmitting, setBuiltinEditSubmitting] = useState(false);
  const [builtinDeleteCode, setBuiltinDeleteCode] = useState<string | null>(null);
  const [builtinDeleteSubmitting, setBuiltinDeleteSubmitting] = useState(false);

  // 🆕 Round 28s301 — admin-created custom services + the "add" dialog.
  const [customSvcRows, setCustomSvcRows] = useState<CustomSvcRow[]>([]);
  const [addSvcOpen, setAddSvcOpen] = useState(false);
  const [addSvcName, setAddSvcName] = useState("");
  const [addSvcDesc, setAddSvcDesc] = useState("");
  const [addSvcBadge, setAddSvcBadge] = useState<MassageService["badge"]>("POPULAR");
  const [addSvcP60, setAddSvcP60] = useState(1500);
  const [addSvcP90, setAddSvcP90] = useState(2200);
  const [addSvcP120, setAddSvcP120] = useState(2900);
  const [addSvcImage, setAddSvcImage] = useState("");
  const [addSvcUploading, setAddSvcUploading] = useState(false);
  const [addSvcSubmitting, setAddSvcSubmitting] = useState(false);

  // 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") — an
  //   optional "Activate on" datetime the founder can set on each edit
  //   dialog. Format: YYYY-MM-DDTHH:mm (matches datetime-local input).
  //   Empty = active immediately. Non-empty + future = the change sits
  //   dormant and MaintenanceGate's 60s re-apply pump snaps it live at
  //   (or shortly after) the picked minute.
  const [addScheduledFor, setAddScheduledFor] = useState<string>("");
  const [addSvcScheduledFor, setAddSvcScheduledFor] = useState<string>("");
  const [builtinEditScheduledFor, setBuiltinEditScheduledFor] = useState<string>("");
  const [detailsScheduledFor, setDetailsScheduledFor] = useState<string>("");

  // 🆕 Round 28r50 (feature #1 "Bundle Packages") — live-synced from
  //   publicRules.bundles + local add/edit dialog state. Customer wiring
  //   is Phase 2; this is the admin-side management surface only.
  const [bundles, setBundles] = useState<Record<string, BundleDoc>>({});
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleName, setBundleName] = useState<string>("");
  const [bundleSessionCount, setBundleSessionCount] = useState<number>(3);
  const [bundleDiscountPct, setBundleDiscountPct] = useState<number>(10);
  const [bundleServiceId, setBundleServiceId] = useState<string>(""); // "" = any
  const [bundleExpiresAt, setBundleExpiresAt] = useState<string>(""); // yyyy-MM-dd
  const [bundleLabel, setBundleLabel] = useState<string>("");
  const [bundleSubmitting, setBundleSubmitting] = useState(false);
  const [bundleDeleteId, setBundleDeleteId] = useState<string | null>(null);
  // 🆕 Round 28r60 — polish fields on the create/edit dialog.
  const [bundleImageUrl, setBundleImageUrl] = useState<string>("");
  const [bundleCategoryTag, setBundleCategoryTag] = useState<string>("");
  const [bundleSubtitle, setBundleSubtitle] = useState<string>("");
  const [bundleImageUploading, setBundleImageUploading] = useState(false);
  const bundleImageInputRef = useRef<HTMLInputElement | null>(null);
  /** Pre-minted stable id used ONLY for the create flow's storage path so
   *  the uploaded file lives at `bundles/{id}/…` even before the doc has
   *  been saved. Not swapped into `editingBundleId` because that would
   *  flip the dialog title from "Add" to "Edit" mid-way. Consumed by
   *  handleSaveBundle when the CREATE finalises. */
  const bundlePendingIdRef = useRef<string | null>(null);

  // 🆕 Round 28r50 (feature #3 "Bulk Service Edits") — dialog state.
  //   Multi-select of standard + custom services; apply-mode; duration
  //   scope; live before→after preview; batch-write via persistServices.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkMode, setBulkMode] = useState<BulkAdjustMode>("pct_down");
  const [bulkValue, setBulkValue] = useState<number>(10);
  const [bulkScope, setBulkScope] = useState<BulkDurationScope>({ d60: true, d90: true, d120: true });
  const [bulkScheduledFor, setBulkScheduledFor] = useState<string>("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // 🆕 Round 28r50 (feature #4 "Print/Share Promo Card") — dialog state.
  //   Reuses shareCode as the "which code is being printed" pointer for
  //   both the existing QR-share dialog and the new print dialog.
  const [printCode, setPrintCode] = useState<string | null>(null);
  const [printFormat, setPrintFormat] = useState<"a6" | "card" | "square">("a6");
  const printCardRef = useRef<HTMLDivElement | null>(null);

  // 🆕 Round 28r59 (Phase 4 feature #3 "Historical price log") — a
  //   filtered view over `auditLogs`. Reuses the collection already
  //   populated by every service/promo/bundle write since 28s234.
  interface AuditRow {
    id: string;
    action: string;
    actorEmail: string | null;
    detail: Record<string, unknown>;
    at: Timestamp | null;
  }
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState("");

  // 🆕 Round 28r59 (Phase 4 feature #5 "Discount validator preview")
  //   — sandbox state. Never touches customer bookings; runs the debug
  //   variant of validateDiscount to surface the reason string.
  const [testCode, setTestCode] = useState("");
  const [testServiceId, setTestServiceId] = useState<string>("");
  const [testDuration, setTestDuration] = useState<60 | 90 | 120>(60);
  const [testTaxiKm, setTestTaxiKm] = useState<number>(0);
  const [testHour, setTestHour] = useState<number>(22);
  const [testReferralRedeems, setTestReferralRedeems] = useState<number>(0);

  // 🆕 Round 28r59 (Phase 4 feature #2 "Revenue impact preview") —
  //   baseline stats from the last 30 days of completed bookings, used
  //   by the Edit / Create dialogs' Projected Impact panel. Kept as a
  //   one-time compute on mount (matches the usage-stats fetch above).
  interface BaselineStats {
    days: number;
    completedCount: number;
    avgServicePrice: number;
    bookingsPerDay: number;
  }
  const [baseline, setBaseline] = useState<BaselineStats | null>(null);

  // 🆕 Round 28r59 (feature #4 A/B analytics) — sitewide baseline avg
  //   booking total (with vs without discount). One-time compute.
  interface AbStats {
    avgWithoutDiscount: number;
    avgWithDiscount: number;
  }
  const [abStats, setAbStats] = useState<AbStats | null>(null);

  // 🆕 Round 28r59 (feature #6 "Referral tier system") — editable tier
  //   list on the REFERRAL built-in edit dialog. Loaded from the
  //   override, held here so add/remove/edit doesn't roundtrip to
  //   Firestore per keystroke. Saved on the same Save button.
  const [builtinEditTiers, setBuiltinEditTiers] = useState<ReferralTier[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "publicRules"), (snap) => {
      const data = snap.data();
      setPromosEnabled(data?.promosEnabled === true);
      // 🆕 Round 28r49 — pull the per-code override map live so the row's
      //   effective values (and the "deleted" strikethrough) reflect the
      //   most recent Save without a page refresh.
      const raw = (data?.builtinCodeOverrides ?? {}) as Record<string, BuiltinOverrideDoc>;
      const clean: Record<string, BuiltinOverrideDoc> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v && typeof v === "object") clean[k.toUpperCase()] = v;
      }
      setBuiltinOverridesState(clean);
      // 🆕 Round 28r50 — bundles ride the same public doc + this same
      //   listener (no rules change: publicRules is already admin-write,
      //   public-read). Empty/absent → no bundles configured.
      const rawBundles = (data?.bundles ?? {}) as Record<string, BundleDoc>;
      const cleanB: Record<string, BundleDoc> = {};
      for (const [k, v] of Object.entries(rawBundles)) {
        if (!v || typeof v !== "object") continue;
        if (typeof v.sessionCount !== "number" || v.sessionCount < 1) continue;
        cleanB[k] = v;
      }
      setBundles(cleanB);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "promoCodes"), (snap) => {
      const map: Record<string, PromoDoc> = {};
      snap.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          id: d.id,
          kind: data.kind === "custom" ? "custom" : "builtin",
          enabled: data.enabled !== false,
          type: data.type,
          amount: data.amount,
          capThb: data.capThb,
          label: data.label,
          expiresAt: data.expiresAt ?? null,
          startsAt: data.startsAt ?? null,
          minSpendThb: data.minSpendThb ?? null,
          maxRedemptions: data.maxRedemptions ?? null,
          perPhoneLimit: data.perPhoneLimit ?? null,
          scheduledFor: data.scheduledFor ?? null,
        };
      });
      setPromoDocs(map);
    });
    return () => unsub();
  }, []);

  // 🆕 Round 28r59 (Phase 4 feature #3 "Historical price log") —
  //   filtered onSnapshot on auditLogs. Only the actions that touched
  //   pricing / promotions / bundles / services. Bounded to 200 most
  //   recent so this page doesn't stream the whole audit history.
  useEffect(() => {
    let cancelled = false;
    const unsub = onSnapshot(
      query(collection(db, "auditLogs"), orderBy("at", "desc"), fbLimit(200)),
      (snap) => {
        if (cancelled) return;
        const rows: AuditRow[] = [];
        snap.forEach((d) => {
          const data = d.data() as {
            action?: string;
            actorEmail?: string | null;
            detail?: Record<string, unknown>;
            at?: Timestamp | null;
          };
          if (typeof data.action !== "string") return;
          const a = data.action;
          // Only surface pricing/promo/bundle/service audit trails.
          if (
            !a.startsWith("service.") &&
            !a.startsWith("promo.") &&
            !a.startsWith("bundle.") &&
            !a.startsWith("promo.builtin_")
          ) return;
          rows.push({
            id: d.id,
            action: a,
            actorEmail: data.actorEmail ?? null,
            detail: data.detail ?? {},
            at: data.at ?? null,
          });
        });
        setAuditRows(rows);
        setAuditLoading(false);
      },
      (err) => {
        console.warn("[promotions] audit log fetch failed:", err);
        setAuditLoading(false);
      },
    );
    return () => { cancelled = true; unsub(); };
  }, []);

  // 🆕 Round 28r59 (feature #2 "Revenue impact preview") — one-time
  //   baseline: last 30 days of completed bookings. Bounded to 500
  //   docs. Fails soft — panel just hides if the read errors.
  useEffect(() => {
    void (async () => {
      try {
        const cutoff = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const snap = await getDocs(
          query(
            collection(db, "bookings"),
            where("createdAt", ">=", cutoff),
            fbLimit(500),
          ),
        );
        let completedCount = 0;
        let totalService = 0;
        let discountedTotal = 0;
        let discountedCount = 0;
        let nonDiscountedTotal = 0;
        let nonDiscountedCount = 0;
        snap.forEach((d) => {
          const data = d.data() as {
            status?: string;
            servicePrice?: number;
            totalPrice?: number;
            discountAmount?: number | null;
          };
          const s = String(data.status ?? "").toLowerCase();
          if (s !== "completed" && s !== "done") return;
          completedCount += 1;
          const svc = typeof data.servicePrice === "number" ? data.servicePrice : 0;
          totalService += svc;
          const total = typeof data.totalPrice === "number" ? data.totalPrice : svc;
          if (typeof data.discountAmount === "number" && data.discountAmount > 0) {
            discountedTotal += total;
            discountedCount += 1;
          } else {
            nonDiscountedTotal += total;
            nonDiscountedCount += 1;
          }
        });
        setBaseline({
          days: 30,
          completedCount,
          avgServicePrice: completedCount > 0 ? Math.round(totalService / completedCount) : 0,
          bookingsPerDay: completedCount / 30,
        });
        setAbStats({
          avgWithDiscount: discountedCount > 0 ? Math.round(discountedTotal / discountedCount) : 0,
          avgWithoutDiscount: nonDiscountedCount > 0 ? Math.round(nonDiscountedTotal / nonDiscountedCount) : 0,
        });
      } catch (err) {
        console.warn("[promotions] baseline stats fetch failed:", err);
      }
    })();
  }, []);

  // Usage stats — one-time fetch (not live; a moderately-stale count of
  // "how many bookings used this code" is fine for this page's purpose).
  useEffect(() => {
    void (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "bookings"), where("discountCode", "!=", null), fbLimit(1000)),
        );
        const stats: Record<string, UsageStat> = {};
        snap.forEach((d) => {
          const data = d.data();
          const code = String(data.discountCode ?? "").toUpperCase();
          if (!code) return;
          const amt = typeof data.discountAmount === "number" ? data.discountAmount : 0;
          const cur = stats[code] ?? { count: 0, totalDiscount: 0 };
          cur.count += 1;
          cur.totalDiscount += amt;
          stats[code] = cur;
        });
        setUsage(stats);
      } catch (err) {
        console.error("[promotions] usage fetch failed:", err);
      } finally {
        setUsageLoading(false);
      }
    })();
  }, []);

  // 🆕 Round 28s300 — seed the editable service rows ONCE from the live
  //   publicRules.serviceOverrides (getDoc, not the live listener, so
  //   typing here isn't clobbered by a snapshot). priceForDuration on
  //   the raw catalog service returns the current effective price
  //   (override or hardcoded), so the fields pre-fill with what's live.
  useEffect(() => {
    void (async () => {
      let ov: Record<string, LiveServiceOverride> = {};
      let custom: CustomServiceInput[] = [];
      let order: string[] = [];
      try {
        const snap = await getDoc(doc(db, "adminSettings", "publicRules"));
        const d = snap.data() ?? {};
        ov = (d.serviceOverrides ?? {}) as Record<string, LiveServiceOverride>;
        custom = (d.customServices ?? []) as CustomServiceInput[];
        order = (d.serviceOrder ?? []) as string[];
      } catch (err) {
        console.error("[promotions] serviceOverrides fetch failed:", err);
      }
      const stdRows: SvcRow[] = services.map((s) => {
        const o = ov[s.id] ?? {};
        // 🆕 Round 28r50 — scheduledFor lands as a Firestore Timestamp; the
        //   local editable state carries it as epoch ms so the pending
        //   dialog datetime-local input round-trips cleanly.
        const rawSched = (o as unknown as { scheduledFor?: Timestamp | null }).scheduledFor;
        return {
          id: s.id,
          name: o.name ?? s.name,
          enabled: o.enabled !== false,
          p60: o.prices?.[60] ?? priceForDuration(s, 60),
          p90: o.prices?.[90] ?? priceForDuration(s, 90),
          p120: o.prices?.[120] ?? priceForDuration(s, 120),
          image: o.image ?? s.image,
          detail: o.detail ?? s.detail,
          benefit: (o.benefit ?? s.benefit ?? []).join("\n"),
          // 🆕 28r103 — seed the badge from override → catalog default.
          badge: (o.badge as MassageService["badge"]) ?? s.badge,
          scheduledForMs: rawSched?.toMillis?.() ?? null,
        };
      });
      const custRows: CustomSvcRow[] = (custom ?? []).filter((c) => c?.id).map((c) => ({
        id: c.id, name: c.name ?? c.id, desc: c.desc ?? "", image: c.image ?? "",
        badge: c.badge ?? "POPULAR", enabled: c.enabled !== false,
        p60: c.prices?.[60] ?? 0, p90: c.prices?.[90] ?? 0, p120: c.prices?.[120] ?? 0,
        detail: "", benefit: "",
        scheduledForMs: null,
      }));
      setSvcRows(stdRows);
      setCustomSvcRows(custRows);
      // Order: saved order first (only ids that still exist), then any
      // new/unlisted ids appended in their natural order.
      const allIds = [...stdRows.map((r) => r.id), ...custRows.map((r) => r.id)];
      const savedValid = order.filter((id) => allIds.includes(id));
      setOrderIds([...savedValid, ...allIds.filter((id) => !savedValid.includes(id))]);
      // 🆕 Round 28r49 (founder: "Add-ons · บริการเสริม เอาออกจากทุกที่ที่มี")
      //   — add-on rows previously loaded here were removed. `addonOverrides`
      //   / `customAddons` on publicRules are no longer read (harmless
      //   leftover fields if present).
    })();
  }, []);

  // Single writer for the pricing/services config, taking explicit
  // values so add/delete/reorder can persist a freshly-built list without
  // waiting on a state flush.
  // 🆕 Round 28r49 (founder: "Add-ons · บริการเสริม เอาออกจากทุกที่ที่มี")
  //   — the `addons` argument + addonOverrides/customAddons writes have
  //   been removed.
  const persistServices = async (
    rows: SvcRow[], customRows: CustomSvcRow[], order: string[],
  ) => {
    // Same rationale as customServices below — `scheduledFor` here is
    //   a Firestore Timestamp on the wire but a number in the runtime
    //   type; use `unknown` at the write boundary so TS doesn't force
    //   the runtime shape onto the serialized shape.
    const overrides: Record<string, Record<string, unknown>> = {};
    rows.forEach((r) => {
      overrides[r.id] = {
        enabled: r.enabled,
        name: r.name.trim() || r.id,
        price: r.p60,
        prices: { 60: r.p60, 90: r.p90, 120: r.p120 },
        image: r.image,
        detail: r.detail,
        benefit: r.benefit.split("\n").map((b) => b.trim()).filter(Boolean),
        // 🆕 28r103 — persist the badge override.
        badge: r.badge,
        // 🆕 Round 28r50 — write the row's schedule as a Firestore
        //   Timestamp. `null` when the field's empty so an OLD schedule
        //   that's been cleared doesn't linger on the doc via merge.
        scheduledFor: r.scheduledForMs ? Timestamp.fromMillis(r.scheduledForMs) : null,
      };
    });
    // NB: the runtime `CustomServiceInput.scheduledFor` type is
    //   `number | null` (that's what applyLiveServiceConfig's filter
    //   compares against Date.now()) — but the Firestore doc stores it
    //   as a Timestamp, so this write shape uses `unknown` to sidestep
    //   the mismatch. MaintenanceGate does the Timestamp→ms coercion
    //   on read back.
    const customServices: Record<string, unknown>[] = customRows.map((c) => ({
      id: c.id, name: c.name.trim() || c.id, desc: c.desc.trim(), image: c.image,
      badge: c.badge, enabled: c.enabled, prices: { 60: c.p60, 90: c.p90, 120: c.p120 },
      scheduledFor: c.scheduledForMs ? Timestamp.fromMillis(c.scheduledForMs) : null,
    }));
    await setDoc(
      doc(db, "adminSettings", "publicRules"),
      { serviceOverrides: overrides, customServices, serviceOrder: order, updatedAt: serverTimestamp() },
      { merge: true },
    );
  };

  const handleSaveServices = async () => {
    setSvcSaving(true);
    try {
      await persistServices(svcRows, customSvcRows, orderIds);
      void logAdminAction("service.update", {
        count: svcRows.length + customSvcRows.length,
        changedFields: [...svcRows, ...customSvcRows].filter((r) => !r.enabled).map((r) => `${r.id}: ปิด`),
      });
      toast.success("บันทึกราคา/บริการแล้ว — มีผลกับการจองใหม่ทันที");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSvcSaving(false);
    }
  };

  const setSvcField = (id: string, patch: Partial<SvcRow>) =>
    setSvcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const setCustomField = (id: string, patch: Partial<CustomSvcRow>) =>
    setCustomSvcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // 🆕 Round 28s302 — reorder a service up/down in the customer menu.
  const moveService = (id: string, dir: -1 | 1) =>
    setOrderIds((ids) => {
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Details dialog (image/detail/benefits) for a standard service.
  const detailsRow = svcRows.find((r) => r.id === detailsId) ?? null;
  const handleUploadDetailsImage = async (file: File) => {
    if (!detailsId || !file.type.startsWith("image/")) return;
    setDetailsUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file, 1200, 0.85);
      const path = `services/${detailsId}/${Date.now()}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      setSvcField(detailsId, { image: await getDownloadURL(snap.ref) });
    } catch (err) {
      console.error("[promotions] details image upload failed", err);
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setDetailsUploading(false);
    }
  };

  // 🆕 Round 28r49 — handleAddAddon / handleDeleteAddon were removed with
  //   the Add-ons editor.

  // 🆕 Round 28s301 — image upload for the new-service dialog. Reuses the
  //   therapist-gallery pattern (downscale → Storage → URL).
  const handleUploadSvcImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("ไฟล์ต้องเป็นรูปภาพ"); return; }
    setAddSvcUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file, 1200, 0.85);
      const path = `services/new-${Date.now()}-${Math.round(blob.size % 100000)}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      setAddSvcImage(await getDownloadURL(snap.ref));
    } catch (err) {
      console.error("[promotions] service image upload failed", err);
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setAddSvcUploading(false);
    }
  };

  const handleAddCustomService = async () => {
    const name = addSvcName.trim();
    if (!name) { toast.error("ใส่ชื่อบริการก่อน"); return; }
    if (addSvcP60 <= 0) { toast.error("ราคา 60 นาที ต้องมากกว่า 0"); return; }
    setAddSvcSubmitting(true);
    try {
      const id = `SR-C${Date.now().toString(36).toUpperCase()}`;
      // 🆕 Round 28r50 — for a brand-new custom service, activation
      //   scheduling is expressed as a "not-enabled-yet" gate + a
      //   scheduledForMs stamp on the row. The setter in servicePricing
      //   filters by scheduledFor > now, so a scheduled custom service
      //   also correctly stays hidden until the picked minute.
      const scheduledMs = inputDTToMs(addSvcScheduledFor);
      const row: CustomSvcRow = {
        id, name, desc: addSvcDesc.trim(), image: addSvcImage,
        badge: addSvcBadge, enabled: true,
        p60: addSvcP60, p90: addSvcP90, p120: addSvcP120,
        detail: "", benefit: "",
        scheduledForMs: scheduledMs,
      };
      const next = [...customSvcRows, row];
      const nextOrder = [...orderIds, id];
      await persistServices(svcRows, next, nextOrder);
      setCustomSvcRows(next);
      setOrderIds(nextOrder);
      void logAdminAction("service.update", { changedFields: [`สร้างบริการ ${name} (${id})`] });
      setAddSvcOpen(false);
      setAddSvcName(""); setAddSvcDesc(""); setAddSvcImage(""); setAddSvcBadge("POPULAR");
      setAddSvcP60(1500); setAddSvcP90(2200); setAddSvcP120(2900);
      setAddSvcScheduledFor("");
      toast.success(`เพิ่มบริการ ${name} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("เพิ่มบริการไม่สำเร็จ");
    } finally {
      setAddSvcSubmitting(false);
    }
  };

  const handleDeleteCustomService = async (id: string) => {
    const next = customSvcRows.filter((r) => r.id !== id);
    const nextOrder = orderIds.filter((x) => x !== id);
    try {
      await persistServices(svcRows, next, nextOrder);
      setCustomSvcRows(next);
      setOrderIds(nextOrder);
      void logAdminAction("service.update", { changedFields: [`ลบบริการ ${id}`] });
      toast.success("ลบบริการแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const customList = useMemo(
    () => Object.values(promoDocs).filter((p) => p.kind === "custom"),
    [promoDocs],
  );

  const handleTogglePromos = async (checked: boolean) => {
    setPromosSaving(true);
    try {
      await setDoc(doc(db, "adminSettings", "publicRules"), { promosEnabled: checked, updatedAt: serverTimestamp() }, { merge: true });
      void logAdminAction("settings.update", { changedFields: [`promosEnabled: ${checked}`] });
      toast.success(checked ? "เปิดใช้งานโปรโมชั่นแล้ว" : "ปิดใช้งานโปรโมชั่นแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setPromosSaving(false);
    }
  };

  const handleToggleBuiltin = async (code: string, enabled: boolean) => {
    try {
      await setDoc(doc(db, "promoCodes", code), { kind: "builtin", enabled }, { merge: true });
      void logAdminAction("promo.toggle", { code, enabled });
      toast.success(`${enabled ? "เปิด" : "ปิด"}โค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  // 🆕 Round 28r49 — helpers for the per-code edit / delete / restore
  //   flow. Writes to publicRules.builtinCodeOverrides.<CODE> as a
  //   deep-merged partial (setDoc merge:true), so a Save/Delete never
  //   accidentally clobbers OTHER codes on the same map.
  const openBuiltinEdit = (code: string) => {
    const meta = BUILTIN_CODES.find((b) => b.code === code);
    const ov = builtinOverrides[code] ?? {};
    // Prefill the form with the CURRENT effective values (override merged
    // with hardcoded defaults) — makes it obvious what "live" looks like.
    if (meta?.kind === "percent") {
      setBuiltinEditAmount(String(ov.percent ?? meta.defaultAmount));
      setBuiltinEditCap(String(ov.cap ?? meta.defaultCap ?? ""));
    } else if (meta?.kind === "fixed") {
      setBuiltinEditAmount(String(ov.amount ?? meta.defaultAmount));
      setBuiltinEditCap("");
    } else {
      // freetaxi — amount uneditable, we still show the fields disabled.
      setBuiltinEditAmount("");
      setBuiltinEditCap("");
    }
    setBuiltinEditMinSpend(ov.minSpend != null ? String(ov.minSpend) : "");
    setBuiltinEditLabel(ov.label ?? "");
    // Timestamp → yyyy-MM-dd (or empty)
    const tsToInput = (t?: Timestamp | null) => {
      if (!t?.toDate) return "";
      const d = t.toDate();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${da}`;
    };
    setBuiltinEditStart(tsToInput(ov.startsAt));
    setBuiltinEditExpiry(tsToInput(ov.expiryDate));
    // 🆕 Round 28r50 — activation-schedule pre-fill (feature #2). Uses
    //   the datetime-local shape (with time-of-day) rather than the
    //   day-only pickers above, so the founder can hit e.g. 22:00 sharp
    //   for a night-only promo.
    setBuiltinEditScheduledFor(tsToInputDT(ov.scheduledFor));
    // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — only
    //   the REFERRAL pseudo-code exposes tiers in the UI; everything else
    //   resets to an empty list so a stale add doesn't leak into the
    //   next dialog opening.
    const raw = (ov as unknown as { tiers?: unknown }).tiers;
    const clean: ReferralTier[] = [];
    if (Array.isArray(raw)) {
      for (const t of raw) {
        if (t && typeof (t as ReferralTier).minRedeems === "number" && typeof (t as ReferralTier).amount === "number") {
          clean.push({
            minRedeems: (t as ReferralTier).minRedeems,
            amount: (t as ReferralTier).amount,
            label: (t as ReferralTier).label,
          });
        }
      }
    }
    setBuiltinEditTiers(code === "REFERRAL" ? clean : []);
    setBuiltinEditCode(code);
  };

  const handleSaveBuiltinEdit = async () => {
    const code = builtinEditCode;
    if (!code) return;
    const meta = BUILTIN_CODES.find((b) => b.code === code);
    if (!meta) return;
    if (builtinEditStart && builtinEditExpiry && new Date(builtinEditStart) >= new Date(builtinEditExpiry)) {
      toast.error("วันเริ่มต้องมาก่อนวันหมดอายุ"); return;
    }
    setBuiltinEditSubmitting(true);
    try {
      // Build a minimal patch. `null` explicitly CLEARS a field on merge;
      // undefined leaves whatever's already there. Empty string in a
      // required field = "reset to default", which we express as `null`
      // so the saved doc doesn't retain a phantom 0.
      const parseOptNum = (raw: string): number | null | undefined => {
        const t = raw.trim();
        if (t === "") return null;
        const n = Number(t);
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      };
      const patch: Record<string, unknown> = { deleted: false };
      if (meta.kind === "percent") {
        const p = parseOptNum(builtinEditAmount);
        const c = parseOptNum(builtinEditCap);
        if (p !== undefined) patch.percent = p;
        if (c !== undefined) patch.cap = c;
      } else if (meta.kind === "fixed") {
        const a = parseOptNum(builtinEditAmount);
        if (a !== undefined) patch.amount = a;
      }
      const ms = parseOptNum(builtinEditMinSpend);
      if (ms !== undefined) patch.minSpend = ms;
      patch.label = builtinEditLabel.trim() || null;
      patch.startsAt = builtinEditStart ? Timestamp.fromDate(new Date(`${builtinEditStart}T00:00:00`)) : null;
      patch.expiryDate = builtinEditExpiry ? Timestamp.fromDate(new Date(`${builtinEditExpiry}T23:59:59`)) : null;
      // 🆕 Round 28r50 (feature #2) — activation-schedule for the whole
      //   override. While in the future, MaintenanceGate drops this
      //   override entirely; the hardcoded default remains live.
      patch.scheduledFor = inputDTToTimestamp(builtinEditScheduledFor);
      // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — only
      //   write tiers when editing REFERRAL; on every other code, clear
      //   the field so a stale array can't be inherited if a code was
      //   renamed via override.
      if (code === "REFERRAL") {
        const cleanTiers = builtinEditTiers
          .filter((t) => Number.isFinite(t.minRedeems) && Number.isFinite(t.amount) && t.minRedeems >= 0 && t.amount >= 0)
          .map((t) => ({
            minRedeems: Math.round(t.minRedeems),
            amount: Math.round(t.amount),
            ...(t.label?.trim() ? { label: t.label.trim() } : {}),
          }))
          .sort((a, b) => a.minRedeems - b.minRedeems);
        patch.tiers = cleanTiers;
      } else {
        patch.tiers = null;
      }
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { builtinCodeOverrides: { [code]: patch }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("promo.builtin_edit", { code, changedFields: Object.keys(patch).filter((k) => k !== "deleted") });
      setBuiltinEditCode(null);
      toast.success(`อัปเดตโค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setBuiltinEditSubmitting(false);
    }
  };

  const handleDeleteBuiltin = async () => {
    const code = builtinDeleteCode;
    if (!code) return;
    setBuiltinDeleteSubmitting(true);
    try {
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { builtinCodeOverrides: { [code]: { deleted: true } }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("promo.builtin_delete", { code });
      setBuiltinDeleteCode(null);
      toast.success(`ลบโค้ด ${code} แล้ว (กู้คืนได้)`);
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setBuiltinDeleteSubmitting(false);
    }
  };

  const handleRestoreBuiltin = async (code: string) => {
    try {
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { builtinCodeOverrides: { [code]: { deleted: false } }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("promo.builtin_restore", { code });
      toast.success(`กู้คืนโค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("กู้คืนไม่สำเร็จ");
    }
  };

  const handleAddCustom = async () => {
    const code = addCode.trim().toUpperCase();
    if (!code) { toast.error("กรอกโค้ดก่อน"); return; }
    if (BUILTIN_CODES.some((b) => b.code === code)) { toast.error("ชื่อนี้ซ้ำกับโค้ดมาตรฐาน ใช้ชื่ออื่น"); return; }
    if (addAmount <= 0) { toast.error("จำนวนต้องมากกว่า 0"); return; }
    if (addStart && addExpiry && new Date(addStart) >= new Date(addExpiry)) {
      toast.error("วันเริ่มต้องมาก่อนวันหมดอายุ"); return;
    }
    setAddSubmitting(true);
    try {
      await setDoc(doc(db, "promoCodes", code), {
        kind: "custom",
        enabled: true,
        type: addType,
        amount: addAmount,
        ...(addType === "percent" ? { capThb: addCap } : {}),
        label: addLabel.trim() || `${code} — ${addType === "percent" ? `${addAmount}% off` : `฿${addAmount} off`}`,
        // startsAt at 00:00, expiresAt at end-of-day so the whole picked day counts.
        startsAt: addStart ? Timestamp.fromDate(new Date(`${addStart}T00:00:00`)) : null,
        expiresAt: addExpiry ? Timestamp.fromDate(new Date(`${addExpiry}T23:59:59`)) : null,
        minSpendThb: addMinSpend > 0 ? addMinSpend : null,
        maxRedemptions: addMaxRedemptions > 0 ? addMaxRedemptions : null,
        perPhoneLimit: addPerPhone > 0 ? addPerPhone : null,
        // 🆕 Round 28r50 (feature #2) — activation schedule; MaintenanceGate
        //   drops the code entirely until this passes.
        scheduledFor: inputDTToTimestamp(addScheduledFor),
        createdAt: serverTimestamp(),
      });
      void logAdminAction("promo.create", { code, type: addType, amount: addAmount });
      setAddOpen(false);
      setAddCode(""); setAddAmount(100); setAddCap(300); setAddLabel("");
      setAddStart(""); setAddExpiry(""); setAddMinSpend(0); setAddMaxRedemptions(0); setAddPerPhone(0); setAddType("fixed");
      setAddScheduledFor("");
      toast.success(`สร้างโค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("สร้างไม่สำเร็จ");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteDoc(doc(db, "promoCodes", deleteTarget.id));
      void logAdminAction("promo.delete", { code: deleteTarget.id });
      toast.success(`ลบโค้ด ${deleteTarget.id} แล้ว`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // 🆕 Round 28s299 — share link is the customer origin + ?promo=CODE,
  //   captured by HomePage into localStorage (see discount.ts).
  const shareUrl = shareCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://sunred.vip"}/?promo=${encodeURIComponent(shareCode)}`
    : "";
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("คัดลอกลิงก์แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ — กดค้างที่ลิงก์เพื่อคัดลอกเอง");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 🆕 Round 28r50 (feature #1 "Bundle Packages") — handlers
  // ─────────────────────────────────────────────────────────────

  const openBundleCreate = () => {
    setEditingBundleId(null);
    setBundleName("Weekly Ritual · 3 sessions");
    setBundleSessionCount(3);
    setBundleDiscountPct(10);
    setBundleServiceId("");
    setBundleExpiresAt("");
    setBundleLabel("");
    // 🆕 Round 28r60 — reset the new polish fields on create + clear any
    //   leftover pre-minted id from a previous cancelled create.
    setBundleImageUrl("");
    setBundleCategoryTag("Weekly Ritual");
    setBundleSubtitle("");
    bundlePendingIdRef.current = null;
    setBundleDialogOpen(true);
  };
  const openBundleEdit = (id: string) => {
    const b = bundles[id];
    if (!b) return;
    setEditingBundleId(id);
    setBundleName(b.name);
    setBundleSessionCount(b.sessionCount);
    setBundleDiscountPct(b.discountPct);
    setBundleServiceId(b.serviceId ?? "");
    setBundleExpiresAt(b.expiresAt?.toDate ? tsToInputDT(b.expiresAt).slice(0, 10) : "");
    setBundleLabel(b.label ?? "");
    // 🆕 Round 28r60 — hydrate polish fields (undefined → empty string).
    setBundleImageUrl(b.imageUrl ?? "");
    setBundleCategoryTag(b.categoryTag ?? "");
    setBundleSubtitle(b.subtitle ?? "");
    setBundleDialogOpen(true);
  };

  // 🆕 Round 28r60 — bundle hero image upload. Same lazy firebase/storage +
  //   downscaleImage pattern the AvatarUploader in therapistFormKit uses
  //   (28s280-281). Stored at `bundles/{bundleId}/{ts}.jpg` — storage.rules
  //   grants authenticated write on `bundles/**` with the same image-only +
  //   15MB caps as the therapist path.
  const handleBundleImageUpload = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("ไฟล์ต้องเป็นรูปภาพ"); return; }
    // Resolve a stable id BEFORE upload — for new bundles we mint one now
    // (same base36 shape used at save-time) so the storage path is
    // deterministic; on edit, reuse the existing bundle id. Pinning it in
    // a ref (not editingBundleId) keeps the dialog title on "Add" even
    // after the image lands.
    let targetId: string;
    if (editingBundleId) {
      targetId = editingBundleId;
    } else {
      targetId = bundlePendingIdRef.current
        ?? `SR-BUNDLE-${Date.now().toString(36).toUpperCase()}`;
      bundlePendingIdRef.current = targetId;
    }
    setBundleImageUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file, 1600, 0.85);
      const path = `bundles/${targetId}/${Date.now()}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(snap.ref);
      setBundleImageUrl(url);
    } catch (err) {
      console.error("[bundle image upload]", err);
      const msg = String((err as { code?: string })?.code ?? err ?? "");
      toast.error(msg.includes("unauthorized") ? "อัปโหลดไม่ได้ — สิทธิ์ไม่พอ" : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBundleImageUploading(false);
      if (bundleImageInputRef.current) bundleImageInputRef.current.value = "";
    }
  };

  const handleSaveBundle = async () => {
    const nm = bundleName.trim();
    if (!nm) { toast.error("ใส่ชื่อแพ็คเกจก่อน"); return; }
    if (bundleSessionCount < 1) { toast.error("จำนวนครั้งต้อง ≥ 1"); return; }
    if (bundleDiscountPct < 0 || bundleDiscountPct > 100) { toast.error("ส่วนลดต้องอยู่ระหว่าง 0–100%"); return; }
    setBundleSubmitting(true);
    try {
      // On CREATE: reuse the pre-minted id if a hero image was uploaded
      // during this dialog session (so the doc id matches the storage
      // folder). Otherwise mint a fresh one.
      const id = editingBundleId
        ?? bundlePendingIdRef.current
        ?? `SR-BUNDLE-${Date.now().toString(36).toUpperCase()}`;
      const patch: Record<string, unknown> = {
        name: nm,
        sessionCount: Math.round(bundleSessionCount),
        discountPct: Math.round(bundleDiscountPct),
        serviceId: bundleServiceId.trim() || null,
        enabled: bundles[id]?.enabled !== false, // preserve existing on edit
        expiresAt: bundleExpiresAt ? Timestamp.fromDate(new Date(`${bundleExpiresAt}T23:59:59`)) : null,
        label: bundleLabel.trim() || null,
        // 🆕 Round 28r60 — presentation fields. Empty string → null so
        //   pre-r60 docs don't get polluted with empty defaults.
        imageUrl: bundleImageUrl.trim() || null,
        categoryTag: bundleCategoryTag.trim() || null,
        subtitle: bundleSubtitle.trim() || null,
      };
      if (!editingBundleId) patch.createdAt = serverTimestamp();
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { bundles: { [id]: patch }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction(editingBundleId ? "bundle.update" : "bundle.create", {
        bundleId: id, name: nm, sessionCount: patch.sessionCount, discountPct: patch.discountPct,
      });
      setBundleDialogOpen(false);
      // 🆕 Round 28r60 — release the pre-minted id now that the CREATE doc
      //   has landed at that same id (the storage folder is now bound to
      //   a real bundle doc).
      bundlePendingIdRef.current = null;
      toast.success(editingBundleId ? "อัปเดตแพ็คเกจแล้ว" : "สร้างแพ็คเกจแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setBundleSubmitting(false);
    }
  };
  const handleToggleBundle = async (id: string, enabled: boolean) => {
    try {
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { bundles: { [id]: { enabled } }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("bundle.update", { bundleId: id, changedFields: [`enabled: ${enabled}`] });
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };
  const handleDeleteBundle = async () => {
    const id = bundleDeleteId;
    if (!id) return;
    try {
      // Firestore has no path-level unset via setDoc merge without
      // FieldValue.delete(); simplest is a full re-write of the bundles
      // map minus this id.
      const next: Record<string, BundleDoc> = { ...bundles };
      delete next[id];
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { bundles: next, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("bundle.delete", { bundleId: id });
      setBundleDeleteId(null);
      toast.success("ลบแพ็คเกจแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  // Live preview of savings for the bundle currently in the dialog.
  const bundlePreview = useMemo(() => {
    const cnt = Math.max(1, Math.round(bundleSessionCount));
    const pct = Math.max(0, Math.min(100, bundleDiscountPct));
    // Baseline = the specific service's 60-min price (or the first
    // standard service if "any").
    let base = 0;
    let baseLabel = "60-min baseline";
    if (bundleServiceId) {
      const std = svcRows.find((r) => r.id === bundleServiceId);
      const cus = customSvcRows.find((r) => r.id === bundleServiceId);
      if (std) { base = std.p60; baseLabel = `${std.name} · 60 min`; }
      else if (cus) { base = cus.p60; baseLabel = `${cus.name} · 60 min`; }
    } else if (svcRows[0]) {
      base = svcRows[0].p60;
      baseLabel = `e.g. ${svcRows[0].name} · 60 min`;
    }
    const s = bundleSavings({ sessionCount: cnt, discountPct: pct }, base);
    return { ...s, base, baseLabel, cnt, pct };
  }, [bundleSessionCount, bundleDiscountPct, bundleServiceId, svcRows, customSvcRows]);

  // ─────────────────────────────────────────────────────────────
  // 🆕 Round 28r50 (feature #3 "Bulk Service Edits") — handlers
  // ─────────────────────────────────────────────────────────────

  const openBulk = () => {
    // Pre-select nothing — founder should explicitly opt each row in.
    setBulkSelected({});
    setBulkMode("pct_down");
    setBulkValue(10);
    setBulkScope({ d60: true, d90: true, d120: true });
    setBulkScheduledFor("");
    setBulkOpen(true);
  };
  const bulkAllRows: (SvcRow | CustomSvcRow)[] = useMemo(
    () => [...svcRows, ...customSvcRows],
    [svcRows, customSvcRows],
  );
  const applyBulkAdjustment = (currentPrice: number): number => {
    if (bulkMode === "pct_up")   return Math.max(0, Math.round(currentPrice * (1 + bulkValue / 100)));
    if (bulkMode === "pct_down") return Math.max(0, Math.round(currentPrice * (1 - bulkValue / 100)));
    if (bulkMode === "thb_up")   return Math.max(0, Math.round(currentPrice + bulkValue));
    if (bulkMode === "thb_down") return Math.max(0, Math.round(currentPrice - bulkValue));
    if (bulkMode === "fixed")    return Math.max(0, Math.round(bulkValue));
    return currentPrice;
  };
  // Preview of what will change (only rows selected + only durations in scope).
  interface BulkPreviewCell { row: SvcRow | CustomSvcRow; duration: 60|90|120; before: number; after: number }
  const bulkPreview = useMemo<BulkPreviewCell[]>(() => {
    const list: BulkPreviewCell[] = [];
    for (const row of bulkAllRows) {
      if (!bulkSelected[row.id]) continue;
      const durations: (60|90|120)[] = [
        ...(bulkScope.d60 ? [60 as const] : []),
        ...(bulkScope.d90 ? [90 as const] : []),
        ...(bulkScope.d120 ? [120 as const] : []),
      ];
      for (const d of durations) {
        const before = d === 60 ? row.p60 : d === 90 ? row.p90 : row.p120;
        const after = applyBulkAdjustment(before);
        if (before !== after) list.push({ row, duration: d, before, after });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkAllRows, bulkSelected, bulkScope, bulkMode, bulkValue]);
  const handleApplyBulk = async () => {
    if (bulkPreview.length === 0) { toast.error("ไม่มีการเปลี่ยนแปลง"); return; }
    setBulkSubmitting(true);
    try {
      // Fold changes into local svcRows / customSvcRows AND stamp the
      // shared scheduledFor onto every touched row (feature #2 combo).
      const schedMs = inputDTToMs(bulkScheduledFor);
      const changed = new Set(bulkPreview.map((c) => c.row.id));
      const patchRow = <T extends SvcRow>(r: T): T => {
        if (!changed.has(r.id)) return r;
        const nx: T = { ...r };
        for (const c of bulkPreview) {
          if (c.row.id !== r.id) continue;
          if (c.duration === 60) nx.p60 = c.after;
          if (c.duration === 90) nx.p90 = c.after;
          if (c.duration === 120) nx.p120 = c.after;
        }
        if (schedMs) nx.scheduledForMs = schedMs;
        return nx;
      };
      const nextStd = svcRows.map(patchRow);
      const nextCust = customSvcRows.map(patchRow);
      await persistServices(nextStd, nextCust, orderIds);
      setSvcRows(nextStd);
      setCustomSvcRows(nextCust);
      void logAdminAction("service.bulk_edit", {
        count: bulkPreview.length,
        mode: bulkMode,
        value: bulkValue,
        scheduledFor: schedMs ?? null,
        changedFields: Array.from(changed),
      });
      setBulkOpen(false);
      toast.success(`ปรับ ${bulkPreview.length} ราคาแล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 🆕 Round 28r50 (feature #4 "Print/Share Promo Card") — handlers
  // ─────────────────────────────────────────────────────────────

  const printCardUrl = printCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://sunred.vip"}/?promo=${encodeURIComponent(printCode)}`
    : "";
  // Metadata for the code being printed (used to render the discount
  // description on the printable card).
  const printCodeMeta = useMemo(() => {
    if (!printCode) return null;
    const b = BUILTIN_CODES.find((x) => x.code === printCode);
    if (b) {
      const ov = builtinOverrides[printCode];
      const amount = b.kind === "percent"
        ? (ov?.percent ?? b.defaultAmount)
        : (ov?.amount ?? b.defaultAmount);
      const cap = b.kind === "percent" ? (ov?.cap ?? b.defaultCap) : undefined;
      const desc = b.kind === "percent"
        ? `${amount}% off${cap ? ` (max ฿${cap})` : ""}`
        : b.kind === "fixed"
        ? `฿${amount} off`
        : "Free travel";
      return { label: ov?.label?.trim() || b.label, desc };
    }
    const c = promoDocs[printCode];
    if (c && c.kind === "custom") {
      const desc = c.type === "percent"
        ? `${c.amount}% off${c.capThb ? ` (max ฿${c.capThb})` : ""}`
        : `฿${c.amount} off`;
      return { label: c.label ?? printCode, desc };
    }
    return { label: printCode, desc: "Present at booking" };
  }, [printCode, builtinOverrides, promoDocs]);

  const PRINT_FORMATS = {
    a6:     { label: "A6 flyer (105×148 mm)",   w: 105, h: 148, unit: "mm" as const, cssW: "105mm", cssH: "148mm" },
    card:   { label: "Business card (85×55 mm)", w: 85,  h: 55,  unit: "mm" as const, cssW: "85mm",  cssH: "55mm" },
    square: { label: "Social square (1080 px)",   w: 300, h: 300, unit: "px" as const, cssW: "300px", cssH: "300px" },
  } as const;

  const handleDownloadPrintPDF = () => {
    if (!printCode || !printCardRef.current) return;
    // Use window.print() flow: open a new tab with the card + a print
    // stylesheet, auto-trigger Chrome's print dialog which offers "Save
    // as PDF" on every OS. jsPDF was considered — it's a repo dep — but
    // faithfully rendering the serif wordmark + QR image via jsPDF's
    // primitives is fiddler and less faithful to the on-screen preview
    // than the browser's own PDF export.
    const fmt = PRINT_FORMATS[printFormat];
    const cardHtml = printCardRef.current.outerHTML;
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("เปิดหน้าปริ้นไม่ได้ — ตรวจสอบ pop-up blocker"); return; }
    win.document.write(`<!doctype html>
<html><head><title>SunRed Promo · ${printCode}</title>
<style>
  @page { size: ${fmt.w}${fmt.unit} ${fmt.h}${fmt.unit}; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: "Helvetica Neue", Inter, system-ui, sans-serif; }
  .card { width: ${fmt.cssW}; height: ${fmt.cssH}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6mm; background: #fff; color: #1F2933; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>${cardHtml}<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>`);
    win.document.close();
    void logAdminAction("promo.print_card", { code: printCode, format: printFormat });
  };

  const handleCopyPrintAsImage = async () => {
    if (!printCode || !printCardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(printCardRef.current, {
        backgroundColor: "#ffffff",
        // QR image is served cross-origin (api.qrserver.com) — request
        // useCORS so it lands on the canvas instead of being blocked.
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error("แปลงรูปไม่สำเร็จ"); return; }
        try {
          // Clipboard image write requires the ClipboardItem API (recent Safari/Chrome).
          const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
          if (CI && navigator.clipboard && "write" in navigator.clipboard) {
            await navigator.clipboard.write([new CI({ "image/png": blob })]);
            toast.success("คัดลอกรูปการ์ดแล้ว");
          } else {
            // Fallback: download it.
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `sunred-promo-${printCode}.png`;
            a.click();
            toast.success("ดาวน์โหลดรูปการ์ดแล้ว");
          }
        } catch (e) {
          console.error("[promotions] clipboard copy failed", e);
          toast.error("คัดลอกไม่สำเร็จ (QR อาจถูก CORS block)");
        }
      }, "image/png");
    } catch (err) {
      console.error("[promotions] html2canvas failed", err);
      toast.error("แปลงรูปไม่สำเร็จ");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760, mx: "auto", fontFamily: SANS }}>
      {/* 🆕 Round 28r48 (bilingual pass) — English-primary header + Thai subtitle,
          matching the r35 admin-page convention (Dashboard / Bookings / Earnings). */}
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5, lineHeight: 1 }}>
        Promotions
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em", mb: 1.25 }}>
        โปรโมชั่น
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2.5 }}>
        จัดการราคา/บริการ และโค้ดส่วนลด — บันทึกแล้วมีผลกับการจองใหม่ทันที
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* 🆕 Round 28s300 — Pricing & services editor */}
        <SectionCard icon={<Storefront size={13} weight="bold" />} title="Pricing & Services · ราคา & บริการ">
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5 }}>
            แก้ราคาแต่ละช่วงเวลา · เปลี่ยนชื่อ · เปิด/ปิดบริการ — มีผลกับการจองใหม่เท่านั้น (ออเดอร์เก่าล็อกราคาที่จ่ายไว้แล้ว)
          </Typography>
          <Stack spacing={1.5}>
            {orderIds.map((oid, idx) => {
              const std = svcRows.find((r) => r.id === oid);
              const cus = customSvcRows.find((r) => r.id === oid);
              const r = std ?? cus;
              if (!r) return null;
              const isCustom = !!cus;
              const set = isCustom ? setCustomField : setSvcField;
              const pct = therapistPctFor(r.id);
              const shopCut = Math.round(r.p60 * (1 - pct));
              const therapistCut = r.p60 - shopCut;
              return (
                <Box key={r.id} sx={{ p: "11px 12px", borderRadius: "12px", background: adminColor.panel2, ...(isCustom ? { border: `1px dashed ${adminColor.line2}` } : {}), opacity: r.enabled ? 1 : 0.6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                    {/* reorder */}
                    <Box sx={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                      <Box onClick={() => moveService(r.id, -1)} sx={{ cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 1, lineHeight: 0 }}><CaretUp size={13} color={adminColor.dim} weight="bold" /></Box>
                      <Box onClick={() => moveService(r.id, 1)} sx={{ cursor: idx === orderIds.length - 1 ? "default" : "pointer", opacity: idx === orderIds.length - 1 ? 0.25 : 1, lineHeight: 0 }}><CaretDown size={13} color={adminColor.dim} weight="bold" /></Box>
                    </Box>
                    {(isCustom ? cus!.image : std!.image)
                      ? <img src={isCustom ? cus!.image : std!.image} alt="" width={30} height={30} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <Box sx={{ width: 30, height: 30, borderRadius: "8px", background: adminColor.panel3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Camera size={15} color={adminColor.dim} /></Box>}
                    <TextField
                      value={r.name} onChange={(e) => set(r.id, { name: e.target.value })}
                      size="small" variant="standard" sx={{ flex: 1, minWidth: 0, "& .MuiInput-input": { fontSize: 13.5, fontWeight: 700, color: adminColor.text } }}
                    />
                    {isCustom && <Box sx={{ fontSize: 9, fontWeight: 800, color: adminColor.accent, background: `${adminColor.accent}1F`, borderRadius: "5px", px: "5px", py: "1px", flexShrink: 0 }}>NEW</Box>}
                    {/* 🆕 Round 28r50 (feature #2) — Scheduled badge. Shows
                        when the row carries a future scheduledForMs; the
                        override sits queued until that time. */}
                    {isFutureMs(r.scheduledForMs) && (
                      <Box title={`Activates ${fmtScheduledLabel(r.scheduledForMs)}`}
                        sx={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: 9, fontWeight: 800, color: adminColor.amber, background: `${adminColor.amber}1F`, borderRadius: "5px", px: "5px", py: "1px", flexShrink: 0 }}>
                        <Calendar size={9} weight="bold" /> SCHED
                      </Box>
                    )}
                    {!isCustom && <Button size="small" onClick={() => { setDetailsId(r.id); setDetailsScheduledFor(msToInputDT(r.scheduledForMs)); }} sx={{ color: adminColor.accent, minWidth: "auto", p: "3px" }} aria-label="Details"><NotePencil size={16} /></Button>}
                    <Switch checked={r.enabled} onChange={(e) => set(r.id, { enabled: e.target.checked })} sx={switchSx} size="small" />
                    {isCustom && <Button size="small" onClick={() => void handleDeleteCustomService(r.id)} sx={{ color: adminColor.red, minWidth: "auto", p: "3px" }}><Trash size={15} /></Button>}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {([["60 น.", "p60"], ["90 น.", "p90"], ["120 น.", "p120"]] as const).map(([lbl, key]) => (
                      <TextField
                        key={key} label={lbl} type="number" size="small" fullWidth sx={fieldSx}
                        value={r[key]}
                        onChange={(e) => set(r.id, { [key]: Math.max(0, Number(e.target.value)) } as Partial<CustomSvcRow>)}
                        InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }}
                      />
                    ))}
                  </Stack>
                  {/* 🆕 Round 28s302 — margin line (60-min basis) */}
                  <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: 0.75 }}>
                    60 น.: หมอนวดได้ ฿{therapistCut.toLocaleString()} · ร้าน ฿{shopCut.toLocaleString()} ({Math.round((1 - pct) * 100)}%)
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="contained" disabled={svcSaving || svcRows.length === 0}
              onClick={() => void handleSaveServices()}
              startIcon={svcSaving ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <FloppyDisk size={15} weight="bold" />}
              sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, borderRadius: "10px", "&:hover": { background: adminColor.accentDeep } }}
            >
              {svcSaving ? "กำลังบันทึก…" : "Save · บันทึก"}
            </Button>
            <Button
              variant="outlined" startIcon={<Plus size={15} weight="bold" />} onClick={() => setAddSvcOpen(true)}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
            >
              Add Service · เพิ่มบริการ
            </Button>
            {/* 🆕 Round 28r50 (feature #3 "Bulk Service Edits") */}
            <Button
              variant="outlined" startIcon={<Sliders size={15} weight="bold" />} onClick={openBulk}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
            >
              Bulk Adjust · ปรับยกชุด
            </Button>
          </Stack>
        </SectionCard>

        {/* 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม
            เอาออกจากทุกที่ที่มี") — the Add-ons editor (28s302) has been
            removed alongside the customer picker. If addonOverrides /
            customAddons still exist on publicRules from a previous save,
            they're no longer read by anything. */}

        {/* Master switch */}
        <SectionCard icon={<Tag size={13} weight="bold" />} title="Master Switch · สวิตช์หลัก">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable promotions site-wide · เปิดใช้งานทั้งเว็บ</Typography>
            <Switch checked={promosEnabled} disabled={promosSaving} onChange={(e) => void handleTogglePromos(e.target.checked)} sx={switchSx} />
          </Box>
          {!promosEnabled && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "flex-start", gap: "6px", color: adminColor.amber }}>
              <Warning size={14} weight="fill" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                ปิดอยู่ตอนนี้ — ลูกค้าจะไม่เห็นช่องใส่โค้ดส่วนลดเลย ต่อให้เปิด/สร้างโค้ดข้างล่างก็ยังไม่มีผลกับลูกค้าจริงจนกว่าจะเปิดสวิตช์นี้
              </Typography>
            </Box>
          )}
        </SectionCard>

        {/* Built-in codes */}
        <SectionCard icon={<Percent size={13} weight="bold" />} title="Built-in Codes · โค้ดมาตรฐาน">
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            แก้ไข/ลบได้ทุกโค้ด — เก็บไว้ในระบบเสมอ (ลบแล้วกู้คืนได้)
          </Typography>
          <Stack spacing={1}>
            {BUILTIN_CODES.map((b) => {
              const enabled = promoDocs[b.code]?.enabled !== false;
              const ov = builtinOverrides[b.code];
              const deleted = ov?.deleted === true;
              // Effective values (override merged with hardcoded defaults).
              const effAmount = b.kind === "percent"
                ? (ov?.percent ?? b.defaultAmount)
                : (ov?.amount ?? b.defaultAmount);
              const effCap = b.kind === "percent" ? (ov?.cap ?? b.defaultCap) : undefined;
              const summary = b.kind === "percent"
                ? `${effAmount}% off${effCap ? ` (สูงสุด ฿${effCap})` : ""}`
                : b.kind === "fixed"
                ? `฿${effAmount} off`
                : "ฟรีค่าเดินทาง";
              const extras: string[] = [];
              if (ov?.minSpend) extras.push(`ขั้นต่ำ ฿${ov.minSpend.toLocaleString()}`);
              if (ov?.startsAt?.toDate) extras.push(`เริ่ม ${ov.startsAt.toDate().toLocaleDateString("th-TH")}`);
              if (ov?.expiryDate?.toDate) extras.push(`ถึง ${ov.expiryDate.toDate().toLocaleDateString("th-TH")}`);
              // 🆕 Round 28r50 (feature #2) — scheduled activation for
              //   the OVERRIDE. Until this date, the code runs on the
              //   hardcoded default. Distinct from startsAt (which is the
              //   code's own eligibility window).
              const scheduledMs = ov?.scheduledFor?.toMillis?.() ?? null;
              const scheduledFuture = !!scheduledMs && scheduledMs > Date.now();
              if (scheduledFuture) extras.push(`Scheduled ${fmtScheduledLabel(scheduledMs)}`);
              const displayLabel = ov?.label?.trim() || b.label;
              return (
                <Box
                  key={b.code}
                  sx={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 2, p: "8px 10px", borderRadius: "10px",
                    background: adminColor.panel2,
                    opacity: deleted ? 0.55 : 1,
                    ...(deleted ? { border: `1px dashed ${adminColor.red}` } : {}),
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13, fontWeight: 700, color: adminColor.text,
                        ...(deleted ? { textDecoration: "line-through" } : {}),
                      }}
                    >
                      {b.code} <span style={{ fontWeight: 400, color: adminColor.dim }}>· {displayLabel}</span>
                      {deleted && <span style={{ marginLeft: 6, color: adminColor.red, fontWeight: 700 }}>· ลบแล้ว</span>}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: adminColor.muted }}>{summary} · {b.desc}</Typography>
                    {extras.length > 0 && (
                      <Typography sx={{ fontSize: 10.5, color: adminColor.dim }}>{extras.join(" · ")}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {deleted ? (
                      <Button
                        size="small"
                        onClick={() => void handleRestoreBuiltin(b.code)}
                        sx={{ color: adminColor.green, minWidth: "auto", p: "4px" }}
                        aria-label="Restore"
                      >
                        <ArrowCounterClockwise size={16} />
                      </Button>
                    ) : (
                      <>
                        {b.code !== "REFERRAL" && (
                          <Button size="small" onClick={() => setShareCode(b.code)} sx={{ color: adminColor.accent, minWidth: "auto", p: "4px" }} aria-label="Share">
                            <ShareNetwork size={16} />
                          </Button>
                        )}
                        {/* 🆕 Round 28r50 (feature #4) — Print Card. REFERRAL
                            is a PATTERN (SUN-XXXX), not a single distributable
                            code, so no print button there. */}
                        {b.code !== "REFERRAL" && (
                          <Button size="small" onClick={() => setPrintCode(b.code)} sx={{ color: adminColor.dim, minWidth: "auto", p: "4px" }} aria-label="Print Card">
                            <Printer size={16} />
                          </Button>
                        )}
                        {/* 🆕 Round 28r49 — Edit + Delete per-code. Enable
                            switch (28s298) stays alongside so admin can
                            still "pause" a code without editing/deleting. */}
                        <Button size="small" onClick={() => openBuiltinEdit(b.code)} sx={{ color: adminColor.blue, minWidth: "auto", p: "4px" }} aria-label="Edit">
                          <PencilSimple size={16} />
                        </Button>
                        <Button size="small" onClick={() => setBuiltinDeleteCode(b.code)} sx={{ color: adminColor.red, minWidth: "auto", p: "4px" }} aria-label="Delete">
                          <Trash size={16} />
                        </Button>
                        <Switch checked={enabled} onChange={(e) => void handleToggleBuiltin(b.code, e.target.checked)} sx={switchSx} />
                      </>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </SectionCard>

        {/* Custom codes */}
        <SectionCard icon={<Ticket size={13} weight="bold" />} title="Custom Codes · โค้ดที่สร้างเอง">
          {customList.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1 }}>ยังไม่มีโค้ดที่สร้างเอง</Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {customList.map((c) => {
                const now = Date.now();
                const expired = c.expiresAt && c.expiresAt.toMillis() < now;
                const notStarted = c.startsAt && c.startsAt.toMillis() > now;
                // 🆕 Round 28r50 (feature #2) — scheduled activation of
                //   the CODE ITSELF (distinct from startsAt eligibility).
                const scheduledMs = c.scheduledFor?.toMillis?.() ?? null;
                const isScheduled = scheduledMs && scheduledMs > now;
                // Build the conditions/limits line only from fields that are set.
                const meta: string[] = [];
                if (c.minSpendThb) meta.push(`ขั้นต่ำ ฿${c.minSpendThb.toLocaleString()}`);
                if (c.maxRedemptions) meta.push(`จำกัด ${c.maxRedemptions} ครั้ง`);
                if (c.perPhoneLimit) meta.push(`${c.perPhoneLimit} ครั้ง/เบอร์`);
                if (c.startsAt) meta.push(`เริ่ม ${c.startsAt.toDate().toLocaleDateString("th-TH")}`);
                if (c.expiresAt) meta.push(`${expired ? "หมดอายุแล้ว" : "ถึง"} ${c.expiresAt.toDate().toLocaleDateString("th-TH")}`);
                return (
                  <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "8px 10px", borderRadius: "10px", background: adminColor.panel2, opacity: expired ? 0.6 : 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                        {c.id} <span style={{ fontWeight: 400, color: adminColor.dim }}>
                          · {c.type === "percent" ? `${c.amount}% off${c.capThb ? ` (สูงสุด ฿${c.capThb})` : ""}` : `฿${c.amount} off`}
                        </span>
                        {notStarted && <span style={{ color: adminColor.amber, fontWeight: 700 }}> · ยังไม่เริ่ม</span>}
                        {expired && <span style={{ color: adminColor.red, fontWeight: 700 }}> · หมดอายุ</span>}
                        {isScheduled && (
                          <span style={{ color: adminColor.amber, fontWeight: 700 }}
                            title={`Activates ${fmtScheduledLabel(scheduledMs)}`}> · Scheduled {fmtScheduledLabel(scheduledMs)}</span>
                        )}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: adminColor.muted }}>{c.label}</Typography>
                      {meta.length > 0 && (
                        <Typography sx={{ fontSize: 10.5, color: adminColor.dim }}>{meta.join(" · ")}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Button size="small" onClick={() => setShareCode(c.id)} sx={{ color: adminColor.accent, minWidth: "auto", p: "4px" }} aria-label="Share">
                        <ShareNetwork size={16} />
                      </Button>
                      {/* 🆕 Round 28r50 (feature #4) — Print Card */}
                      <Button size="small" onClick={() => setPrintCode(c.id)} sx={{ color: adminColor.dim, minWidth: "auto", p: "4px" }} aria-label="Print Card">
                        <Printer size={16} />
                      </Button>
                      <Switch checked={c.enabled} onChange={(e) => void setDoc(doc(db, "promoCodes", c.id), { enabled: e.target.checked }, { merge: true })} sx={switchSx} />
                      <Button size="small" onClick={() => setDeleteTarget(c)} sx={{ color: adminColor.red, minWidth: "auto", p: "4px" }}>
                        <Trash size={16} />
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Button
            variant="outlined" startIcon={<Plus size={15} weight="bold" />} onClick={() => setAddOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
          >
            Create Code · สร้างโค้ด
          </Button>
        </SectionCard>

        {/* 🆕 Round 28r50 (feature #1 "Bundle Packages") — prepaid
            multi-session discounts, e.g. buy-3-get-10%-off. Admin
            management surface only in this phase — customer-facing
            display + BookingFlow wiring is Phase 2. Empty = nothing
            surfaced anywhere. Slots after Custom Codes and before Usage
            Stats since bundles ARE a kind of pricing promo. */}
        <SectionCard icon={<Package size={13} weight="bold" />} title="Bundle Packages · แพ็คเกจ">
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            แพ็คเกจจ่ายล่วงหน้าหลายครั้ง (เช่น จ่าย 3 ครั้ง ลด 10%) — Phase 1: จัดการฝั่ง admin (ลูกค้าจะเห็นในเฟส 2)
          </Typography>
          {Object.keys(bundles).length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1 }}>ยังไม่มีแพ็คเกจ</Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {Object.entries(bundles).map(([id, b]) => {
                const now = Date.now();
                const expired = b.expiresAt && b.expiresAt.toMillis() < now;
                // Preview savings: use the target service's 60-min price,
                // or the first standard service if any-service.
                let base = 0;
                if (b.serviceId) {
                  const std = svcRows.find((r) => r.id === b.serviceId);
                  const cus = customSvcRows.find((r) => r.id === b.serviceId);
                  base = std?.p60 ?? cus?.p60 ?? 0;
                } else {
                  base = svcRows[0]?.p60 ?? 0;
                }
                const s = bundleSavings({ sessionCount: b.sessionCount, discountPct: b.discountPct }, base);
                const svcName = b.serviceId
                  ? svcRows.find((r) => r.id === b.serviceId)?.name
                    ?? customSvcRows.find((r) => r.id === b.serviceId)?.name
                    ?? b.serviceId
                  : "Any service · ทุกบริการ";
                return (
                  <Box key={id} sx={{ p: "9px 11px", borderRadius: "10px", background: adminColor.panel2, opacity: expired || !b.enabled ? 0.55 : 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
                      {/* 🆕 Round 28r60 — tiny image thumbnail when set. */}
                      {b.imageUrl && (
                        <Avatar
                          src={b.imageUrl} variant="rounded"
                          sx={{ width: 42, height: 42, borderRadius: "8px", flexShrink: 0, border: `1px solid ${adminColor.line}` }}
                        />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                            {b.name}
                            {expired && <span style={{ color: adminColor.red, fontWeight: 700 }}> · หมดอายุ</span>}
                          </Typography>
                          {/* 🆕 Round 28r60 — category tag pill (neutral tint on admin). */}
                          {b.categoryTag && (
                            <Box component="span" sx={{
                              fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                              color: adminColor.accent, background: `${adminColor.accent}14`,
                              border: `1px solid ${adminColor.accent}33`, borderRadius: 999, padding: "1px 8px",
                            }}>
                              {b.categoryTag}
                            </Box>
                          )}
                        </Box>
                        {b.subtitle && (
                          <Typography sx={{ fontSize: 11, color: adminColor.dim, fontStyle: "italic" }}>
                            {b.subtitle}
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: 11.5, color: adminColor.muted }}>
                          {b.sessionCount} sessions · {b.discountPct}% off · {svcName}
                          {b.expiresAt && ` · ถึง ${b.expiresAt.toDate().toLocaleDateString("th-TH")}`}
                        </Typography>
                        {base > 0 && (
                          <Typography sx={{ fontSize: 10.5, color: adminColor.dim }}>
                            {b.sessionCount} × ฿{base.toLocaleString()} = ฿{s.gross.toLocaleString()} → ฿{s.net.toLocaleString()} (save ฿{s.discountAmt.toLocaleString()})
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Button size="small" onClick={() => openBundleEdit(id)} sx={{ color: adminColor.blue, minWidth: "auto", p: "4px" }} aria-label="Edit">
                          <PencilSimple size={16} />
                        </Button>
                        <Switch checked={b.enabled !== false} onChange={(e) => void handleToggleBundle(id, e.target.checked)} sx={switchSx} />
                        <Button size="small" onClick={() => setBundleDeleteId(id)} sx={{ color: adminColor.red, minWidth: "auto", p: "4px" }} aria-label="Delete">
                          <Trash size={16} />
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Button
            variant="outlined" startIcon={<Plus size={15} weight="bold" />} onClick={openBundleCreate}
            sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
          >
            Add Bundle · เพิ่มแพ็คเกจ
          </Button>
        </SectionCard>

        {/* 🆕 Round 28r59 (Phase 4 feature #4 "A/B analytics") — Usage
            stats table now includes redemption count, total discount ฿
            granted, avg ticket, and a simple "drives N/mo · ฿X ticket"
            line so admin can compare active codes at a glance. */}
        <SectionCard icon={<ChartBar size={13} weight="bold" />} title="Usage Stats · สถิติการใช้งาน">
          <Typography sx={{ fontSize: 11.5, color: adminColor.muted, mb: 1 }}>
            จากออเดอร์จริงล่าสุด (สูงสุด 1,000 รายการ) — เทียบกับค่าเฉลี่ยทั้งเว็บ
          </Typography>
          {abStats && (
            <Box sx={{ p: "8px 10px", mb: 1, borderRadius: "8px", background: adminColor.panel2, display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Baseline · ไม่มีโค้ด</Typography>
                <Typography sx={{ ...adminFigureSx, fontSize: 13, fontWeight: 700, color: adminColor.text }}>฿{abStats.avgWithoutDiscount.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>With code · เฉลี่ย</Typography>
                <Typography sx={{ ...adminFigureSx, fontSize: 13, fontWeight: 700, color: adminColor.text }}>฿{abStats.avgWithDiscount.toLocaleString()}</Typography>
              </Box>
            </Box>
          )}
          {usageLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}><CircularProgress size={20} sx={{ color: adminColor.accent }} /></Box>
          ) : Object.keys(usage).length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted }}>ยังไม่มีออเดอร์ที่ใช้โค้ดส่วนลด</Typography>
          ) : (
            <Box sx={{ overflow: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ "& th": { textAlign: "left", py: 0.75, px: 1, color: adminColor.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${adminColor.line}` } }}>
                    <Box component="th">Code</Box>
                    <Box component="th" sx={{ textAlign: "right !important" }}>Redeems</Box>
                    <Box component="th" sx={{ textAlign: "right !important" }}>Total ลด</Box>
                    <Box component="th" sx={{ textAlign: "right !important" }}>Avg / order</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {Object.entries(usage).sort((a, b) => b[1].count - a[1].count).map(([code, s]) => {
                    const avgPer = s.count > 0 ? Math.round(s.totalDiscount / s.count) : 0;
                    return (
                      <Box key={code} component="tr" sx={{ "& td": { py: 0.75, px: 1, borderBottom: `1px solid ${adminColor.line}` } }}>
                        <Box component="td" sx={{ fontWeight: 700, color: adminColor.text }}>{code}</Box>
                        <Box component="td" sx={{ ...adminFigureSx, textAlign: "right !important", color: adminColor.text }}>{s.count}</Box>
                        <Box component="td" sx={{ ...adminFigureSx, textAlign: "right !important", color: adminColor.muted }}>฿{s.totalDiscount.toLocaleString()}</Box>
                        <Box component="td" sx={{ ...adminFigureSx, textAlign: "right !important", color: adminColor.muted }}>฿{avgPer.toLocaleString()}</Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </SectionCard>

        {/* 🆕 Round 28r59 (Phase 4 feature #5 "Discount validator preview")
            — sandbox for verifying a code before sharing. Uses the debug
            variant of validateDiscount so failed attempts return a reason
            string, not just a silent NULL_RESULT. */}
        <SectionCard icon={<Flask size={13} weight="bold" />} title="Test a Code · ทดสอบโค้ด">
          <Typography sx={{ fontSize: 11.5, color: adminColor.muted, mb: 1 }}>
            ทดสอบว่าโค้ดจะใช้ได้กับบริการ/ช่วงเวลาไหน โดยไม่ต้องเปิดหน้าจอง
          </Typography>
          <TextField
            fullWidth label="Code · โค้ด" placeholder="FIRST10 · SUN-ABCD · WELCOME20…"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
          />
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              select fullWidth label="Service · บริการ"
              value={testServiceId}
              onChange={(e) => setTestServiceId(e.target.value)}
              sx={fieldSx} SelectProps={selectMenuProps}
            >
              <MenuItem value="">(ไม่ระบุ · any)</MenuItem>
              {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              {customSvcRows.map((r) => <MenuItem key={r.id} value={r.id}>{r.name} · custom</MenuItem>)}
            </TextField>
            <TextField
              select fullWidth label="Duration · ช่วงเวลา"
              value={testDuration} onChange={(e) => setTestDuration(Number(e.target.value) as 60 | 90 | 120)}
              sx={fieldSx} SelectProps={selectMenuProps}
            >
              {[60, 90, 120].map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              fullWidth type="number" label="Taxi (km) · ระยะทาง"
              value={testTaxiKm}
              onChange={(e) => setTestTaxiKm(Math.max(0, Number(e.target.value)))}
              sx={fieldSx}
              helperText="ใช้กับ FREETAXI เท่านั้น"
            />
            <TextField
              fullWidth type="number" label="Hour (BKK) · ชั่วโมง"
              value={testHour}
              onChange={(e) => setTestHour(Math.max(0, Math.min(23, Number(e.target.value))))}
              sx={fieldSx}
              helperText="0–23 · ใช้กับ TONIGHT500"
            />
          </Stack>
          <TextField
            fullWidth type="number" label="Referral redeems · จำนวนการใช้ก่อนหน้า"
            value={testReferralRedeems}
            onChange={(e) => setTestReferralRedeems(Math.max(0, Number(e.target.value)))}
            sx={{ ...fieldSx, mb: 1.5 }}
            helperText="ใช้กับ SUN-XXXX + tiers เท่านั้น (จำลอง N ครั้งที่โค้ดถูกใช้)"
          />
          {(() => {
            const svc = [...services, ...customSvcRows].find((s) => s.id === testServiceId);
            const basePrice = svc ? (
              testDuration === 60 ? (svcRows.find((r) => r.id === svc.id)?.p60 ?? customSvcRows.find((r) => r.id === svc.id)?.p60 ?? priceForDuration(svc as MassageService, 60))
              : testDuration === 90 ? (svcRows.find((r) => r.id === svc.id)?.p90 ?? customSvcRows.find((r) => r.id === svc.id)?.p90 ?? priceForDuration(svc as MassageService, 90))
              : (svcRows.find((r) => r.id === svc.id)?.p120 ?? customSvcRows.find((r) => r.id === svc.id)?.p120 ?? priceForDuration(svc as MassageService, 120))
            ) : 2000;
            // rough taxi baseline: 45 base + 10/km
            const taxi = testTaxiKm > 0 ? Math.round(45 + testTaxiKm * 10) : 0;
            const debug = validateDiscountDebug(testCode, basePrice, {
              bookingHourBKK: testHour,
              serviceId: testServiceId || null,
              taxiFareTHB: taxi,
              referralRedeemCount: testReferralRedeems,
            });
            return (
              <Box sx={{
                p: "10px 12px", borderRadius: "10px",
                background: debug.valid ? `${adminColor.green}12` : `${adminColor.red}12`,
                border: `1px solid ${debug.valid ? adminColor.green : adminColor.red}55`,
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <ShieldCheck size={14} weight="bold" color={debug.valid ? adminColor.green : adminColor.red} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: debug.valid ? adminColor.green : adminColor.red }}>
                    {debug.valid ? "VALID" : "INVALID"}
                  </Typography>
                  {debug.code && (
                    <Typography sx={{ fontSize: 11.5, color: adminColor.dim, fontFamily: "monospace" }}>· {debug.code}</Typography>
                  )}
                </Box>
                {debug.valid ? (
                  <>
                    <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.text }}>
                      −฿{debug.amount.toLocaleString()} <span style={{ fontSize: 11.5, color: adminColor.dim, fontWeight: 400 }}>· {debug.label}</span>
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: 0.5 }}>
                      Base ฿{basePrice.toLocaleString()} · taxi ฿{taxi.toLocaleString()} · type {debug.type}
                    </Typography>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 12, color: adminColor.muted }}>
                    เหตุผล: {debug.reason}
                  </Typography>
                )}
              </Box>
            );
          })()}
        </SectionCard>

        {/* 🆕 Round 28r59 (Phase 4 feature #3 "Historical price log") —
            filtered auditLogs view. Reuses the collection already
            populated by logAdminAction on every service / promo /
            bundle write since 28s234. */}
        <SectionCard icon={<ClockCounterClockwise size={13} weight="bold" />} title="Change History · ประวัติการแก้ไข">
          <Typography sx={{ fontSize: 11.5, color: adminColor.muted, mb: 1 }}>
            การแก้ราคา / โค้ด / บริการ / bundle 200 รายการล่าสุด
          </Typography>
          <TextField
            fullWidth size="small" placeholder="ค้นหา (code, actor, action)…"
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <MagnifyingGlass size={14} color={adminColor.dim} style={{ marginRight: 6 }} />
              ),
            }}
          />
          {auditLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}><CircularProgress size={20} sx={{ color: adminColor.accent }} /></Box>
          ) : auditRows.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted }}>ยังไม่มีประวัติการแก้ไข</Typography>
          ) : (
            <Stack spacing={0.5} sx={{ maxHeight: 320, overflow: "auto" }}>
              {auditRows
                .filter((r) => {
                  const q = auditSearch.trim().toLowerCase();
                  if (!q) return true;
                  const detailStr = JSON.stringify(r.detail).toLowerCase();
                  return (
                    r.action.toLowerCase().includes(q) ||
                    (r.actorEmail ?? "").toLowerCase().includes(q) ||
                    detailStr.includes(q)
                  );
                })
                .map((r) => {
                  const when = r.at?.toDate?.().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) ?? "—";
                  const detailSummary = Object.entries(r.detail)
                    .filter(([k]) => k !== "changedFields")
                    .slice(0, 2)
                    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                    .join(" · ");
                  const changed = Array.isArray((r.detail as { changedFields?: unknown }).changedFields)
                    ? ((r.detail as { changedFields: unknown[] }).changedFields).slice(0, 3).join(", ")
                    : null;
                  return (
                    <Box key={r.id} sx={{ p: "6px 10px", borderRadius: "6px", background: adminColor.panel2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "flex-start" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: adminColor.text, fontFamily: "monospace" }}>
                          {r.action}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: adminColor.dim, flexShrink: 0 }}>{when}</Typography>
                      </Box>
                      {(detailSummary || changed) && (
                        <Typography sx={{ fontSize: 11, color: adminColor.muted, mt: 0.25, wordBreak: "break-word" }}>
                          {changed ? `changed: ${changed}` : detailSummary}
                        </Typography>
                      )}
                      {r.actorEmail && (
                        <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: 0.25 }}>{r.actorEmail}</Typography>
                      )}
                    </Box>
                  );
                })}
            </Stack>
          )}
        </SectionCard>
      </Box>

      {/* Add custom code dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>Create Code · สร้างโค้ดใหม่</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus label="โค้ด" placeholder="เช่น NEWYEAR2026" value={addCode}
            onChange={(e) => setAddCode(e.target.value)} sx={{ ...fieldSx, mb: 1.5, mt: 1 }} />
          {/* 🆕 Round 28r48 (audit) — SelectProps.MenuProps for `<TextField select>` (28s265 pattern);
              without it, the popover uses theme.ts's translucent paper and page content bleeds through. */}
          <TextField select fullWidth label="ประเภท" value={addType} onChange={(e) => setAddType(e.target.value as "percent" | "fixed")} sx={{ ...fieldSx, mb: 1.5 }} SelectProps={selectMenuProps}>
            <MenuItem value="fixed">ลดคงที่ (บาท)</MenuItem>
            <MenuItem value="percent">ลดเปอร์เซ็นต์</MenuItem>
          </TextField>
          <TextField
            fullWidth type="number" label={addType === "percent" ? "ลด (%)" : "ลด (บาท)"} value={addAmount}
            onChange={(e) => setAddAmount(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }}
          />
          {addType === "percent" && (
            <TextField fullWidth type="number" label="ลดสูงสุด (บาท)" value={addCap}
              onChange={(e) => setAddCap(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }} />
          )}
          <TextField fullWidth label="ข้อความที่ลูกค้าเห็น (ไม่บังคับ)" value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />

          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 1, mb: 0.5 }}>
            เงื่อนไข (ไม่บังคับ)
          </Typography>
          <TextField fullWidth type="number" label="ยอดขั้นต่ำ (บาท)" helperText="0 = ไม่กำหนด" value={addMinSpend}
            onChange={(e) => setAddMinSpend(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }} />
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField fullWidth type="number" label="จำกัดจำนวนครั้งรวม" helperText="0 = ไม่จำกัด" value={addMaxRedemptions}
              onChange={(e) => setAddMaxRedemptions(Math.max(0, Number(e.target.value)))} sx={fieldSx} />
            <TextField fullWidth type="number" label="ครั้ง/เบอร์" helperText="0 = ไม่จำกัด" value={addPerPhone}
              onChange={(e) => setAddPerPhone(Math.max(0, Number(e.target.value)))} sx={fieldSx} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth type="date" label="วันเริ่ม" InputLabelProps={{ shrink: true }} value={addStart}
              onChange={(e) => setAddStart(e.target.value)} sx={fieldSx} />
            <TextField fullWidth type="date" label="วันหมดอายุ" InputLabelProps={{ shrink: true }} value={addExpiry}
              onChange={(e) => setAddExpiry(e.target.value)} sx={fieldSx} />
          </Stack>
          {/* 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") —
              activation schedule for this custom code. Distinct from
              วันเริ่ม above (that gates guest eligibility inside
              validateDiscount; this hides the code entirely until the
              picked minute). Empty = active immediately. */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 2, mb: 0.5 }}>
            Activate on · ตั้งเวลาเปิดใช้
          </Typography>
          <TextField
            fullWidth type="datetime-local" label="เปิดใช้เมื่อ" InputLabelProps={{ shrink: true }}
            value={addScheduledFor} onChange={(e) => setAddScheduledFor(e.target.value)}
            sx={{ ...fieldSx, mt: 0.5 }}
            helperText="ว่าง = เปิดทันที · ตั้งเวลาแล้วจะเปิดโดยอัตโนมัติภายใน ~1 นาทีของเวลาที่ตั้ง"
          />

          {/* 🆕 Round 28r59 (Phase 4 feature #2 "Revenue impact preview")
              — projected monthly cost + upside based on last-30-day
              baseline. Attach rate hardcoded 20% (MVP). Shows only when
              baseline stats have loaded. */}
          {baseline && baseline.completedCount > 0 && (
            <Box sx={{ mt: 2, p: "10px 12px", borderRadius: "10px", background: `${adminColor.accent}0F`, border: `1px solid ${adminColor.accent}33` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                <TrendUp size={13} weight="bold" color={adminColor.accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.accent }}>
                  Projected impact · ผลกระทบต่อรายได้
                </Typography>
              </Box>
              {(() => {
                const attach = 0.20;
                const monthly = Math.round(baseline.bookingsPerDay * 30 * attach);
                const perOrder =
                  addType === "percent"
                    ? Math.min(addCap, Math.round((baseline.avgServicePrice * addAmount) / 100))
                    : addAmount;
                const cost = Math.round(monthly * perOrder);
                return (
                  <Typography sx={{ fontSize: 12, color: adminColor.text, lineHeight: 1.5 }}>
                    ประเมิน <strong>{monthly} จอง/เดือน</strong> ใช้โค้ดนี้ (สมมติ 20% attach) → ลด ~<strong>฿{cost.toLocaleString()}</strong> รวม
                    <br />
                    <span style={{ fontSize: 10.5, color: adminColor.dim }}>
                      อ้างอิงงานเสร็จ 30 วันล่าสุด · avg ฿{baseline.avgServicePrice.toLocaleString()} · {baseline.completedCount} orders
                    </span>
                  </Typography>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleAddCustom()} variant="contained" disabled={addSubmitting || !addCode.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {addSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Create · สร้าง"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>Delete Code · ลบโค้ด?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>
            <strong>{deleteTarget?.id}</strong> จะใช้จองไม่ได้อีกทันที (สถิติการใช้งานเดิมไม่หาย เพราะเก็บอยู่ที่ booking แต่ละรายการ)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel · ยกเลิก</Button>
          <Button onClick={() => void handleDelete()} variant="contained" disabled={deleteSubmitting} sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700 }}>
            {deleteSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Delete · ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28s299 — share link + QR. The QR is rendered by a
          public image API (goqr.me) — CSP allows img-src https:, so no
          library/bundle cost; the payload is only a public promo URL, no
          secrets. If admin has promos OFF, the link still works the
          moment she turns them on. */}
      <Dialog open={!!shareCode} onClose={() => setShareCode(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Share Code · แชร์ {shareCode}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
            ลูกค้าที่เปิดลิงก์นี้จะได้โค้ดใส่ให้อัตโนมัติตอนจอง
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
            {shareUrl && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`}
                alt={`QR ${shareCode}`}
                width={200}
                height={200}
                style={{ borderRadius: 12, border: `1px solid ${adminColor.line}` }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, background: adminColor.panel2, border: `1px solid ${adminColor.line}`, borderRadius: "10px", p: "9px 12px" }}>
            <Typography sx={{ fontSize: 12, color: adminColor.text, wordBreak: "break-all", flex: 1 }}>{shareUrl}</Typography>
            <Button onClick={() => void copyShare()} size="small" sx={{ color: adminColor.accent, minWidth: "auto", p: "4px", flexShrink: 0 }} aria-label="Copy">
              <Copy size={16} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareCode(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>Close · ปิด</Button>
          <Button onClick={() => void copyShare()} variant="contained" startIcon={<Copy size={15} />}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}>
            Copy Link · คัดลอก
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28s301 — add a brand-new custom service */}
      <Dialog open={addSvcOpen} onClose={() => setAddSvcOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>Add Service · เพิ่มบริการ</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, mt: 0.5 }}>
            <Box
              component="label"
              sx={{ width: 64, height: 64, borderRadius: "12px", flexShrink: 0, cursor: "pointer", overflow: "hidden", border: `1px dashed ${adminColor.line2}`, background: adminColor.panel2, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              {addSvcUploading ? <CircularProgress size={20} sx={{ color: adminColor.accent }} />
                : addSvcImage ? <img src={addSvcImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Camera size={22} color={adminColor.dim} />}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadSvcImage(f); }} />
            </Box>
            <Typography sx={{ fontSize: 12, color: adminColor.muted }}>แตะเพื่ออัปโหลดรูป (ไม่บังคับ)</Typography>
          </Box>
          <TextField fullWidth autoFocus label="ชื่อบริการ" value={addSvcName} onChange={(e) => setAddSvcName(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />
          <TextField fullWidth label="คำอธิบายสั้น (ไม่บังคับ)" value={addSvcDesc} onChange={(e) => setAddSvcDesc(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />
          <TextField select fullWidth label="ป้าย" value={addSvcBadge} onChange={(e) => setAddSvcBadge(e.target.value as MassageService["badge"])} sx={{ ...fieldSx, mb: 1.5 }} SelectProps={selectMenuProps}>
            {BADGE_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth type="number" label="60 น." value={addSvcP60} onChange={(e) => setAddSvcP60(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
            <TextField fullWidth type="number" label="90 น." value={addSvcP90} onChange={(e) => setAddSvcP90(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
            <TextField fullWidth type="number" label="120 น." value={addSvcP120} onChange={(e) => setAddSvcP120(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
          </Stack>
          {/* 🆕 Round 28r50 (feature #2) — schedule this new custom
              service to appear in the catalog automatically at a future
              time. Empty = live immediately on Save. */}
          <TextField
            fullWidth type="datetime-local" label="เปิดใช้เมื่อ (ไม่บังคับ)" InputLabelProps={{ shrink: true }}
            value={addSvcScheduledFor} onChange={(e) => setAddSvcScheduledFor(e.target.value)}
            sx={{ ...fieldSx, mt: 1.5 }}
            helperText="ว่าง = ปรากฏในเมนูทันที · ตั้งเวลาแล้วจะปรากฏโดยอัตโนมัติ"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSvcOpen(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleAddCustomService()} variant="contained" disabled={addSvcSubmitting || addSvcUploading || !addSvcName.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {addSvcSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Add · เพิ่ม"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28s302 — edit a standard service's photo + detail-page copy */}
      <Dialog open={!!detailsRow} onClose={() => setDetailsId(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Details · {detailsRow?.name}
        </DialogTitle>
        {detailsRow && (
          <DialogContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, mt: 0.5 }}>
              <Box component="label" sx={{ width: 72, height: 72, borderRadius: "12px", flexShrink: 0, cursor: "pointer", overflow: "hidden", border: `1px dashed ${adminColor.line2}`, background: adminColor.panel2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {detailsUploading ? <CircularProgress size={20} sx={{ color: adminColor.accent }} />
                  : detailsRow.image ? <img src={detailsRow.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Camera size={22} color={adminColor.dim} />}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadDetailsImage(f); }} />
              </Box>
              <Typography sx={{ fontSize: 12, color: adminColor.muted }}>แตะเพื่อเปลี่ยนรูปบริการ</Typography>
            </Box>
            <TextField
              fullWidth multiline minRows={3} label="รายละเอียด (โชว์หน้าบริการ)" value={detailsRow.detail}
              onChange={(e) => setSvcField(detailsRow.id, { detail: e.target.value })} sx={{ ...fieldSx, mb: 2 }}
            />
            <TextField
              fullWidth multiline minRows={4} label="จุดเด่น (บรรทัดละ 1 ข้อ)" value={detailsRow.benefit}
              onChange={(e) => setSvcField(detailsRow.id, { benefit: e.target.value })} sx={fieldSx}
              helperText="แต่ละบรรทัด = 1 bullet บนหน้าบริการ"
            />
            {/* 🆕 Round 28r103 (founder 2026-07-13 — "ป้าย ใช้งานไม่ได้ใน
                หน้าแอดมิน") — badge dropdown for standard services (was
                only editable on custom services).  ServicesPage renders
                the amber pill on the Bestseller featured card and the
                rose pill on mini cards using this value. */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 2, mb: 0.5 }}>
              Badge · ป้าย
            </Typography>
            <TextField
              select fullWidth label="ป้ายที่โชว์บนการ์ด"
              value={detailsRow.badge ?? "SIGNATURE"}
              onChange={(e) => setSvcField(detailsRow.id, { badge: e.target.value as MassageService["badge"] })}
              sx={{ ...fieldSx, mb: 2 }}
              helperText="เลือกป้ายที่จะโชว์บนการ์ด · SIGNATURE = amber bestseller pill · อื่นๆ = rose"
            >
              <MenuItem value="SIGNATURE">SIGNATURE (bestseller · amber)</MenuItem>
              <MenuItem value="POPULAR">POPULAR</MenuItem>
              <MenuItem value="RECOMMEND">RECOMMEND</MenuItem>
              <MenuItem value="EXCLUSIVE">EXCLUSIVE</MenuItem>
            </TextField>
            {/* 🆕 Round 28r50 (feature #2) — schedule this whole override
                (image/detail/benefit AND the price fields typed in the
                main list) to go live at a future time. Empty = live on
                the next Save. Row shows a SCHED badge while queued. */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 2, mb: 0.5 }}>
              Activate on · ตั้งเวลาเปิดใช้
            </Typography>
            <TextField
              fullWidth type="datetime-local" label="เปิดใช้เมื่อ"
              InputLabelProps={{ shrink: true }}
              value={detailsScheduledFor}
              onChange={(e) => {
                const v = e.target.value;
                setDetailsScheduledFor(v);
                setSvcField(detailsRow.id, { scheduledForMs: inputDTToMs(v) });
              }}
              sx={fieldSx}
              helperText="ว่าง = เปิดทันที · ตั้งเวลาแล้วจะเปิดโดยอัตโนมัติภายใน ~1 นาทีของเวลาที่ตั้ง"
            />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDetailsId(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>Close · เสร็จ</Button>
          <Button onClick={() => { setDetailsId(null); void handleSaveServices(); }} variant="contained"
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}>
            Save · บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม
          เอาออกจากทุกที่ที่มี") — the "Add Add-on" dialog (28s302) has
          been removed. */}

      {/* 🆕 Round 28r49 — Edit a built-in code (per-code override into
          publicRules.builtinCodeOverrides). The visible fields depend on
          the code's type — percent codes show %+cap, fixed codes show
          amount, FREETAXI's amount field is hidden with an explanatory
          notice since the discount equals the actual taxi fare. */}
      <Dialog open={!!builtinEditCode} onClose={() => setBuiltinEditCode(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Edit Built-in · แก้ไข {builtinEditCode}
        </DialogTitle>
        {(() => {
          const meta = BUILTIN_CODES.find((b) => b.code === builtinEditCode);
          if (!meta) return null;
          return (
            <DialogContent>
              <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5, mt: 0.5 }}>
                ค่าเริ่มต้น: {meta.kind === "percent" ? `${meta.defaultAmount}% (สูงสุด ฿${meta.defaultCap ?? "—"})` : meta.kind === "fixed" ? `฿${meta.defaultAmount}` : "= ค่าเดินทางจริง"}
              </Typography>
              {meta.kind === "percent" && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <TextField
                    fullWidth type="number" label="ลด (%)"
                    value={builtinEditAmount}
                    onChange={(e) => setBuiltinEditAmount(e.target.value)}
                    sx={fieldSx}
                    helperText="ว่าง = ใช้ค่าเริ่มต้น"
                  />
                  <TextField
                    fullWidth type="number" label="ลดสูงสุด (บาท)"
                    value={builtinEditCap}
                    onChange={(e) => setBuiltinEditCap(e.target.value)}
                    sx={fieldSx}
                    helperText="ว่าง = ใช้ค่าเริ่มต้น"
                  />
                </Stack>
              )}
              {meta.kind === "fixed" && (
                <TextField
                  fullWidth type="number" label="ลด (บาท)"
                  value={builtinEditAmount}
                  onChange={(e) => setBuiltinEditAmount(e.target.value)}
                  sx={{ ...fieldSx, mb: 1.5 }}
                  helperText="ว่าง = ใช้ค่าเริ่มต้น"
                />
              )}
              {meta.kind === "freetaxi" && (
                <Box sx={{ mb: 1.5, p: "10px 12px", borderRadius: "10px", background: `${adminColor.accent}12`, color: adminColor.muted, fontSize: 12 }}>
                  จำนวนที่ลด = ค่าเดินทางจริงของงานนั้น — แก้ไขไม่ได้
                </Box>
              )}
              <TextField
                fullWidth type="number" label="ยอดขั้นต่ำ (บาท)"
                value={builtinEditMinSpend}
                onChange={(e) => setBuiltinEditMinSpend(e.target.value)}
                sx={{ ...fieldSx, mb: 1.5 }}
                helperText="ว่าง = ไม่มีขั้นต่ำ"
              />
              <TextField
                fullWidth label="ข้อความที่ลูกค้าเห็น (ไม่บังคับ)"
                value={builtinEditLabel}
                onChange={(e) => setBuiltinEditLabel(e.target.value)}
                sx={{ ...fieldSx, mb: 1.5 }}
                helperText="ว่าง = ใช้ข้อความเริ่มต้น"
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth type="date" label="วันเริ่ม" InputLabelProps={{ shrink: true }}
                  value={builtinEditStart}
                  onChange={(e) => setBuiltinEditStart(e.target.value)}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth type="date" label="วันหมดอายุ" InputLabelProps={{ shrink: true }}
                  value={builtinEditExpiry}
                  onChange={(e) => setBuiltinEditExpiry(e.target.value)}
                  sx={fieldSx}
                />
              </Stack>
              {/* 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft
                  Mode") — schedule this override's ACTIVATION. Distinct
                  from วันเริ่ม above (which gates guest eligibility once
                  the override IS live): scheduledFor sits the override
                  ITSELF dormant, so the code runs on hardcoded defaults
                  until then. Empty = active on Save. */}
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 2, mb: 0.5 }}>
                Activate on · ตั้งเวลาเปิดใช้
              </Typography>
              <TextField
                fullWidth type="datetime-local" label="เปิดใช้เมื่อ" InputLabelProps={{ shrink: true }}
                value={builtinEditScheduledFor}
                onChange={(e) => setBuiltinEditScheduledFor(e.target.value)}
                sx={fieldSx}
                helperText="ว่าง = เปิดทันที · ตั้งเวลาแล้วจะเปิดโดยอัตโนมัติภายใน ~1 นาที"
              />

              {/* 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system")
                  — only shown on the REFERRAL pseudo-code. Each tier says:
                  "if the SAME SUN-XXXX has been used ≥ minRedeems times,
                  award this amount." Highest matching tier wins in
                  validateDiscount. Empty list → flat referral discount. */}
              {meta.code === "REFERRAL" && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.5 }}>
                    Tiers · ระดับตามจำนวนแนะนำ
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: adminColor.muted, mb: 1 }}>
                    ยิ่งโค้ดของคนแนะนำถูกใช้มาก ยิ่งได้ลดมาก · ถ้าไม่ตั้ง = ลดคงที่ตามค่าเริ่มต้น
                  </Typography>
                  <Stack spacing={1}>
                    {builtinEditTiers.map((t, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <TextField
                          type="number" size="small" label="ครั้งขั้นต่ำ" value={t.minRedeems}
                          onChange={(e) => setBuiltinEditTiers((rows) => rows.map((r, idx) => idx === i ? { ...r, minRedeems: Math.max(0, Number(e.target.value)) } : r))}
                          sx={{ ...fieldSx, flex: 1 }}
                        />
                        <TextField
                          type="number" size="small" label="ลด (฿)" value={t.amount}
                          onChange={(e) => setBuiltinEditTiers((rows) => rows.map((r, idx) => idx === i ? { ...r, amount: Math.max(0, Number(e.target.value)) } : r))}
                          sx={{ ...fieldSx, flex: 1 }}
                        />
                        <TextField
                          size="small" label="ข้อความ (ไม่บังคับ)" value={t.label ?? ""}
                          onChange={(e) => setBuiltinEditTiers((rows) => rows.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r))}
                          sx={{ ...fieldSx, flex: 1.4 }}
                        />
                        <Button
                          size="small" onClick={() => setBuiltinEditTiers((rows) => rows.filter((_, idx) => idx !== i))}
                          sx={{ color: adminColor.red, minWidth: "auto", p: "4px" }} aria-label="Remove tier"
                        >
                          <Trash size={15} />
                        </Button>
                      </Stack>
                    ))}
                    <Button
                      size="small" variant="outlined" startIcon={<Plus size={13} weight="bold" />}
                      onClick={() => setBuiltinEditTiers((rows) => [...rows, { minRedeems: rows.length === 0 ? 3 : (rows[rows.length - 1].minRedeems + 3), amount: rows.length === 0 ? 300 : (rows[rows.length - 1].amount + 100) }])}
                      sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "8px", alignSelf: "flex-start" }}
                    >
                      Add tier · เพิ่มระดับ
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* 🆕 Round 28r59 (feature #2 "Revenue impact preview") —
                  same 20%-attach model as the create dialog. Uses the
                  effective per-order amount (percent × avg or fixed). */}
              {baseline && baseline.completedCount > 0 && (
                <Box sx={{ mt: 2, p: "10px 12px", borderRadius: "10px", background: `${adminColor.accent}0F`, border: `1px solid ${adminColor.accent}33` }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <TrendUp size={13} weight="bold" color={adminColor.accent} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.accent }}>
                      Projected impact · ผลกระทบต่อรายได้
                    </Typography>
                  </Box>
                  {(() => {
                    const attach = 0.20;
                    const monthly = Math.round(baseline.bookingsPerDay * 30 * attach);
                    const amt = Number(builtinEditAmount);
                    const cap = Number(builtinEditCap);
                    const perOrder = meta.kind === "percent" && Number.isFinite(amt)
                      ? Math.min(Number.isFinite(cap) && cap > 0 ? cap : Infinity, Math.round((baseline.avgServicePrice * amt) / 100))
                      : meta.kind === "fixed" && Number.isFinite(amt)
                        ? amt
                        : 0;
                    const cost = Math.round(monthly * perOrder);
                    return (
                      <Typography sx={{ fontSize: 12, color: adminColor.text, lineHeight: 1.5 }}>
                        ประเมิน <strong>{monthly} จอง/เดือน</strong> ใช้โค้ดนี้ (สมมติ 20% attach) → ลด ~<strong>฿{cost.toLocaleString()}</strong> รวม
                        <br />
                        <span style={{ fontSize: 10.5, color: adminColor.dim }}>
                          อ้างอิงงานเสร็จ 30 วันล่าสุด · avg ฿{baseline.avgServicePrice.toLocaleString()} · {baseline.completedCount} orders
                        </span>
                      </Typography>
                    );
                  })()}
                </Box>
              )}
            </DialogContent>
          );
        })()}
        <DialogActions>
          <Button onClick={() => setBuiltinEditCode(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleSaveBuiltinEdit()} variant="contained" disabled={builtinEditSubmitting}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {builtinEditSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Save · บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r49 — Delete-a-built-in confirm. Soft-delete via
          `deleted: true` on the override so it can be restored without
          losing any prior amount/label edits. */}
      <Dialog open={!!builtinDeleteCode} onClose={() => setBuiltinDeleteCode(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Delete Built-in · ลบ {builtinDeleteCode}?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>
            <strong>{builtinDeleteCode}</strong> จะใช้จองไม่ได้ทันที กู้คืนได้ภายหลังจากปุ่ม Restore
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuiltinDeleteCode(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleDeleteBuiltin()} variant="contained" disabled={builtinDeleteSubmitting}
            sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700 }}
          >
            {builtinDeleteSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Delete · ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r50 (feature #1 "Bundle Packages") — create/edit dialog. */}
      <Dialog open={bundleDialogOpen} onClose={() => setBundleDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          {editingBundleId ? "Edit Bundle · แก้ไขแพ็คเกจ" : "Add Bundle · เพิ่มแพ็คเกจ"}
        </DialogTitle>
        <DialogContent>
          {/* 🆕 Round 28r60 — hero image uploader. Same downscale + lazy
              firebase/storage pattern as the therapist AvatarUploader
              (28s280-281). Optional — skipping renders the text-only
              customer card variant. */}
          <input
            ref={bundleImageInputRef} type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => void handleBundleImageUpload(e.target.files?.[0])}
          />
          <Box
            onClick={() => !bundleImageUploading && bundleImageInputRef.current?.click()}
            sx={{
              display: "flex", alignItems: "center", gap: 1.25, mt: 1, mb: 1.5,
              p: "10px 12px", borderRadius: "12px", cursor: bundleImageUploading ? "wait" : "pointer",
              background: adminColor.panel2, border: `1px dashed ${adminColor.line2}`,
              transition: "border-color .15s ease, background .15s ease",
              "&:hover": bundleImageUploading ? {} : { borderColor: adminColor.accent, background: `${adminColor.accent}0A` },
            }}
          >
            {bundleImageUrl ? (
              <Avatar src={bundleImageUrl} variant="rounded" sx={{ width: 58, height: 58, borderRadius: "10px", border: `1px solid ${adminColor.line}` }} />
            ) : (
              <Box sx={{ width: 58, height: 58, borderRadius: "10px", background: adminColor.panel3, display: "flex", alignItems: "center", justifyContent: "center", color: adminColor.dim }}>
                <Camera size={22} weight="fill" />
              </Box>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: adminColor.text }}>
                {bundleImageUploading ? "กำลังอัปโหลด…" : bundleImageUrl ? "รูปหน้าปกแพ็คเกจ" : "อัปโหลดรูปหน้าปก · Hero image"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: adminColor.dim }}>
                {bundleImageUrl ? "แตะเพื่อเปลี่ยน" : "อัตราส่วน 16:9 · ไม่บังคับ (จะแสดง card แบบข้อความอย่างเดียว)"}
              </Typography>
            </Box>
            {bundleImageUrl && !bundleImageUploading && (
              <Button
                size="small" variant="text"
                onClick={(e) => { e.stopPropagation(); setBundleImageUrl(""); }}
                sx={{ color: adminColor.red, fontWeight: 700, textTransform: "none", minWidth: "auto" }}
              >
                Remove
              </Button>
            )}
            {bundleImageUploading && <CircularProgress size={18} sx={{ color: adminColor.accent }} />}
          </Box>

          <TextField
            fullWidth autoFocus label="Bundle name · ชื่อแพ็คเกจ"
            placeholder="เช่น Weekly Ritual · 3 sessions"
            value={bundleName} onChange={(e) => setBundleName(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
          />

          {/* 🆕 Round 28r60 — Category tag: Autocomplete freeSolo backed by
              BUNDLE_CATEGORY_TAGS. Admin can pick a suggestion OR type any
              custom label; the pill it renders on the customer card is
              i18n-passthrough. */}
          <Autocomplete
            freeSolo fullWidth
            options={BUNDLE_CATEGORY_TAGS}
            value={bundleCategoryTag}
            onChange={(_, v) => setBundleCategoryTag(v ?? "")}
            onInputChange={(_, v) => setBundleCategoryTag(v)}
            renderInput={(params) => (
              <TextField
                {...params} label="Category tag · หมวดหมู่ (ไม่บังคับ)"
                placeholder="เช่น Weekly Ritual"
                sx={{ ...fieldSx, mb: 1.5 }}
              />
            )}
            componentsProps={{ paper: { sx: { background: adminColor.panel, border: `1px solid ${adminColor.line}` } } }}
          />

          {/* 🆕 Round 28r60 — Subtitle: short descriptor line shown under
              the name on the customer card. */}
          <TextField
            fullWidth label="Subtitle · คำโปรย (ไม่บังคับ)"
            placeholder="เช่น 3 sessions over 30 days"
            value={bundleSubtitle} onChange={(e) => setBundleSubtitle(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
          />

          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              select fullWidth label="จำนวนครั้ง · Sessions"
              value={bundleSessionCount} onChange={(e) => setBundleSessionCount(Number(e.target.value))}
              sx={fieldSx} SelectProps={selectMenuProps}
            >
              {[3, 5, 10].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
            <TextField
              select fullWidth label="ส่วนลด (%) · Discount"
              value={bundleDiscountPct} onChange={(e) => setBundleDiscountPct(Number(e.target.value))}
              sx={fieldSx} SelectProps={selectMenuProps}
            >
              {[5, 10, 15, 20, 25].map((p) => <MenuItem key={p} value={p}>{p}%</MenuItem>)}
            </TextField>
          </Stack>
          <TextField
            select fullWidth label="Service · บริการ"
            value={bundleServiceId} onChange={(e) => setBundleServiceId(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }} SelectProps={selectMenuProps}
          >
            <MenuItem value="">Any service · ทุกบริการ</MenuItem>
            {svcRows.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            {customSvcRows.map((r) => <MenuItem key={r.id} value={r.id}>{r.name} · custom</MenuItem>)}
          </TextField>
          <TextField
            fullWidth label="Sub-label (optional) · badge/แท็ก"
            placeholder="เช่น POPULAR / NEW"
            value={bundleLabel} onChange={(e) => setBundleLabel(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
          />
          <TextField
            fullWidth type="date" label="Expires on · วันหมดอายุ (ไม่บังคับ)" InputLabelProps={{ shrink: true }}
            value={bundleExpiresAt} onChange={(e) => setBundleExpiresAt(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
          />

          {/* Live preview */}
          <Box sx={{ mt: 1, p: "10px 12px", borderRadius: "10px", background: adminColor.panel2, border: `1px solid ${adminColor.line}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.5 }}>
              Preview · ตัวอย่าง
            </Typography>
            {bundlePreview.base > 0 ? (
              <>
                <Typography sx={{ fontSize: 12.5, color: adminColor.text }}>
                  {bundlePreview.cnt} × ฿{bundlePreview.base.toLocaleString()} = ฿{bundlePreview.gross.toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: adminColor.accent, fontWeight: 700 }}>
                  → ฿{bundlePreview.net.toLocaleString()} ({bundlePreview.pct}% off · save ฿{bundlePreview.discountAmt.toLocaleString()})
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: 0.5 }}>
                  based on {bundlePreview.baseLabel}
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 12, color: adminColor.dim }}>เพิ่มบริการก่อนเพื่อดูตัวอย่าง</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBundleDialogOpen(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleSaveBundle()} variant="contained"
            disabled={bundleSubmitting || !bundleName.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {bundleSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (editingBundleId ? "Save · บันทึก" : "Create · สร้าง")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r50 (feature #1) — bundle delete confirm. */}
      <Dialog open={!!bundleDeleteId} onClose={() => setBundleDeleteId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Delete Bundle · ลบแพ็คเกจ?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>
            {bundleDeleteId ? bundles[bundleDeleteId]?.name : ""} จะถูกลบทันที (ผู้ที่ซื้อแพ็คเกจไปแล้วไม่ได้รับผลกระทบ)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBundleDeleteId(null)}>Cancel · ยกเลิก</Button>
          <Button onClick={() => void handleDeleteBundle()} variant="contained" sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700 }}>
            Delete · ลบ
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r50 (feature #3 "Bulk Service Edits") — dialog. */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Bulk Adjust · ปรับราคายกชุด
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
            เลือกบริการ + วิธีปรับ + ช่วงเวลาที่จะใช้ → กด Apply เพื่อบันทึกใน 1 คำสั่ง
          </Typography>

          {/* Services multi-select */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.5 }}>
            Services · บริการ
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: "auto", border: `1px solid ${adminColor.line}`, borderRadius: "10px", mb: 1.5 }}>
            {bulkAllRows.map((r) => (
              <Box key={r.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, borderBottom: `1px solid ${adminColor.line}` }}>
                <Checkbox
                  checked={!!bulkSelected[r.id]}
                  onChange={(e) => setBulkSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                  size="small" sx={{ color: adminColor.accent, "&.Mui-checked": { color: adminColor.accent } }}
                />
                <Typography sx={{ fontSize: 13, color: adminColor.text, flex: 1 }}>{r.name}</Typography>
                <Typography sx={{ fontSize: 11, color: adminColor.dim }}>
                  60 ฿{r.p60.toLocaleString()} / 90 ฿{r.p90.toLocaleString()} / 120 ฿{r.p120.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Mode + value */}
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              select fullWidth label="Adjustment · วิธีปรับ"
              value={bulkMode} onChange={(e) => setBulkMode(e.target.value as BulkAdjustMode)}
              sx={fieldSx} SelectProps={selectMenuProps}
            >
              <MenuItem value="pct_down">− %</MenuItem>
              <MenuItem value="pct_up">+ %</MenuItem>
              <MenuItem value="thb_down">− ฿</MenuItem>
              <MenuItem value="thb_up">+ ฿</MenuItem>
              <MenuItem value="fixed">= ฿ (fixed)</MenuItem>
            </TextField>
            <TextField
              fullWidth type="number" label="Value · จำนวน"
              value={bulkValue} onChange={(e) => setBulkValue(Math.max(0, Number(e.target.value)))}
              sx={fieldSx}
            />
          </Stack>

          {/* Duration scope */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.5 }}>
            Apply to durations · ใช้กับช่วงเวลา
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
            {([["60 min", "d60"], ["90 min", "d90"], ["120 min", "d120"]] as const).map(([lbl, key]) => (
              <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={bulkScope[key]}
                  onChange={(e) => setBulkScope((s) => ({ ...s, [key]: e.target.checked }))}
                  sx={{ color: adminColor.accent, "&.Mui-checked": { color: adminColor.accent } }}
                />
                <Typography sx={{ fontSize: 13, color: adminColor.text }}>{lbl}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Optional scheduled activation */}
          <TextField
            fullWidth type="datetime-local" label="Activate on · เปิดใช้เมื่อ (ไม่บังคับ)" InputLabelProps={{ shrink: true }}
            value={bulkScheduledFor} onChange={(e) => setBulkScheduledFor(e.target.value)}
            sx={{ ...fieldSx, mb: 1.5 }}
            helperText="ว่าง = มีผลทันที · ตั้งเวลาแล้วจะปรับให้เองภายใน ~1 นาที"
          />

          {/* Live preview */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.5 }}>
            Preview · ตัวอย่าง ({bulkPreview.length} cells)
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: "auto", border: `1px solid ${adminColor.line}`, borderRadius: "10px", p: 1, background: adminColor.panel2 }}>
            {bulkPreview.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: adminColor.dim, textAlign: "center", py: 2 }}>
                ไม่มีการเปลี่ยนแปลง — เลือกบริการก่อน หรือปรับค่าให้ต่างจากปัจจุบัน
              </Typography>
            ) : (
              bulkPreview.map((c, i) => (
                <Box key={`${c.row.id}-${c.duration}-${i}`} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.35 }}>
                  <Typography sx={{ fontSize: 12, color: adminColor.text }}>
                    {c.row.name} · {c.duration} min
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: adminColor.text, ...adminFigureSx }}>
                    ฿{c.before.toLocaleString()} → <span style={{ color: c.after > c.before ? adminColor.red : adminColor.green, fontWeight: 800 }}>฿{c.after.toLocaleString()}</span>
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleApplyBulk()} variant="contained"
            disabled={bulkSubmitting || bulkPreview.length === 0}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {bulkSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : `Apply · ปรับ ${bulkPreview.length}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28r50 (feature #4 "Print/Share Promo Card") — printable
          card + QR + PDF/image export. */}
      <Dialog open={!!printCode} onClose={() => setPrintCode(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Print Card · การ์ดโปรโมชั่น {printCode}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
            สำหรับแจกคนขับแท็กซี่ / ลง Reddit / Stickman ฯลฯ — สแกน QR ปุ่ม promo=CODE เข้าอัตโนมัติ
          </Typography>
          <TextField
            select fullWidth label="Format · ขนาด"
            value={printFormat} onChange={(e) => setPrintFormat(e.target.value as "a6" | "card" | "square")}
            sx={{ ...fieldSx, mb: 1.5 }} SelectProps={selectMenuProps}
          >
            {(Object.keys(PRINT_FORMATS) as (keyof typeof PRINT_FORMATS)[]).map((k) => (
              <MenuItem key={k} value={k}>{PRINT_FORMATS[k].label}</MenuItem>
            ))}
          </TextField>

          {/* The card itself — held in a ref so window.print()'s cloned
              window can serialize its outerHTML, and html2canvas can
              render the same DOM to image on demand. */}
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <div
              ref={printCardRef}
              className="card"
              style={{
                width: PRINT_FORMATS[printFormat].cssW,
                height: PRINT_FORMATS[printFormat].cssH,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "6mm",
                background: "#fff",
                color: "#1F2933",
                border: `1px solid ${adminColor.line}`,
                boxShadow: "0 4px 14px rgba(31,41,51,0.08)",
                fontFamily: adminFont.sans,
              }}
            >
              <div style={{ fontFamily: adminFont.serif, fontSize: 20, fontWeight: 700, letterSpacing: "0.02em", marginBottom: 6 }}>
                SunRed
              </div>
              <div style={{ fontFamily: adminFont.serif, fontSize: 32, fontWeight: 800, letterSpacing: "0.04em", marginBottom: 4 }}>
                {printCode}
              </div>
              <div style={{ fontSize: 12, marginBottom: 10, color: "#3E4F58" }}>
                {printCodeMeta?.desc}
              </div>
              {printCardUrl && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(printCardUrl)}`}
                  alt={`QR ${printCode}`}
                  width={130}
                  height={130}
                  crossOrigin="anonymous"
                  style={{ marginBottom: 10 }}
                />
              )}
              <div style={{ fontSize: 9, color: "#5C6F7B", textAlign: "center", lineHeight: 1.35, maxWidth: "90%" }}>
                Scan · Book · Enjoy at sunred.vip · Terms apply
              </div>
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintCode(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>
            Close · ปิด
          </Button>
          <Button
            onClick={() => void handleCopyPrintAsImage()} variant="outlined"
            sx={{ borderColor: adminColor.line2, color: adminColor.accent, textTransform: "none", fontWeight: 700 }}
          >
            Copy as image · คัดลอกรูป
          </Button>
          <Button
            onClick={handleDownloadPrintPDF} variant="contained" startIcon={<Printer size={15} weight="bold" />}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            Download PDF · พิมพ์ / บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPromotionsPage;
