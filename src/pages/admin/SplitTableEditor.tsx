// src/pages/admin/SplitTableEditor.tsx
//
// 🆕 Round 28w.39 (founder 2026-07-14 "ตารางส่วนแบ่ง เอาไว้หน้ารีพอต") —
//   admin-only editor for the per-(service, duration) therapist split.
//   For each service tier: shows the customer price, lets View set the
//   THERAPIST amount, and derives the shop's cut (price − therapist) with
//   live validation (therapist can't exceed the price → shop ≥ 0).
//
//   Saves to adminSettings/earnings.serviceSplits (admin-only doc — the
//   split is sensitive and must NEVER reach a customer surface). The
//   Report page's onSnapshot listener re-applies it and recomputes payroll.

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, TextField, CircularProgress } from "@mui/material";
import { doc, setDoc, serverTimestamp, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import services from "@/data/services";
import { durationsFor, priceForDuration, formatTHB } from "@/utils/servicePricing";
import { effectiveServiceSplits, applyServiceSplitConfig, commissionBaseFor, DEFAULT_THERAPIST_PCT } from "@/utils/commission";
import { adminColor, adminFont } from "@/theme/adminTheme";

const SANS = adminFont.sans;

interface Props {
  /** Bumps when the parent (re)loads adminSettings/earnings → re-seed inputs. */
  splitVersion: number;
}

const SplitTableEditor: React.FC<Props> = ({ splitVersion }) => {
  // serviceId → duration → therapist amount (as input string)
  const [draft, setDraft] = useState<Record<string, Record<number, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 🆕 28w.48 (founder: "backfill ครั้งเดียว") — one-time LOCK: stamp every
  //   existing booking that has no frozen split yet, so later table edits can
  //   never move an old job again.
  // 🆕 28w.49 (founder chose "เรตเดิม 60%" — old jobs were paid at the pre-table
  //   flat rate, NOT the new split table which pays LESS on Thai/Aroma) — the
  //   lock now freezes each un-stamped job at DEFAULT_THERAPIST_PCT (60%) of the
  //   post-discount price, i.e. what View actually paid before the split table
  //   existed. Un-stamped jobs are exactly the pre-28w.43 ones (confirm-time
  //   stamping started then), so this restores their true historical payout.
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  // (Re)seed from the effective config on load / after a save round-trips.
  useEffect(() => {
    if (dirty) return;
    const eff = effectiveServiceSplits();
    const next: Record<string, Record<number, string>> = {};
    for (const svc of services) {
      next[svc.id] = {};
      for (const d of durationsFor(svc)) {
        const amt = eff[svc.id]?.[d];
        next[svc.id][d] = amt != null ? String(amt) : "";
      }
    }
    setDraft(next);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitVersion]);

  const setVal = (sid: string, d: number, v: string) => {
    setDirty(true);
    setSaved(false);
    setDraft((p) => ({
      ...p,
      [sid]: { ...(p[sid] ?? {}), [d]: v.replace(/[^\d]/g, "") },
    }));
  };

  // any therapist amount exceeding the price is invalid (shop would be < 0)
  let anyInvalid = false;
  for (const svc of services) {
    for (const d of durationsFor(svc)) {
      const raw = draft[svc.id]?.[d];
      if (raw == null || raw === "") continue;
      if (parseInt(raw, 10) > priceForDuration(svc, d)) anyInvalid = true;
    }
  }

  const save = async () => {
    if (anyInvalid) return;
    setSaving(true);
    const cfg: Record<string, Record<number, number>> = {};
    for (const svc of services) {
      cfg[svc.id] = {};
      for (const d of durationsFor(svc)) {
        const n = parseInt(draft[svc.id]?.[d] ?? "", 10);
        if (Number.isFinite(n)) cfg[svc.id][d] = n;
      }
    }
    try {
      await setDoc(
        doc(db, "adminSettings", "earnings"),
        { serviceSplits: cfg, updatedAt: serverTimestamp() },
        { merge: true },
      );
      applyServiceSplitConfig(cfg);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[splitTable] save failed", e);
    } finally {
      setSaving(false);
    }
  };

  // One-time backfill / reset: set EVERY priced booking to the OLD flat rate —
  // 60% of the post-discount price (DEFAULT_THERAPIST_PCT), i.e. what was
  // actually paid before the split table existed. OVERWRITES any earlier lock
  // (🆕 28w.50 — the first lock run stamped 485 old jobs at TABLE values, which
  // pay LESS than 60% on Thai/Aroma; this re-stamps them at the true 60% rate,
  // so it must NOT skip already-frozen jobs). Independent of the table — new
  // jobs still confirm-stamp at the table going forward.
  const runBackfill = async () => {
    const pct = Math.round(DEFAULT_THERAPIST_PCT * 100);
    const ok = window.confirm(
      `ตั้งส่วนแบ่งงานเก่าทั้งหมดใหม่ ที่เรตเดิม ${pct}% ของราคา (หลังส่วนลด)?\n\n` +
        `• งานเก่าทุกอัน → ตั้งเป็น ${pct}% (เท่าที่จ่ายจริง)\n` +
        "• เขียนทับล็อกเดิมที่เคยตั้งไว้ที่ตาราง (ถ้ามี)\n" +
        "• งานใหม่หลังจากนี้ยังใช้ตารางส่วนแบ่งตามปกติ",
    );
    if (!ok) return;
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const snap = await getDocs(collection(db, "bookings"));
      let stamped = 0;
      let noPrice = 0;
      let batch = writeBatch(db);
      let inBatch = 0;
      for (const d of snap.docs) {
        const data = d.data() as {
          servicePrice?: number | null;
          discountAmount?: number | null;
        };
        if (!(typeof data.servicePrice === "number" && data.servicePrice > 0)) {
          noPrice++;
          continue; // nothing to split (no service price)
        }
        const base = commissionBaseFor({
          servicePrice: data.servicePrice,
          discountAmount: data.discountAmount,
        });
        const therapistShare = Math.round(base * DEFAULT_THERAPIST_PCT);
        const shopShare = Math.max(0, base - therapistShare);
        batch.update(d.ref, { therapistShare, shopShare });
        stamped++;
        inBatch++;
        if (inBatch >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          inBatch = 0;
        }
      }
      if (inBatch > 0) await batch.commit();
      setBackfillMsg(`ตั้งเรตเดิม ${pct}% แล้ว ${stamped} งาน · ข้าม ${noPrice} (ไม่มีราคา)`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[splitTable] backfill failed", e);
      setBackfillMsg("ล้มเหลว — ลองใหม่อีกครั้ง");
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Box
      sx={{
        background: adminColor.panel ?? "rgba(255,255,255,0.03)",
        border: `1px solid ${adminColor.line ?? "rgba(255,255,255,0.08)"}`,
        borderRadius: "16px",
        p: { xs: 1.75, md: 2.5 },
      }}
    >
      <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: adminColor.text, letterSpacing: "0.02em", mb: 0.5 }}>
        ส่วนแบ่ง ร้าน / พนักงาน
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mb: 2 }}>
        ตั้งค่าจ้างพนักงานต่อเมนู × เวลา · ส่วนของร้าน = ราคา − พนักงาน (คิดให้อัตโนมัติ)
      </Typography>

      {services.map((svc) => (
        <Box key={svc.id} sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: adminColor.text, mb: 0.75 }}>
            {svc.name}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {durationsFor(svc).map((d) => {
              const price = priceForDuration(svc, d);
              const raw = draft[svc.id]?.[d] ?? "";
              const therapist = raw === "" ? null : parseInt(raw, 10);
              const invalid = therapist != null && therapist > price;
              const shop = therapist == null ? null : price - therapist;
              return (
                <Box
                  key={d}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "52px 1fr 92px 1fr", md: "64px 1fr 110px 1fr" },
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.muted }}>
                    {d} min
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>
                    ราคา {formatTHB(price)}
                  </Typography>
                  <TextField
                    value={raw}
                    onChange={(e) => setVal(svc.id, d, e.target.value)}
                    placeholder="พนักงาน"
                    size="small"
                    inputProps={{ inputMode: "numeric", "aria-label": `${svc.name} ${d} min therapist share` }}
                    error={invalid}
                    sx={{
                      "& .MuiInputBase-input": { fontFamily: SANS, fontSize: 13, py: "6px", color: adminColor.text },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: invalid ? "#E4557A" : (adminColor.line ?? "rgba(255,255,255,0.14)") },
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 12,
                      fontWeight: 600,
                      color: invalid ? "#E4557A" : shop == null ? adminColor.dim : adminColor.text,
                    }}
                  >
                    {therapist == null
                      ? "ใช้ % เดิม"
                      : invalid
                        ? "เกินราคา!"
                        : `ร้าน ${formatTHB(shop as number)}`}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
        <Button
          onClick={save}
          disabled={!dirty || anyInvalid || saving}
          variant="contained"
          sx={{
            textTransform: "none",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 13,
            borderRadius: "999px",
            px: 2.5,
            background: "linear-gradient(135deg,#D97C95,#C96F89)",
            "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" },
            "&.Mui-disabled": { opacity: 0.5, color: "#fff" },
          }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึกส่วนแบ่ง"}
        </Button>
        {saved && !dirty && (
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "#57B88B", fontWeight: 700 }}>
            บันทึกแล้ว ✓
          </Typography>
        )}
        {anyInvalid && (
          <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "#E4557A", fontWeight: 600 }}>
            มีช่องที่ค่าจ้างเกินราคา — แก้ก่อนบันทึก
          </Typography>
        )}
      </Box>

      {/* 🔒 One-time backfill / lock — freezes the split onto old bookings */}
      <Box
        sx={{
          mt: 2.5,
          pt: 2,
          borderTop: `1px solid ${adminColor.line ?? "rgba(0,0,0,0.08)"}`,
        }}
      >
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 800, color: adminColor.text, mb: 0.25 }}>
          ล็อกงานเก่าที่เรตเดิม 60% (ทำครั้งเดียว)
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mb: 1.25, lineHeight: 1.5 }}>
          ตั้งงานเก่าทุกอันที่ 60% ของราคาหลังส่วนลด (เท่าที่จ่ายจริง) · เขียนทับล็อกเดิมถ้าเคยตั้งที่ตารางไว้ · งานใหม่ยังใช้ตารางตามปกติ
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            onClick={runBackfill}
            disabled={backfilling}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 13,
              borderRadius: "999px",
              px: 2.5,
              color: "#8A3A57",
              borderColor: "#B8567F",
              "&:hover": { borderColor: "#8A3A57", background: "rgba(184,86,127,0.06)" },
              "&.Mui-disabled": { opacity: 0.4, color: "#8A3A57", borderColor: "#B8567F" },
            }}
          >
            {backfilling ? <CircularProgress size={16} sx={{ color: "#8A3A57" }} /> : "🔒 ล็อกงานเก่า (เรตเดิม 60%)"}
          </Button>
          {backfillMsg && (
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, fontWeight: 600 }}>
              {backfillMsg}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SplitTableEditor;
