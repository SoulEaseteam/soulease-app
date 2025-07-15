// src/pages/NotificationsPage.tsx

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { useAuth } from '@/providers/AuthProvider';
import { listenToNotifications } from '@/services/notificationService';
import { Notification } from '@/types/firebaseSchemas';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenToNotifications(user.uid, setNotifications);
    return () => unsubscribe();
  }, [user]);

  return (
    <Box sx={{ pb: 10 }}> {/* reserve space for BottomNav */}
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>🔔 การแจ้งเตือน</Typography>

        {notifications.length === 0 ? (
          <Typography color="text.secondary">ยังไม่มีการแจ้งเตือน</Typography>
        ) : (
          notifications.map((n) => (
            <Paper
              key={n.id}
              sx={{ p: 2, mb: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f1f1f1' } }}
              onClick={() => navigate(n.link || '/')}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography>{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(n.createdAt?.toDate?.()).fromNow()}
                </Typography>
              </Stack>
            </Paper>
          ))
        )}
      </Box>

      <BottomNav />
    </Box>
  );
};

export default NotificationsPage;