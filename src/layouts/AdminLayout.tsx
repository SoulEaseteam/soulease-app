// src/layouts/AdminLayout.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  EventNote,
  Add,
  Lock,
  Logout,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
    { text: 'Therapists', icon: <People />, path: '/admin/therapists' },
    { text: 'Bookings', icon: <EventNote />, path: '/admin/bookings' },
    { text: 'Add Therapist', icon: <Add />, path: '/admin/add-therapist' },
    { text: 'Holiday Toggle', icon: <Lock />, path: '/admin/holiday' },
    { text: 'Change Password', icon: <Lock />, path: '/admin/change-password' },
    {
      text: 'Logout',
      icon: <Logout />,
      action: () => {
        localStorage.clear();
        navigate('/admin/login');
      },
    },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold" color="white">
          Admin Panel
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem disablePadding key={item.text}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() =>
                item.path ? navigate(item.path) : item.action?.()
              }
            >
              <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#1a237e',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" fontWeight="bold">
            Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#303f9f',
            color: '#fff',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout;