import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  useTheme,
} from '@mui/material';
import { useAuth } from "@/providers/AuthProvider";
import { listenToNotifications } from '@/types/services/notificationService';
import type { NotificationDoc } from '@/types/services/notificationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/layouts/BottomNavGlass';

dayjs.extend(relativeTime);

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenToNotifications(user.uid, setNotifications);
    return () => unsubscribe();
  }, [user]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: 10,
        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#FDFBF7',
      }}
    >
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 3, pt: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          🔔 Notifications
        </Typography>

        {notifications.length === 0 ? (
          <Typography color="text.secondary">You have no notifications yet.</Typography>
        ) : (
          notifications.map((n) => (
            <Paper
              key={n.id}
              elevation={3}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 4,
                cursor: 'pointer',
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? '#1e1e1e'
                      : '#f2f2f2',
                },
              }}
              onClick={() => navigate(n.link || '/')}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography fontSize={14}>{n.message}</Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {dayjs(
                    n.createdAt?.toDate ? n.createdAt.toDate() : n.createdAt
                  ).fromNow()}
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