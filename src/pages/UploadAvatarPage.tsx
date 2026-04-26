import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  LinearProgress,
} from "@mui/material";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function UploadAvatarPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const storage = getStorage();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ===============================================================
  // HANDLE FILE SELECT
  // ===============================================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (selected.size > 4 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกิน 4MB");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  // ===============================================================
  // FIND THERAPIST DOCUMENT ID CORRECTLY (SunRed Logic)
  // ===============================================================
  const findTherapistDocId = async () => {
    if (!user) return null;

    // 1) Try docId = uid
    const direct = doc(db, "therapists", user.uid);
    const directSnap = await getDocs(
      query(collection(db, "therapists"), where("uid", "==", user.uid))
    );

    if (!directSnap.empty) {
      return directSnap.docs[0].id;
    }

    // 2) Try where email = user.email
    if (user.email) {
      const q2 = query(
        collection(db, "therapists"),
        where("email", "==", user.email)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) return snap2.docs[0].id;
    }

    return null;
  };

  // ===============================================================
  // UPLOAD LOGIC
  // ===============================================================
  const handleUpload = async () => {
    if (!file || !user) {
      alert("กรุณาเลือกรูปก่อน");
      return;
    }

    setUploading(true);

    try {
      const filePath = `avatars/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // ===============================================================
      // Update Firestore Based on Role
      // ===============================================================
      if (role === "therapist") {
        const therapistDocId = await findTherapistDocId();

        if (!therapistDocId) {
          alert("ไม่พบข้อมูล Therapist ในระบบ ไม่สามารถอัปโหลดได้");
          setUploading(false);
          return;
        }

        await updateDoc(doc(db, "therapists", therapistDocId), {
          image: url,
        });
      } else if (role === "admin") {
        await updateDoc(doc(db, "admins", user.uid), { avatar: url });
      } else {
        await updateDoc(doc(db, "users", user.uid), { avatar: url });
      }

      alert("อัปโหลดรูปเสร็จเรียบร้อย");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูป");
    } finally {
      setUploading(false);
    }
  };

  // ===============================================================
  // UI LAYOUT
  // ===============================================================
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        📸 Upload Your Avatar
      </Typography>

      <Card sx={{ p: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={3} alignItems="center">

            <Avatar
              src={preview || user?.photoURL || ""}
              sx={{
                width: 140,
                height: 140,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
            />

            <Button variant="contained" component="label" fullWidth sx={{ py: 1.5 }}>
              เลือกรูปภาพ
              <input hidden type="file" accept="image/*" onChange={handleFileChange} />
            </Button>

            {uploading && (
              <Box sx={{ width: "100%" }}>
                <LinearProgress />
                <Typography mt={1} textAlign="center" fontSize={14}>
                  กำลังอัปโหลด...
                </Typography>
              </Box>
            )}

            <Button
              variant="outlined"
              color="success"
              fullWidth
              disabled={!file || uploading}
              onClick={handleUpload}
              sx={{ py: 1.5 }}
            >
              อัปโหลดรูป
            </Button>

            <Button fullWidth variant="text" color="inherit" onClick={() => navigate(-1)}>
              ← กลับ
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}