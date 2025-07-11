// src/pages/admin/AdminUserDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
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

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={user.image} alt={user.name || user.email} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {user.name || '-'}
            </Typography>
            <Typography>{user.email}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography><b>Role:</b> {user.role}</Typography>
        <Typography><b>Status:</b> {user.isActive === false ? 'Inactive' : 'Active'}</Typography>
        <Typography><b>Created At:</b> {formatDate(user.createdAt)}</Typography>
      </Paper>
    </Box>
  );
};

export default AdminUserDetailPage;