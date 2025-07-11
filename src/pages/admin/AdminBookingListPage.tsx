// src/pages/admin/AdminTherapistListPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Button,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Therapist } from '@/types/therapist';
import { useNavigate } from 'react-router-dom';

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'available':
      return { label: 'Available', color: 'success' };
    case 'resting':
      return { label: 'Resting', color: 'warning' };
    case 'holiday':
      return { label: 'On Leave', color: 'default' };
    case 'bookable':
      return { label: 'Bookable', color: 'info' };
    default:
      return { label: 'Unknown', color: 'default' };
  }
};

const AdminTherapistListPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTherapists = async () => {
      const snapshot = await getDocs(collection(db, 'therapists'));
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Therapist[];
      setTherapists(list);
      setLoading(false);
    };

    fetchTherapists();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Therapist Management
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={2}>
          <List>
            {therapists.map((therapist, index) => {
              const statusInfo = getStatusLabel(therapist.available);
              return (
                <React.Fragment key={therapist.id}>
                  <ListItem alignItems="flex-start">
                    <Avatar
                      src={therapist.image}
                      alt={therapist.name}
                      sx={{ mr: 2, width: 56, height: 56 }}
                    />
                    <Box flex="1">
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>
                          {therapist.name}
                        </Typography>
                        <Chip
                          label={statusInfo.label}
                          color={statusInfo.color as any}
                          size="small"
                        />
                      </Box>
                      <ListItemText
                        secondary={
                          <>
                            ⭐ <b>Rating:</b> {therapist.rating || 0} &nbsp;&nbsp;
                            📅 <b>Today:</b> {therapist.todayBookings ?? 0} &nbsp;&nbsp;
                            🗓 <b>Total:</b> {therapist.totalBookings ?? 0}
                          </>
                        }
                      />
                      <Box display="flex" justifyContent="flex-end" mt={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/admin/therapists/${therapist.id}`)}
                        >
                          Details
                        </Button>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < therapists.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default AdminTherapistListPage;
