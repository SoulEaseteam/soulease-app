// src/components/admin/AdminTopBar.tsx
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

const AdminTopBar: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Soulease Spa Admin
        </Typography>
        {user && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2">{user.email}</Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;
