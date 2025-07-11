import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const FollowButton: React.FC = () => {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleClick = () => {
    window.open('https://x.com/SoulEase_bkk', '_blank', 'noopener,noreferrer');
    setIsFollowing(true);
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
      <Button
        onClick={handleClick}
        variant={isFollowing ? 'contained' : 'outlined'}
        startIcon={<OpenInNewIcon />}
        sx={{
          bgcolor: isFollowing ? '#2b3b53' : '#fff',
          color: isFollowing ? '#fff' : '#2b3b53',
          border: isFollowing ? 'none' : '1.5px solid #2b3b53',
          borderRadius: 6,
          px: 3,
          py: 1.5,
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'Orson, sans-serif',
          textTransform: 'none',
          boxShadow: isFollowing
            ? '0 4px 12px rgba(43, 59, 83, 0.16)'
            : '0 6px 20px rgba(43, 59, 83, 0.08)',
          transition: 'all 0.25s cubic-bezier(.77,0,.18,1)',
          '&:hover': {
            bgcolor: isFollowing ? '#1f2937' : '#f5f5f5',
            color: '#2b3b53',
            transform: 'scale(1.06)',
          },
        }}
      >
        {isFollowing ? 'Following @SoulEase_bkk' : 'Follow @SoulEase_bkk'}
      </Button>
    </Box>
  );
};

export default FollowButton;