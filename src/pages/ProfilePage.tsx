import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Switch,
} from '@mui/material';
import {
  Edit,
  Notifications,
  Favorite,
  Event,
  Stars,
  AdminPanelSettings,
  Logout,
  LocationOn,
  Settings,
  UploadFile,
  Lock,
  Brightness4,
  HeartBrokenOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../providers/AuthProvider';
import { Heart } from 'phosphor-react';
import { HeartIcon } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const role = user?.role;

  const handleLogout = async () => {
    await logout?.();
    localStorage.removeItem('token');
    alert('You have been logged out!');
    navigate('/login');
  };

  const renderMenuItems = () => {
    switch (role) {
      case 'user':
        return (
          <>
            <ListItem button onClick={() => navigate('/edit-profile')}>
              <ListItemIcon><Edit /></ListItemIcon>
              <ListItemText primary="Edit Profile" />
            </ListItem>
            <ListItem button onClick={() => navigate('/notifications')}>
              <ListItemIcon><Notifications /></ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
            <ListItem button onClick={() => navigate('/saved')}>
              <ListItemIcon><Favorite /></ListItemIcon>
              <ListItemText primary="Favourites" />
            </ListItem>
            <ListItem button onClick={() => navigate('/booking/history')}>
              <ListItemIcon><Event /></ListItemIcon>
              <ListItemText primary="My Bookings" />
            </ListItem>
          </>
        );
      case 'therapist':
        return (
          <>
            <ListItem button onClick={() => navigate('/edit-profile')}>
              <ListItemIcon><Edit /></ListItemIcon>
              <ListItemText primary="Edit Profile" />
            </ListItem>
            <ListItem button onClick={() => navigate('/notifications')}>
              <ListItemIcon><Notifications /></ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
            <ListItem button onClick={() => navigate('/my-bookings')}>
              <ListItemIcon><Event /></ListItemIcon>
              <ListItemText primary="My Booking Schedule" />
            </ListItem>
            <ListItem button onClick={() => navigate('/reviews')}>
              <ListItemIcon><Stars /></ListItemIcon>
              <ListItemText primary="My Reviews" />
            </ListItem>
          </>
        );
      case 'admin':
        return (
          <>
            <ListItem button onClick={() => navigate('/admin')}>
              <ListItemIcon><AdminPanelSettings /></ListItemIcon>
              <ListItemText primary="Admin Dashboard" />
            </ListItem>
            <ListItem button onClick={() => navigate('/notifications')}>
              <ListItemIcon><Notifications /></ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #eee, #fff)',
        p: 2,
        pt: 8,
        pb: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 2,
          overflow: 'hidden',
          textAlign: 'center',
          pb: 4,
        }}
      >
        <Box sx={{ position: 'relative', height: 130, background: '#2b3b53' }}>
          <Avatar
            src={user?.image || '/images/massage/user.png'}
            sx={{
              width: 120,
              height: 120,
              position: 'absolute',
              bottom: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              border: '4px solid #fff',
            }}
          />
        </Box>

        <Box mt={8}>
          <Typography variant="h6" fontWeight="bold">
            {user?.username || 'My Profile'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {role === 'therapist'
              ? 'Therapist Account'
              : role === 'admin'
              ? 'Administrator'
              : 'Customer'}
          </Typography>
        </Box>

        <List>
          {renderMenuItems()}

        <ListItem button onClick={() => navigate('/edit-profile')}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText primary="Edit Profile" />
        </ListItem>

        <ListItem button onClick={() => navigate('/notifications')}>
          <ListItemIcon><Notifications /></ListItemIcon>
          <ListItemText primary="Notifications" />
        </ListItem>

        <ListItem button onClick={() => navigate('/upload-profile-image')}>
          <ListItemIcon><HeartIcon /></ListItemIcon>
          <ListItemText primary="Favourites" />
        </ListItem>

        <ListItem button onClick={() => navigate('/booking/history')}>
          <ListItemIcon><Event /></ListItemIcon>
          <ListItemText primary="My Bookings" />
        </ListItem>


        </List>

        <Divider sx={{ my: 1 }} />

        <ListItem button onClick={handleLogout}>
          <ListItemIcon sx={{ color: '#B00020' }}><Logout /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Paper>

      <BottomNav />
    </Box>
  );
};

export default ProfilePage;