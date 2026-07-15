// src/pages/admin/AdminMembersPage.tsx
//
// 🆕 Round 28w.77 (founder "admin/users เอาออก แล้วทำเมนูใหม่ ที่เป็นระบบสมัคร
//   สมาชิก") — the enrol box was cramped into the Customer Insights toolbar and
//   wrapped badly. Membership enrolment now has its own menu: register a guest,
//   then see / manage every SRD- member in one table.
//
//   Split of concerns (don't merge these two pages):
//     • /admin/membership — the RULES (tier thresholds + staff bonus)
//     • /admin/members    — the PEOPLE (enrol, codes, tiers, remove)  ← this file
//
//   Records live in adminSettings/members (a map keyed by normalised phone), so
//   no new collection and no Firestore rules deploy is needed.

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography, TextField, Button, MenuItem, CircularProgress } from "@mui/material";
// NB: `query` is aliased — this component already has a `query` state for the
//     search box, which would shadow the Firestore helper.
import { collection, doc, getDocs, onSnapshot, setDoc, query as fsQuery, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { Crown, MagnifyingGlass } from "phosphor-react";
import { adminColor, adminFont, adminFieldSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";
import { normPhone } from "@/utils/phoneCountry";
import { pointsFor, pointsValueTHB, sunPointEarnPerTHB } from "@/config/anniversary";
import {
  membershipFor,
  applyMembershipConfig,
  generateMemberCode,
  tierRank,
  MEMBERSHIP_COLORS,
  MEMBERSHIP_TIERS,
  type MembershipTier,
  type MembershipThresholds,
} from "@/utils/membership";

const SANS = adminFont.sans;
const thb = (n: number) => `฿${Math.round(n).toLocaleString()}`;

type MemberRec = {
  code: string;
  tier: MembershipTier;
  name?: string;
  createdAtMs: number;
  updatedAtMs: number;
};

/** Lifetime stats per phone — drives the auto tier + the visits/spend columns. */
type CustStat = { served: number; totalSpent: number; lastVisitMs: number; noShowCount: number; name: string };

// 🆕 28w.96 (founder: "admin/members กดดูประวัติการจองได้ ยอดสะสม เครดิตได้") — one
//   row per reservation, kept per phone so a member's history opens instantly
//   instead of firing another query. Built in the SAME pass that computes the
//   stats, and keyed by the SAME normPhone — so what the history shows and what
//   the credit was calculated from can never disagree.
type BookingLite = {
  id: string;
  whenMs: number;
  serviceName: string;
  therapistName: string;
  status: string;
  totalTHB: number;
};

const AdminMembersPage: React.FC = () => {
  const [members, setMembers] = useState<Record<string, MemberRec>>({});
  const [stats, setStats] = useState<Record<string, CustStat>>({});
  const [history, setHistory] = useState<Record<string, BookingLite[]>>({});
  const [openPhone, setOpenPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  // 🆕 28x.38 — a booking card links here as /admin/members?q=<phone>, so the
  //   concierge lands with that guest already filtered (SRD code · ยอดสะสม · history).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  // enrol form
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

  // inline edit
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editTier, setEditTier] = useState<MembershipTier>("Bronze");

  const nowMs = useMemo(() => Date.now(), []);

  // members map (live)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminSettings", "members"),
      (snap) => {
        const data = snap.data() as { members?: Record<string, MemberRec> } | undefined;
        setMembers(data?.members ?? {});
      },
      () => {},
    );
    return () => unsub();
  }, []);

  // tier thresholds (live) — so the auto tier matches /admin/membership
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminSettings", "membership"),
      (snap) => {
        applyMembershipConfig((snap.data() as Partial<MembershipThresholds>) ?? null);
        setMembers((m) => ({ ...m })); // re-render with the new thresholds
      },
      () => {},
    );
    return () => unsub();
  }, []);

  // lifetime per-phone aggregate from every booking
  useEffect(() => {
    const SERVED = new Set(["completed", "done"]);
    const NOSHOW = new Set(["no_show", "no-show", "noshow"]);
    void getDocs(collection(db, "bookings")).then((snap) => {
      const map: Record<string, CustStat> = {};
      const hist: Record<string, BookingLite[]> = {};
      snap.forEach((d) => {
        const b = d.data() as {
          phone?: string; status?: string; totalPrice?: number; servicePrice?: number;
          taxiFee?: number; paymentFee?: number;
          contactName?: string; customerName?: string;
          serviceName?: string; therapistName?: string;
          createdAt?: { toDate?: () => Date; seconds?: number };
          startAt?: { toDate?: () => Date; seconds?: number };
        };
        const phone = normPhone((b.phone ?? "").trim());
        if (!phone) return;
        // 🆕 Round 28x.38 (founder: "ยอดสะสมคือยอดตามเมนู ไม่รวมค่าเทกซี่") —
        //   membership tier + SunPoints accrue on the MENU amount only, not
        //   the paid total. `servicePrice` is the menu (service + add-ons),
        //   which already excludes taxi and the WeChat/Alipay payment
        //   surcharge. Old bookings without servicePrice fall back to
        //   totalPrice minus those two non-menu fees.
        const menuTHB =
          typeof b.servicePrice === "number"
            ? b.servicePrice
            : Math.max(0, (b.totalPrice ?? 0) - (b.taxiFee ?? 0) - (b.paymentFee ?? 0));
        const tAny = b.startAt ?? b.createdAt;
        const whenMs = tAny?.toDate ? tAny.toDate().getTime() : (typeof tAny?.seconds === "number" ? tAny.seconds * 1000 : 0);
        (hist[phone] ??= []).push({
          id: d.id,
          whenMs,
          serviceName: b.serviceName ?? "-",
          therapistName: b.therapistName ?? "-",
          status: b.status ?? "-",
          totalTHB: menuTHB,
        });
        const row = (map[phone] ??= { served: 0, totalSpent: 0, lastVisitMs: 0, noShowCount: 0, name: "" });
        const nm = (b.contactName || b.customerName || "").trim();
        if (nm && !row.name) row.name = nm;
        const st = b.status ?? "";
        if (NOSHOW.has(st)) row.noShowCount++;
        if (SERVED.has(st)) {
          row.served++;
          row.totalSpent += menuTHB;
          const t = b.createdAt ?? b.startAt;
          const ms = t?.toDate ? t.toDate().getTime() : (typeof t?.seconds === "number" ? t.seconds * 1000 : 0);
          if (ms > row.lastVisitMs) row.lastVisitMs = ms;
        }
      });
      for (const k of Object.keys(hist)) hist[k].sort((a, b) => b.whenMs - a.whenMs);
      setHistory(hist);
      setStats(map);
      setLoaded(true);
    });
  }, []);

  /** Tier this phone qualifies for right now, from its booking history. */
  const autoTierFor = (phone: string): MembershipTier | null => {
    const s = stats[phone];
    if (!s) return null;
    return membershipFor(s, nowMs).tier;
  };

  const writeMembers = async (next: Record<string, MemberRec>) => {
    // Full-doc replace (not merge) so a removed key actually disappears.
    await setDoc(doc(db, "adminSettings", "members"), { members: next });
  };

  /**
   * 🆕 Round 28w.88 — mirror the membership onto the guest's OWN users/{uid} doc.
   *
   * The roster above lives in `adminSettings/members`, which Firestore rules make
   * admin-only — so the customer app cannot read it and had no way to know the
   * guest is a member. Without this mirror, an enrolled guest would open the
   * Anniversary dialog and still be told to "request membership".
   *
   * Matched on the normalised phone, which is the SAME key the roster uses and
   * the same value the new phone-based signup writes to users.phone — so the two
   * sides line up with no extra bookkeeping. A guest who has no account yet
   * simply gets no mirror; re-running enrol (or their signing up later) is
   * handled by `syncMembershipMirror` being safe to call again.
   */
  const syncMembershipMirror = async (
    phoneKey: string,
    rec: MemberRec | null,
  ) => {
    try {
      const snap = await getDocs(
        fsQuery(collection(db, "users"), where("phone", "==", phoneKey)),
      );
      await Promise.all(
        snap.docs.map((d) =>
          setDoc(
            doc(db, "users", d.id),
            {
              // 🆕 28w.92 (founder: "ลูกค้าที่มีเบอร์กับเราแล้วถือว่าเป็นลูกค้าเก่าทันที")
              //   — carry the guest's real history on their OWN doc. The client
              //   cannot ask "does my phone appear in bookings?" (rules only let
              //   a guest list bookings by their uid, and most SunRed bookings are
              //   concierge-created with userId null and only a phone), so the
              //   count has to be delivered to them, not discovered by them.
              // 🆕 28w.95 (founder: "กันลูกค้าเก่าน้อยใจ · ยอดสะสมจากการจองครั้งก่อนหน้า
              //   จะถูกเก็บเป็นเครดิตให้อัตโนมัติ หากยืนยันได้ว่ามีประวัติจริง") — back-credit
              //   SunPoints for everything they already spent with us.
              //
              //   "ยืนยันได้ว่ามีประวัติจริง" is not a promise we take on trust: totalSpent
              //   is summed ONLY over bookings with status completed/done on this
              //   phone. A pending, cancelled or no-show reservation earns nothing,
              //   so the credit is always backed by a session we actually delivered.
              membership: rec
                ? {
                    code: rec.code,
                    tier: rec.tier,
                    phone: phoneKey,
                    visits: stats[phoneKey]?.served ?? 0,
                    lastVisitMs: stats[phoneKey]?.lastVisitMs ?? 0,
                    totalSpentTHB: Math.round(stats[phoneKey]?.totalSpent ?? 0),
                    // 🆕 28w.98 — the guest's most recent reservation id. The
                    //   customer app shows THIS (as SR-XXXXXXXX) instead of the
                    //   SRD- membership code: a booking reference is disclosable
                    //   by design, identifies the reservation rather than the
                    //   person, and grants nothing to whoever reads it.
                    //   `history` is sorted newest-first in the same pass.
                    lastBookingId: history[phoneKey]?.[0]?.id ?? null,
                    // Back-credit at the NORMAL 1x rate. The 2x multiplier is an
                    // Anniversary reward for NEW spend — applying it retroactively
                    // would double every historic baht and hand out a fortune.
                    points: pointsFor(stats[phoneKey]?.totalSpent ?? 0),
                  }
                : null,
            },
            { merge: true },
          ),
        ),
      );
    } catch (e) {
      // Non-fatal: the roster write already succeeded. Surface it rather than
      // letting the guest silently look like a non-member.
      console.error("[members] membership mirror failed", e);
      toast.warning("บันทึกสมาชิกแล้ว แต่ซิงก์ไปหน้าลูกค้าไม่สำเร็จ");
    }
  };

  /**
   * 🆕 Round 28w.92 — re-stamp EVERY member's mirror with their current visit
   * count.
   *
   * Needed for two reasons:
   *   1. Backfill. Members enrolled before this round carry a mirror with no
   *      `visits` field, so the Anniversary page would read 0 and hand a loyal
   *      regular the first-timer offer — the exact bug the founder just called
   *      out. Run this once and they're all correct.
   *   2. Drift. `visits` is a snapshot. A guest who books again is still shown
   *      at their old count until someone re-stamps it. Re-run whenever the
   *      difference matters (e.g. before a campaign opens).
   */
  const syncAllMirrors = async () => {
    const keys = Object.keys(members);
    if (keys.length === 0) { toast.info("ยังไม่มีสมาชิก"); return; }
    setSaving(true);
    let ok = 0;
    try {
      for (const key of keys) {
        await syncMembershipMirror(key, members[key]);
        ok++;
      }
      toast.success(`ซิงก์ประวัติสมาชิกแล้ว · ${ok}/${keys.length} คน`);
    } catch (e) {
      console.error("[members] sync-all failed", e);
      toast.error(`ซิงก์ไม่สำเร็จ (สำเร็จ ${ok}/${keys.length})`);
    } finally {
      setSaving(false);
    }
  };

  const enrol = async () => {
    const key = normPhone(newPhone.trim());
    if (!key) { toast.error("ใส่เบอร์ก่อน"); return; }
    if (members[key]) { toast.warning("เบอร์นี้เป็นสมาชิกอยู่แล้ว"); return; }
    setSaving(true);
    try {
      const tier: MembershipTier = autoTierFor(key) ?? "Bronze";
      const rec: MemberRec = {
        code: generateMemberCode(tier),
        tier,
        name: newName.trim() || stats[key]?.name || newPhone.trim(),
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      await writeMembers({ ...members, [key]: rec });
      await syncMembershipMirror(key, rec);
      void logAdminAction("member.enroll", { phone: key, code: rec.code, tier });
      setNewPhone(""); setNewName("");
      toast.success(`สมัครแล้ว · ${rec.code}`);
    } catch (e) { console.error("[members] enrol failed", e); toast.error("สมัครไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const resetCode = async (key: string) => {
    const cur = members[key]; if (!cur) return;
    setSaving(true);
    try {
      const rec: MemberRec = { ...cur, code: generateMemberCode(cur.tier), updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      await syncMembershipMirror(key, rec);
      void logAdminAction("member.reset", { phone: key, code: rec.code });
      toast.success(`รีเซตรหัสแล้ว · ${rec.code}`);
    } catch (e) { console.error("[members] reset failed", e); toast.error("รีเซตไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const upgrade = async (key: string) => {
    const cur = members[key]; if (!cur) return;
    const to = autoTierFor(key);
    if (!to || tierRank(to) <= tierRank(cur.tier)) return;
    setSaving(true);
    try {
      const rec: MemberRec = { ...cur, tier: to, code: generateMemberCode(to), updatedAtMs: Date.now() };
      await writeMembers({ ...members, [key]: rec });
      void logAdminAction("member.upgrade", { phone: key, code: rec.code, tier: to });
      toast.success(`อัปเกรดเป็น ${to} · ${rec.code}`);
    } catch (e) { console.error("[members] upgrade failed", e); toast.error("อัปเกรดไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editKey) return;
    const cur = members[editKey]; if (!cur) return;
    const code = editCode.trim().toUpperCase();
    if (!code) { toast.error("ใส่รหัสก่อน"); return; }
    setSaving(true);
    try {
      const rec: MemberRec = { ...cur, code, tier: editTier, updatedAtMs: Date.now() };
      await writeMembers({ ...members, [editKey]: rec });
      void logAdminAction("member.edit", { phone: editKey, code, tier: editTier });
      setEditKey(null);
      toast.success("บันทึกแล้ว");
    } catch (e) { console.error("[members] edit failed", e); toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const remove = async (key: string) => {
    if (!members[key]) return;
    if (!window.confirm(`ยกเลิกสมาชิก ${members[key].code}?`)) return;
    setSaving(true);
    try {
      const next = { ...members }; delete next[key];
      await writeMembers(next);
      void logAdminAction("member.remove", { phone: key });
      setEditKey(null);
      toast.success("ยกเลิกสมาชิกแล้ว");
    } catch (e) { console.error("[members] remove failed", e); toast.error("ยกเลิกไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(members)
      .map(([phone, rec]) => ({ phone, rec, stat: stats[phone], auto: autoTierFor(phone) }))
      .filter(({ phone, rec }) =>
        !q ||
        rec.code.toLowerCase().includes(q) ||
        (rec.name ?? "").toLowerCase().includes(q) ||
        phone.includes(q),
      )
      .sort((a, b) => b.rec.createdAtMs - a.rec.createdAtMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, stats, query, nowMs]);

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = { Bronze: 0, Silver: 0, Gold: 0, BlackVIP: 0 };
    for (const r of Object.values(members)) c[r.tier] = (c[r.tier] ?? 0) + 1;
    return c;
  }, [members]);

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, fontFamily: SANS }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text }}>
        Members
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4 }}>
        ระบบสมัครสมาชิก · รหัส SRD-
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 1, mb: 2 }}>
        สมัครสมาชิกให้ลูกค้า แล้วจัดการรหัส/Level ได้ที่นี่ · เกณฑ์ Level ตั้งที่หน้า <b>Membership</b>
      </Typography>

      {/* tier tally */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {MEMBERSHIP_TIERS.map((t) => (
          <Box key={t} sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.6, borderRadius: "12px", background: `${MEMBERSHIP_COLORS[t]}14`, border: `1px solid ${MEMBERSHIP_COLORS[t]}44` }}>
            <Crown size={14} weight="fill" color={MEMBERSHIP_COLORS[t]} />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: MEMBERSHIP_COLORS[t] }}>{t}</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.text }}>{tierCounts[t] ?? 0}</Typography>
          </Box>
        ))}
      </Box>

      {/* enrol */}
      <Box sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "16px", p: { xs: 1.75, md: 2 }, mb: 2 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: adminColor.text, mb: 1.25 }}>
          สมัครสมาชิกให้ลูกค้า
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center" }}>
          <TextField
            size="small" label="เบอร์โทร" value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            inputProps={{ inputMode: "tel" }}
            sx={{ ...adminFieldSx, width: { xs: "100%", sm: 190 } }}
          />
          <TextField
            size="small" label="ชื่อ (ไม่ใส่ก็ได้)" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ ...adminFieldSx, width: { xs: "100%", sm: 190 } }}
          />
          <Button
            variant="contained" disabled={saving || !newPhone.trim()} onClick={enrol}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
              background: "linear-gradient(135deg,#D97C95,#C96F89)",
              "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" },
              "&.Mui-disabled": { opacity: 0.5, color: "#fff" } }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "+ สมัคร (รหัส SRD-)"}
          </Button>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 1 }}>
          อีเมล — ให้ลูกค้าสมัคร/ล็อกอินใส่เอง · Level ตัดจากประวัติของเบอร์นี้อัตโนมัติ (ถ้ามี) ไม่มีก็ Bronze
        </Typography>

        {/* 🆕 28w.92 — backfill/refresh the visit count carried on each member's
            own user doc. Members enrolled before this round have no count, so the
            customer app would read 0 and treat a loyal regular as a first-timer.
            Also fixes drift: the count is a snapshot, so a guest who books again
            keeps their old number until this is re-run. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            disabled={saving || Object.keys(members).length === 0}
            onClick={() => void syncAllMirrors()}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 12,
              borderRadius: "999px", px: 2,
              color: adminColor.accent, borderColor: adminColor.line2,
              "&:hover": { borderColor: adminColor.accent },
            }}
          >
            {saving ? <CircularProgress size={14} /> : `ซิงก์ประวัติสมาชิก (${Object.keys(members).length})`}
          </Button>
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, flex: 1, minWidth: 180 }}>
            ส่งประวัติไปที่บัญชีลูกค้า — จำนวนครั้งที่ใช้บริการ (แยก “ลูกค้าเก่า / ใหม่”) และ
            <b> เครดิตคะแนนย้อนหลังจากยอดใช้จ่ายเดิม</b> (ทุก {thb(sunPointEarnPerTHB())} = 1 คะแนน ·
            นับเฉพาะออเดอร์ที่สำเร็จจริง) · <b>สมาชิกที่สมัครไว้ก่อนหน้านี้ ต้องกดครั้งหนึ่ง</b>
          </Typography>
        </Box>
      </Box>

      {/* search */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px", maxWidth: 360, mb: 1.5 }}>
        <MagnifyingGlass size={15} color={adminColor.dim} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name or phone…"
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
        />
      </Box>

      {/* members */}
      {!loaded ? (
        <Box sx={{ textAlign: "center", py: 5 }}><CircularProgress size={22} sx={{ color: adminColor.accent }} /></Box>
      ) : rows.length === 0 ? (
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim, textAlign: "center", py: 5 }}>
          {Object.keys(members).length === 0 ? "ยังไม่มีสมาชิก — สมัครให้ลูกค้าคนแรกได้เลย" : "ไม่พบสมาชิกที่ค้นหา"}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {rows.map(({ phone, rec, stat, auto }) => {
            const color = MEMBERSHIP_COLORS[rec.tier];
            const canUpgrade = !!auto && tierRank(auto) > tierRank(rec.tier);
            const editing = editKey === phone;
            return (
              <Box key={phone} sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderLeft: `4px solid ${color}`, borderRadius: "14px", p: { xs: 1.5, md: 1.75 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "180px 1fr auto" }, gap: 1.25, alignItems: "center" }}>
                  {/* who */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: adminColor.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rec.name || phone}
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim }}>{phone}</Typography>
                  </Box>

                  {/* code + tier + stats */}
                  {editing ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small" label="รหัสสมาชิก" value={editCode}
                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                        inputProps={{ style: { fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em", fontWeight: 700 } }}
                        sx={{ ...adminFieldSx, width: 190 }}
                      />
                      <TextField
                        select size="small" label="Level" value={editTier}
                        onChange={(e) => setEditTier(e.target.value as MembershipTier)}
                        sx={{ ...adminFieldSx, width: 140 }}
                      >
                        {MEMBERSHIP_TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center" }}>
                      <Typography sx={{ fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 800, letterSpacing: "0.06em", color: adminColor.text }}>
                        {rec.code}
                      </Typography>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: 0.9, py: "2px", borderRadius: 999, background: `${color}1A`, border: `1px solid ${color}55` }}>
                        <Crown size={12} weight="fill" color={color} />
                        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color }}>{rec.tier}</Typography>
                      </Box>
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim }}>
                        {stat ? `${stat.served} ครั้ง · ${thb(stat.totalSpent)}` : "ยังไม่มีประวัติ"}
                        {stat && stat.noShowCount > 0 && ` · no-show ${stat.noShowCount}`}
                      </Typography>
                      {canUpgrade && (
                        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: MEMBERSHIP_COLORS[auto] }}>
                          ถึงเกณฑ์ {auto} แล้ว
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* actions */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                    {editing ? (
                      <>
                        <Button size="small" variant="contained" disabled={saving} onClick={saveEdit}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", background: "linear-gradient(135deg,#D97C95,#C96F89)" }}>
                          บันทึก
                        </Button>
                        <Button size="small" variant="text" disabled={saving} onClick={() => setEditKey(null)}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.muted }}>
                          ยกเลิก
                        </Button>
                        <Button size="small" variant="text" disabled={saving} onClick={() => void remove(phone)}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.red }}>
                          ลบสมาชิก
                        </Button>
                      </>
                    ) : (
                      <>
                        {canUpgrade && (
                          <Button size="small" variant="contained" disabled={saving} onClick={() => void upgrade(phone)}
                            sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", background: "linear-gradient(135deg,#D97C95,#C96F89)" }}>
                            อัปเกรด → {auto}
                          </Button>
                        )}
                        <Button size="small" variant="outlined" disabled={saving} onClick={() => void resetCode(phone)}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", color: "#8A3A57", borderColor: "#B8567F" }}>
                          รีเซตรหัส
                        </Button>
                        <Button size="small" variant="outlined" disabled={saving}
                          onClick={() => { setEditCode(rec.code); setEditTier(rec.tier); setEditKey(phone); }}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", color: adminColor.muted, borderColor: adminColor.line2 }}>
                          แก้ไข
                        </Button>
                        {/* 🆕 28w.96 — open this member's real reservations. */}
                        <Button size="small" variant="outlined"
                          onClick={() => setOpenPhone((p) => (p === phone ? null : phone))}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, borderRadius: "999px", color: adminColor.accent, borderColor: adminColor.line2 }}>
                          {openPhone === phone ? "ซ่อนประวัติ" : `ประวัติ (${history[phone]?.length ?? 0})`}
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>

                {/* 🆕 28w.96 (founder: "admin/members กดดูประวัติการจองได้ ยอดสะสม
                    เครดิตได้") — the reservations behind the numbers. Shown from the
                    SAME per-phone aggregation the credit is computed from, so the
                    history and the points can never tell different stories. Rows the
                    shop did NOT deliver are greyed and marked "ไม่นับ", because those
                    earn nothing — the founder can see exactly which ones counted. */}
                {openPhone === phone && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${adminColor.line}` }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
                      {[
                        { k: "ใช้บริการ", v: `${stat?.served ?? 0} ครั้ง` },
                        { k: "ยอดสะสม", v: thb(stat?.totalSpent ?? 0) },
                        { k: "เครดิตคะแนน", v: `${pointsFor(stat?.totalSpent ?? 0).toLocaleString()} คะแนน` },
                        { k: "มูลค่าคะแนน", v: thb(pointsValueTHB(pointsFor(stat?.totalSpent ?? 0))) },
                      ].map((c) => (
                        <Box key={c.k} sx={{ px: 1.25, py: 0.75, borderRadius: "10px", background: adminColor.panel2, border: `1px solid ${adminColor.line}` }}>
                          <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.dim }}>{c.k}</Typography>
                          <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: adminColor.text, fontVariantNumeric: "lining-nums tabular-nums" }}>{c.v}</Typography>
                        </Box>
                      ))}
                    </Box>

                    {(history[phone]?.length ?? 0) === 0 ? (
                      <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>ยังไม่มีออเดอร์ของเบอร์นี้</Typography>
                    ) : (
                      <Box sx={{ maxHeight: 260, overflowY: "auto", borderRadius: "10px", border: `1px solid ${adminColor.line}` }}>
                        {history[phone].map((b) => {
                          const counted = b.status === "completed" || b.status === "done";
                          return (
                            // 🆕 28x.42 (founder: "กดที่รายละเอียดการจอง...เชื่อมต่อไปยัง
                            //   ประวัติการจองนั้นๆ หน้า booking") — tap a history row to open
                            //   that exact reservation on the Bookings page (?open=<id>).
                            <Box key={b.id} component={RouterLink} to={`/admin/bookings?open=${b.id}`} sx={{
                              display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.85,
                              borderBottom: `1px solid ${adminColor.line}`,
                              opacity: counted ? 1 : 0.55,
                              textDecoration: "none", cursor: "pointer",
                              "&:hover": { background: `${adminColor.line}55` },
                            }}>
                              <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, width: 78, flexShrink: 0 }}>
                                {b.whenMs ? new Date(b.whenMs).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
                              </Typography>
                              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {b.serviceName} · {b.therapistName}
                              </Typography>
                              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: counted ? adminColor.green : adminColor.dim, width: 74, textAlign: "right", flexShrink: 0 }}>
                                {counted ? b.status : `${b.status} · ไม่นับ`}
                              </Typography>
                              <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 800, color: adminColor.text, width: 74, textAlign: "right", flexShrink: 0, fontVariantNumeric: "lining-nums tabular-nums" }}>
                                {thb(b.totalTHB)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default AdminMembersPage;
