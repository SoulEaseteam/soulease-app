// src/pages/admin/TherapistAdminPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  Paper,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Therapist {
  id: string;
  name: string;
  manualStatus: 'available' | 'holiday' | string;
}

const TherapistAdminPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      const snapshot = await getDocs(collection(db, 'therapists'));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Therapist[];
      setTherapists(data);
      setLoading(false);
    };

    fetchTherapists();
  }, []);

  const toggleHoliday = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'holiday' ? 'available' : 'holiday';
    await updateDoc(doc(db, 'therapists', id), {
      manualStatus: newStatus,
    });
    setTherapists((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, manualStatus: newStatus } : t
      )
    );
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Manage Therapist Holidays
      </Typography>

      <Stack spacing={2}>
        {therapists.map((t) => {
          const isHoliday = t.manualStatus === 'holiday';
          return (
            <Paper
              key={t.id}
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isHoliday ? '#fff5f5' : '#f0fdf4',
                borderLeft: `6px solid ${isHoliday ? '#f44336' : '#4caf50'}`,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
                {t.name}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={isHoliday ? 'On Holiday' : 'Available'}
                  color={isHoliday ? 'error' : 'success'}
                  size="small"
                />
                <Switch
                  checked={isHoliday}
                  onChange={() => toggleHoliday(t.id, t.manualStatus)}
                  color="error"
                />
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default TherapistAdminPage;