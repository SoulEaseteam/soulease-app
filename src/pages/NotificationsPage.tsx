// src/pages/NotificationsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, Paper, IconButton, Badge
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { subscribeToNotifications } from '../data/subscribeToNotifications';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, setNotifications);
    return () => unsubscribe();
  }, [user]);

  return (
    <Box sx={{ minHeight: '100vh', background: '#1c2a3a', pb: 10 }}>
      <Box
        sx={{
          background: '#2b3b53',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          color: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <IconButton onClick={() => navigate('/profile')} sx={{ color: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" ml={1}>
          Notifications
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Paper
          elevation={4}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'linear-gradient(to bottom, #fff, #f2f2f2)',
          }}
        >
          <List>
            {notifications.map((n) => (
              <ListItem key={n.id} divider>
                <ListItemText
                  primary={
                    <Typography fontWeight="bold">
                      {n.type === 'review' && '📣 New Review'}
                      {n.type === 'booking_confirmed' && '✅ Booking Confirmed'}
                      {n.type === 'admin' && '📢 Admin Message'}
                    </Typography>
                  }
                  secondary={
                    <Typography color="text.secondary" fontSize={14}>
                      {n.message}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            {notifications.length === 0 && (
              <ListItem>
                <ListItemText primary="No notifications yet." />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default NotificationsPage;