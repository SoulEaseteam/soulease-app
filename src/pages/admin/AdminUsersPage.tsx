// src/pages/admin/AdminUsersPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: 'user' | 'therapist' | 'admin';
  image?: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(list);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        User Management
      </Typography>
      <Paper elevation={2}>
        <List>
          {users.map((user, index) => (
            <React.Fragment key={user.id}>
              <ListItem>
                <Avatar
                  src={user.image || ''}
                  alt={user.username}
                  sx={{ width: 40, height: 40, mr: 2 }}
                />
                <ListItemText
                  primary={`${user.username}`}
                  secondary={
                    <>
                      📧 {user.email || 'No email'} <br />
                      🔒 Role: <b>{user.role || 'user'}</b>
                    </>
                  }
                />
              </ListItem>
              {index < users.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminUsersPage;