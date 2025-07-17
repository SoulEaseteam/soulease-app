// src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7B5AC2', // สีม่วงอ่อนๆ เอกลักษณ์ของ Soulease
    },
    secondary: {
      main: '#F9A826', // สีทอง/ส้มอ่อน
    },
    background: {
      default: '#FAF9F6', // สีพื้นหลังขาวนวล
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#777777',
    },
  },
  typography: {
    fontFamily: `'Chonburi', 'Raleway', 'Playfair Display', sans-serif`,
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.75rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          padding: '10px 20px',
        },
      },
    },
  },
});

export default theme;