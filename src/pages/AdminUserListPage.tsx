// src/pages/AdminUserListPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { doc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface User {
  id: string;
  email: string;
  role: 'user' | 'therapist' | 'admin';
  createdAt?: string;
  isActive?: boolean;
}

const AdminUserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const data: User[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as User[];
      setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleToggleRole = async (id: string, role: User['role']) => {
    const newRole = role === 'therapist' ? 'user' : 'therapist';
    await updateDoc(doc(db, 'users', id), { role: newRole });
    alert(`Role updated to ${newRole}`);
    window.location.reload();
  };

  const handleToggleStatus = async (id: string, isActive: boolean = true) => {
    await updateDoc(doc(db, 'users', id), { isActive: !isActive });
    alert(`User has been ${isActive ? 'deactivated' : 'reactivated'}`);
    window.location.reload();
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#f4f6f8', py: 4 }}>
      <Box sx={{ maxWidth: 960, mx: 'auto', px: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          👤 All Users Management
        </Typography>

        <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.isActive === false ? 'Inactive' : 'Active'}</TableCell>
                  <TableCell>{user.createdAt || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => navigate(`/admin/user/${user.id}`)}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleRole(user.id, user.role)}>
                      <AdminPanelSettingsIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleStatus(user.id, user.isActive)}>
                      {user.isActive === false ? <CheckCircleOutlineIcon /> : <BlockIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AdminUserListPage;