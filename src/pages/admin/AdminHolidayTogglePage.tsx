import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  Paper,
  Box,
  CircularProgress,
} from '@mui/material';
import { db } from '@/firebase';
import { Therapist } from '@/types/therapist';

const AdminHolidayTogglePage = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTherapists = async () => {
    const snapshot = await getDocs(collection(db, 'therapists'));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Therapist[];
    setTherapists(data);
    setLoading(false);
  };

  const handleToggleHoliday = async (id: string, value: boolean) => {
    const therapistRef = doc(db, 'therapists', id);
    await updateDoc(therapistRef, { manualStatus: value ? 'holiday' : 'available' });

    // อัปเดต local state
    setTherapists((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, manualStatus: value ? 'holiday' : 'available' } : t
      )
    );
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        🚦 จัดการสถานะวันหยุด (Holiday)
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อ</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="center">เปิดวันหยุด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {therapists.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.manualStatus === 'holiday' ? '🛑 หยุด' : '✅ พร้อมทำงาน'}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={t.manualStatus === 'holiday'}
                      onChange={(e) => handleToggleHoliday(t.id, e.target.checked)}
                      color="primary"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
};

export default AdminHolidayTogglePage;