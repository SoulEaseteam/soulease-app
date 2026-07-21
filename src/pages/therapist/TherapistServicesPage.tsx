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

const SANS = '"Inter", system-ui, sans-serif';

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
    >
      <TherapistServiceList value={value} onChange={setValue} />
    </SelfEditShell>
  );
};

export default TherapistServicesPage;
