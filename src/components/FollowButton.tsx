import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const FollowButton: React.FC = () => {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleClick = () => {
    window.open('https://x.com/SoulEase_bkk', '_blank');
    setIsFollowing(true);
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center">
      <Button
        onClick={handleClick}
        variant="contained"
        startIcon={<OpenInNewIcon />}
        sx={{
          bgcolor: isFollowing ? '#2b3b53' : 'linear-gradient(to right, #fefefe, #f5f5f5)',
          color: isFollowing ? '#ffffff' : '#2b3b53',
          borderRadius: 6,
          px: 3,
          py: 1.5,
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'Orson, sans-serif',
          textTransform: 'none',
          boxShadow: isFollowing
            ? '0 4px 12px rgba(0, 0, 0, 0.25)'
            : '0 6px 20px rgba(43, 59, 83, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: isFollowing ? '#1f2937' : '#eeeeee',
            transform: 'scale(1.05)',
          },
        }}
      >
        {isFollowing ? 'Following @SoulEase_bkk' : 'Follow @SoulEase_bkk'}
      </Button>
    </Box>
  );
};

export default FollowButton;