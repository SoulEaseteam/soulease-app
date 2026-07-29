// src/pages/therapist/TherapistGalleryPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Gallery · แกลเลอรี — เพิ่ม/ลบ
//   ได้สูงสุด 9 รูป ทุกรูปที่อัปโหลดใหม่จะถูกตรวจสอบผ่านแอดมินหลังบ้านก่อน
//   เสมอ") — new uploads land in `galleryRequests` as pending (never touch
//   the live `gallery` array directly — firestore.rules no longer allows
//   that self-write), reviewed on the admin "คำขอพนักงาน" page. Removing an
//   already-live photo is instant self-service (firestore.rules'
//   therapistGallerySelfRemoval only permits the array to shrink).
//   Cap (live + pending combined) is a UI guard, not a rules boundary —
//   matches the Wed/Sun working-hours precedent (28x.88).
//
// 🆕 Round 28x.111 (founder: "แกลเลอรี แก้ไขเป็นเพิ่มได้ 12 รูป") — bumped
//   9 → 12.
//
// 🆕 Round 28x.112 (founder: "กดค้างเรียงลำดับรูปได้") — long-press any live
//   photo to enter a reorderable list (framer-motion's Reorder, the only
//   drag library already in this app — no new dependency). A grid doesn't
//   have a well-supported drag-reorder story in Reorder (it hit-tests along
//   ONE axis, which breaks across grid rows/columns), so reordering switches
//   to a single-column list for the duration, then returns to the normal
//   3-col grid. Saves by rewriting the therapist's `gallery` array in the
//   new order — firestore.rules' galleryOnlyShrinks() only checks that every
//   URL in the new array already existed in the old one (hasAll), which a
//   same-set reorder always satisfies; no rules change needed.
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, CircularProgress, IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Reorder } from "framer-motion";
import { CaretLeft, UploadSimple, X, CircleNotch, Clock, Image, Trash, DotsSixVertical } from "phosphor-react";
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
const GALLERY_CAP = 12;

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
  // 🆕 Round 28x.104 (founder: "ถามทุกครั้งที่กดลบ") — the X button used to
  // delete instantly; now it just opens a confirm dialog, same for a live
  // photo or a still-pending request.
  const [confirmTarget, setConfirmTarget] = useState<{ kind: "live" | "pending"; key: string } | null>(null);

  // 🆕 Round 28x.112 — long-press-to-reorder state. `orderDraft` is a working
  // copy of the live gallery order edited by Reorder.Group; the real
  // `gallery` array on the therapist doc is untouched until "บันทึกลำดับ".
  const [reordering, setReordering] = useState(false);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const LONG_PRESS_MS = 450;
  const MOVE_CANCEL_PX = 8;

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

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const { kind, key } = confirmTarget;
    setConfirmTarget(null);
    if (kind === "live") await removeLivePhoto(key);
    else await withdrawPending(key);
  };

  // ── Long-press to reorder (28x.112) ────────────────────────────────────
  const clearPressTimer = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
  };

  const onTilePointerDown = (e: React.PointerEvent) => {
    pressStart.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      setOrderDraft(live);
      setReordering(true);
      clearPressTimer();
    }, LONG_PRESS_MS);
  };

  const onTilePointerMove = (e: React.PointerEvent) => {
    if (!pressStart.current) return;
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearPressTimer();
  };

  const orderDirty = JSON.stringify(orderDraft) !== JSON.stringify(live);

  const cancelReorder = () => {
    setReordering(false);
    setOrderDraft([]);
  };

  const saveOrder = async () => {
    if (!therapistDocId || !orderDirty) {
      setReordering(false);
      return;
    }
    setSavingOrder(true);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        gallery: orderDraft,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      setToast({ msg: "บันทึกลำดับรูปแล้ว", severity: "success" });
      setReordering(false);
    } catch (err) {
      console.error("[TherapistGallery] reorder save failed:", err);
      setToast({ msg: "บันทึกลำดับไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSavingOrder(false);
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
          <CircularProgress sx={{ color: "#FF9999" }} />
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          {/* 🆕 Round 28x.104 (founder: "ปรับหน้าแกลเลอรีให้สวยขึ้น") — a
              vivid rose counter card instead of a plain caption line. */}
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: 1.25, mb: 2.5,
              p: "12px 14px", borderRadius: "14px",
              background: "linear-gradient(160deg, rgba(224,112,143,0.12) 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)",
              border: "1px solid rgba(194,24,91,0.20)",
            }}
          >
            <Box sx={{ width: 34, height: 34, borderRadius: "11px", flexShrink: 0, background: "linear-gradient(135deg, #FF9999, #FF9999)", boxShadow: "0 3px 8px rgba(194,24,91,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Image size={17} weight="duotone" color="#fff" />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: "var(--sr-ink)" }}>
                {totalCount}/{GALLERY_CAP} รูป
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.4, mt: "1px" }}>
                รูปที่อัปโหลดใหม่ทุกรูปต้องรอแอดมินตรวจสอบก่อนขึ้นจริง
              </Typography>
            </Box>
          </Box>

          {reordering ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: "var(--sr-ink)" }}>
                  จัดเรียงรูป · Reorder
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)" }}>
                  ลากขึ้น/ลง แล้วกดบันทึก
                </Typography>
              </Box>
              <Reorder.Group
                axis="y"
                values={orderDraft}
                onReorder={setOrderDraft}
                style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}
              >
                {orderDraft.map((url, i) => (
                  <Reorder.Item key={url} value={url} style={{ listStyle: "none" }}>
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.25,
                        p: "8px 10px", borderRadius: "14px",
                        background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)",
                        boxShadow: "var(--sr-card-shadow)",
                      }}
                    >
                      <DotsSixVertical size={18} color="var(--sr-dim)" style={{ cursor: "grab", flexShrink: 0 }} />
                      <Box component="img" src={url} alt="" sx={{ width: 48, height: 48, borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-muted)" }}>
                        รูปที่ {i + 1}
                      </Typography>
                    </Box>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              <Box sx={{ display: "flex", gap: 1, mt: 2, mb: 2.5 }}>
                <Button
                  onClick={cancelReorder}
                  disabled={savingOrder}
                  fullWidth
                  sx={{ py: 1.2, borderRadius: 2, textTransform: "none", fontWeight: 700, color: "var(--sr-muted)", background: "var(--sr-panel-2)" }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={() => void saveOrder()}
                  disabled={!orderDirty || savingOrder}
                  fullWidth
                  variant="contained"
                  sx={{
                    py: 1.2, borderRadius: 2, textTransform: "none", fontWeight: 700,
                    background: "linear-gradient(135deg, #FF9999, #FF9999)", boxShadow: "0 6px 16px rgba(194,24,91,0.30)",
                    "&.Mui-disabled": { background: "var(--sr-panel-2)", color: "var(--sr-dim)", boxShadow: "none" },
                  }}
                >
                  {savingOrder ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึกลำดับ"}
                </Button>
              </Box>
            </>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: "var(--sr-muted)", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
                    รอแอดมินตรวจสอบ
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: 2.5 }}>
                    {pending.map((p) => (
                      <Box key={p.id} sx={{ position: "relative", aspectRatio: "1", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(194,24,91,0.20)", boxShadow: "0 4px 12px rgba(194,24,91,0.10)" }}>
                        <Box component="img" src={p.imageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
                        <Box sx={{ position: "absolute", top: 5, left: 5, display: "flex", alignItems: "center", gap: "3px", background: "rgba(0,0,0,0.55)", borderRadius: "8px", px: "6px", py: "2px" }}>
                          <Clock size={10} color="#fff" />
                          <Typography sx={{ fontSize: 8.5, color: "#fff", fontWeight: 700 }}>รอตรวจ</Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => setConfirmTarget({ kind: "pending", key: p.id })}
                          disabled={busyUrl === p.id}
                          sx={{ position: "absolute", top: 5, right: 5, width: 24, height: 24, background: "rgba(220,38,38,0.85)", color: "#fff", "&:hover": { background: "#DC2626" } }}
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
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.25, py: 5 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #FF9999, #FF9999)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(194,24,91,0.28)" }}>
                    <Image size={26} weight="duotone" />
                  </Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)" }}>
                    ยังไม่มีรูปในแกลเลอรี
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: live.length > 1 ? 1 : 2.5 }}>
                    {live.map((url) => (
                      <Box
                        key={url}
                        onPointerDown={live.length > 1 ? onTilePointerDown : undefined}
                        onPointerMove={live.length > 1 ? onTilePointerMove : undefined}
                        onPointerUp={live.length > 1 ? clearPressTimer : undefined}
                        onPointerLeave={live.length > 1 ? clearPressTimer : undefined}
                        onContextMenu={(e) => e.preventDefault()}
                        sx={{
                          position: "relative", aspectRatio: "1", borderRadius: "14px", overflow: "hidden",
                          border: "1px solid rgba(194,24,91,0.20)", boxShadow: "0 4px 12px rgba(194,24,91,0.10)",
                          userSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation",
                        }}
                      >
                        <Box component="img" src={url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                        <IconButton
                          size="small"
                          onClick={() => setConfirmTarget({ kind: "live", key: url })}
                          disabled={busyUrl === url}
                          sx={{ position: "absolute", top: 5, right: 5, width: 24, height: 24, background: "rgba(220,38,38,0.85)", color: "#fff", "&:hover": { background: "#DC2626" } }}
                        >
                          <X size={12} weight="bold" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                  {live.length > 1 && (
                    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-dim)", mb: 2.5, textAlign: "center" }}>
                      กดค้างรูปเพื่อจัดเรียงใหม่
                    </Typography>
                  )}
                </>
              )}
            </>
          )}

          {/* 🆕 Round 28x.104 (founder: "เอาปุ่มอัปโหลดไว้ข้างล่าง") — moved
              from above both grids to below them. Hidden while reordering
              (28x.112) — nothing to upload mid-drag. */}
          {!reordering && (
            <>
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
                  mt: 1, py: 1.4, textTransform: "none", fontWeight: 700, borderRadius: 2,
                  background: "linear-gradient(135deg, #FF9999, #FF9999)", color: "#fff", boxShadow: "0 6px 16px rgba(194,24,91,0.30)",
                  "&:hover": { boxShadow: "0 6px 16px rgba(194,24,91,0.30)" },
                  "&.Mui-disabled": { background: "var(--sr-panel-2)", color: "var(--sr-dim)", boxShadow: "none" },
                  "& .sr-spin": { animation: "srspin 0.8s linear infinite" },
                  "@keyframes srspin": { to: { transform: "rotate(360deg)" } },
                }}
              >
                {atCap ? `ครบ ${GALLERY_CAP} รูปแล้ว` : uploading ? "กำลังอัปโหลด…" : "อัปโหลดรูปใหม่"}
              </Button>
            </>
          )}
        </Box>
      )}

      {/* 🆕 Round 28x.104 (founder: "ถามทุกครั้งที่กดลบ") */}
      <Dialog open={Boolean(confirmTarget)} onClose={() => setConfirmTarget(null)} PaperProps={{ sx: { borderRadius: "16px", background: "var(--sr-panel)", maxWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "var(--sr-ink)" }}>
          {confirmTarget?.kind === "pending" ? "ยกเลิกคำขอรูปนี้?" : "ลบรูปนี้?"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)", lineHeight: 1.5 }}>
            {confirmTarget?.kind === "pending"
              ? "รูปที่รออนุมัติจะถูกยกเลิกทันที ทำกลับไม่ได้"
              : "รูปนี้จะหายจากโปรไฟล์สาธารณะทันที ทำกลับไม่ได้"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmTarget(null)} sx={{ textTransform: "none", fontWeight: 700, color: "var(--sr-muted)" }}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => void confirmDelete()}
            startIcon={<Trash size={15} weight="bold" />}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, background: "#DC2626", color: "#fff", "&:hover": { background: "#B91C1C" } }}
          >
            ลบเลย
          </Button>
        </DialogActions>
      </Dialog>

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
