// src/pages/admin/AdminApplicationsPage.tsx
//
// 🆕 P2 (marketplace on-ramp) — the admin review queue for public
//   "become a practitioner" applications submitted at /apply.
//
//   A prospective practitioner's submission lands here as `pending`. The
//   concierge reads it, reaches out on the contact she gave, and if she's a
//   fit, ADDS her as a therapist (Add Therapist) then mints her login
//   (Create account → the P1 ①② flow). Approve/Reject here is the vetting
//   decision; it deliberately does NOT auto-create a therapist doc — quality
//   gate stays human (CBODY is vetted, not open signup).

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { collection, onSnapshot, orderBy, query, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Check, X, Trash, Copy, Clock, MapPin, UserPlus, ChatCircleText } from "phosphor-react";

import { db } from "@/lib/firebase";
import { adminColor, adminFont } from "@/theme/adminTheme";

interface Application {
  id: string;
  name?: string;
  contactMethod?: string;
  contact?: string;
  area?: string;
  age?: string;
  experience?: string;
  status?: string;
  source?: string;
  agreedTerms?: boolean;
  photoUrls?: string[];
  tallyFields?: Record<string, string>;
  createdAt?: { toDate?: () => Date } | null;
}

const fmt = (v: Application["createdAt"]): string => {
  const d = v && typeof v.toDate === "function" ? v.toDate() : null;
  return d ? d.toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending:  { bg: "rgba(217,119,6,0.12)", fg: adminColor.amber, label: "รอพิจารณา" },
  approved: { bg: "rgba(22,163,74,0.12)", fg: adminColor.green, label: "อนุมัติแล้ว" },
  rejected: { bg: "rgba(220,38,38,0.10)", fg: adminColor.red,   label: "ปฏิเสธ" },
};

const AdminApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "providerApplications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setApps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Application, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("[applications] load failed", err.code ?? err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const pending = useMemo(() => apps.filter((a) => (a.status ?? "pending") === "pending"), [apps]);
  const reviewed = useMemo(() => apps.filter((a) => (a.status ?? "pending") !== "pending"), [apps]);

  const setStatus = async (a: Application, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "providerApplications", a.id), { status, reviewedAt: serverTimestamp() });
    } catch (e) {
      console.error("[applications] setStatus failed", e);
      toast.error("อัปเดตไม่สำเร็จ");
    }
  };

  const remove = async (a: Application) => {
    if (!window.confirm(`ลบใบสมัครของ "${a.name || "—"}" ทิ้ง?`)) return;
    try {
      await deleteDoc(doc(db, "providerApplications", a.id));
    } catch (e) {
      console.error("[applications] delete failed", e);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const copyContact = (a: Application) => {
    void navigator.clipboard.writeText(`${a.contactMethod ?? ""} ${a.contact ?? ""}`.trim());
    toast.success("คัดลอกช่องทางติดต่อแล้ว");
  };

  const renderCard = (a: Application) => {
    const st = STATUS_STYLE[a.status ?? "pending"] ?? STATUS_STYLE.pending;
    const isPending = (a.status ?? "pending") === "pending";
    return (
      <Box
        key={a.id}
        sx={{
          background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "16px",
          p: 2, boxShadow: "0 2px 10px rgba(31,41,51,0.04)", display: "flex", flexDirection: "column", gap: 1.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 700, fontSize: 16, color: adminColor.text }}>
            {a.name || "—"}
          </Typography>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: 1, py: "3px", borderRadius: "999px", background: st.bg }}>
            <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11, fontWeight: 800, color: st.fg }}>{st.label}</Typography>
          </Box>
        </Box>

        {/* Contact — the actionable line: copy it, then reach out off-app. */}
        <Box
          onClick={() => copyContact(a)}
          sx={{
            display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
            background: adminColor.panel2, borderRadius: "10px", p: "8px 10px",
            "&:hover": { background: adminColor.panel3 },
          }}
        >
          <ChatCircleText size={16} color={adminColor.accent} />
          <Typography sx={{ fontFamily: adminFont.sans, fontSize: 13.5, fontWeight: 700, color: adminColor.text, flex: 1, wordBreak: "break-all" }}>
            {a.contactMethod ? `${a.contactMethod} · ` : ""}{a.contact || "—"}
          </Typography>
          <Copy size={15} color={adminColor.dim} />
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontFamily: adminFont.sans, fontSize: 12.5, color: adminColor.muted }}>
          {a.area && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <MapPin size={13} color={adminColor.dim} /> {a.area}
            </Box>
          )}
          {a.age && <Box>อายุ {a.age}</Box>}
          {a.agreedTerms && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", color: adminColor.green, fontWeight: 700 }}>
              <Check size={13} weight="bold" /> ยอมรับข้อตกลง
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: "5px", ml: "auto" }}>
            <Clock size={13} color={adminColor.dim} /> {fmt(a.createdAt)}
          </Box>
        </Box>

        {a.experience && (
          <Typography sx={{ fontFamily: adminFont.sans, fontSize: 12.5, color: adminColor.dim, lineHeight: 1.6, whiteSpace: "pre-wrap", background: adminColor.panel2, borderRadius: "10px", p: "8px 10px" }}>
            {a.experience}
          </Typography>
        )}

        {/* 🆕 Tally submissions carry the full field set + uploaded photos. */}
        {a.tallyFields && Object.keys(a.tallyFields).length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontFamily: adminFont.sans, fontSize: 12, background: adminColor.panel2, borderRadius: "10px", p: "8px 10px" }}>
            {Object.entries(a.tallyFields).slice(0, 20).map(([k, v]) => (
              <Box key={k} sx={{ color: adminColor.text }}>
                <Box component="span" sx={{ color: adminColor.dim }}>{k}:</Box> {v}
              </Box>
            ))}
          </Box>
        )}
        {a.photoUrls && a.photoUrls.length > 0 && (
          <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {a.photoUrls.map((u, i) => (
              <Box key={i} component="a" href={u} target="_blank" rel="noopener noreferrer" sx={{ display: "block", lineHeight: 0 }}>
                <Box component="img" src={u} alt="" loading="lazy" sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: "8px", border: `1px solid ${adminColor.line}` }} />
              </Box>
            ))}
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: "flex", gap: "8px", mt: 0.25, flexWrap: "wrap" }}>
          {isPending ? (
            <>
              <Button
                size="small" onClick={() => void setStatus(a, "approved")}
                startIcon={<Check size={15} weight="bold" />}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "999px", color: "#fff", px: 1.75, background: "linear-gradient(180deg,#1CAE52,#149046)", "&:hover": { background: "#15803d" } }}
              >
                อนุมัติ
              </Button>
              <Button
                size="small" variant="outlined" onClick={() => void setStatus(a, "rejected")}
                startIcon={<X size={15} weight="bold" />}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "999px", color: adminColor.muted, borderColor: adminColor.line2 }}
              >
                ปฏิเสธ
              </Button>
            </>
          ) : (
            <Button
              size="small" variant="outlined" onClick={() => navigate("/admin/add-therapist")}
              startIcon={<UserPlus size={15} weight="bold" />}
              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "999px", color: adminColor.accent, borderColor: adminColor.line2 }}
            >
              เพิ่มเป็นหมอนวด
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small" onClick={() => void remove(a)}
            startIcon={<Trash size={15} />}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "999px", color: adminColor.dim, minWidth: 0, "&:hover": { color: adminColor.red } }}
          >
            ลบ
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: `radial-gradient(120% 90% at 15% 0%, ${adminColor.panel3} 0%, ${adminColor.bg} 55%)`, minHeight: "100%" }}>
      <Box mb={2.5}>
        <Button
          onClick={() => { if (window.history.length > 1) void navigate(-1); else void navigate("/admin/dashboard"); }}
          startIcon={<ArrowLeft size={13} weight="bold" />}
          variant="outlined"
          sx={{ borderColor: adminColor.accent, color: adminColor.accent, fontWeight: "bold", textTransform: "none", borderRadius: "10px", "&:hover": { borderColor: adminColor.accentDeep, background: adminColor.panel2 } }}
        >
          Back
        </Button>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 25, fontWeight: 700, color: adminColor.text, lineHeight: 1.15 }}>
          Applications
        </Typography>
        <Typography sx={{ fontSize: 12, color: adminColor.dim, mt: "3px" }}>
          ใบสมัครหมอนวด · จากหน้า sunred.vip/apply · รอพิจารณา {pending.length} รายการ
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={5}><CircularProgress sx={{ color: adminColor.accent }} /></Box>
      ) : apps.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 6, color: adminColor.dim }}>
          <Typography sx={{ fontFamily: adminFont.sans, fontSize: 14, fontWeight: 600 }}>ยังไม่มีใบสมัคร</Typography>
          <Typography sx={{ fontFamily: adminFont.sans, fontSize: 12.5, mt: 0.5 }}>
            แชร์ลิงก์ <b>sunred.vip/apply</b> ให้คนที่อยากร่วมงาน
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {pending.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: adminFont.sans, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: adminColor.amber, mb: 1.25 }}>
                รอพิจารณา · {pending.length}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {pending.map(renderCard)}
              </Box>
            </Box>
          )}
          {reviewed.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: adminFont.sans, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: adminColor.dim, mb: 1.25 }}>
                พิจารณาแล้ว · {reviewed.length}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {reviewed.map(renderCard)}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdminApplicationsPage;
