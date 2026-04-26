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

interface User {
  id: string;
  email: string;
  role: 'user' | 'therapist' | 'admin';
  createdAt?: Timestamp;
  isActive?: boolean;
  image?: string;
  name?: string;
}

const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetchUser();
  }, [id]);

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;

    // ❌ Admin ห้ามเปลี่ยน role ของตัวเอง
    if (user.id === currentAdminUid) {
      alert("⚠️ You cannot change your own role.");
      return;
    }

    await updateDoc(doc(db, 'users', user.id), { role: newRole });
    setUser({ ...user, role: newRole as User['role'] });
  };

  const handleToggleActive = async () => {
    if (!user) return;

    // ❌ Admin ห้ามปิด active ของตัวเอง
    if (user.id === currentAdminUid) {
      alert("⚠️ You cannot deactivate your own account.");
      return;
    }

    await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive });
    setUser({ ...user, isActive: !user.isActive });
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
            disabled={isSelf} // ❌ Admin แก้ตัวเองไม่ได้
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
      </Paper>
    </Box>
  );
};

export default AdminUserDetailPage;