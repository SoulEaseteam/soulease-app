// src/pages/admin/AdminHolidayTogglePage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  CircularProgress,
  Grid,
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Therapist {
  id: string;
  name: string;
  holiday: boolean;
}

const AdminHolidayTogglePage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTherapists = async () => {
    const snapshot = await getDocs(collection(db, 'therapists'));
    const data: Therapist[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      name: docSnap.data().name || 'Unnamed',
      holiday: docSnap.data().holiday || false,
    }));
    setTherapists(data);
    setLoading(false);
  };

  const handleToggleHoliday = async (id: string, currentValue: boolean) => {
    await updateDoc(doc(db, 'therapists', id), {
      holiday: !currentValue,
    });
    setTherapists(prev =>
      prev.map(t => (t.id === id ? { ...t, holiday: !currentValue } : t))
    );
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} fontFamily="'Trebuchet MS', sans-serif">
      <Typography variant="h4" gutterBottom>📆 Toggle Therapist Holidays</Typography>
      <Grid container spacing={2}>
        {therapists.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={t.holiday}
                    onChange={() => handleToggleHoliday(t.id, t.holiday)}
                  />
                }
                label={<Typography>{t.name}</Typography>}
              />
              <Typography variant="body2" color="text.secondary">
                {t.holiday ? 'On Holiday' : 'Available'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminHolidayTogglePage;
