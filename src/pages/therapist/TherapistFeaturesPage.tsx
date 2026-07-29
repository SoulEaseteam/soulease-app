// src/pages/therapist/TherapistFeaturesPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Features · ลักษณะเฉพาะตัว") —
// self-service edit for `features` on her own therapist doc. `features` is
// written as a plain Record<string,string> (matches AddTherapistPage's own
// save shape, not the stricter Features interface — Firestore doesn't
// enforce it either way).
//
// 🆕 Round 28x.105 (founder: "ปรับให้สวยขึ้น เป็นสัดส่วน ดูง่าย กระชับขึ้น") —
// was rendering admin's shared FeaturesEditor, which hardcodes
// `adminColor.panel` (stark white boxes) on top of this page's dark/rose
// staff theme, and stacked all 15 fields in a single column on mobile — a
// long scroll of oversized inputs. This page now has its own compact field
// GRID (2 columns at every width, not just sm+) styled with the staff
// app's own rose accent, while still reading the field list from admin's
// FEATURE_ROWS constant — so admin's Add/Edit Therapist form (which still
// uses FeaturesEditor directly) and this page can never offer a different
// set of fields, only a different presentation of the same ones.

import React, { useEffect, useRef, useState } from "react";
import { Box, TextField } from "@mui/material";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { FEATURE_ROWS } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: "var(--sr-panel-2)",
    fontSize: 13.5,
    "& fieldset": { borderColor: "var(--sr-hairline)" },
    "&:hover fieldset": { borderColor: "rgba(194,24,91,0.35)" },
    "&.Mui-focused fieldset": { borderColor: "#FF9999", borderWidth: "1.5px" },
  },
  "& .MuiInputLabel-root": { fontSize: 12.5, color: "var(--sr-muted)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#FF9999" },
  "& .MuiOutlinedInput-input": { color: "var(--sr-ink)" },
} as const;

const TherapistFeatureGrid: React.FC<{ value: Record<string, string>; onChange: (k: string, v: string) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
    {FEATURE_ROWS.map(([k, label]) => (
      <TextField
        key={k}
        label={label}
        fullWidth
        size="small"
        sx={fieldSx}
        value={value[k] ?? ""}
        onChange={(e) => onChange(k, e.target.value)}
      />
    ))}
  </Box>
);

const TherapistFeaturesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("{}");

  useEffect(() => {
    if (!therapist) return;
    const obj = (therapist.features ?? {}) as unknown as Record<string, string>;
    setValue(obj);
    initialRef.current = JSON.stringify(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.features ?? {})]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) if ((v ?? "").trim()) trimmed[k] = v.trim();
      await updateDoc(doc(db, "therapists", therapistDocId), {
        features: trimmed,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(trimmed);
      setValue(trimmed);
      setToast({ msg: "บันทึกข้อมูลแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistFeatures] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="ลักษณะเฉพาะตัว · Features"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="ข้อมูลเหล่านี้แสดงในหน้าโปรไฟล์สาธารณะของคุณ ปล่อยว่างช่องไหนก็ได้ถ้าไม่อยากระบุ"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <TherapistFeatureGrid value={value} onChange={(k, v) => setValue((prev) => ({ ...prev, [k]: v }))} />
    </SelfEditShell>
  );
};

export default TherapistFeaturesPage;
