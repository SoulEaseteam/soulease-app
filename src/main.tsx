// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

// ✅ โหลดฟอนต์ถ้าคุณใช้ @fontsource
import '@fontsource/chonburi';
import '@fontsource/orson';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);