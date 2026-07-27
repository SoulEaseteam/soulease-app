import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider, 
  CircularProgress,
  Button,
  Select,
  MenuItem,
} from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from "@/lib/firebase";
import { Timestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { adminResetCustomerPassword } from "@/utils/adminResetPassword";
import type { User as UserBase } from "@/types/user";

// Shared field list lives in @/types/user (reconciled 2026-07-27
// restructure). This page always synthesizes `id` before use and
// treats `email`/`role` as guaranteed non-null, unlike the looser
// canonical shape shared with AdminUsersPage.
interface User extends Omit<UserBase, "id" | "email" | "role"> {
  id: string;
  email: string;
  role: 'user' | 'therapist' | 'admin';
}

const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const currentAdminUid = auth.currentUser?.uid; // 👈 ตรวจสอบ admin คนปัจจุบัน

  useEffect(() => {
    const fetchUser = async () => {
      const ref = doc(db, 'users', id!);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUser({ id: snap.id, ...snap.data() } as User);
      }
      setLoading(false);
    };
    void fetchUser();
  }, [id]);

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;

    // ❌ Admin ห้ามเปลี่ยน role ของตัวเอง
    if (user.id === currentAdminUid) {
      toast.warning("You cannot change your own role.");
      return;
    }

    await updateDoc(doc(db, 'users', user.id), { role: newRole });
    setUser({ ...user, role: newRole as User['role'] });
  };

  const handleToggleActive = async () => {
    if (!user) return;

    // ❌ Admin ห้ามปิด active ของตัวเอง
    if (user.id === currentAdminUid) {
      toast.warning("You cannot deactivate your own account.");
      return;
    }

    await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive });
    setUser({ ...user, isActive: !user.isActive });
  };

  // 🆕 28x.29 — reset this customer's login password to their phone number.
  //   Calls the admin-only Cloud Function; on success the concierge tells the
  //   guest to log in with their username/phone + phone-as-password.
  const handleResetPassword = async () => {
    if (!user) return;
    if (user.id === currentAdminUid) {
      toast.warning("Use My Account to change your own password.");
      return;
    }
    const ok = window.confirm(
      `รีเซตรหัสผ่านของ ${user.name || user.username || user.phone || user.email}?\n\nรหัสใหม่จะเป็น "เบอร์โทรของลูกค้าเอง" — ลูกค้าเข้าระบบด้วย username/เบอร์ + เบอร์เป็นรหัสผ่าน`
    );
    if (!ok) return;
    setResetting(true);
    try {
      const res = await adminResetCustomerPassword(user.id);
      const loginHint = user.username || res.phone;
      toast.success(
        `รีเซตแล้ว · เข้าด้วย ${loginHint} · รหัสผ่าน = ${res.newPassword} (เบอร์)`,
        { autoClose: 12000 }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reset password] failed", e);
      toast.error(`รีเซตไม่สำเร็จ: ${msg}`);
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box p={4}>
        <Typography color="error">User not found.</Typography>
      </Box>
    );
  }

  const isSelf = user.id === currentAdminUid; // ตรวจสอบว่าดู user ตัวเอง

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={user.image} alt={user.name || user.email} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">{user.name || '-'}</Typography>
            <Typography>{user.email}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography><b>Created At:</b> {formatDate(user.createdAt)}</Typography>

        <Box mt={2}>
          <Typography fontWeight="bold">Role:</Typography>

          <Select
            size="small"
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isSelf}
            MenuProps={{ PaperProps: { sx: { background: "#fff", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="therapist">Therapist</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>

          {isSelf && (
            <Typography color="error" fontSize={12} mt={1}>
              ⚠️ You cannot change your own role.
            </Typography>
          )}
        </Box>

        <Box mt={2}>
          <Typography fontWeight="bold">Status:</Typography>
          <Button
            variant="contained"
            color={user.isActive === false ? 'error' : 'success'}
            onClick={handleToggleActive}
            disabled={isSelf} // ❌ Admin ห้าม deactive ตัวเอง
            sx={{ mt: 1 }}
          >
            {user.isActive === false ? 'Inactive' : 'Active'}
          </Button>

          {isSelf && (
            <Typography color="error" fontSize={12} mt={1}>
              ⚠️ You cannot deactivate your own account.
            </Typography>
          )}
        </Box>

        {/* 🆕 28x.29 — reset login password to the customer's phone number */}
        <Divider sx={{ my: 2 }} />
        <Box mt={1}>
          <Typography fontWeight="bold">รหัสผ่าน (Login):</Typography>
          <Typography fontSize={12.5} color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
            {user.phone
              ? `รีเซตแล้วรหัสจะเป็นเบอร์ ${user.phone} · เข้าด้วย ${user.username || user.phone}`
              : "⚠️ ลูกค้ารายนี้ไม่มีเบอร์ในระบบ — รีเซตเป็นเบอร์ไม่ได้"}
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleResetPassword}
            disabled={isSelf || resetting || !user.phone}
            sx={{ mt: 0.5 }}
          >
            {resetting ? "กำลังรีเซต…" : "รีเซตรหัสผ่าน → เบอร์โทร"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminUserDetailPage;