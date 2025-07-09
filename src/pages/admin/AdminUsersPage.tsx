// ✅ AdminUsersPage.tsx
import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

const AdminUsersPage: React.FC = () => {
  const users = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>User Management</Typography>
      <Paper>
        <List>
          {users.map(user => (
            <React.Fragment key={user.id}>
              <ListItem>
                <ListItemText primary={user.name} secondary={user.email} />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminUsersPage;