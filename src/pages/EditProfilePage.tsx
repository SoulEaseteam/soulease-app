import React, { useState } from 'react';
import { Box, TextField, Button, Avatar, Typography, Paper, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const EditProfilePage: React.FC = () => {
  const [name, setName] = useState('Naila Stefenson');
  const [bio, setBio] = useState('UX/UI Designer');
  const navigate = useNavigate();

  const handleSave = () => {
    alert('✅ Profile updated!');
    navigate('/profile');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#1c2a3a', pb: 10 }}>
      
      {/* Header */}
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
          Edit Profile
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Paper
          elevation={4}
          sx={{
            p: 3,
            borderRadius: 4,
            maxWidth: 400,
            mx: 'auto',
            background: 'linear-gradient(to bottom, #fff, #f2f2f2)',
          }}
        >
          <Box textAlign="center">
            <Avatar src="/images/massage/user.png" sx={{ width: 90, height: 90, mb: 2 }} />
            <Typography fontWeight="bold" fontSize={18}>
              Edit Your Info
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ my: 2 }}
          />
          <TextField
            fullWidth
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{
              mt: 3,
              fontWeight: 'bold',
              py: 1.3,
              borderRadius: 99,
              textTransform: 'none',
            }}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default EditProfilePage;