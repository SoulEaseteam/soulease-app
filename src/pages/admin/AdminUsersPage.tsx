// src/pages/admin/AdminUsersPage.tsx
//
// 🆕 Round 28s234 (Phase 4 — CRM) — added a "Customer Insights" panel above
//   the account grid. WHY grouped by phone, not the `users` collection: most
//   guests book without signing up (BookingFlowPage writes userId: user?.uid
//   ?? null — guest checkout is the norm per CLAUDE.md), so `users` misses
//   most real customers. Phone is always present on a booking, so it's the
//   only reliable key for "is this a repeat guest." VIP = 5+ completed
//   bookings; no-show count flags guests worth a deposit/confirm-call policy.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Crown, Warning, MagnifyingGlass, UsersThree, Repeat, CurrencyCircleDollar, CaretDown, CircleNotch, ProhibitInset, Copy } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
// 🆕 28w.60 — membership enrollment (SRD- codes) on the customer insights drawer.
import {
  membershipFor, menuSpendForBooking, isReservedShopBooking, isTestLocationBooking, applyMembershipConfig, generateMemberCode, tierRank,
  MEMBERSHIP_COLORS, MEMBERSHIP_TIERS, type MembershipTier, type MembershipThresholds,
} from "@/utils/membership";
import { countryFromPhone, normPhone, type PhoneCountry } from "@/utils/phoneCountry";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

type Role = "admin" | "therapist" | "user";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Role | null;
}

// 🆕 Round 28s286 — a compact per-booking row kept on each guest so the
//   profile drawer can show their full history.
interface BookingLite {
  id: string;
  date: Date | null;
  serviceName: string;
  therapistName: string;
  amount: number;
  status: string;
}

interface CustomerInsight {
  phone: string;        // normalized display key
  country: PhoneCountry | null; // resolved from the original phone's dial code
  name: string;
  orders: number;       // all bookings placed (incl. cancelled)
  served: number;       // actually-delivered (completed/done) — the VIP basis
  noShowCount: number;
  totalSpent: number;   // revenue from served bookings only
  lastVisit: Date | null; // service date of the most recent served booking
  bookings: BookingLite[]; // full history, newest first (built at aggregation)
}

// mode of a string list — used for "favorite therapist / service".
function modeOf(arr: string[]): string | null {
  const counts: Record<string, number> = {};
  let best: string | null = null;
  let bestN = 0;
  for (const x of arr) {
    if (!x) continue;
    counts[x] = (counts[x] || 0) + 1;
    if (counts[x] > bestN) { bestN = counts[x]; best = x; }
  }
  return best;
}

const VIP_THRESHOLD = 5;
const NO_SHOW_STATUSES = new Set(["no_show", "no-show", "noshow"]);
// 🆕 Round 28s285 — a booking counts as a real "visit" + realized revenue
//   only once it's actually been delivered. Everything else (cancelled,
//   still-pending, refunded, etc.) is an order but not a served visit.
const SERVED_STATUSES = new Set(["completed", "done"]);


// 🆕 Round 28s288 — flatten a full booking doc into label/value pairs for
//   the expandable history row. Only shows fields that are actually present.
function bookingDetailPairs(d: Record<string, unknown>): Array<[string, string]> {
  const num = (v: unknown) => Number(v ?? 0);
  const thb = (v: unknown) => `฿${num(v).toLocaleString()}`;
  const loc = typeof d.location === "string"
    ? d.location
    : d.location && typeof d.location === "object"
      ? `${(d.location as { lat?: number }).lat}, ${(d.location as { lng?: number }).lng}`
      : "";
  const paid = d.paid === true || d.paymentStatus === "paid";
  const pairs: Array<[string, string]> = [];
  const dateTime = `${(d.date as string) ?? ""} ${(d.time as string) ?? ""}`.trim();
  if (dateTime) pairs.push(["วันเวลา", dateTime]);
  if (d.phone) pairs.push(["โทร", String(d.phone)]);
  if (loc) pairs.push(["สถานที่", loc]);
  pairs.push(["บริการ", `${(d.serviceName as string) ?? "—"}${d.duration ? ` · ${d.duration} min` : ""}`]);
  if (d.therapistName) pairs.push(["หมอนวด", String(d.therapistName)]);
  pairs.push(["การจ่าย", `${(d.payment as string) ?? "—"} · ${paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}`]);
  if (d.servicePrice != null) pairs.push(["ค่าบริการ", thb(d.servicePrice)]);
  if (num(d.taxiFee) > 0) pairs.push(["ค่าเดินทาง", thb(d.taxiFee)]);
  if (num(d.discountAmount) > 0) pairs.push(["ส่วนลด", `-${thb(d.discountAmount)}`]);
  pairs.push(["ยอดรวม", thb(d.totalPrice ?? d.servicePrice)]);
  const note = (d.addressNote as string) || (d.note as string);
  if (note) pairs.push(["โน้ต", note]);
  if (d.reviewText) {
    const stars = d.rating ? "★".repeat(Math.max(0, Math.min(5, Math.round(num(d.rating))))) + " " : "";
    pairs.push(["รีวิว", `${stars}${d.reviewText}`]);
  }
  return pairs;
}

// 🆕 Round 28s286 — colour a booking's status chip in the profile drawer.
function statusColor(status: string): string {
  if (SERVED_STATUSES.has(status)) return adminColor.green;
  if (NO_SHOW_STATUSES.has(status)) return adminColor.red;
  if (["cancelled", "canceled", "refunded", "failed", "rejected"].includes(status)) return adminColor.dim;
  return adminColor.blue; // confirmed / paid / pending / in_progress
}

function serviceDate(b: { startAt?: { toDate?: () => Date }; date?: string }): Date | null {
  if (b.startAt?.toDate) {
    const d = b.startAt.toDate();
    if (d && !isNaN(d.getTime())) return d;
  }
  if (typeof b.date === "string") {
    const d = new Date(b.date);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<User | null>(null);

  // 🆕 Round 28s234 — customer insights (grouped by phone from `bookings`).
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const currentAdminUid = auth.currentUser?.uid;

  // --------------------------------------------------------------------
  // Load Users
  // --------------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));

      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<User, "id">),
        }))
      );
    } catch (err) {
      console.error("Fetch users failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // --------------------------------------------------------------------
  // 🆕 Round 28s234 — customer insights from bookings, grouped by phone.
  // --------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "bookings"));
        const byPhone: Record<string, CustomerInsight> = {};
        snap.forEach((d) => {
          const b = d.data() as {
            phone?: string; contactName?: string; customerName?: string;
            status?: string; totalPrice?: number; servicePrice?: number;
            taxiFee?: number; paymentFee?: number;
            locationName?: string; address?: string;
            startAt?: { toDate?: () => Date }; date?: string;
            serviceName?: string; therapistName?: string;
          };
          const raw = b.phone?.trim();
          if (!raw) return;
          const phone = normPhone(raw);
          if (!phone) return;
          // 🆕 28x.99u — admin's own placeholder-phone bookings (guest's real
          //   number wasn't bookable, put in the note instead) aren't a real
          //   customer — 126 real bookings, Aug 2025-Jul 2026, were showing
          //   up here as a fake top-spending "SUNRED" VIP guest.
          // 🆕 28x.99v — plus known QA test addresses (see isTestLocationBooking).
          if (isReservedShopBooking(b) || isTestLocationBooking(b)) return;
          if (!byPhone[phone]) {
            byPhone[phone] = {
              phone,
              // 🆕 Round 28s287 — detect country from the ORIGINAL phone
              //   (raw still has its +66/+86/… dial code; the normalized
              //   key has dropped it for Thai numbers).
              country: countryFromPhone(raw),
              name: b.contactName || b.customerName || phone,
              orders: 0, served: 0, noShowCount: 0, totalSpent: 0, lastVisit: null, bookings: [],
            };
          }
          const row = byPhone[phone];
          // Prefer a real name over the phone-as-name placeholder.
          const nm = (b.contactName || b.customerName || "").trim();
          if (nm && (row.name === row.phone || !row.name)) row.name = nm;

          const status = b.status ?? "";
          // Real amount paid (incl. taxi/surcharge) — for the per-booking
          // receipt list below, same as AdminUsersPage's own single-booking
          // "ยอดรวม" line elsewhere in this file.
          const amount = b.totalPrice ?? b.servicePrice ?? 0;
          const visit = serviceDate(b);
          row.orders += 1;
          row.bookings.push({
            id: d.id,
            date: visit,
            serviceName: b.serviceName ?? "",
            therapistName: b.therapistName ?? "",
            amount,
            status,
          });
          if (NO_SHOW_STATUSES.has(status)) row.noShowCount += 1;
          if (SERVED_STATUSES.has(status)) {
            row.served += 1;
            // 🆕 28x.99u — was `+= amount` (includes taxi/surcharge); the
            //   suggested tier shown here must use the same menu-only
            //   formula AdminMembersPage enrolls on, or a guest with heavy
            //   taxi spend could show a higher suggested tier here than
            //   what she'd actually be enrolled at.
            row.totalSpent += menuSpendForBooking(b);
            if (visit && (!row.lastVisit || visit > row.lastVisit)) row.lastVisit = visit;
          }
        });
        // Newest booking first within each guest.
        Object.values(byPhone).forEach((r) => r.bookings.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)));
        // Sort guests by realized value (served visits), then lifetime spend.
        setInsights(Object.values(byPhone).sort((a, b) => b.served - a.served || b.totalSpent - a.totalSpent));
      } catch (err) {
        console.error("[customer insights] fetch failed:", err);
      } finally {
        setInsightsLoading(false);
      }
    })();
  }, []);

  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string | null>(null); // ISO code · "__none__" · null=all
  // 🆕 28x.41 (founder: "ปุ่มกรอง ลูกค้าตามเลเวล + กรองคนที่เป็นสมาชิกและยังไม่เป็น")
  const [tierFilter, setTierFilter] = useState<MembershipTier | "__all__">("__all__");
  const [memberFilter, setMemberFilter] = useState<"__all__" | "member" | "nonmember">("__all__");
  // 🆕 28x.41 (founder: "ให้ดูในจอมือถือสะดวกขึ้น") — the 8-col DataGrid is
  //   cramped on a phone; on narrow screens we swap it for a stacked card list.
  const isMobile = useMediaQuery("(max-width:600px)");
  const [selectedGuest, setSelectedGuest] = useState<CustomerInsight | null>(null);
  // 🆕 Round 28s288 — one history row can expand to its FULL booking doc,
  //   fetched on demand (an old booking may be outside the Bookings feed
  //   window, so we read it directly by id here).
  const [openBooking, setOpenBooking] = useState<{ id: string; loading: boolean; data: Record<string, unknown> | null } | null>(null);

  const openHistoryBooking = async (id: string) => {
    if (openBooking?.id === id) { setOpenBooking(null); return; }
    setOpenBooking({ id, loading: true, data: null });
    try {
      const snap = await getDoc(doc(db, "bookings", id));
      setOpenBooking({ id, loading: false, data: snap.exists() ? (snap.data() as Record<string, unknown>) : null });
    } catch (err) {
      console.error("[history booking] fetch failed", err);
      setOpenBooking({ id, loading: false, data: null });
    }
  };
  const closeGuest = () => { setSelectedGuest(null); setOpenBooking(null); setBlockFlow(false); setBlockReason(""); setMemberEditing(false); };

  // 🆕 Round 28s293 — live set of blocked phone numbers, so the guest
  //   drawer can show a "Blocked" badge and toggle Block/Unblock in one
  //   click without leaving Customer Insights. Same `blockedPhones`
  //   collection the booking-flow submit guard and AdminBlockedDevicesPage
  //   read/write, keyed by normPhone().
  const [blockedPhones, setBlockedPhones] = useState<Set<string>>(new Set());
  const [blockFlow, setBlockFlow] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blockedPhones"), (snap) => {
      setBlockedPhones(new Set(snap.docs.map((d) => d.id)));
    });
    return () => unsub();
  }, []);

  const handleBlockGuest = async () => {
    if (!selectedGuest) return;
    setBlockSubmitting(true);
    try {
      const key = normPhone(selectedGuest.phone);
      await setDoc(doc(db, "blockedPhones", key), {
        phoneRaw: selectedGuest.phone,
        reason: blockReason.trim() || "Blocked by admin",
        createdAt: serverTimestamp(),
      });
      void logAdminAction("phone.block", { phone: key, reason: blockReason.trim() });
      setBlockFlow(false);
      setBlockReason("");
      toast.success(`บล็อกเบอร์ ${selectedGuest.phone} แล้ว`);
    } catch (err) {
      console.error("[block guest] failed:", err);
      toast.error("บล็อกไม่สำเร็จ");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleUnblockGuest = async () => {
    if (!selectedGuest) return;
    setBlockSubmitting(true);
    try {
      const key = normPhone(selectedGuest.phone);
      await deleteDoc(doc(db, "blockedPhones", key));
      void logAdminAction("phone.unblock", { phone: key });
      toast.success(`ปลดบล็อกเบอร์ ${selectedGuest.phone} แล้ว`);
    } catch (err) {
      console.error("[unblock guest] failed:", err);
      toast.error("ปลดบล็อกไม่สำเร็จ");
    } finally {
      setBlockSubmitting(false);
    }
  };

  // 🆕 28w.60 — membership enrollment. Records live in adminSettings/members
  //   (map keyed by normalized phone) so no new collection / rules deploy is
  //   needed; thresholds come from adminSettings/membership.
  type MemberRec = { code: string; tier: MembershipTier; name?: string; createdAtMs: number; updatedAtMs: number };
  const [members, setMembers] = useState<Record<string, MemberRec>>({});
  const nowMs = useMemo(() => Date.now(), []);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "members"), (snap) => {
      const data = snap.data() as { members?: Record<string, MemberRec> } | undefined;
      setMembers(data?.members ?? {});
    }, () => {});
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "membership"), (snap) => {
      applyMembershipConfig((snap.data() as Partial<MembershipThresholds>) ?? null);
      // bump `members` identity so the open drawer recomputes tier with new cfg
      setMembers((m) => ({ ...m }));
    }, () => {});
    return () => unsub();
  }, []);

  const [memberSaving, setMemberSaving] = useState(false);
  // 🆕 28w.61b (founder "แก้ไขได้ทุกอย่าง") — manual edit of a member's code + tier.
  const [memberEditing, setMemberEditing] = useState(false);
  const [editCode, setEditCode] = useState("");
  const [editTier, setEditTier] = useState<MembershipTier>("Bronze");
  const computedTierFor = (g: CustomerInsight) =>
    membershipFor({ served: g.served, totalSpent: g.totalSpent, lastVisitMs: g.lastVisit?.getTime() ?? 0, noShowCount: g.noShowCount }, nowMs).tier;
  // 🆕 28x.41 — a guest's level for the filter + card chip: the enrolled member
  //   tier if they hold an SRD- code, else the tier their history qualifies for.
  const isEnrolledMember = (g: CustomerInsight) => !!members[normPhone(g.phone)];
  const effectiveTier = (g: CustomerInsight): MembershipTier | null =>
    members[normPhone(g.phone)]?.tier ?? computedTierFor(g);

  // Full-doc replace (not merge) so removing a member key actually deletes it.
  const writeMembers = async (next: Record<string, MemberRec>) => {
    await setDoc(doc(db, "adminSettings", "members"), { members: next });
  };
  const enrollGuest = async () => {
    if (!selectedGuest) return;
    setMemberSaving(true);
    try {
      const key = normPhone(selectedGuest.phone);
      const tier: MembershipTier = computedTierFor(selectedGuest) ?? "Bronze";
      const rec: MemberRec = { code: generateMemberCode(tier), tier, name: selectedGuest.name, createdAtMs: Date.now(), updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      void logAdminAction("member.enroll", { phone: key, code: rec.code, tier });
      toast.success(`สมัครสมาชิกแล้ว · ${rec.code}`);
    } catch (e) { console.error("[member enroll] failed", e); toast.error("สมัครไม่สำเร็จ"); }
    finally { setMemberSaving(false); }
  };
  const resetMemberCode = async () => {
    if (!selectedGuest) return;
    const key = normPhone(selectedGuest.phone); const cur = members[key]; if (!cur) return;
    setMemberSaving(true);
    try {
      const rec: MemberRec = { ...cur, code: generateMemberCode(cur.tier), updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      void logAdminAction("member.reset", { phone: key, code: rec.code });
      toast.success(`รีเซตรหัสแล้ว · ${rec.code}`);
    } catch (e) { console.error("[member reset] failed", e); toast.error("รีเซตไม่สำเร็จ"); }
    finally { setMemberSaving(false); }
  };
  const upgradeMemberCode = async () => {
    if (!selectedGuest) return;
    const key = normPhone(selectedGuest.phone); const cur = members[key]; if (!cur) return;
    const to = computedTierFor(selectedGuest);
    if (!to || tierRank(to) <= tierRank(cur.tier)) return;
    setMemberSaving(true);
    try {
      const rec: MemberRec = { ...cur, tier: to, code: generateMemberCode(to), updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      void logAdminAction("member.upgrade", { phone: key, code: rec.code, tier: to });
      toast.success(`อัปเกรดเป็น ${to} · ${rec.code}`);
    } catch (e) { console.error("[member upgrade] failed", e); toast.error("อัปเกรดไม่สำเร็จ"); }
    finally { setMemberSaving(false); }
  };
  const startEditMember = (rec: MemberRec) => { setEditCode(rec.code); setEditTier(rec.tier); setMemberEditing(true); };
  const saveMemberEdit = async () => {
    if (!selectedGuest) return;
    const key = normPhone(selectedGuest.phone); const cur = members[key]; if (!cur) return;
    const code = editCode.trim().toUpperCase();
    if (!code) { toast.error("ใส่รหัสก่อน"); return; }
    setMemberSaving(true);
    try {
      const rec: MemberRec = { ...cur, code, tier: editTier, updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      void logAdminAction("member.edit", { phone: key, code, tier: editTier });
      setMemberEditing(false);
      toast.success("บันทึกแล้ว");
    } catch (e) { console.error("[member edit] failed", e); toast.error("บันทึกไม่สำเร็จ"); }
    finally { setMemberSaving(false); }
  };
  const removeMember = async () => {
    if (!selectedGuest) return;
    const key = normPhone(selectedGuest.phone); if (!members[key]) return;
    setMemberSaving(true);
    try {
      const next = { ...members }; delete next[key];
      await writeMembers(next);
      void logAdminAction("member.remove", { phone: key });
      setMemberEditing(false);
      toast.success("ยกเลิกสมาชิกแล้ว");
    } catch (e) { console.error("[member remove] failed", e); toast.error("ยกเลิกไม่สำเร็จ"); }
    finally { setMemberSaving(false); }
  };

  // 🆕 Round 28s287b — guest count per country (doubles as the filter row).
  const countryBreakdown = useMemo(() => {
    const m = new Map<string, { country: PhoneCountry; count: number }>();
    let unknown = 0;
    for (const i of insights) {
      if (i.country) {
        const e = m.get(i.country.code);
        if (e) e.count += 1;
        else m.set(i.country.code, { country: i.country, count: 1 });
      } else unknown += 1;
    }
    return { list: Array.from(m.values()).sort((a, b) => b.count - a.count), unknown };
  }, [insights]);

  const filteredInsights = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return insights.filter((i) => {
      const matchesText = !q || i.name.toLowerCase().includes(q) || (qd && i.phone.includes(qd));
      const matchesCountry =
        !countryFilter ||
        (countryFilter === "__none__" ? !i.country : i.country?.code === countryFilter);
      // 🆕 28x.41 — level + membership filters.
      const matchesTier = tierFilter === "__all__" || effectiveTier(i) === tierFilter;
      const enrolled = isEnrolledMember(i);
      const matchesMember =
        memberFilter === "__all__" ||
        (memberFilter === "member" ? enrolled : !enrolled);
      return matchesText && matchesCountry && matchesTier && matchesMember;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights, query, countryFilter, tierFilter, memberFilter, members, nowMs]);

  const vipCount = useMemo(() => insights.filter((i) => i.served >= VIP_THRESHOLD).length, [insights]);
  const repeatCount = useMemo(() => insights.filter((i) => i.served >= 2).length, [insights]);
  const withNoShow = useMemo(() => insights.filter((i) => i.noShowCount > 0).length, [insights]);
  const totalRevenue = useMemo(() => insights.reduce((s, i) => s + i.totalSpent, 0), [insights]);

  // 🆕 Round 28s286 — derived facts for the selected guest's profile drawer.
  const guestStats = useMemo(() => {
    const g = selectedGuest;
    if (!g) return null;
    const served = g.bookings.filter((b) => SERVED_STATUSES.has(b.status));
    return {
      favTherapist: modeOf(served.map((b) => b.therapistName)),
      favService: modeOf(served.map((b) => b.serviceName)),
      avgSpend: g.served ? Math.round(g.totalSpent / g.served) : 0,
      daysSince: g.lastVisit ? Math.floor((Date.now() - g.lastVisit.getTime()) / 86_400_000) : null,
    };
  }, [selectedGuest]);

  // --------------------------------------------------------------------
  // Edit functions
  // --------------------------------------------------------------------
  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setForm({ ...u });
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!editingUser || !form) return;

    const isSelf = editingUser.id === currentAdminUid;

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: isSelf ? editingUser.role : form.role, // ❗ ห้ามเปลี่ยน role ตัวเอง
      });
      handleCloseEdit();
      await fetchUsers();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // --------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------
  const handleDelete = async (id?: string) => {
    if (!id) return;

    if (id === currentAdminUid) {
      toast.warning("You cannot delete your own admin account.");
      return;
    }

    if (!confirm("❗ ต้องการลบผู้ใช้นี้หรือไม่?")) return;

    try {
      await deleteDoc(doc(db, "users", id));
      await fetchUsers();
    } catch (err) {
      console.error("Delete user failed:", err);
    }
  };

  // --------------------------------------------------------------------
  // DataGrid Columns
  // --------------------------------------------------------------------
  const columns: GridColDef<User>[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1.2 },
    { field: "phone", headerName: "Phone", flex: 1 },
    { field: "role", headerName: "Role", flex: 0.8 },

    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => {
        const row = params.row;

        return (
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleOpenEdit(row)}
            >
              Edit
            </Button>

            <Button
              variant="outlined"
              size="small"
              color="error"
              disabled={row.id === currentAdminUid} // ❗ ป้องกันลบตัวเอง
              onClick={() => handleDelete(row.id)}
            >
              Delete
            </Button>
          </Stack>
        );
      },
    },
  ];

  const insightColumns: GridColDef<CustomerInsight>[] = [
    {
      field: "name", headerName: "Guest", flex: 1.1,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, height: "100%" }}>
          {p.row.served >= VIP_THRESHOLD && <Crown size={14} weight="fill" color={adminColor.amber} />}
          {/* 🆕 Round 28s293 — glanceable "Blocked" flag in the list, not just the drawer. */}
          {blockedPhones.has(normPhone(p.row.phone)) && <ProhibitInset size={14} weight="fill" color={adminColor.red} />}
          <span style={{ fontWeight: p.row.served >= VIP_THRESHOLD ? 700 : 400 }}>{p.row.name}</span>
        </Box>
      ),
    },
    {
      field: "phone", headerName: "Phone", flex: 1,
      // 🆕 Round 28s285 — tap-to-call, matching the booking-list convention.
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <a href={`tel:${p.row.phone}`} style={{ color: adminColor.accent, textDecoration: "none", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
            {p.row.phone}
          </a>
        </Box>
      ),
    },
    {
      // 🆕 Round 28s287 — country from the dial code (tourist-heavy business,
      //   so knowing the caller's country helps language/therapist match).
      field: "country", headerName: "Country", flex: 0.7,
      valueGetter: (_v, row) => row.country?.name ?? "",
      renderCell: (p) => p.row.country ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, height: "100%" }}>
          <span style={{ fontSize: 15 }}>{p.row.country.flag}</span>
          <span>{p.row.country.code}</span>
        </Box>
      ) : <span style={{ color: adminColor.dim }}>—</span>,
    },
    {
      field: "served", headerName: "Visits", flex: 0.6, type: "number",
      description: "จำนวนครั้งที่มารับบริการจริง (completed) — เกณฑ์ VIP",
      renderCell: (p) => <span style={{ ...(adminFigureSx as object), fontWeight: 700 }}>{p.row.served}</span>,
    },
    {
      field: "orders", headerName: "Orders", flex: 0.6, type: "number",
      description: "จำนวนออเดอร์ทั้งหมด (รวมยกเลิก)",
      renderCell: (p) => <span style={{ ...(adminFigureSx as object), color: adminColor.dim }}>{p.row.orders}</span>,
    },
    {
      field: "noShowCount", headerName: "No-shows", flex: 0.7, type: "number",
      renderCell: (p) => p.row.noShowCount > 0 ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%", color: adminColor.red, fontWeight: 700 }}>
          <Warning size={13} weight="fill" />{p.row.noShowCount}
        </Box>
      ) : <span style={{ color: adminColor.dim }}>0</span>,
    },
    {
      field: "totalSpent", headerName: "Total spent", flex: 0.9,
      valueFormatter: (v) => `฿${Number(v ?? 0).toLocaleString()}`,
    },
    {
      field: "lastVisit", headerName: "Last visit", flex: 0.9,
      valueFormatter: (v) => v ? new Date(v as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
    },
  ];

  // --------------------------------------------------------------------
  // Component Return — Round 28s234 Control Room dark theme
  // --------------------------------------------------------------------
  const gridSx = {
    background: adminColor.panel2,
    border: "none",
    color: adminColor.text,
    fontFamily: SANS,
    "& .MuiDataGrid-columnHeaders": { background: adminColor.panel3, color: adminColor.muted, borderColor: adminColor.line },
    "& .MuiDataGrid-cell": { borderColor: adminColor.line },
    "& .MuiDataGrid-row:hover": { background: adminColor.panel3 },
    "& .MuiDataGrid-footerContainer": { borderColor: adminColor.line, color: adminColor.muted },
    "& .MuiTablePagination-root": { color: adminColor.muted },
    "& .MuiDataGrid-overlay": { background: "transparent" },
  } as const;

  return (
    <Box p={3} sx={{ fontFamily: SANS }}>
      {/* ── Customer Insights (CRM) ─────────────────────────────────── */}
      {/* 🆕 Round 28r45 — bilingual header (English primary + Thai
          subtitle). Same operator-scan pattern as Dashboard (28r35). */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>
          Customer Insights
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
          ข้อมูลลูกค้า · CRM
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 1 }}>
          Grouped by phone across all bookings (merges +66/0 variants) · VIP = {VIP_THRESHOLD}+ delivered visits
        </Typography>
      </Box>

      {/* 🆕 Round 28s285 — icon-circle stat pills, matching Dashboard/Earnings.
          🆕 Round 28r45 — bilingual labels (English primary + tiny Thai
          sub) + hover lift + soft ink-tinted depth shadow (was flat
          hairline), + inner highlight shadow on icon plate (matches
          Bookings 28r44 pattern). */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap" }}>
        {([
          { icon: <UsersThree size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #6FA0AD, ${adminColor.accent})`, num: insights.length, label: "Unique guests", labelTh: "ลูกค้าไม่ซ้ำ", color: adminColor.text, tone: adminColor.accent },
          { icon: <Repeat size={16} color="#fff" weight="bold" />, grad: `radial-gradient(circle at 35% 30%, #3B82F6, ${adminColor.blue})`, num: repeatCount, label: "Repeat (2+)", labelTh: "กลับมาซ้ำ", color: adminColor.blue, tone: adminColor.blue },
          { icon: <Crown size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #F59E0B, ${adminColor.amber})`, num: vipCount, label: `VIP (${VIP_THRESHOLD}+)`, labelTh: "ลูกค้า VIP", color: adminColor.amber, tone: adminColor.amber },
          { icon: <Warning size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #EF4444, ${adminColor.red})`, num: withNoShow, label: "With no-shows", labelTh: "มีเบี้ยวนัด", color: adminColor.red, tone: adminColor.red },
          { icon: <CurrencyCircleDollar size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #22C55E, ${adminColor.green})`, num: `฿${totalRevenue.toLocaleString()}`, label: "Realized revenue", labelTh: "รายได้จริง", color: adminColor.green, tone: adminColor.green },
        ]).map((c, i) => (
          <Box
            key={i}
            sx={{
              display: "flex", alignItems: "center", gap: "10px",
              background: adminColor.panel, border: `1px solid ${adminColor.line}`,
              borderRadius: "15px", p: "8px 15px 8px 8px",
              boxShadow: "0 2px 10px rgba(31,41,51,0.04)",
              transition: "transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                background: `${c.tone}0A`,
                boxShadow: `0 4px 14px rgba(31,41,51,0.06), 0 2px 6px ${c.tone}22`,
              },
            }}
          >
            <Box
              sx={{
                width: 32, height: 32, borderRadius: "50%", background: c.grad,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px ${c.tone}33`,
              }}
            >
              {c.icon}
            </Box>
            <Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 17, color: c.color, lineHeight: 1.1 }}>{c.num}</Typography>
              <Typography sx={{ fontSize: 10, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, lineHeight: 1.1, mt: 0.15 }}>{c.label}</Typography>
              <Typography sx={{ fontSize: 9, color: adminColor.dim, fontWeight: 600, lineHeight: 1 }}>{c.labelTh}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* 🆕 Round 28s285 search + 28s287c country dropdown filter. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 220, maxWidth: 360, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          {/* 🆕 Round 28r45 — filter placeholder is English-only per the
              r43 founder rule ("ตรงตัวกรองไม่ต้อง"). */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
          />
        </Box>
        {/* 🆕 Round 28s287c (founder: "ทำเป็นดรอปดาว ดีกว่า") — country filter
            as a dropdown; each option shows flag + name + guest count.
            🆕 Round 28r45 — filter label English-only (r43). */}
        <TextField
          select size="small" label="Country"
          value={countryFilter ?? "__all__"}
          onChange={(e) => setCountryFilter(e.target.value === "__all__" ? null : e.target.value)}
          sx={{ minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel, color: adminColor.text, borderRadius: "12px", maxHeight: 380, boxShadow: "0 8px 24px rgba(31,41,51,0.10)" } } } }}
        >
          <MenuItem value="__all__">🌏 All ({insights.length})</MenuItem>
          {countryBreakdown.list.map(({ country, count }) => (
            <MenuItem key={country.code} value={country.code}>{country.flag} {country.name} ({count})</MenuItem>
          ))}
          {countryBreakdown.unknown > 0 && <MenuItem value="__none__">❔ Unknown ({countryBreakdown.unknown})</MenuItem>}
        </TextField>

        {/* 🆕 28x.41 — Level (tier) filter. Count each tier by effective level. */}
        <TextField
          select size="small" label="Level"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as MembershipTier | "__all__")}
          sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.10)" } } } }}
        >
          <MenuItem value="__all__">All levels</MenuItem>
          {MEMBERSHIP_TIERS.map((t) => {
            const n = insights.filter((i) => effectiveTier(i) === t).length;
            return <MenuItem key={t} value={t}><span style={{ color: MEMBERSHIP_COLORS[t], fontWeight: 700 }}>●</span>&nbsp;{t} ({n})</MenuItem>;
          })}
        </TextField>

        {/* 🆕 28x.41 — Membership filter (enrolled SRD- vs not). */}
        <TextField
          select size="small" label="Membership"
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value as "__all__" | "member" | "nonmember")}
          sx={{ minWidth: 170, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.10)" } } } }}
        >
          <MenuItem value="__all__">All guests</MenuItem>
          <MenuItem value="member">👑 Members ({insights.filter(isEnrolledMember).length})</MenuItem>
          <MenuItem value="nonmember">Non-members ({insights.filter((i) => !isEnrolledMember(i)).length})</MenuItem>
        </TextField>
      </Box>

      {/* 🆕 28x.41 — phone: stacked card list; desktop: the full DataGrid. */}
      {isMobile ? (
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 11, color: adminColor.dim, mb: 1 }}>
            {filteredInsights.length} guests
          </Typography>
          <Stack spacing={1}>
            {filteredInsights
              .slice()
              .sort((a, b) => b.served - a.served)
              .map((g) => {
                const tier = effectiveTier(g);
                const tc = tier ? MEMBERSHIP_COLORS[tier] : adminColor.dim;
                const enrolled = isEnrolledMember(g);
                const blocked = blockedPhones.has(normPhone(g.phone));
                return (
                  <Box
                    key={g.phone}
                    onClick={() => setSelectedGuest(g)}
                    sx={{
                      background: adminColor.panel, border: `1px solid ${adminColor.line}`,
                      borderRadius: "14px", p: "11px 13px", cursor: "pointer",
                      "&:active": { background: adminColor.panel3 },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.5 }}>
                      {g.served >= VIP_THRESHOLD && <Crown size={14} weight="fill" color={adminColor.amber} />}
                      {blocked && <ProhibitInset size={14} weight="fill" color={adminColor.red} />}
                      <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: adminColor.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.name}
                      </Typography>
                      {tier && (
                        <Box sx={{ px: 0.8, py: "1px", borderRadius: 999, background: `${tc}1A`, border: `1px solid ${tc}55`, flexShrink: 0, display: "flex", alignItems: "center", gap: "3px" }}>
                          {enrolled && <Crown size={10} weight="fill" color={tc} />}
                          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: tc, lineHeight: 1.5 }}>{tier}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                      <span style={{ fontSize: 14 }}>{g.country?.flag ?? "🌐"}</span>
                      <a href={`tel:${g.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: adminColor.accent, textDecoration: "none", fontWeight: 600, fontSize: 12.5 }}>
                        {g.phone}
                      </a>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                      {[
                        { l: "Visits", v: String(g.served), strong: true },
                        { l: "Orders", v: String(g.orders) },
                        { l: "No-show", v: String(g.noShowCount), danger: g.noShowCount > 0 },
                        { l: "Spent", v: `฿${g.totalSpent.toLocaleString()}` },
                      ].map((s) => (
                        <Box key={s.l} sx={{ display: "flex", alignItems: "baseline", gap: 0.4 }}>
                          <Typography sx={{ ...adminFigureSx, fontSize: 13, fontWeight: s.strong ? 800 : 700, color: s.danger ? adminColor.red : adminColor.text }}>{s.v}</Typography>
                          <Typography sx={{ fontSize: 9, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{s.l}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            {filteredInsights.length === 0 && !insightsLoading && (
              <Typography sx={{ fontSize: 13, color: adminColor.dim, textAlign: "center", py: 3 }}>ไม่พบลูกค้าตามตัวกรอง</Typography>
            )}
          </Stack>
        </Box>
      ) : (
        <Paper sx={{ height: 440, p: 0, borderRadius: 3, background: adminColor.panel2, mb: 4, overflow: "hidden" }}>
          <DataGrid
            rows={filteredInsights}
            columns={insightColumns}
            loading={insightsLoading}
            getRowId={(row) => row.phone}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedGuest(p.row as CustomerInsight)}
            initialState={{ sorting: { sortModel: [{ field: "served", sort: "desc" }] } }}
            sx={{ ...gridSx, "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </Paper>
      )}

      {/* ── Registered accounts ──────────────────────────────────────── */}
      {/* 🆕 Round 28r45 — bilingual section header. */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 20, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>
          Accounts
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.35, letterSpacing: "0.02em" }}>
          บัญชีผู้ใช้ · signed-up users only
        </Typography>
      </Box>

      <Paper
        sx={{
          height: 640,
          p: 0,
          borderRadius: 3,
          background: adminColor.panel2,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          sx={gridSx}
        />
      </Paper>

      {/* ── Guest profile drawer (28s286) ─────────────────────────────── */}
      <Dialog open={!!selectedGuest} onClose={closeGuest} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { background: adminColor.bg, borderRadius: "18px" } } }}>
        {selectedGuest && guestStats && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {selectedGuest.served >= VIP_THRESHOLD && <Crown size={18} weight="fill" color={adminColor.amber} />}
                <Typography sx={{ fontFamily: adminFont.serif, fontSize: 20, fontWeight: 700, color: adminColor.text }}>{selectedGuest.name}</Typography>
                {/* 🆕 Round 28s293 — blocked-phone badge, matches the list flag. */}
                {blockedPhones.has(normPhone(selectedGuest.phone)) && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.red, background: `${adminColor.red}1A`, borderRadius: "6px", px: "7px", py: "2px" }}>
                    <ProhibitInset size={12} weight="fill" /> Blocked
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <a href={`tel:${selectedGuest.phone}`} style={{ color: adminColor.accent, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>{selectedGuest.phone}</a>
                {/* 🆕 28x.41 (founder: "โชว์สัญชาติ") — nationality chip, always shown
                    (falls back to Unknown when the phone has no resolvable dial code). */}
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: "8px", py: "2px", borderRadius: 999, background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
                  <span style={{ fontSize: 14 }}>{selectedGuest.country?.flag ?? "🌐"}</span>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: adminColor.muted }}>
                    {selectedGuest.country?.name ?? "Unknown"}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* stat pills — even 3-col grid so none becomes a giant bar */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }, gap: 1, mb: 2 }}>
                {[
                  { n: selectedGuest.served, l: "Visits" },
                  { n: selectedGuest.orders, l: "Orders" },
                  { n: guestStats.daysSince == null ? "—" : `${guestStats.daysSince}d`, l: "Since last" },
                  { n: `฿${selectedGuest.totalSpent.toLocaleString()}`, l: "Spent" },
                  { n: `฿${guestStats.avgSpend.toLocaleString()}`, l: "Avg / visit" },
                  { n: selectedGuest.noShowCount, l: "No-shows", danger: selectedGuest.noShowCount > 0 },
                ].map((s, i) => (
                  <Box key={i} sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 12px" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 16, color: s.danger ? adminColor.red : adminColor.text, lineHeight: 1.2 }}>{s.n}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.l}</Typography>
                  </Box>
                ))}
              </Box>

              {/* favorites — 🆕 Round 28r45 bilingual labels */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 2 }}>
                {[
                  { label: "Favorite therapist", sub: "หมอนวดที่ชอบ", val: guestStats.favTherapist },
                  { label: "Favorite service",   sub: "บริการที่ชอบ", val: guestStats.favService   },
                ].map((f, i) => (
                  <Box key={i} sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "10px 13px" }}>
                    <Typography sx={{ fontSize: 10, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 800, lineHeight: 1.15 }}>{f.label}</Typography>
                    <Typography sx={{ fontSize: 9, color: adminColor.dim, fontWeight: 600, mb: 0.4 }}>{f.sub}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: adminColor.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.val || "—"}</Typography>
                  </Box>
                ))}
              </Box>

              {/* 🆕 28w.60 — Membership enrollment (SRD- code / reset / upgrade) */}
              {(() => {
                const mKey = normPhone(selectedGuest.phone);
                const member = members[mKey];
                const computed = computedTierFor(selectedGuest);
                const shown = member?.tier ?? computed;
                const canUpgrade = !!member && !!computed && tierRank(computed) > tierRank(member.tier) && (computed === "Gold" || computed === "BlackVIP");
                const tc = shown ? MEMBERSHIP_COLORS[shown] : adminColor.dim;
                return (
                  <Box sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "12px 14px", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Crown size={16} weight="fill" color={tc} />
                        <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: adminColor.muted }}>Membership</Typography>
                      </Box>
                      {shown && (
                        <Box sx={{ px: 0.9, py: "2px", borderRadius: 999, background: `${tc}1A`, border: `1px solid ${tc}55` }}>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: tc, lineHeight: 1.4 }}>{shown}</Typography>
                        </Box>
                      )}
                    </Box>
                    {member ? (
                      memberEditing ? (
                        <>
                          {/* 🆕 28w.61b — edit everything: custom code + tier */}
                          <TextField
                            label="รหัสสมาชิก" value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                            size="small" fullWidth sx={{ mb: 1 }}
                            inputProps={{ style: { fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em", fontWeight: 700 } }}
                          />
                          <TextField
                            select label="Level" value={editTier}
                            onChange={(e) => setEditTier(e.target.value as MembershipTier)}
                            size="small" fullWidth sx={{ mb: 1.25 }}
                          >
                            {MEMBERSHIP_TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </TextField>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                            <Button size="small" variant="contained" disabled={memberSaving} onClick={saveMemberEdit}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", background: "linear-gradient(135deg,#D97C95,#C96F89)", "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" } }}>
                              บันทึก
                            </Button>
                            <Button size="small" variant="text" disabled={memberSaving} onClick={() => setMemberEditing(false)}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.muted }}>
                              ยกเลิก
                            </Button>
                            <Button size="small" variant="text" disabled={memberSaving} onClick={removeMember}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.red, ml: "auto" }}>
                              ลบสมาชิก
                            </Button>
                          </Box>
                        </>
                      ) : (
                        <>
                          {/* 🆕 28x.41 (founder: "กดคัดลอกได้") — tap the SRD code to copy it. */}
                          <Box
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              void navigator.clipboard?.writeText(member.code);
                              toast.success(`คัดลอกแล้ว · ${member.code}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                void navigator.clipboard?.writeText(member.code);
                                toast.success(`คัดลอกแล้ว · ${member.code}`);
                              }
                            }}
                            sx={{
                              display: "inline-flex", alignItems: "center", gap: 0.75, mb: 1,
                              cursor: "pointer", userSelect: "none", borderRadius: "8px",
                              px: 0.75, py: 0.25, ml: -0.75,
                              "&:hover": { background: adminColor.panel3 },
                            }}
                            aria-label="Copy membership code"
                          >
                            <Typography sx={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 800, letterSpacing: "0.08em", color: adminColor.text }}>
                              {member.code}
                            </Typography>
                            <Copy size={16} color={adminColor.dim} />
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            <Button size="small" variant="outlined" disabled={memberSaving} onClick={resetMemberCode}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", color: "#8A3A57", borderColor: "#B8567F", "&:hover": { borderColor: "#8A3A57", background: "rgba(184,86,127,0.06)" } }}>
                              รีเซตรหัส
                            </Button>
                            {canUpgrade && (
                              <Button size="small" variant="contained" disabled={memberSaving} onClick={upgradeMemberCode}
                                sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", background: "linear-gradient(135deg,#D97C95,#C96F89)", "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" } }}>
                                อัปเกรด → {computed}
                              </Button>
                            )}
                            <Button size="small" variant="outlined" disabled={memberSaving} onClick={() => startEditMember(member)}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", color: adminColor.muted, borderColor: adminColor.line2, "&:hover": { borderColor: adminColor.muted } }}>
                              แก้ไข
                            </Button>
                          </Box>
                          {computed && tierRank(computed) > tierRank(member.tier) && !canUpgrade && (
                            <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: 0.6 }}>ถึงเกณฑ์ {computed} แล้ว (อัปเกรดรหัสได้เมื่อถึง Gold/BlackVIP)</Typography>
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <Typography sx={{ fontSize: 12, color: adminColor.dim, mb: 1 }}>
                          ยังไม่ได้สมัคร · เกณฑ์ปัจจุบัน: <b style={{ color: tc }}>{computed ?? "ยังไม่เข้าเกณฑ์"}</b>
                        </Typography>
                        <Button size="small" variant="contained" disabled={memberSaving} onClick={enrollGuest}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", background: "linear-gradient(135deg,#D97C95,#C96F89)", "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" } }}>
                          + สมัครสมาชิก (รหัส SRD-)
                        </Button>
                      </>
                    )}
                  </Box>
                );
              })()}

              {/* history — 🆕 Round 28r45 bilingual header */}
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: adminColor.muted, mb: 0.15 }}>
                Booking history ({selectedGuest.bookings.length})
              </Typography>
              <Typography sx={{ fontSize: 10, color: adminColor.dim, fontWeight: 600, mb: 1 }}>ประวัติการจอง</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxHeight: 340, overflowY: "auto", pr: 0.5 }}>
                {selectedGuest.bookings.map((b) => {
                  const isOpen = openBooking?.id === b.id;
                  return (
                    <Box key={b.id} sx={{ background: adminColor.panel, border: `1px solid ${isOpen ? adminColor.accent : adminColor.line}`, borderRadius: "12px", overflow: "visible" }}>
                      {/* 🆕 Round 28s290 (founder screenshot: rows clipped/cramped) —
                          root cause confirmed via an isolated Artifact stress-test:
                          MUI's sx fontSize (raw numbers) resolves through
                          pxToRem, so it scales with the device's OS text-size
                          setting, while the row's padding was fixed px. On a
                          phone with "larger text" on, the single-line
                          whiteSpace:nowrap+ellipsis title collapsed to 2-3
                          characters and the amount/status crowded the edge —
                          reproduced at 2.4× text in the stress test, matching
                          the screenshot exactly. Fix: max 2 items per visual
                          line, and WRAP instead of truncate — text reflows
                          onto more lines under any scaling instead of
                          clipping/overlapping. Verified in isolation before
                          shipping this time. */}
                      <Box onClick={() => void openHistoryBooking(b.id)} sx={{ display: "flex", flexDirection: "column", gap: "6px", p: "12px 14px", cursor: "pointer", "&:hover": { background: adminColor.panel2 } }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, flexWrap: "wrap" }}>
                          <Typography sx={{ flex: "1 1 120px", minWidth: 0, fontSize: 13.5, fontWeight: 700, color: adminColor.text, wordBreak: "break-word", lineHeight: 1.3 }}>
                            {b.serviceName || "บริการ"}
                          </Typography>
                          <Typography sx={{ ...adminFigureSx, fontSize: 13.5, color: adminColor.text, flexShrink: 0, whiteSpace: "nowrap" }}>฿{b.amount.toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
                          <Typography sx={{ flex: "1 1 100px", minWidth: 0, fontSize: 11.5, color: adminColor.dim, wordBreak: "break-word", lineHeight: 1.35 }}>
                            {b.therapistName ? `${b.therapistName} · ` : ""}{b.date ? b.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
                            <Box sx={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: statusColor(b.status), background: `${statusColor(b.status)}1F`, borderRadius: "5px", px: "6px", py: "2px", whiteSpace: "nowrap" }}>{b.status || "—"}</Box>
                            <CaretDown size={14} color={adminColor.dim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
                          </Box>
                        </Box>
                      </Box>
                      {/* expanded full detail */}
                      {isOpen && (
                        <Box sx={{ borderTop: `1px solid ${adminColor.line}`, p: "11px 13px", background: adminColor.panel2 }}>
                          {openBooking?.loading ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: adminColor.dim, fontSize: 12.5, "@keyframes spinU": { to: { transform: "rotate(360deg)" } } }}>
                              <CircleNotch size={15} style={{ animation: "spinU .8s linear infinite" }} /> Loading… · กำลังโหลด
                            </Box>
                          ) : openBooking?.data ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {bookingDetailPairs(openBooking.data).map(([label, value], i) => (
                                <Box key={i} sx={{ display: "flex", gap: 1.25 }}>
                                  <Typography sx={{ fontSize: 11.5, color: adminColor.dim, minWidth: 74, flexShrink: 0 }}>{label}</Typography>
                                  <Typography sx={{ fontSize: 12.5, color: adminColor.text, wordBreak: "break-word" }}>{value}</Typography>
                                </Box>
                              ))}
                              <Typography sx={{ fontSize: 10.5, color: adminColor.dim, mt: "2px" }}>ID: {b.id}</Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: 12.5, color: adminColor.dim }}>Booking not found · ไม่พบข้อมูล (อาจถูกลบ)</Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
              {/* 🆕 Round 28s293 — block flow, inline (no nested Dialog).
                  🆕 Round 28r45 — bilingual copy on all admin controls. */}
              {blockFlow && (
                <Box sx={{ mt: 2, p: "12px 13px", background: adminColor.panel, border: `1px solid ${adminColor.red}55`, borderRadius: "12px" }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: adminColor.red, mb: "6px" }}>
                    Block {selectedGuest.phone} · บล็อกเบอร์นี้ — will no longer be able to book · จะจองผ่านเว็บไม่ได้อีก
                  </Typography>
                  <TextField
                    fullWidth size="small" placeholder="Reason · เหตุผล (e.g. เบี้ยวนัดหลายครั้ง)"
                    value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                    sx={{ mb: "8px", "& .MuiOutlinedInput-root": { background: adminColor.bg } }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small" variant="contained" disabled={blockSubmitting}
                      onClick={() => void handleBlockGuest()}
                      sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700, "&:hover": { background: "#B91C1C" } }}
                    >
                      Confirm block · ยืนยัน
                    </Button>
                    <Button size="small" onClick={() => { setBlockFlow(false); setBlockReason(""); }} sx={{ color: adminColor.muted, textTransform: "none" }}>
                      Cancel · ยกเลิก
                    </Button>
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {blockedPhones.has(normPhone(selectedGuest.phone)) ? (
                <Button
                  onClick={() => void handleUnblockGuest()}
                  disabled={blockSubmitting}
                  startIcon={<ProhibitInset size={15} />}
                  sx={{ color: adminColor.red, textTransform: "none", fontWeight: 700 }}
                >
                  Unblock · ปลดบล็อก
                </Button>
              ) : (
                !blockFlow && (
                  <Button
                    onClick={() => setBlockFlow(true)}
                    startIcon={<ProhibitInset size={15} />}
                    sx={{ color: adminColor.red, textTransform: "none", fontWeight: 700 }}
                  >
                    Block · บล็อก
                  </Button>
                )
              )}
              <Box sx={{ flex: 1 }} />
              <Button onClick={closeGuest} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>Close · ปิด</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ------------------ EDIT DIALOG ------------------ */}
      <Dialog open={!!editingUser} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>✏️ Edit User</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="dense"
            value={form?.name ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
          />

          <TextField
            label="Email"
            fullWidth
            margin="dense"
            value={form?.email ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, email: e.target.value } : p))}
          />

          <TextField
            label="Phone"
            fullWidth
            margin="dense"
            value={form?.phone ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, phone: e.target.value } : p))}
          />

          {/* ❗ ถ้าเป็น admin ตัวเอง => ปิดการแก้ role */}
          {/* 🆕 Round 28s265 (audit: dropdowns app-wide inheriting the
              global theme's translucent Paper background) — SelectProps
              forces an opaque menu; was missing here. */}
          <TextField
            select
            label="Role"
            fullWidth
            margin="dense"
            value={form?.role ?? "user"}
            onChange={(e) =>
              setForm((p) => (p ? { ...p, role: e.target.value as Role } : p))
            }
            disabled={editingUser?.id === currentAdminUid}
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } } }}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="therapist">Therapist</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </TextField>

          {editingUser?.id === currentAdminUid && (
            <Typography color="error" fontSize={13} mt={1}>
              ⚠️ You cannot modify your own admin role.
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
