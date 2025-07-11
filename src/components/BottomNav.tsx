import React, { useEffect, useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserCircle } from 'phosphor-react';
import { FaRegHeart, FaRegFileAlt } from 'react-icons/fa';
import { SpaOutlined } from '@mui/icons-material';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return; // กัน SSR
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowNav(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line
  }, [lastScrollY]);

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue !== location.pathname) navigate(newValue);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 1200,
        fontFamily: 'Orson, sans-serif',
        pointerEvents: 'none', // ป้องกัน scroll ทับ input
      }}
    >
      <Paper
        elevation={10}
        sx={{
          pointerEvents: 'auto', // กดปุ่มได้
          visibility: typeof window !== 'undefined' ? 'visible' : 'hidden',
          position: 'relative',
          bottom: showNav ? 0 : '-100px',
          transition: 'bottom 0.4s cubic-bezier(0.4,0,0.2,1)',
          background: 'rgba(12, 18, 28, 0.75)',
          backdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.4)',
          fontFamily: 'Orson, sans-serif',
        }}
      >
        <BottomNavigation
          value={location.pathname}
          onChange={handleChange}
          showLabels
          sx={{
            '& .MuiBottomNavigationAction-root': {
              color: '#7b8b99',
              transition: 'all 0.3s ease',
              borderRadius: '16px',
              mx: 0.5,
              py: 0.5,
              fontFamily: 'Orson, sans-serif',
              '&:hover': {
                transform: 'scale(1.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            },
            '& .Mui-selected': {
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              transform: 'scale(1.2)',
              boxShadow: '0 6px 16px rgba(255, 255, 255, 0.2)',
              fontFamily: 'Orson, sans-serif',
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="/"
            icon={<FaRegHeart size={26} />}
            sx={{
              '& .MuiBottomNavigationAction-label': {
                fontSize: 10,
                fontFamily: 'Orson, sans-serif',
              },
            }}
          />

          <BottomNavigationAction
            label="Services"
            value="/services"
            icon={<SpaOutlined sx={{ fontSize: 26 }} />}
            sx={{
              '& .MuiBottomNavigationAction-label': {
                fontSize: 10,
                fontFamily: 'Orson, sans-serif',
              },
            }}
          />

          <BottomNavigationAction
            label="History"
            value="/booking/history"
            icon={<FaRegFileAlt size={26} />}
            sx={{
              '& .MuiBottomNavigationAction-label': {
                fontSize: 10,
                fontFamily: 'Orson, sans-serif',
              },
            }}
          />

          <BottomNavigationAction
            label="Profile"
            value="/profile"
            icon={<UserCircle size={26} />}
            sx={{
              '& .MuiBottomNavigationAction-label': {
                fontSize: 10,
                fontFamily: 'Orson, sans-serif',
              },
            }}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default BottomNav;