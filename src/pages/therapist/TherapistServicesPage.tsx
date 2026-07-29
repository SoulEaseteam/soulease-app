// src/pages/therapist/TherapistServicesPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Services · บริการที่ทำได้") —
// self-service edit for `servicesAvailable` on her own therapist doc.
// Already whitelisted in firestore.rules therapistEditableKeys().
//
// 🆕 Round 28x.104 (founder: "ให้สวยขึ้น บริการเรียง 1 แถวต่อแถว") — the
// option LIST still comes from admin's SERVICE_OPTIONS (so it can never
// drift from what admin's Add/Edit Therapist form offers), but the ROW
// component is now its own thing here instead of reusing admin's
// ServicesEditor. That component hardcodes `adminColor.*` (the admin dark
// Control Room theme) and renders as wrapped chips — restyling it in place
// would also change the admin form nobody asked to touch. This page's own
// list renders one full-width row per service with an iOS-style trailing
// checkmark, in the staff app's own rose theme.
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Check } from "phosphor-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { SERVICE_OPTIONS } from "@/pages/admin/therapistFormKit";
import { resolveServiceId } from "@/utils/serviceCatalog";
import { SelfEditShell } from "./selfEditKit";
import services from "@/data/services";
import { durationsFor, priceForDuration, formatTHB } from "@/utils/servicePricing";
import { therapistFixedFor, therapistPctFor } from "@/utils/commission";
import { motoFareCheckpoints, ADMIN_QUOTE_KM, RUSH_SURGE_PCT, PEAK_SURGE_PCT } from "@/utils/taxiFare";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

// 🆕 Round 28x.129 (founder: "ตัวเลข ข้อความหนาทึบ จนดูไม่ออก") — the money
// columns were Playfair Display 700 at 13.5px. Playfair is a high-contrast
// display serif: at that size its bold numerals collapse into thick blobs,
// and on the dark panel the thin strokes disappear entirely, so "฿1,200"
// reads as a smudge. It's the wrong tool for small figures — a display serif
// is for headlines, not a rate table she scans on a phone.
//
// Inter 700 keeps the weight (these ARE the numbers that matter to her) while
// staying legible at 13.5px, and `tabular-nums` locks every digit to the same
// advance width so the ฿ column actually aligns down the table instead of
// ragging. The colour was the hardcoded #FF9999 — a 2.6:1 blur on the dark
// panel — and is now the theme-aware --sr-money token (index.css), which
// clears AA in BOTH themes for the same reason the tier tokens moved to CSS
// this round: one fixed hex cannot serve two grounds.
const ROSE = "var(--sr-money)";
const MONEY_SX = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 13.5,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
} as const;

const TherapistServiceList: React.FC<{ value: string[]; onChange: (next: string[]) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {SERVICE_OPTIONS.map((s) => {
      const on = value.includes(s.id);
      return (
        <Box
          key={s.id}
          role="button"
          tabIndex={0}
          onClick={() => onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id]); }}
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
            p: "14px 16px", borderRadius: "14px", cursor: "pointer",
            background: on ? "linear-gradient(135deg, rgba(224,112,143,0.16), rgba(194,24,91,0.10))" : "var(--sr-panel-2)",
            border: on ? "1px solid rgba(194,24,91,0.38)" : "1px solid var(--sr-hairline)",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: 14, color: on ? "var(--sr-ink)" : "var(--sr-body)" }}>
            {s.name}
          </Typography>
          <Box
            sx={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: on ? "linear-gradient(135deg, #FF9999, #FF9999)" : "var(--sr-panel)",
              border: on ? "none" : "1.5px solid var(--sr-hairline)",
              boxShadow: on ? "0 3px 8px rgba(194,24,91,0.35)" : "none",
            }}
          >
            {on && <Check size={14} weight="bold" color="#fff" />}
          </Box>
        </Box>
      );
    })}
  </Box>
);

// 🆕 Round 28x.111 (founder: "Services เพิ่มตารางราคา แบ่งรายได้ต่อเมนู") —
// read-only reference table: for every service + duration, the price a
// guest pays and her cut of it. Same numbers Reports pays out from
// (SERVICE_SPLIT_DEFAULTS in commission.ts — the fixed per-duration
// therapist amount, falling back to the flat 60% tier rate for any
// duration with no fixed entry, exactly like therapistPayoutFor does for
// a real booking). Shows the FULL catalog, not just the services she has
// switched on above — she can see what every menu item pays before
// deciding what to offer.
//
// 🆕 Round 28x.116 (founder: "บอกราคาจ่ายร้านด้วย") — added the shop's own
// cut as a 4th column, computed the same way shopShareFor() does (price
// − her fixed cut, floored at 0) so the row always reconciles: her cut +
// the shop's cut always adds back up to the full price.
const ServiceSplitTable: React.FC = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {services.map((svc) => (
      <Box key={svc.id}>
        <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: 12.5, color: "var(--sr-ink)", mb: 0.75 }}>
          {svc.name}
        </Typography>
        <Box sx={{ borderRadius: "12px", border: "1px solid var(--sr-hairline)", overflow: "hidden" }}>
          <Box sx={{ display: "flex", px: "10px", py: "8px", background: "var(--sr-panel-2)" }}>
            <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ระยะเวลา
            </Typography>
            <Typography sx={{ width: 60, textAlign: "right", fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ราคา
            </Typography>
            <Typography sx={{ width: 66, textAlign: "right", fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              คุณได้
            </Typography>
            <Typography sx={{ width: 60, textAlign: "right", fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ร้านได้
            </Typography>
          </Box>
          {durationsFor(svc).map((d, i) => {
            const price = priceForDuration(svc, d);
            const cut = therapistFixedFor(svc.id, d) ?? Math.round(price * therapistPctFor(svc.id));
            const shopCut = Math.max(0, price - cut);
            return (
              <Box
                key={d}
                sx={{ display: "flex", alignItems: "center", px: "10px", py: "9px", borderTop: i > 0 ? "1px solid var(--sr-hairline)" : "none" }}
              >
                <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)" }}>
                  {d} นาที
                </Typography>
                <Typography sx={{ width: 60, textAlign: "right", fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)" }}>
                  {formatTHB(price)}
                </Typography>
                <Typography sx={{ width: 66, textAlign: "right", ...MONEY_SX, color: ROSE }}>
                  {formatTHB(cut)}
                </Typography>
                <Typography sx={{ width: 60, textAlign: "right", fontFamily: SANS, fontSize: 12, color: "var(--sr-dim)" }}>
                  {formatTHB(shopCut)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    ))}
  </Box>
);

// 🆕 Round 28x.115 (founder: "เพิ่มตารางค่าแท็กซี่") — reference table for the
// dispatch travel fare, same round-trip moto checkpoints BookingFlowPage
// quotes customers from (taxiFare.ts). Live-overridable values (checkpoints,
// admin-quote threshold, surge %) are `let` exports with live ES-module
// bindings, so this always reflects whatever MaintenanceGate has applied —
// same guarantee ServiceSplitTable already has for prices/splits.
const TaxiFareTable: React.FC = () => {
  const checkpoints = motoFareCheckpoints();
  return (
    <Box sx={{ borderRadius: "12px", border: "1px solid var(--sr-hairline)", overflow: "hidden" }}>
      <Box sx={{ display: "flex", px: "12px", py: "8px", background: "var(--sr-panel-2)" }}>
        <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 10, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          ระยะทาง
        </Typography>
        <Typography sx={{ width: 90, textAlign: "right", fontFamily: SANS, fontSize: 10, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          ค่าเดินทาง
        </Typography>
      </Box>
      {checkpoints.map(([km, fare], i) => (
        <Box key={km} sx={{ display: "flex", alignItems: "center", px: "12px", py: "9px", borderTop: i > 0 ? "1px solid var(--sr-hairline)" : "none" }}>
          <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--sr-body)" }}>
            {km === 0 ? "0–3 กม." : `~${km} กม.`}
          </Typography>
          <Typography sx={{ width: 90, textAlign: "right", ...MONEY_SX, color: ROSE }}>
            {formatTHB(fare)}
          </Typography>
        </Box>
      ))}
      <Box sx={{ display: "flex", alignItems: "center", px: "12px", py: "9px", borderTop: "1px solid var(--sr-hairline)" }}>
        <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--sr-body)" }}>
          เกิน {ADMIN_QUOTE_KM} กม.
        </Typography>
        <Typography sx={{ width: 90, textAlign: "right", fontFamily: SANS, fontWeight: 700, fontSize: 12.5, color: "var(--sr-muted)" }}>
          แจ้งแอดมิน
        </Typography>
      </Box>
    </Box>
  );
};

const TherapistServicesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("[]");

  // 🆕 Round 28x.129 (founder: "Services กดใช้งานจริงไม่ได้ ไม่โชว์หรือซ้อนบนเว็บ")
  //   — this page compared the STORED strings against SERVICE_OPTIONS ids
  //   verbatim. Plenty of therapist docs still hold LEGACY SLUGS from before
  //   the SKU rename ("aromatherapy-massage" rather than "SR-Aroma"), which is
  //   precisely why AdminTherapistDetailPage runs every value through
  //   resolveServiceId() on load — this page was the one surface that didn't.
  //
  //   Both symptoms she reported fall straight out of that:
  //     • "กดใช้งานจริงไม่ได้" — a legacy slug matches no option, so every row
  //       rendered OFF even though she was already offering those services.
  //       Toggling looked like it did nothing because the truth was never
  //       displayed in the first place.
  //     • "ไม่โชว์หรือซ้อนบนเว็บ" — switching one ON then appended the CANONICAL
  //       id next to the legacy slug it duplicates. The public profile maps ids
  //       through SERVICE_DISPLAY, so the pair rendered as one proper card plus
  //       one unmapped raw-id card: the same service listed twice.
  //
  //   Normalising on load fixes the display immediately, and because `dirty`
  //   compares against the RAW stored value, an unclean doc lights up the Save
  //   button on arrival — one tap rewrites it in canonical form for good.
  useEffect(() => {
    if (!therapist) return;
    const raw = therapist.servicesAvailable ?? [];
    const normalized = Array.from(
      new Set(raw.map((s) => resolveServiceId(s) ?? s).filter(Boolean))
    );
    setValue(normalized);
    initialRef.current = JSON.stringify(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.servicesAvailable ?? [])]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        servicesAvailable: value,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(value);
      setToast({ msg: "บันทึกบริการแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistServices] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="บริการที่ทำได้ · Services"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="เลือกบริการที่คุณเปิดรับตอนนี้ ลูกค้าจะเห็นตรงนี้บนโปรไฟล์สาธารณะของคุณ"
      toast={toast}
      onToastClose={() => setToast(null)}
      footer={
        <>
          <Box
            sx={{
              mt: 2.5,
              background: "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 45%, var(--sr-panel) 100%)",
              border: "1px solid rgba(194,24,91,0.20)",
              borderRadius: 3,
              padding: "16px",
              boxShadow: "0 8px 22px rgba(194,24,91,0.10)",
            }}
          >
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: "var(--sr-ink)", mb: 0.5 }}>
              ตารางราคา · แบ่งรายได้ต่อเมนู
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-muted)", lineHeight: 1.5, mb: 1.5 }}>
              ราคาที่ลูกค้าจ่าย เทียบกับส่วนที่คุณได้ต่องาน — ตัวเลขเดียวกับที่ใช้จ่ายจริงในหน้ารีพอต
              (ไม่รวมค่าแท็กซี่ · ดูตารางค่าเดินทางแยกด้านล่าง)
            </Typography>
            <ServiceSplitTable />
            {/* 🆕 Round 28x.115 (founder: "อธิบายเรื่องการจัดโปร ว่าไม่กระทบต่อ
                ส่วนแบ่งรายได้ต่อเมนู") — every duration on this page's catalog
                has a FIXED therapist amount (SERVICE_SPLIT_DEFAULTS), which a
                discount never touches; the shop's own share absorbs the full
                difference (commission.ts shopShareFor = base − therapistShare,
                where therapistShare is this fixed number, not a % of the
                discounted base). */}
            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.5, mt: 1.5 }}>
              ถ้าลูกค้าได้ส่วนลดหรือโค้ดโปรโมชัน ส่วนของคุณตามตารางนี้ไม่ถูกหักลดค่ะ —
              ทางร้านรับผลต่างของส่วนลดเต็มจำนวน
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 2,
              background: "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 45%, var(--sr-panel) 100%)",
              border: "1px solid rgba(194,24,91,0.20)",
              borderRadius: 3,
              padding: "16px",
              boxShadow: "0 8px 22px rgba(194,24,91,0.10)",
            }}
          >
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: "var(--sr-ink)", mb: 0.5 }}>
              ค่าเดินทาง · Taxi fare
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-muted)", lineHeight: 1.5, mb: 1.5 }}>
              ราคารอบไป-กลับ มอเตอร์ไซค์ (ค่าเริ่มต้น) — ถ้าฝนตกจะเปลี่ยนเป็นรถยนต์ ราคาอาจสูงกว่านี้
            </Typography>
            <TaxiFareTable />
            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.5, mt: 1.5 }}>
              ช่วงเร่งด่วน (7–9, 17–20 น.) +{RUSH_SURGE_PCT}% · ช่วงดึก (21–02 น.) +{PEAK_SURGE_PCT}% —
              บวกเพิ่มจากราคาฐานด้านบน
            </Typography>
          </Box>
        </>
      }
    >
      <TherapistServiceList value={value} onChange={setValue} />
    </SelfEditShell>
  );
};

export default TherapistServicesPage;
