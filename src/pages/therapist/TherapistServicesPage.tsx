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
import { SelfEditShell } from "./selfEditKit";
import services from "@/data/services";
import { durationsFor, priceForDuration, formatTHB } from "@/utils/servicePricing";
import { therapistFixedFor, therapistPctFor } from "@/utils/commission";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE_DEEP = "#C2185B";

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
              background: on ? "linear-gradient(135deg, #E0708F, #C2185B)" : "var(--sr-panel)",
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
const ServiceSplitTable: React.FC = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {services.map((svc) => (
      <Box key={svc.id}>
        <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: 12.5, color: "var(--sr-ink)", mb: 0.75 }}>
          {svc.name}
        </Typography>
        <Box sx={{ borderRadius: "12px", border: "1px solid var(--sr-hairline)", overflow: "hidden" }}>
          <Box sx={{ display: "flex", px: "12px", py: "8px", background: "var(--sr-panel-2)" }}>
            <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 10, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ระยะเวลา
            </Typography>
            <Typography sx={{ width: 76, textAlign: "right", fontFamily: SANS, fontSize: 10, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ราคา
            </Typography>
            <Typography sx={{ width: 84, textAlign: "right", fontFamily: SANS, fontSize: 10, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              คุณได้
            </Typography>
          </Box>
          {durationsFor(svc).map((d, i) => {
            const price = priceForDuration(svc, d);
            const cut = therapistFixedFor(svc.id, d) ?? Math.round(price * therapistPctFor(svc.id));
            return (
              <Box
                key={d}
                sx={{ display: "flex", alignItems: "center", px: "12px", py: "9px", borderTop: i > 0 ? "1px solid var(--sr-hairline)" : "none" }}
              >
                <Typography sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--sr-body)" }}>
                  {d} นาที
                </Typography>
                <Typography sx={{ width: 76, textAlign: "right", fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)" }}>
                  {formatTHB(price)}
                </Typography>
                <Typography sx={{ width: 84, textAlign: "right", fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: ROSE_DEEP }}>
                  {formatTHB(cut)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    ))}
  </Box>
);

const TherapistServicesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("[]");

  useEffect(() => {
    if (!therapist) return;
    const list = therapist.servicesAvailable ?? [];
    setValue(list);
    initialRef.current = JSON.stringify(list);
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
      note="เลือกบริการที่คุณเปิดรับตอนนี้ — ลูกค้าจะเห็นตรงนี้บนโปรไฟล์สาธารณะของคุณ"
      toast={toast}
      onToastClose={() => setToast(null)}
      footer={
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
          </Typography>
          <ServiceSplitTable />
        </Box>
      }
    >
      <TherapistServiceList value={value} onChange={setValue} />
    </SelfEditShell>
  );
};

export default TherapistServicesPage;
