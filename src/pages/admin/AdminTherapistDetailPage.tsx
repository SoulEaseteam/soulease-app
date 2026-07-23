// src/pages/admin/AdminTherapistDetailPage.tsx
//
// 🆕 Round 28s271 (founder: screenshot of this page + the separate
//   /admin/edit-therapist page — "เหมือนซ้ำ แก้ และปรับให้สวยขึ้นและเพิ่มมี
//   ฟังชั้นที่ต้องมี") — this page and EditTherapistPage.tsx were two
//   different "edit a therapist" surfaces reachable from the SAME roster
//   card (View → here, Edit → the other page), each editing an
//   overlapping-but-different field subset with no shared logic. Merged
//   into ONE page: every field from both old pages now lives here,
//   EditTherapistPage.tsx is deleted, and the roster's Edit button now
//   opens this page with `?edit=1`.
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Avatar,
  Badge,
  TextField,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { app, auth, db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  ArrowLeft, PencilSimple, FloppyDisk, X, Eye,
  Star, ChatCircleText, Clock, MapPin, Medal, EyeSlash, Prohibit, Umbrella,
  Calendar, ChartBar, ClockCounterClockwise, TelegramLogo, IdentificationCard, Image as ImageIcon, Sparkle,
  Check, Warning, Globe, Notebook, UserFocus, MapPinLine, Info, Bank, ShieldCheck,
} from "phosphor-react";
import type { Credential, LanguageSkill } from "@/types/therapist";
import { calculateTherapistStatus, isOverrideExpired } from "@/utils/calculateTherapistStatus";
// 🆕 28x.106 — overrides expire at the BUSINESS night's end (06:00 BKK),
//   not midnight; a "พักคืนนี้" set at 21:00 used to evaporate mid-shift.
import { endOfBusinessDayBKK, fmtBKKTimeShort } from "@/utils/time";
import { useTherapistBookings, findActiveBooking } from "@/utils/useTherapistBookings";
import { computeBookingStats, type TherapistBookingStats, EMPTY_BOOKING_STATS } from "@/hooks/useTherapistBookingStats";
import { logAdminAction } from "@/utils/auditLog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { resolveServiceId, getServiceLabel } from "@/utils/serviceCatalog";
import {
  SectionCard, LocationPicker, FeaturesEditor, LanguagesEditor, ServicesEditor,
  CredentialsEditor, BiosEditor, GalleryEditor, AvatarUploader, fieldSx, selectMenuProps,
  FEATURE_ROWS, LANG_LABEL, LANG_LEVEL_TH, BIO_LANGS,
} from "./therapistFormKit";

type Avail = "available" | "bookable" | "resting" | "holiday";
type StatusOverride = "Auto" | "available" | "bookable" | "resting";

const STATUS_COLOR: Record<Avail, string> = {
  available: adminColor.green,
  bookable: adminColor.amber,
  resting: adminColor.dim,
  holiday: adminColor.red,
};

const badgeOptions = ["", "VIP", "HOT", "NEW"] as const;

interface FormState {
  name: string;
  image: string;
  specialty: string;
  startTime: string;
  endTime: string;
  badge: string;
  statusOverride: StatusOverride;
  isHoliday: boolean;
  currentLocation: string;
  hidden: boolean;
  blocked: boolean;
  /** 🆕 28x.81 — staff-app access gate, separate from hidden/blocked
   *  (which control PUBLIC bookability, not whether she can sign in). */
  staffActive: boolean;
  telegramChatId: string;
  // 🆕 Round 28s278 — rich fields, now editable (were view-only in 28s277).
  area: string;
  homeAddress: string;
  features: Record<string, string>;
  languageSkills: LanguageSkill[];
  servicesAvailable: string[]; // canonical SKU ids
  credentials: Credential[];
  gallery: string[];
  bios: Record<string, string>;
}

const EMPTY_FORM: FormState = {
  name: "", image: "", specialty: "",
  startTime: "", endTime: "", badge: "", statusOverride: "Auto", isHoliday: false,
  currentLocation: "", hidden: false, blocked: false, staffActive: false, telegramChatId: "",
  area: "", homeAddress: "", features: {}, languageSkills: [], servicesAvailable: [],
  credentials: [], gallery: [], bios: {},
};

function toFormState(data: Record<string, unknown>): FormState {
  const rawOverride = data.statusOverride;
  const statusOverride: StatusOverride =
    rawOverride === "available" || rawOverride === "bookable" || rawOverride === "resting" ? rawOverride : "Auto";
  const loc = data.currentLocation;
  // features → a flat string map of the known editable keys (unknown keys
  // like employmentType are preserved separately at save time).
  const rawFeatures = (data.features && typeof data.features === "object" ? data.features : {}) as Record<string, unknown>;
  const features: Record<string, string> = {};
  for (const [k] of FEATURE_ROWS) {
    if (rawFeatures[k] != null) features[k] = String(rawFeatures[k]);
  }
  const langs = Array.isArray(data.languageSkills) ? (data.languageSkills as LanguageSkill[]) : [];
  const creds = Array.isArray(data.credentials) ? (data.credentials as Credential[]) : [];
  const gallery = Array.isArray(data.gallery) ? (data.gallery as string[]).filter(Boolean) : [];
  // Normalize whatever's stored (legacy slug OR SKU id) to canonical SKU.
  const rawServices = Array.isArray(data.servicesAvailable)
    ? (data.servicesAvailable as string[])
    : Array.isArray(data.services)
      ? (data.services as string[])
      : [];
  const servicesAvailable = Array.from(
    new Set(rawServices.map((s) => resolveServiceId(s) ?? s).filter(Boolean))
  );
  const rawBios = (data.bios && typeof data.bios === "object" ? data.bios : {}) as Record<string, unknown>;
  const bios: Record<string, string> = {};
  for (const [code] of BIO_LANGS) {
    if (rawBios[code] != null) bios[code] = String(rawBios[code]);
  }
  return {
    name: (data.name as string) || "",
    image: (data.image as string) || "",
    specialty: (data.specialty as string) || "",
    startTime: (data.startTime as string) || "",
    endTime: (data.endTime as string) || "",
    badge: (data.badge as string) || "",
    statusOverride,
    isHoliday: !!data.isHoliday,
    currentLocation:
      loc && typeof loc === "object" ? `${(loc as { lat: number }).lat}, ${(loc as { lng: number }).lng}` : (loc as string) || "",
    hidden: !!data.hidden,
    blocked: !!data.blocked,
    staffActive: !!data.staffActive,
    telegramChatId: (data.telegramChatId as string) || "",
    area: (data.area as string) || "",
    homeAddress: (data.homeAddress as string) || "",
    features,
    languageSkills: langs,
    servicesAvailable,
    credentials: creds,
    gallery,
    bios,
  };
}

const AdminTherapistDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState<string | null>(null);
  const [rawDoc, setRawDoc] = useState<Record<string, unknown> | null>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [lastBookingAt, setLastBookingAt] = useState<Date | null>(null);
  // 🆕 Round 28s276 (founder: "Rating อาจจะต้องดูจากดาวใน reviewText, Reviews
  //   ดึงจาก reviewText") — computed from the SAME bookings listener below
  //   (admin already has full list access via isAdmin(), so this isn't
  //   scoped by the rating>=1 filter the public-facing useTherapistReviews
  //   hook needs for its anonymous-visitor security-rule constraint).
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  // Round 28s372 — computed from admin bookings listener; written to
  // therapist doc via "Sync Stats" so the public detail page can read
  // them without a restricted bookings query.
  const [computedStats, setComputedStats] = useState<TherapistBookingStats>(EMPTY_BOOKING_STATS);
  // 🆕 Round 28x.118 (founder: "ยกเลิกออเดอร์ แต่ยังแจกยอดจองให้พนักงานอยู่") —
  // cancelled bookings an admin explicitly flagged `countsAsSession: true`
  // (from AdminBookingListPage's cancel flow) on top of computedStats.
  // Deliberately NOT folded into computeBookingStats() itself — that shared
  // function also backs the therapist's own private Performance stats and
  // this same page's raw totals, both of which must stay the TRUE count;
  // only the public totalSessions this page syncs should include the bonus.
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // 🆕 Round 28x.133 (founder chose "โบนัสรายคน") — admin-set display boost.
  const [bonusDraft, setBonusDraft] = useState<string>("");
  const [savingBonus, setSavingBonus] = useState(false);
  // 🆕 Round 28x.138 — admin-set rebook % override (blank = show real).
  const [rebookDraft, setRebookDraft] = useState<string>("");
  const [savingRebook, setSavingRebook] = useState(false);

  // 🆕 opening the roster's Pencil icon lands here with ?edit=1 pre-armed.
  const [editing, setEditing] = useState(() => searchParams.get("edit") === "1");
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  // 🆕 28x.70 — one-time code so the practitioner links her own Telegram.
  const [linking, setLinking] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const makeLinkCode = async () => {
    if (!docId) return;
    setLinking(true);
    try {
      const fn = httpsCallable<{ therapistId: string }, { ok: boolean; code: string }>(
        getFunctions(app, "asia-southeast1"),
        "createTherapistLinkCode"
      );
      const res = await fn({ therapistId: docId });
      setLinkCode(res.data.code);
    } catch (e) {
      console.error("[therapist] link code failed", e);
      toast.error("สร้างรหัสไม่สำเร็จ");
    } finally {
      setLinking(false);
    }
  };

  // 🆕 28x.88 — mint a real staff-app login (uid + email on the therapist
  //   doc) in one click, instead of depending on her to self-sign-up with a
  //   matching email nobody actually set. See createTherapistAccount.
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreds, setAccountCreds] = useState<{ username: string; password: string } | null>(null);
  const createAccount = async () => {
    if (!docId) return;
    setCreatingAccount(true);
    try {
      const fn = httpsCallable<{ therapistId: string }, { ok: boolean; username: string; password: string }>(
        getFunctions(app, "asia-southeast1"),
        "createTherapistAccount"
      );
      const res = await fn({ therapistId: docId });
      setAccountCreds({ username: res.data.username, password: res.data.password });
    } catch (e) {
      console.error("[therapist] create account failed", e);
      const msg = (e as { message?: string })?.message ?? "";
      toast.error(msg.includes("already") ? "พนักงานคนนี้มีบัญชีอยู่แล้ว" : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setCreatingAccount(false);
    }
  };

  // 🆕 28x.91 — the credential card only shows once; this is the way back in
  // if admin navigates away without copying it, or the therapist forgets it.
  const [resettingPassword, setResettingPassword] = useState(false);
  const resetPassword = async () => {
    if (!docId) return;
    setResettingPassword(true);
    try {
      const fn = httpsCallable<{ therapistId: string }, { ok: boolean; username: string; password: string }>(
        getFunctions(app, "asia-southeast1"),
        "resetTherapistPassword"
      );
      const res = await fn({ therapistId: docId });
      setAccountCreds({ username: res.data.username, password: res.data.password });
    } catch (e) {
      console.error("[therapist] reset password failed", e);
      toast.error("รีเซ็ตรหัสผ่านไม่สำเร็จ");
    } finally {
      setResettingPassword(false);
    }
  };
  const originalRef = useRef<FormState>(EMPTY_FORM);
  // 🆕 Round 28s314 — bank details live in the ADMIN-ONLY `payoutAccounts`
  //   collection, NOT on the therapist doc (which is `allow read: if true`,
  //   i.e. world-readable — bank numbers must never land there). Loaded +
  //   saved separately from the main form, keyed by the therapist doc id.
  const EMPTY_BANK = { bankName: "", bankAccount: "", bankAccountName: "" };
  const [bankForm, setBankForm] = useState(EMPTY_BANK);
  // 🆕 Round 28s272 (founder: "กดปากกาแล้วไม่มีข้อมูล") — the onSnapshot
  // callback below reads `editing` to avoid clobbering in-progress edits
  // on a live update, but it's created once inside a `[id]`-only effect,
  // so it closed over whatever `editing` was AT MOUNT. Landing here via
  // ?edit=1 means editing was already `true` on the very first render —
  // so the very first real snapshot got treated as "don't stomp an
  // edit-in-progress" and the form stayed permanently empty. `editingRef`
  // always reads the CURRENT value; `hasLoadedRef` guarantees the first
  // successful load always populates regardless of edit mode.
  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const hasLoadedRef = useRef(false);

  // ── Live status — same engine + live-bookings merge as the roster
  //    grid (28s267), replacing this page's old hand-rolled, simpler
  //    calc that didn't account for real active bookings.
  const liveBookings = useTherapistBookings(docId);
  const activeBooking = findActiveBooking(liveBookings);

  useEffect(() => {
    if (!id) return;

    // 🆕 Round 28s272 — resets when navigating between two different
    // therapists' URLs without a full remount (same component instance,
    // just `id` changes) — otherwise a leftover `true` from the previous
    // therapist would block the new one's very first load the same way
    // the ?edit=1 case did.
    hasLoadedRef.current = false;
    editingRef.current = searchParams.get("edit") === "1";
    setEditing(editingRef.current);

    let unsubTherapist: (() => void) | null = null;
    let unsubBookings: (() => void) | null = null;

    const fetchData = async () => {
      setLoading(true);

      let docRef: ReturnType<typeof doc> | null = null;
      let resolvedId: string | null = null;

      try {
        const directRef = doc(db, "therapists", id);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          docRef = directRef;
          resolvedId = directSnap.id;
        }
      } catch {
        // doc not found at direct ID — fallback to query by field
      }

      if (!docRef) {
        const q = query(collection(db, "therapists"), where("id", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          resolvedId = snapshot.docs[0].id;
          docRef = snapshot.docs[0].ref;
        }
      }

      if (!docRef || !resolvedId) {
        setRawDoc(null);
        setLoading(false);
        return;
      }

      setDocId(resolvedId);

      unsubTherapist = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRawDoc({ id: snap.id, ...data });
          const next = toFormState(data);
          originalRef.current = next;
          // Always populate on the first successful load, even if we
          // opened straight into edit mode (?edit=1). After that, don't
          // stomp in-progress edits with a live update mid-typing.
          if (!hasLoadedRef.current || !editingRef.current) {
            setFormData(next);
          }
          hasLoadedRef.current = true;
        }
      });

      unsubBookings = onSnapshot(
        query(collection(db, "bookings"), where("therapistId", "==", resolvedId)),
        (snap) => {
          const today = dayjs().format("YYYY-MM-DD");
          let todayCount = 0;
          let last: Date | null = null;
          // 🆕 Round 28s276 — a booking counts as reviewed if it has real
          // reviewText, regardless of whether a `rating` field exists.
          // Matches ReviewListPage.tsx's established convention exactly
          // (`rating: typeof r.rating === "number" ? r.rating : 5`) — a
          // written positive comment with no explicit star still counts,
          // defaulting to 5. Confirmed via a real Firestore doc (founder
          // screenshot): older completed bookings can have reviewText with
          // no rating field at all, which the public-facing
          // useTherapistReviews hook's `where("rating",">=",1)` query
          // silently excludes — that filter exists there ONLY because
          // anonymous visitors need it to satisfy firestore.rules (28s6:
          // un-rated bookings still carry PII and must stay private from
          // public listeners). Admin already has full list access via
          // isAdmin(), so this page isn't bound by that same constraint.
          const ratings: number[] = [];
          // 🆕 Round 28x.134 — the per-booking countsAsSession credit is retired;
          //   its counts were migrated into displaySessionBonus, so we no longer
          //   tally it here (doing so would double-count against the bonus).
          snap.forEach((d) => {
            const b = d.data();
            if (b.date === today) todayCount++;
            if (b.startAt?.toDate) {
              const dDate = b.startAt.toDate();
              if (!last || dDate > last) last = dDate;
            }
            const text = typeof b.reviewText === "string" ? b.reviewText.trim() : "";
            if (text) ratings.push(typeof b.rating === "number" ? b.rating : 5);
          });
          setTodayBookings(todayCount);
          setTotalBookings(snap.size);
          setLastBookingAt(last);
          setReviewCount(ratings.length);
          setAvgRating(ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0);
          // Round 28s372 — derive loyalty stats for the Sync Stats button.
          setComputedStats(computeBookingStats(snap));
        }
      );

      setLoading(false);
    };

    void fetchData();

    return () => {
      unsubTherapist?.();
      unsubBookings?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 🆕 Round 28s314 — load the admin-only bank account for this therapist.
  useEffect(() => {
    if (!docId) return;
    let alive = true;
    void getDoc(doc(db, "payoutAccounts", docId)).then((snap) => {
      if (!alive) return;
      const d = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
      setBankForm({
        bankName: (d.bankName as string) || "",
        bankAccount: (d.bankAccount as string) || "",
        bankAccountName: (d.bankAccountName as string) || "",
      });
    });
    return () => {
      alive = false;
    };
  }, [docId]);

  const engineInput = rawDoc
    ? { ...(rawDoc as any), activeBooking: !!activeBooking, busyUntil: activeBooking?.endAt ?? null }
    : null;
  const engine = engineInput ? calculateTherapistStatus(engineInput) : null;
  const computedStatus: Avail = engine?.status ?? "resting";
  const overrideActive =
    formData.statusOverride !== "Auto" && !isOverrideExpired((rawDoc as { overrideUntil?: unknown } | null)?.overrideUntil);

  const statusLine = (() => {
    switch (computedStatus) {
      case "available": return "ว่างตอนนี้";
      case "bookable": return activeBooking ? `กำลังนวด · ถึง ${fmtBKKTimeShort(activeBooking.endAt, "—")}` : "จองได้ตอนนี้";
      case "resting": return engine?.nextAvailable ? `พัก · เริ่ม ${engine.nextAvailable}` : "พัก";
      case "holiday": return "วันหยุดวันนี้";
      default: return "";
    }
  })();

  // Round 28s372 — Sync computed booking stats to the therapist doc so the
  // public detail page (which can't query bookings directly) can show chips.
  // Current stored bonus (live from the doc snapshot). The draft input syncs
  // to it whenever the doc changes underneath (effect below).
  const displayBonus =
    typeof rawDoc?.displaySessionBonus === "number" ? rawDoc.displaySessionBonus : 0;
  useEffect(() => {
    setBonusDraft(String(displayBonus));
  }, [displayBonus]);

  // 🆕 28x.138 — rebook override (null = none). Draft syncs from the doc.
  const rebookOverride =
    typeof rawDoc?.rebookRateOverride === "number" ? rawDoc.rebookRateOverride : null;
  useEffect(() => {
    setRebookDraft(rebookOverride == null ? "" : String(rebookOverride));
  }, [rebookOverride]);

  // 🆕 28x.138 — write the rebook override (or clear it with a blank input).
  //   The onTherapistBonusChange trigger recomputes rebookRate from it.
  const saveRebook = async () => {
    if (!docId) return;
    const raw = rebookDraft.trim();
    const next = raw === "" ? null : Math.min(100, Math.max(0, Math.round(Number(raw) || 0)));
    setSavingRebook(true);
    try {
      await updateDoc(doc(db, "therapists", docId), {
        rebookRateOverride: next,
        updatedBy: auth.currentUser?.uid ?? "admin",
      });
      await logAdminAction("sync_therapist_stats" as Parameters<typeof logAdminAction>[0], {
        therapistId: docId,
        rebookRateOverride: next,
      });
    } catch (err) {
      console.error("[AdminTherapistDetailPage] saveRebook failed:", err);
    } finally {
      setSavingRebook(false);
    }
  };

  // 🆕 28x.133 — write ONLY the bonus. The onTherapistBonusChange Cloud
  //   Function recomputes totalSessions from it; the live doc snapshot then
  //   repaints this page. No staff surface reads this field.
  const saveBonus = async () => {
    if (!docId) return;
    const n = Math.max(0, Math.round(Number(bonusDraft) || 0));
    setSavingBonus(true);
    try {
      await updateDoc(doc(db, "therapists", docId), {
        displaySessionBonus: n,
        updatedBy: auth.currentUser?.uid ?? "admin",
      });
      await logAdminAction("sync_therapist_stats" as Parameters<typeof logAdminAction>[0], {
        therapistId: docId,
        displaySessionBonus: n,
      });
    } catch (err) {
      console.error("[AdminTherapistDetailPage] saveBonus failed:", err);
    } finally {
      setSavingBonus(false);
    }
  };

  const handleSyncStats = async () => {
    if (!docId || computedStats.loading) return;
    setSyncing(true);
    try {
      // 🆕 Round 28x.134 — public count = completed (real) + display bonus.
      //   The per-booking credit mode was folded into the bonus, so there are
      //   just two parts now. The onBooking*/onTherapistBonusChange triggers
      //   keep this in sync automatically; this button stays as a manual
      //   "recompute now" using the identical formula.
      const totalSessions = computedStats.totalCompleted + displayBonus;
      await updateDoc(doc(db, "therapists", docId), {
        totalSessions,
        rebookRate: computedStats.repeatPct,
        statsUpdatedAt: serverTimestamp(),
      });
      await logAdminAction("sync_therapist_stats" as Parameters<typeof logAdminAction>[0], {
        therapistId: docId,
        totalSessions,
        rebookRate: computedStats.repeatPct,
      });
      setSyncedAt(new Date());
    } catch (err) {
      console.error("[AdminTherapistDetailPage] sync stats failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const startEditing = () => {
    setFormData(originalRef.current);
    setEditing(true);
  };
  const cancelEditing = () => {
    setFormData(originalRef.current);
    setEditing(false);
    if (searchParams.get("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const toggleHoliday = (checked: boolean) => {
    setFormData((f) => ({ ...f, isHoliday: checked, ...(checked ? { statusOverride: "Auto" as StatusOverride } : {}) }));
  };
  const changeOverride = (value: StatusOverride) => {
    setFormData((f) => ({ ...f, statusOverride: value, ...(value !== "Auto" ? { isHoliday: false } : {}) }));
  };

  const handleSave = async () => {
    if (!docId) return;
    setSaving(true);

    let locationValue: unknown = formData.currentLocation;
    if (typeof locationValue === "string" && locationValue.includes(",")) {
      const [latStr, lngStr] = locationValue.split(",");
      const lat = parseFloat(latStr.trim());
      const lng = parseFloat(lngStr.trim());
      if (!isNaN(lat) && !isNaN(lng)) locationValue = { lat, lng };
    }

    // 🆕 Round 28s278 — rebuild nested objects by OVERLAYING edited keys
    // onto the ORIGINAL doc's nested object, so unknown/unedited keys
    // (e.g. features.employmentType, or a bios language not in the editor)
    // are preserved rather than wiped. Clean out empty strings so we don't
    // persist blank feature rows.
    const rawFeatures = (rawDoc?.features && typeof rawDoc.features === "object" ? rawDoc.features : {}) as Record<string, unknown>;
    const mergedFeatures: Record<string, unknown> = { ...rawFeatures };
    for (const [k] of FEATURE_ROWS) {
      const v = (formData.features[k] ?? "").trim();
      if (v) mergedFeatures[k] = v;
      else delete mergedFeatures[k];
    }
    const rawBios = (rawDoc?.bios && typeof rawDoc.bios === "object" ? rawDoc.bios : {}) as Record<string, unknown>;
    const mergedBios: Record<string, unknown> = { ...rawBios };
    for (const [code] of BIO_LANGS) {
      const v = (formData.bios[code] ?? "").trim();
      if (v) mergedBios[code] = v;
      else delete mergedBios[code];
    }
    // Drop blank rows the operator added but never filled.
    const cleanLanguages = formData.languageSkills.filter((l) => l.code);
    const cleanCredentials = formData.credentials.filter((c) => (c.label ?? "").trim());
    const cleanGallery = formData.gallery.map((g) => g.trim()).filter(Boolean);

    // 🆕 Round 28s275 — customId/rating/reviews dropped from the write
    // patch entirely: customId has no reader anywhere in the codebase
    // (the real public slug is the Firestore doc id itself), and rating/
    // reviews are always live-computed from real bookings, never read
    // from this doc field by anything — writing them here was cosmetic
    // at best, misleading at worst (looks settable, does nothing).
    const patch: Record<string, unknown> = {
      name: formData.name,
      image: formData.image,
      specialty: formData.specialty,
      startTime: formData.startTime,
      endTime: formData.endTime,
      badge: formData.badge,
      statusOverride: formData.statusOverride,
      // 🆕 Round 28s267's rule, applied here too — a manual override now
      //   expires at end of BKK day instead of sticking forever.
      overrideUntil: formData.statusOverride !== "Auto" ? endOfBusinessDayBKK().toDate() : null,
      isHoliday: formData.isHoliday,
      currentLocation: locationValue,
      hidden: formData.hidden,
      blocked: formData.blocked,
      staffActive: formData.staffActive,
      telegramChatId: formData.telegramChatId,
      // 🆕 Round 28s278 — the rich fields, now written back too.
      area: formData.area,
      homeAddress: formData.homeAddress,
      features: mergedFeatures,
      languageSkills: cleanLanguages,
      servicesAvailable: formData.servicesAvailable,
      credentials: cleanCredentials,
      gallery: cleanGallery,
      bios: mergedBios,
      updatedAt: serverTimestamp(),
    };

    const changedFields = (Object.keys(formData) as (keyof FormState)[]).filter(
      (k) => JSON.stringify(formData[k]) !== JSON.stringify(originalRef.current[k])
    );

    try {
      await updateDoc(doc(db, "therapists", docId), patch);
      // 🆕 Round 28s314 — bank details go to the admin-only payoutAccounts doc,
      //   NOT the world-readable therapist doc.
      await setDoc(
        doc(db, "payoutAccounts", docId),
        {
          bankName: bankForm.bankName.trim(),
          bankAccount: bankForm.bankAccount.trim(),
          bankAccountName: bankForm.bankAccountName.trim(),
          therapistName: formData.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (changedFields.length) {
        void logAdminAction("therapist.update", {
          therapistId: docId,
          therapistName: formData.name,
          changedFields,
        });
      }
      originalRef.current = formData;
      setEditing(false);
      if (searchParams.get("edit")) {
        searchParams.delete("edit");
        setSearchParams(searchParams, { replace: true });
      }
    } catch (err) {
      console.error("Failed saving therapist:", err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: adminColor.accent }} />
      </Box>
    );

  if (!rawDoc || !docId)
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ color: adminColor.text }}>Therapist not found · ไม่พบข้อมูล</Typography>
      </Box>
    );

  const ringColor = computedStatus === "resting" ? adminColor.line2 : STATUS_COLOR[computedStatus];

  // 🆕 Round 28s277 — rich real fields, read straight off the live doc.
  // These are display-only here; handleSave's patch never touches them,
  // so viewing/editing the basic fields can't wipe them.
  const features = (rawDoc.features && typeof rawDoc.features === "object" ? rawDoc.features : {}) as Record<string, unknown>;
  const featureEntries = FEATURE_ROWS.filter(([k]) => {
    const v = features[k];
    return v != null && String(v).trim() !== "";
  });
  const languageSkills = Array.isArray(rawDoc.languageSkills) ? (rawDoc.languageSkills as LanguageSkill[]) : [];
  const featureLanguage = typeof features.language === "string" ? features.language : "";
  const credentials = Array.isArray(rawDoc.credentials) ? (rawDoc.credentials as Credential[]) : [];
  const gallery = Array.isArray(rawDoc.gallery) ? (rawDoc.gallery as string[]).filter(Boolean) : [];
  const servicesAvailable = Array.isArray(rawDoc.servicesAvailable)
    ? (rawDoc.servicesAvailable as string[])
    : Array.isArray(rawDoc.services)
      ? (rawDoc.services as string[])
      : [];
  const area = typeof rawDoc.area === "string" ? rawDoc.area : "";
  const homeAddress = typeof rawDoc.homeAddress === "string" ? rawDoc.homeAddress : "";
  const bios = (rawDoc.bios && typeof rawDoc.bios === "object" ? rawDoc.bios : {}) as Record<string, string>;
  const bioText = bios.th || bios.en || "";
  const rebookRate = typeof rawDoc.rebookRate === "number" ? rawDoc.rebookRate : null;
  const totalSessions = typeof rawDoc.totalSessions === "number" ? rawDoc.totalSessions : null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: `radial-gradient(120% 90% at 15% 0%, ${adminColor.panel3} 0%, ${adminColor.bg} 55%)`, minHeight: "100%" }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowLeft size={13} weight="bold" />}
        variant="outlined"
        sx={{ borderColor: adminColor.accent, color: adminColor.accent, fontWeight: "bold", textTransform: "none", borderRadius: "10px", mb: 2.5, "&:hover": { borderColor: adminColor.accentDeep, background: adminColor.panel2 } }}
      >
        Back · กลับ
      </Button>

      <Box sx={{ background: adminColor.panel, borderRadius: "20px", border: `1px solid ${adminColor.line}`, boxShadow: "0 4px 18px rgba(31,41,51,0.08)", p: { xs: 2.5, md: 3.5 } }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          {/* 🆕 Round 28s284 — tap the photo to change it while editing
              (replaces the Image URL text field); display-only otherwise. */}
          {editing ? (
            <AvatarUploader value={formData.image} onChange={(url) => setFormData((f) => ({ ...f, image: url }))} docId={docId ?? ""} size={76} ringColor={ringColor} />
          ) : (
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
              sx={{ "& .MuiBadge-badge": { background: STATUS_COLOR[computedStatus], width: 15, height: 15, borderRadius: "50%", border: `3px solid ${adminColor.panel}` } }}
            >
              <Avatar src={formData.image} sx={{ width: 76, height: 76, boxShadow: `0 0 0 3px ${adminColor.panel}, 0 0 0 5px ${ringColor}` }} />
            </Badge>
          )}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 700, fontSize: 24, color: adminColor.text }}>{formData.name || "-"}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, fontWeight: 600, color: STATUS_COLOR[computedStatus], mt: "4px" }}>
              {computedStatus === "holiday" ? <Umbrella size={13} weight="bold" /> : <Check size={13} weight="bold" />}
              {statusLine}
              {overrideActive && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "3px", fontSize: 11, fontWeight: 700, color: adminColor.red, background: "rgba(220,38,38,0.08)", borderRadius: "6px", px: "6px", py: "1px", ml: "6px" }}>
                  <Warning size={11} weight="bold" /> Override · ถึงสิ้นวัน
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 12.5, color: adminColor.dim, mt: "4px" }}>{formData.specialty || "No specialty set · ยังไม่ระบุความถนัด"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {!editing ? (
              <Tooltip title="Edit · แก้ไข">
                <IconButton onClick={startEditing} sx={{ color: adminColor.accent, background: adminColor.panel2, "&:hover": { background: "rgba(78,126,140,0.14)" } }}>
                  <PencilSimple size={18} />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  startIcon={<FloppyDisk size={15} weight="bold" />}
                  sx={{ background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`, color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "10px", boxShadow: "0 3px 10px rgba(78,126,140,0.32)", "&:hover": { background: adminColor.accentDeep } }}
                >
                  Save · บันทึก
                </Button>
                <Button onClick={cancelEditing} startIcon={<X size={15} weight="bold" />} variant="outlined" sx={{ borderColor: adminColor.line2, color: adminColor.muted, textTransform: "none", fontWeight: 700, borderRadius: "10px" }}>
                  Cancel · ยกเลิก
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* ── Stats row (always visible, always live) ───────────── */}
        {/* 🆕 Round 28r46 — bilingual English · ไทย labels. */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mt: 2.5, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <Star size={15} color={adminColor.dim} weight={reviewCount > 0 ? "fill" : "regular"} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{reviewCount > 0 ? avgRating.toFixed(1) : "—"}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>Rating · คะแนน</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <ChatCircleText size={15} color={adminColor.dim} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{reviewCount}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>Reviews · รีวิว</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <Calendar size={15} color={adminColor.dim} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{todayBookings}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>Today · วันนี้</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <ChartBar size={15} color={adminColor.dim} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{totalBookings}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>Total · รวม</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <ClockCounterClockwise size={15} color={adminColor.dim} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: adminColor.muted }}>
              {lastBookingAt ? dayjs(lastBookingAt).format("YYYY-MM-DD HH:mm") : "No bookings yet · ยังไม่เคยมีงาน"}
            </Typography>
          </Box>
          {/* Round 28s372 — Sync computed stats to therapist doc so public chips work */}
          <Tooltip title={syncedAt ? `Last synced ${dayjs(syncedAt).format("HH:mm")}` : "Write totalSessions + rebookRate to therapist doc → public chips"}>
            <Box>
              <Button
                onClick={() => void handleSyncStats()}
                disabled={syncing || computedStats.loading}
                size="small"
                startIcon={<Sparkle size={13} weight="bold" />}
                sx={{
                  background: syncedAt ? adminColor.green : adminColor.accent,
                  color: "#fff", textTransform: "none", fontWeight: 700,
                  borderRadius: "10px", fontSize: 12, px: "12px", py: "7px",
                  "&:hover": { background: adminColor.accentDeep },
                  "&:disabled": { opacity: 0.5 },
                }}
              >
                {(() => {
                  const draftBonus = Math.max(0, Math.round(Number(bonusDraft) || 0));
                  const total = computedStats.totalCompleted + draftBonus;
                  const label = `${total} sessions · ${computedStats.repeatPct}% rebook`;
                  return syncing ? "Syncing…" : syncedAt ? `Synced ✓ (${label})` : `Sync Stats (${label})`;
                })()}
              </Button>
            </Box>
          </Tooltip>

          {/* 🆕 Round 28x.133/134 (founder chose "โบนัสรายคน" then "รวมเหลืออันเดียว")
              — the ONE display-boost tool. Customers see completed + this bonus;
              the practitioner's own app shows only completed (real); rebook rate
              ignores the bonus. Admin-only surface. */}
          <Box sx={{ background: adminColor.panel2, borderRadius: "12px", p: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              โบนัสยอดโชว์ลูกค้า · Display boost
            </Typography>
            {(() => {
              const draftBonus = Math.max(0, Math.round(Number(bonusDraft) || 0));
              const real = computedStats.totalCompleted;
              const shown = real + draftBonus;
              const dirty = draftBonus !== displayBonus;
              return (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="number"
                      min={0}
                      value={bonusDraft}
                      onChange={(e) => setBonusDraft(e.target.value)}
                      style={{
                        width: 74, padding: "7px 10px", borderRadius: 8,
                        border: `1px solid ${adminColor.line}`, background: adminColor.panel,
                        color: adminColor.text, fontSize: 13, fontWeight: 700, textAlign: "center",
                      }}
                    />
                    <Button
                      onClick={() => void saveBonus()}
                      disabled={savingBonus || !dirty}
                      size="small"
                      sx={{
                        background: adminColor.accent, color: "#fff", textTransform: "none",
                        fontWeight: 700, borderRadius: "9px", fontSize: 12, px: "12px", py: "6px",
                        "&:hover": { background: adminColor.accentDeep },
                        "&:disabled": { opacity: 0.4 },
                      }}
                    >
                      {savingBonus ? "บันทึก…" : "บันทึกโบนัส"}
                    </Button>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: adminColor.dim, lineHeight: 1.5 }}>
                    ทำจริง {real} · โบนัส {draftBonus}
                    {" = "}
                    <span style={{ color: adminColor.text, fontWeight: 800 }}>ลูกค้าเห็น {shown}</span>
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: adminColor.dim, lineHeight: 1.45 }}>
                    พนักงานเห็นแค่ยอดจริง ({real})
                  </Typography>
                </>
              );
            })()}

            {/* 🆕 Round 28x.138 (founder: "โบนัสรายคน ต้องบาลานซ์กับหน้า rebook
                rate ด้วย เดี๋ยวไม่เนียน") — a boosted session count next to a
                0%/blank rebook reads as fake. This sets the rebook % customers
                see, so the pair looks consistent. Leave BLANK to show the real
                rate. Staff keep seeing their real rebook. */}
            <Box sx={{ borderTop: `1px solid ${adminColor.line}`, mt: "2px", pt: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                rebook ที่โชว์ลูกค้า · Display rebook %
              </Typography>
              {(() => {
                const realRebook = computedStats.repeatPct;
                const hasOverride = rebookDraft.trim() !== "";
                const shownRebook = hasOverride ? Math.min(100, Math.max(0, Math.round(Number(rebookDraft) || 0))) : realRebook;
                const dirty = rebookDraft.trim() !== (rebookOverride == null ? "" : String(rebookOverride));
                return (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={`${realRebook}`}
                        value={rebookDraft}
                        onChange={(e) => setRebookDraft(e.target.value)}
                        style={{
                          width: 74, padding: "7px 10px", borderRadius: 8,
                          border: `1px solid ${adminColor.line}`, background: adminColor.panel,
                          color: adminColor.text, fontSize: 13, fontWeight: 700, textAlign: "center",
                        }}
                      />
                      <Button
                        onClick={() => void saveRebook()}
                        disabled={savingRebook || !dirty}
                        size="small"
                        sx={{
                          background: adminColor.accent, color: "#fff", textTransform: "none",
                          fontWeight: 700, borderRadius: "9px", fontSize: 12, px: "12px", py: "6px",
                          "&:hover": { background: adminColor.accentDeep },
                          "&:disabled": { opacity: 0.4 },
                        }}
                      >
                        {savingRebook ? "บันทึก…" : "บันทึก %"}
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: adminColor.dim, lineHeight: 1.5 }}>
                      rebook จริง {realRebook}%
                      {" · "}
                      <span style={{ color: adminColor.text, fontWeight: 800 }}>
                        ลูกค้าเห็น {shownRebook}%{hasOverride ? "" : " (ตามจริง)"}
                      </span>
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: adminColor.dim, lineHeight: 1.45 }}>
                      เว้นว่าง = โชว์ตามจริง · พนักงานเห็น rebook จริงเสมอ
                    </Typography>
                  </>
                );
              })()}
            </Box>
          </Box>
        </Box>

        {!editing ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
            <SectionCard icon={<Info size={13} />} title="Profile · ข้อมูลหลัก">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "10px" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <ReadRow icon={<Clock size={14} />} label="Working Hours" value={`${formData.startTime || "--:--"} – ${formData.endTime || "--:--"}`} />
                  <ReadRow icon={<MapPin size={14} />} label="Location" value={formData.currentLocation || "—"} />
                  <ReadRow icon={<Medal size={14} />} label="Badge" value={formData.badge || "None"} />
                  {rebookRate != null && <ReadRow icon={<ChartBar size={14} />} label="Rebook Rate" value={`${rebookRate}%`} />}
                  {totalSessions != null && <ReadRow icon={<Star size={14} />} label="Sessions (lifetime)" value={String(totalSessions)} />}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* 🆕 Round 28s275 — "Custom ID" had no reader anywhere in the
                      codebase; the real public slug IS this doc's Firestore id
                      (confirmed by this page's own lookup logic above trying it
                      directly first). Shows the real thing instead of a fake
                      editable field that never did anything. */}
                  <ReadRow icon={<IdentificationCard size={14} />} label="URL Slug" value={docId || "—"} />
                  <ReadRow icon={<TelegramLogo size={14} />} label="Telegram" value={formData.telegramChatId || "ยังไม่ผูก"} />
                  <ReadRow
                    icon={<Bank size={14} />}
                    label="Payout Account"
                    value={
                      bankForm.bankAccount
                        ? `${bankForm.bankName ? `${bankForm.bankName} · ` : ""}${bankForm.bankAccount}${bankForm.bankAccountName ? ` (${bankForm.bankAccountName})` : ""}`
                        : "ยังไม่ผูกบัญชี"
                    }
                    alert={!bankForm.bankAccount}
                  />
                  <ReadRow icon={<EyeSlash size={14} />} label="Hidden" value={formData.hidden ? "ซ่อนจากหน้าเว็บ" : "แสดงปกติ"} alert={formData.hidden} />
                  <ReadRow icon={<Prohibit size={14} />} label="Blocked" value={formData.blocked ? "ปิดใช้งาน" : "ใช้งานปกติ"} alert={formData.blocked} />
                  <ReadRow icon={<Umbrella size={14} />} label="Holiday" value={formData.isHoliday ? "วันหยุดวันนี้" : "ไม่ได้หยุด"} alert={formData.isHoliday} />
                </Box>
              </Box>
            </SectionCard>

            {(area || homeAddress) && (
              <SectionCard icon={<MapPinLine size={13} />} title="Area · พื้นที่ / ที่อยู่">
                <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {area && <ReadRow icon={<MapPin size={14} />} label="Area" value={area} />}
                  {homeAddress && <ReadRow icon={<MapPinLine size={14} />} label="Standby address" value={homeAddress} />}
                </Box>
              </SectionCard>
            )}

            {featureEntries.length > 0 && (
              <SectionCard icon={<UserFocus size={13} />} title="Features · ลักษณะเฉพาะตัว">
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: "8px" }}>
                  {featureEntries.map(([k, label]) => (
                    <Box key={k} sx={{ background: adminColor.panel, borderRadius: "10px", p: "8px 12px", border: `1px solid ${adminColor.line}` }}>
                      <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: adminColor.text, mt: "1px" }}>{String(features[k])}</Typography>
                    </Box>
                  ))}
                </Box>
              </SectionCard>
            )}

            {(languageSkills.length > 0 || featureLanguage) && (
              <SectionCard icon={<Globe size={13} />} title="Languages · ภาษา">
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {languageSkills.length > 0 ? (
                    languageSkills.map((l, i) => (
                      <Box key={`${l.code}-${i}`} sx={{ display: "flex", alignItems: "center", gap: "6px", background: adminColor.panel, borderRadius: "9px", p: "6px 12px", border: `1px solid ${adminColor.line}` }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: adminColor.text }}>{LANG_LABEL[l.code] ?? l.code}</Typography>
                        <Typography sx={{ fontSize: 11, color: adminColor.dim }}>{LANG_LEVEL_TH[l.level] ?? l.level}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ fontSize: 13, color: adminColor.muted }}>{featureLanguage}</Typography>
                  )}
                </Box>
              </SectionCard>
            )}

            {servicesAvailable.length > 0 && (
              <SectionCard icon={<Sparkle size={13} />} title="Services · บริการที่ทำได้">
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {servicesAvailable.map((s) => (
                    <Box key={s} sx={{ background: "rgba(78,126,140,0.10)", color: adminColor.accent, borderRadius: "9px", p: "6px 12px", fontSize: 12.5, fontWeight: 700 }}>
                      {getServiceLabel(s, s.replace(/-/g, " "))}
                    </Box>
                  ))}
                </Box>
              </SectionCard>
            )}

            {credentials.length > 0 && (
              <SectionCard icon={<Info size={13} />} title="Credentials · ใบรับรอง">
                <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {credentials.map((c, i) => (
                    <Box key={i} sx={{ background: adminColor.panel, borderRadius: "10px", p: "9px 13px", border: `1px solid ${adminColor.line}` }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: adminColor.text }}>{c.label}</Typography>
                      {c.meta && <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mt: "1px" }}>{c.meta}</Typography>}
                    </Box>
                  ))}
                </Box>
              </SectionCard>
            )}

            {bioText && (
              <SectionCard icon={<Notebook size={13} />} title="Bio · ประวัติแนะนำ">
                <Typography sx={{ fontSize: 13, color: adminColor.muted, lineHeight: 1.65 }}>{bioText}</Typography>
              </SectionCard>
            )}

            {gallery.length > 0 && (
              <SectionCard icon={<ImageIcon size={13} />} title={`Gallery · แกลเลอรี (${gallery.length})`}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {gallery.map((src, i) => (
                    <Avatar key={i} variant="rounded" src={src} sx={{ width: 74, height: 74, borderRadius: "12px", border: `1px solid ${adminColor.line}` }} />
                  ))}
                </Box>
              </SectionCard>
            )}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
            <SectionCard icon={<Sparkle size={13} />} title="Profile · โปรไฟล์">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {/* 🆕 Round 28s284 — Image URL field removed; change the photo
                    by tapping the avatar in the header above. */}
                <TextField label="Name" fullWidth size="small" sx={fieldSx} value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
                <TextField label="Specialty" fullWidth size="small" sx={fieldSx} value={formData.specialty} onChange={(e) => setFormData((f) => ({ ...f, specialty: e.target.value }))} />
                {/* 🆕 Round 28s284 — shrink:true so the "Badge" label doesn't
                    overlap the "None" text displayEmpty renders while empty. */}
                <TextField
                  select label="Badge" fullWidth size="small" sx={fieldSx}
                  value={formData.badge}
                  onChange={(e) => setFormData((f) => ({ ...f, badge: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}
                >
                  {badgeOptions.map((b) => (
                    <MenuItem key={b} value={b}>{b || "None"}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </SectionCard>

            <SectionCard icon={<Clock size={13} />} title="Schedule & Status · ตารางเวลา">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField label="Start Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={formData.startTime} onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))} />
                  <TextField label="End Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={formData.endTime} onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))} />
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    select label="Status Override" fullWidth size="small" sx={fieldSx}
                    value={formData.statusOverride}
                    onChange={(e) => changeOverride(e.target.value as StatusOverride)}
                    SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}
                  >
                    <MenuItem value="Auto">Auto</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="bookable">Bookable</MenuItem>
                    <MenuItem value="resting">Resting</MenuItem>
                  </TextField>
                  <Box
                    onClick={() => toggleHoliday(!formData.isHoliday)}
                    sx={{
                      display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      borderRadius: "10px", padding: "9px 14px", whiteSpace: "nowrap",
                      border: `1px solid ${formData.isHoliday ? "rgba(220,38,38,0.25)" : adminColor.line}`,
                      background: formData.isHoliday ? "rgba(220,38,38,0.09)" : adminColor.panel,
                      color: formData.isHoliday ? adminColor.red : adminColor.dim,
                    }}
                  >
                    <Umbrella size={14} weight={formData.isHoliday ? "fill" : "regular"} /> Holiday · วันหยุด
                  </Box>
                </Box>
              </Box>
            </SectionCard>

            {/* 🆕 Round 28s278 area/address editable · 28s280 map search. */}
            <SectionCard icon={<MapPinLine size={13} />} title="Area · พื้นที่ / ที่อยู่">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <LocationPicker
                  initial={(() => {
                    const parts = (formData.currentLocation || "").split(",").map((s) => parseFloat(s.trim()));
                    return { lat: Number.isFinite(parts[0]) ? parts[0] : null, lng: Number.isFinite(parts[1]) ? parts[1] : null };
                  })()}
                  onPick={({ area, address, lat, lng }) =>
                    setFormData((f) => ({
                      ...f,
                      area: area || f.area,
                      homeAddress: address || f.homeAddress,
                      currentLocation: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    }))
                  }
                />
                <TextField label="Area (e.g. Din Daeng · Ratchada)" fullWidth size="small" sx={fieldSx} value={formData.area} onChange={(e) => setFormData((f) => ({ ...f, area: e.target.value }))} />
                <TextField label="Standby address (full · admin only)" fullWidth size="small" multiline minRows={2} sx={fieldSx} value={formData.homeAddress} onChange={(e) => setFormData((f) => ({ ...f, homeAddress: e.target.value }))} />
                <TextField label="Coordinates (lat, lng)" fullWidth size="small" sx={fieldSx} value={formData.currentLocation} onChange={(e) => setFormData((f) => ({ ...f, currentLocation: e.target.value }))} />
              </Box>
            </SectionCard>

            {/* 🆕 Round 28s278 — full features grid, editable. */}
            <SectionCard icon={<UserFocus size={13} />} title="Features · ลักษณะเฉพาะตัว">
              <FeaturesEditor value={formData.features} onChange={(k, v) => setFormData((f) => ({ ...f, features: { ...f.features, [k]: v } }))} />
            </SectionCard>

            {/* 🆕 Round 28s278 — language rows, add/remove. */}
            <SectionCard icon={<Globe size={13} />} title="Languages · ภาษา">
              <LanguagesEditor value={formData.languageSkills} onChange={(next) => setFormData((f) => ({ ...f, languageSkills: next }))} />
            </SectionCard>

            {/* 🆕 Round 28s278 — services multi-select (canonical SKU ids). */}
            <SectionCard icon={<Sparkle size={13} />} title="Services · บริการที่ทำได้">
              <ServicesEditor value={formData.servicesAvailable} onChange={(next) => setFormData((f) => ({ ...f, servicesAvailable: next }))} />
            </SectionCard>

            {/* 🆕 Round 28s278 — credential rows, add/remove. */}
            <SectionCard icon={<Info size={13} />} title="Credentials · ใบรับรอง">
              <CredentialsEditor value={formData.credentials} onChange={(next) => setFormData((f) => ({ ...f, credentials: next }))} />
            </SectionCard>

            {/* 🆕 Round 28s278 — bios per language. */}
            <SectionCard icon={<Notebook size={13} />} title="Bio · ประวัติแนะนำ (per language)">
              <BiosEditor value={formData.bios} onChange={(code, v) => setFormData((f) => ({ ...f, bios: { ...f.bios, [code]: v } }))} />
            </SectionCard>

            {/* 🆕 Round 28s278 gallery URL rows · 28s280 photo upload. */}
            <SectionCard icon={<ImageIcon size={13} />} title={`Gallery · แกลเลอรี (${formData.gallery.filter(Boolean).length})`}>
              <GalleryEditor value={formData.gallery} onChange={(next) => setFormData((f) => ({ ...f, gallery: next }))} docId={docId} />
            </SectionCard>

            <SectionCard icon={<EyeSlash size={13} />} title="Visibility · การมองเห็น">
              <Box sx={{ display: "flex", gap: 1 }}>
                <Box
                  onClick={() => setFormData((f) => ({ ...f, hidden: !f.hidden }))}
                  sx={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: "10px", padding: "9px 14px", border: `1px solid ${formData.hidden ? "rgba(220,38,38,0.25)" : adminColor.line}`, background: formData.hidden ? "rgba(220,38,38,0.09)" : adminColor.panel, color: formData.hidden ? adminColor.red : adminColor.dim }}
                >
                  <EyeSlash size={14} weight={formData.hidden ? "fill" : "regular"} /> Hide from Homepage · ซ่อน
                </Box>
                <Box
                  onClick={() => setFormData((f) => ({ ...f, blocked: !f.blocked }))}
                  sx={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: "10px", padding: "9px 14px", border: `1px solid ${formData.blocked ? "rgba(220,38,38,0.25)" : adminColor.line}`, background: formData.blocked ? "rgba(220,38,38,0.09)" : adminColor.panel, color: formData.blocked ? adminColor.red : adminColor.dim }}
                >
                  <Prohibit size={14} weight={formData.blocked ? "fill" : "regular"} /> Blocked · บล็อก
                </Box>
              </Box>
            </SectionCard>

            <SectionCard icon={<TelegramLogo size={13} />} title="Contact · ติดต่อ">
              {/* 🆕 Round 28b27 — when set, the therapist receives a personal
                  DM from @SunRed24hBot every time a booking is assigned to
                  them. Onboarding: therapist sends /myid to @SunRed24hBot to
                  get this number. */}
              <TextField
                label="Telegram Chat ID (for job DMs)" fullWidth size="small" sx={fieldSx}
                value={formData.telegramChatId}
                onChange={(e) => setFormData((f) => ({ ...f, telegramChatId: e.target.value }))}
                helperText="กดปุ่มด้านล่างเพื่อสร้างรหัสเชื่อมบัญชี แล้วส่งให้พนักงาน · ช่องนี้จะเติมเองอัตโนมัติ"
                placeholder="e.g. 123456789"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              />

              {/* 🆕 28x.70 — self-service linking. The field above still works,
                  but retyping a 10-digit id copied off someone else's screen is
                  how dispatch silently ends up on the wrong phone. */}
              <Box sx={{ mt: 1.25 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={linking}
                  onClick={() => void makeLinkCode()}
                  sx={{
                    textTransform: "none", fontWeight: 700, fontSize: 12.5,
                    borderRadius: "999px", color: adminColor.accent,
                    borderColor: adminColor.line2,
                  }}
                >
                  {linking ? <CircularProgress size={15} /> : "สร้างรหัสเชื่อมบัญชี"}
                </Button>

                {linkCode && (
                  <Box
                    sx={{
                      mt: 1.25, p: 1.25, borderRadius: "10px",
                      background: `${adminColor.green}14`,
                      border: `1px solid ${adminColor.green}55`,
                    }}
                  >
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11, color: adminColor.dim, mb: 0.5 }}>
                      ส่งข้อความนี้ให้พนักงาน · ใช้ได้ครั้งเดียว หมดอายุใน 24 ชม.
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: adminFont.sans, fontSize: 13.5, fontWeight: 700,
                        color: adminColor.text, wordBreak: "break-word",
                      }}
                    >
                      ทักบอท @SunRed24hBot แล้วพิมพ์ /link {linkCode}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `ทักบอท @SunRed24hBot แล้วพิมพ์ /link ${linkCode}`
                        );
                        toast.success("คัดลอกแล้ว");
                      }}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.green, mt: 0.5, px: 0 }}
                    >
                      คัดลอกข้อความ
                    </Button>
                  </Box>
                )}
              </Box>
            </SectionCard>

            {/* 🆕 28x.81 (founder: "บัญชียังไม่เปิดใช้งาน ... ให้ติดต่อมาขอให้
                แอดมินซิงก์งาน กับตั้งค่าช่องงาน") — a deliberate activation step,
                separate from linking. Linking (above) proves who she is;
                activation is admin confirming the job sync + channel setup are
                done before she can operate the staff app at all. Saved with
                the rest of this form's Save button, same as every other field
                here — not written immediately, so a half-finished onboarding
                (link created, sync not yet run) can't accidentally go live. */}
            <SectionCard icon={<ShieldCheck size={13} />} title="Staff Access · เปิดใช้งานบัญชีพนักงาน">
              <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11, color: adminColor.dim, mb: 1, lineHeight: 1.6 }}>
                ปิดไว้จนกว่าจะซิงก์งาน (หน้ารายชื่อพนักงาน → ซิงก์สิทธิ์งานพนักงาน) และตั้งค่าช่องงานเรียบร้อย ·
                ระหว่างนี้พนักงานล็อกอินได้แต่จะเห็นแค่หน้าจอ &quot;บัญชียังไม่เปิดใช้งาน&quot;
              </Typography>
              <Box
                onClick={() => setFormData((f) => ({ ...f, staffActive: !f.staffActive }))}
                sx={{
                  display: "flex", alignItems: "center", gap: "8px", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", borderRadius: "10px", padding: "9px 14px",
                  border: `1px solid ${formData.staffActive ? "rgba(22,163,74,0.30)" : adminColor.line}`,
                  background: formData.staffActive ? "rgba(22,163,74,0.10)" : adminColor.panel,
                  color: formData.staffActive ? "#16a34a" : adminColor.dim,
                }}
              >
                <ShieldCheck size={14} weight={formData.staffActive ? "fill" : "regular"} />
                {formData.staffActive ? "เปิดใช้งานแล้ว · Active" : "ยังไม่เปิดใช้งาน · Inactive"}
              </Box>

              {/* 🆕 28x.88 — the toggle above only means anything once she has
                  an actual login (uid on the doc). Surface that gap here and
                  let admin close it in one click, rather than assuming the
                  toggle alone means she can sign in. */}
              <Box sx={{ mt: 1.25 }}>
                {rawDoc.uid ? (
                  <>
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11.5, color: adminColor.green, fontWeight: 700, mb: 0.75 }}>
                      ✓ มีบัญชีเข้าใช้งานแล้ว
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={resettingPassword}
                      onClick={() => void resetPassword()}
                      sx={{
                        textTransform: "none", fontWeight: 700, fontSize: 12.5,
                        borderRadius: "999px", color: adminColor.accent,
                        borderColor: adminColor.line2,
                      }}
                    >
                      {resettingPassword ? <CircularProgress size={15} /> : "รีเซ็ตรหัสผ่าน"}
                    </Button>
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 10.5, color: adminColor.dim, mt: 0.5 }}>
                      ลืมรหัสผ่าน หรือดูข้อมูลไม่ทัน กดรีเซ็ตเพื่อออกรหัสใหม่ได้ตลอด
                    </Typography>
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={creatingAccount}
                      onClick={() => void createAccount()}
                      sx={{
                        textTransform: "none", fontWeight: 700, fontSize: 12.5,
                        borderRadius: "999px", color: adminColor.accent,
                        borderColor: adminColor.line2,
                      }}
                    >
                      {creatingAccount ? <CircularProgress size={15} /> : "สร้างบัญชีเข้าใช้งาน"}
                    </Button>
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 10.5, color: adminColor.dim, mt: 0.5 }}>
                      ยังไม่มีบัญชีล็อกอิน — พนักงานยังเข้าแอปไม่ได้แม้เปิดใช้งานด้านบนแล้ว
                    </Typography>
                  </>
                )}

                {accountCreds && (
                  <Box
                    sx={{
                      mt: 1.25, p: 1.25, borderRadius: "10px",
                      background: `${adminColor.green}14`,
                      border: `1px solid ${adminColor.green}55`,
                    }}
                  >
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11, color: adminColor.dim, mb: 0.5 }}>
                      ส่งข้อมูลนี้ให้พนักงาน · แสดงครั้งเดียว จดไว้ให้ดี
                    </Typography>
                    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 13.5, fontWeight: 700, color: adminColor.text }}>
                      Username: {accountCreds.username}
                      <br />
                      Password: {accountCreds.password}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `ล็อกอินเข้าแอป SunRed ได้ที่ sunred.vip ค่ะ\nUsername: ${accountCreds.username}\nPassword: ${accountCreds.password}`
                        );
                        toast.success("คัดลอกแล้ว");
                      }}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.green, mt: 0.5, px: 0 }}
                    >
                      คัดลอกข้อความ
                    </Button>
                  </Box>
                )}
              </Box>
            </SectionCard>

            {/* 🆕 Round 28s314 — bank account for the Pay-Therapists transfer
                flow. The number shows on the payout card with a copy button so
                the admin can transfer the therapist's cut. */}
            <SectionCard icon={<Bank size={13} />} title="Payout Account · บัญชีธนาคาร">
              <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <TextField
                  label="Bank" fullWidth size="small" sx={fieldSx}
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. Kasikorn · SCB · PromptPay"
                />
                <TextField
                  label="Account / PromptPay" fullWidth size="small" sx={fieldSx}
                  value={bankForm.bankAccount}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankAccount: e.target.value }))}
                  placeholder="e.g. 123-4-56789-0"
                  inputProps={{ inputMode: "numeric" }}
                />
                <TextField
                  label="Account name" fullWidth size="small" sx={fieldSx}
                  value={bankForm.bankAccountName}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankAccountName: e.target.value }))}
                  placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
                />
              </Box>
            </SectionCard>
          </Box>
        )}

        <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${adminColor.line}` }}>
          <Button
            onClick={() => navigate(`/therapists/${docId}`)}
            startIcon={<Eye size={15} />}
            sx={{ color: adminColor.accent, textTransform: "none", fontWeight: 700 }}
          >
            View Public Profile · ดูโปรไฟล์
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const ReadRow: React.FC<{ icon: React.ReactNode; label: string; value: string; alert?: boolean }> = ({ icon, label, value, alert }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel2, borderRadius: "10px", p: "9px 13px" }}>
    <Box sx={{ color: alert ? adminColor.red : adminColor.dim, display: "flex" }}>{icon}</Box>
    <Typography sx={{ fontSize: 11.5, color: adminColor.dim, minWidth: 70 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: alert ? adminColor.red : adminColor.text, ml: "auto", textAlign: "right" }}>{value}</Typography>
  </Box>
);

export default AdminTherapistDetailPage;
