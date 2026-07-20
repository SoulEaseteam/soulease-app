// src/pages/therapist/TherapistGalleryPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Gallery · แกลเลอรี — เพิ่ม/ลบ
//   ได้สูงสุด 9 รูป ทุกรูปที่อัปโหลดใหม่จะถูกตรวจสอบผ่านแอดมินหลังบ้านก่อน
//   เสมอ") — new uploads land in `galleryRequests` as pending (never touch
//   the live `gallery` array directly — firestore.rules no longer allows
//   that self-write), reviewed on the admin "คำขอพนักงาน" page. Removing an
//   already-live photo is instant self-service (firestore.rules'
//   therapistGallerySelfRemoval only permits the array to shrink).
//   9-photo cap (live + pending combined) is a UI guard, not a rules
//   boundary — matches the Wed/Sun working-hours precedent (28x.88).

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, CircularProgress, IconButton, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CaretLeft, UploadSimple, X, CircleNotch, Clock } from "phosphor-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { app, auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { downscaleImage } from "@/pages/admin/therapistFormKit";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const GALLERY_CAP = 9;

interface PendingRequest {
  id: string;
  imageUrl: string;
}

const TherapistGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "galleryRequests"), where("therapistUid", "==", uid), where("status", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => setPending(snap.docs.map((d) => ({ id: d.id, imageUrl: (d.data().imageUrl as string) ?? "" }))),
      () => setPending([]),
    );
    return () => unsub();
  }, []);

  const live = therapist?.gallery ?? [];
  const totalCount = live.length + pending.length;
  const atCap = totalCount >= GALLERY_CAP;

  const removeLivePhoto = async (url: string) => {
    if (!therapistDocId) return;
    setBusyUrl(url);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        gallery: live.filter((u) => u !== url),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
    } catch (err) {
      console.error("[TherapistGallery] remove failed:", err);
      setToast({ msg: "ลบรูปไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setBusyUrl(null);
    }
  };

  const withdrawPending = async (id: string) => {
    setBusyUrl(id);
    try {
      await deleteDoc(doc(db, "galleryRequests", id));
    } catch (err) {
      console.error("[TherapistGallery] withdraw failed:", err);
      setToast({ msg: "ยกเลิกคำขอไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setBusyUrl(null);
    }
  };

  const onUploadFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !therapistDocId) return;
    if (atCap) {
      setToast({ msg: `ครบ ${GALLERY_CAP} รูปแล้ว ลบรูปเดิมก่อนถึงจะเพิ่มได้`, severity: "error" });
      return;
    }
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file);
      const path = `therapists/${therapistDocId}/galleryPending/${Date.now()}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      const imageUrl = await getDownloadURL(snap.ref);
      await addDoc(collection(db, "galleryRequests"), {
        therapistUid: auth.currentUser?.uid ?? null,
        therapistDocId,
        therapistName: therapist?.name ?? therapistDocId,
        imageUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setToast({ msg: "ส่งรูปให้แอดมินตรวจแล้ว รออนุมัติก่อนขึ้นจริง", severity: "success" });
    } catch (err) {
      console.error("[TherapistGallery] upload failed:", err);
      setToast({ msg: "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 10 }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate("/therapist/home")} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          แกลเลอรี · Gallery
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress sx={{ color: "#D97C95" }} />
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-muted)", lineHeight: 1.5, mb: 2 }}>
            เพิ่ม/ลบได้สูงสุด {GALLERY_CAP} รูป ({totalCount}/{GALLERY_CAP}) — รูปที่อัปโหลดใหม่ทุกรูปต้องรอแอดมินตรวจสอบก่อนขึ้นจริงบนโปรไฟล์
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => void onUploadFiles(e.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || atCap}
            fullWidth
            startIcon={uploading ? <CircleNotch size={16} className="sr-spin" /> : <UploadSimple size={16} weight="bold" />}
            sx={{
              mb: 2.5, py: 1.4, textTransform: "none", fontWeight: 700, borderRadius: 2,
              background: "linear-gradient(135deg, #C96F89, #7A3049)", color: "#fff", boxShadow: "none",
              "&:hover": { boxShadow: "none" },
              "&.Mui-disabled": { background: "var(--sr-panel-2)", color: "var(--sr-dim)" },
              "& .sr-spin": { animation: "srspin 0.8s linear infinite" },
              "@keyframes srspin": { to: { transform: "rotate(360deg)" } },
            }}
          >
            {atCap ? `ครบ ${GALLERY_CAP} รูปแล้ว` : uploading ? "กำลังอัปโหลด…" : "อัปโหลดรูปใหม่"}
          </Button>

          {pending.length > 0 && (
            <>
              <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: "var(--sr-muted)", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
                รอแอดมินตรวจสอบ
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: 2.5 }}>
                {pending.map((p) => (
                  <Box key={p.id} sx={{ position: "relative", aspectRatio: "1", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(184,92,60,0.18)" }}>
                    <Box component="img" src={p.imageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
                    <Box sx={{ position: "absolute", top: 4, left: 4, display: "flex", alignItems: "center", gap: "3px", background: "rgba(0,0,0,0.55)", borderRadius: "8px", px: "6px", py: "2px" }}>
                      <Clock size={10} color="#fff" />
                      <Typography sx={{ fontSize: 8.5, color: "#fff", fontWeight: 700 }}>รอตรวจ</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => void withdrawPending(p.id)}
                      disabled={busyUrl === p.id}
                      sx={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "rgba(0,0,0,0.55)", color: "#fff", "&:hover": { background: "rgba(0,0,0,0.75)" } }}
                    >
                      <X size={12} weight="bold" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: "var(--sr-muted)", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
            รูปที่ขึ้นจริงตอนนี้
          </Typography>
          {live.length === 0 ? (
            <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)" }}>
              ยังไม่มีรูปในแกลเลอรี
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {live.map((url) => (
                <Box key={url} sx={{ position: "relative", aspectRatio: "1", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(184,92,60,0.18)" }}>
                  <Box component="img" src={url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton
                    size="small"
                    onClick={() => void removeLivePhoto(url)}
                    disabled={busyUrl === url}
                    sx={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "rgba(0,0,0,0.55)", color: "#fff", "&:hover": { background: "rgba(0,0,0,0.75)" } }}
                  >
                    <X size={12} weight="bold" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={2800} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} variant="filled" sx={{ fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default TherapistGalleryPage;
