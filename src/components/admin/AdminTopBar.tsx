import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const AdminTopBar: React.FC = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#2c3e50' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Admin Panel
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;