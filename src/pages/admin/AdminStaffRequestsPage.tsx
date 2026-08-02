// src/pages/admin/AdminStaffRequestsPage.tsx
//
// 🆕 Round 28x.96 (founder: "ทุกรูปที่อัปโหลดใหม่จะถูกตรวจสอบผ่านแอดมิน
//   หลังบ้านก่อนเสมอ ( เพิ่มหน้า คำขอพนักงาน ในหน้าแอดมิน)") — review queue
//   for therapist self-service gallery uploads filed from
//   /therapist/gallery. Approve copies the URL into the live
//   therapists/{id}.gallery array (admin write bypasses the self-edit
//   whitelist in firestore.rules); reject just marks the request resolved
//   and the photo never goes live. Scoped to gallery photos only for now —
//   the page name is deliberately generic ("Staff Requests") so future
//   self-service approval flows can land here too.

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from "@mui/material";
import { CheckCircle, XCircle, Clock, Play } from "phosphor-react";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard } from "./therapistFormKit";

const SANS = adminFont.sans;

interface GalleryRequest {
  id: string;
  therapistDocId: string;
  therapistName: string;
  imageUrl: string;
  // 🆕 Round 28x.174 — absent on every historical request (all photos,
  //   filed before this field existed); default "image" everywhere it's
  //   read, matching the same optional shape firestore.rules accepts.
  mediaType: "image" | "video";
  createdAt: Timestamp | null;
}

const AdminStaffRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<GalleryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  useEffect(() => {
    const q = query(collection(db, "galleryRequests"), where("status", "==", "pending"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              therapistDocId: (data.therapistDocId as string) ?? "",
              therapistName: (data.therapistName as string) ?? (data.therapistDocId as string) ?? "—",
              imageUrl: (data.imageUrl as string) ?? "",
              mediaType: (data.mediaType as "image" | "video" | undefined) ?? "image",
              createdAt: (data.createdAt as Timestamp | undefined) ?? null,
            };
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const approve = async (r: GalleryRequest) => {
    setBusyId(r.id);
    try {
      // 🆕 Round 28x.174 — same approve action, routes to whichever field
      //   this media type actually lives on.
      await updateDoc(doc(db, "therapists", r.therapistDocId), {
        [r.mediaType === "video" ? "videos" : "gallery"]: arrayUnion(r.imageUrl),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      await updateDoc(doc(db, "galleryRequests", r.id), {
        status: "approved",
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser?.uid ?? null,
      });
      setToast({
        msg: `อนุมัติ${r.mediaType === "video" ? "วิดีโอ" : "รูป"}ของ ${r.therapistName} แล้ว`,
        severity: "success",
      });
    } catch (err) {
      console.error("[AdminStaffRequests] approve failed:", err);
      setToast({ msg: "อนุมัติไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: GalleryRequest) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "galleryRequests", r.id), {
        status: "rejected",
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser?.uid ?? null,
      });
      setToast({
        msg: `ปฏิเสธ${r.mediaType === "video" ? "วิดีโอ" : "รูป"}ของ ${r.therapistName} แล้ว`,
        severity: "success",
      });
    } catch (err) {
      console.error("[AdminStaffRequests] reject failed:", err);
      setToast({ msg: "ปฏิเสธไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto", fontFamily: SANS }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5, lineHeight: 1 }}>
        คำขอพนักงาน
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em", mb: 2.5 }}>
        Staff Requests · รูป/วิดีโอแกลเลอรีที่หมอนวดอัปโหลดใหม่ รอตรวจก่อนขึ้นจริง
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={22} />
        </Box>
      ) : requests.length === 0 ? (
        <SectionCard icon={<Clock size={13} weight="bold" />} title="คำขอที่รอตรวจ">
          <Typography sx={{ fontSize: 13, color: adminColor.muted }}>ไม่มีคำขอค้างตรวจตอนนี้</Typography>
        </SectionCard>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {requests.map((r) => (
            <Box
              key={r.id}
              sx={{
                display: "flex", gap: 1.5, alignItems: "center",
                background: adminColor.panel2, border: `1px solid ${adminColor.line}`,
                borderRadius: "16px", p: "12px 14px",
              }}
            >
              <Box sx={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                {r.mediaType === "video" ? (
                  <Box
                    component="video"
                    src={r.imageUrl}
                    preload="metadata"
                    muted
                    sx={{ width: 64, height: 64, borderRadius: "10px", objectFit: "cover", background: "#000", border: `1px solid ${adminColor.line2}` }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={r.imageUrl}
                    alt=""
                    sx={{ width: 64, height: 64, borderRadius: "10px", objectFit: "cover", border: `1px solid ${adminColor.line2}` }}
                  />
                )}
                {r.mediaType === "video" && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <Play size={18} weight="fill" color="rgba(255,255,255,0.85)" />
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: adminColor.text }}>
                  {r.therapistName}
                  {r.mediaType === "video" && (
                    <Box component="span" sx={{ ml: 0.75, fontSize: 10, fontWeight: 800, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      · วิดีโอ
                    </Box>
                  )}
                </Typography>
                <Typography sx={{ fontSize: 11, color: adminColor.dim, mt: "2px" }}>
                  {r.createdAt ? r.createdAt.toDate().toLocaleString("th-TH") : "—"}
                </Typography>
              </Box>
              <Button
                onClick={() => void approve(r)}
                disabled={busyId === r.id}
                startIcon={<CheckCircle size={15} weight="bold" />}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "10px", color: "#fff", background: adminColor.green, px: 1.5, "&:hover": { background: adminColor.green } }}
              >
                อนุมัติ
              </Button>
              <Button
                onClick={() => void reject(r)}
                disabled={busyId === r.id}
                startIcon={<XCircle size={15} weight="bold" />}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "10px", color: adminColor.red, border: `1px solid ${adminColor.line2}`, px: 1.5 }}
              >
                ปฏิเสธ
              </Button>
            </Box>
          ))}
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={3200} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default AdminStaffRequestsPage;
