import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import theme from './theme';
import '@fontsource/raleway'; // ✅ ฟอนต์ที่มีจริงและติดตั้งผ่าน npm แล้ว
import '@fontsource/chonburi'; // ✅ ฟอนต์สำรองถ้าใช้ในธีม
import '@fontsource/playfair-display';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);