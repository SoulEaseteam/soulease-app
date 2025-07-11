import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Snackbar,
  TextField,
  IconButton,
} from '@mui/material';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'therapist' | 'admin';
}

const AdminUserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editedUsername, setEditedUsername] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'users'));
    const userData: User[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<User, 'id'>),
    }));
    setUsers(userData);
    setLoading(false);
  };

  const handleSaveUsername = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { username: editedUsername });
      setSnackbar({ open: true, message: '✅ Username updated!', severity: 'success' });
      setEditUserId(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: '❌ Failed to update username', severity: 'error' });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        👥 All Users
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Paper elevation={3} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id.slice(0, 6)}...</TableCell>
                  <TableCell>
                    {editUserId === user.id ? (
                      <TextField
                        size="small"
                        value={editedUsername}
                        onChange={(e) => setEditedUsername(e.target.value)}
                        onBlur={() => handleSaveUsername(user.id)}
                      />
                    ) : (
                      user.username
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setEditUserId(user.id);
                        setEditedUsername(user.username);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default AdminUserListPage;