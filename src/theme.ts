// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2b3b53', // น้ำเงินเข้มเรียบหรู
    },
    secondary: {
      main: '#f48fb1', // ชมพูหวาน
    },
    background: {
      default: '#fdfdfd',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#29b6f6',
    },
  },
  typography: {
    fontFamily: `'Orson', 'Chonburi', 'Roboto', 'sans-serif'`,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 500 },
    button: {
      textTransform: 'none', // ✅ ปิด uppercase
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12, // ✅ มนขึ้น
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;