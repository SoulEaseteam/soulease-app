// src/pages/admin/AdminNotificationsPage.tsx
import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

const mockNotifications = [
  { id: 1, message: 'New booking from View', time: 'Just now' },
  { id: 2, message: 'New review for therapist Bun', time: '10 min ago' },
];

const AdminNotificationsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Notifications</Typography>
      <Paper>
        <List>
          {mockNotifications.map((n) => (
            <ListItem key={n.id} divider>
              <ListItemText primary={n.message} secondary={n.time} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminNotificationsPage;
