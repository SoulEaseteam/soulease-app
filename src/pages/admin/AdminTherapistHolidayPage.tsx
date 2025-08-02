import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Paper,
  Divider,
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Therapist {
  id: string;
  name: string;
  image?: string;
  manualStatus?: 'available' | 'holiday' | 'bookable' | 'resting';
}

const statusOptions = ['available', 'holiday', 'bookable', 'resting'];

const AdminTherapistHolidayPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTherapists = async () => {
    const snapshot = await getDocs(collection(db, 'therapists'));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Therapist[];
    setTherapists(data);
    setLoading(false);
  };

  const handleStatusChange = async (
    event: SelectChangeEvent,
    id: string
  ) => {
    const newStatus = event.target.value as Therapist['manualStatus'];
    await updateDoc(doc(db, 'therapists', id), {
      manualStatus: newStatus,
    });
    setTherapists(prev =>
      prev.map(t =>
        t.id === id ? { ...t, manualStatus: newStatus } : t
      )
    );
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  if (loading) return <CircularProgress sx={{ m: 3 }} />;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🧘 Manual Therapist Status Control
      </Typography>

      <Paper elevation={2}>
        <List>
          {therapists.map((t) => (
            <React.Fragment key={t.id}>
              <ListItem
                secondaryAction={
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={t.manualStatus || 'available'}
                      onChange={(e) => handleStatusChange(e, t.id)}
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                }
              >
                <ListItemAvatar>
                  <Avatar src={t.image || '/default-avatar.png'} />
                </ListItemAvatar>
                <ListItemText
                  primary={t.name}
                  secondary={`Status: ${t.manualStatus || 'available'}`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminTherapistHolidayPage;
