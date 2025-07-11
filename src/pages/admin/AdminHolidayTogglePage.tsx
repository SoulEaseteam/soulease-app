import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

const AdminTherapistHolidayPage: React.FC = () => {
  const [therapists, setTherapists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      const snapshot = await getDocs(collection(db, 'therapists'));
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTherapists(list);
      setLoading(false);
    };
    fetchTherapists();
  }, []);

  const toggleHoliday = async (id: string, current: string) => {
    const newStatus = current === 'holiday' ? 'available' : 'holiday';
    await updateDoc(doc(db, 'therapists', id), {
      manualStatus: newStatus,
    });
    setTherapists((prev) =>
      prev.map((t) => (t.id === id ? { ...t, manualStatus: newStatus } : t))
    );
  };

  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Therapist Holiday Management
      </Typography>
      <List>
        {therapists.map((t) => (
          <ListItem key={t.id} divider>
            <ListItemText
              primary={t.name}
              secondary={`Current status: ${t.manualStatus}`}
            />
            <Switch
              checked={t.manualStatus === 'holiday'}
              onChange={() => toggleHoliday(t.id, t.manualStatus)}
              color="error"
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default AdminTherapistHolidayPage;