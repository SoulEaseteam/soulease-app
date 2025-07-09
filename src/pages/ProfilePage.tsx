// src/pages/ProfilePage.tsx
import React from 'react';
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
} from '@mui/material';
import {
  Mail,
  Favorite,
  LocationOn,
  Settings,
  Logout,
  Edit,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

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
          borderRadius: 6,
          overflow: 'hidden',
          textAlign: 'center',
          pb: 3,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: 140,
            background: '#2b3b53',
          }}
        >
          <Avatar
            src="/images/massage/user.png"
            sx={{
              width: 100,
              height: 100,
              position: 'absolute',
              bottom: -50,
              left: '50%',
              transform: 'translateX(-50%)',
              border: '4px solid #fff',
            }}
          />
        </Box>

        <Box mt={6}>
          <Typography variant="h6" fontWeight="bold">
            My Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create account
          </Typography>
        </Box>

        <List>
          <ListItem button onClick={() => navigate('/edit-profile')}>
            <ListItemIcon>
              <Edit />
            </ListItemIcon>
            <ListItemText primary="Edit Profile" />
          </ListItem>
          <ListItem button onClick={() => navigate('/messages')}>
            <ListItemIcon>
              <Mail />
            </ListItemIcon>
            <ListItemText primary="Messages" />
          </ListItem>
          <ListItem button onClick={() => navigate('/saved')}>
            <ListItemIcon>
              <Favorite />
            </ListItemIcon>
            <ListItemText primary="Favourites" />
          </ListItem>
          <ListItem button onClick={() => navigate('/location')}>
            <ListItemIcon>
              <LocationOn />
            </ListItemIcon>
            <ListItemText primary="Location" />
          </ListItem>
          <ListItem button onClick={() => navigate('/settings')}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>

        <Divider sx={{ my: 1 }} />

        <ListItem
          button
          onClick={() => {
            localStorage.removeItem('token'); // ✅ เดโม: ลบ token จำลอง
            alert('You have been logged out!');
            navigate('/login');
          }}
        >
          <ListItemIcon sx={{ color: '#B00020' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Paper>

      <BottomNav />
    </Box>
  );
};

export default ProfilePage;