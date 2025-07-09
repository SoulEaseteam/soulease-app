import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();

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
          Messages
        </Typography>
      </Box>

      {/* List Messages */}
      <Box sx={{ p: 2 }}>
        <Paper
          elevation={4}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'linear-gradient(to bottom, #fff, #f2f2f2)',
          }}
        >
          <List>
            <ListItem button sx={{ borderBottom: '1px solid #eee' }}>
              <ListItemText
                primary="Admin Support"
                secondary="Hello! Can I help you?"
              />
            </ListItem>

            <ListItem button>
              <ListItemText
                primary="System Notification"
                secondary="You received a new review"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default MessagesPage;