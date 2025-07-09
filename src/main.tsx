import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // ✅ ชี้ไปที่ไฟล์ App.tsx ที่มี <BrowserRouter> และ <Routes>

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);