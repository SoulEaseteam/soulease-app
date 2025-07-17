import React from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';

const FollowButton: React.FC = () => {
  const handleClick = () => {
    window.open('https://x.com/SoulEase_bkk', '_blank', 'noopener,noreferrer');
  };

  return (
    <Tooltip title="Follow us on X (Twitter)" arrow>
     <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
     
        '& img': {
          width: 55,
          height: 55,
          transition: 'transform 0.2s ease-in-out',
          mt: '1px',
        },
        '&:hover img': {
          transform: 'scale(1.1)',
        },
      }}
    >
      <img src="/images/profli/X (2).gif" alt="Follow on X" />
    </Box>
    </Tooltip>
  );
};

export default FollowButton;