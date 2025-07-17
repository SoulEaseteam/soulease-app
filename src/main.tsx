// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import './index.css'; // ถ้ามีไฟล์ CSS Global

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* ✅ ต้องมีแค่ที่นี่เท่านั้น */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);