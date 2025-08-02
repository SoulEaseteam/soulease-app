import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Therapist {
  id: string;
  name: string;
  manualStatus?: 'available' | 'holiday' | string;
}

const ToggleHolidayPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'therapists'), (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Therapist[];
      setTherapists(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleHoliday = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'holiday' ? 'available' : 'holiday';
    await updateDoc(doc(db, 'therapists', id), {
      manualStatus: newStatus,
    });
    setSnackbar({ open: true, message: `Updated status to ${newStatus}` });
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Toggle Therapist Holiday Status
      </Typography>

      {therapists.length === 0 ? (
        <Typography>No therapists found.</Typography>
      ) : (
        <List>
          {therapists.map((t) => (
            <ListItem key={t.id} divider>
              <ListItemText
                primary={t.name}
                secondary={`Status: ${t.manualStatus || 'N/A'}`}
              />
              <Switch
                checked={t.manualStatus === 'holiday'}
                onChange={() => toggleHoliday(t.id, t.manualStatus || 'available')}
                color="error"
              />
            </ListItem>
          ))}
        </List>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbar({ open: false, message: '' })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ToggleHolidayPage;