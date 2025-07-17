// src/layouts/AppLayout.tsx
import React from 'react';
import { Box } from '@mui/material';
import BottomNav from '../components/BottomNav'; // ✅ import
import AdminFloatingChat from '../components/AdminFloatingChat'; // ✅ ถ้าต้องการปุ่มลอยด้วย

interface Props {
  children: React.ReactNode;
}

const AppLayout: React.FC<Props> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: '80px', // เผื่อพื้นที่ให้ BottomNav
        backgroundColor: '#fdfdfd',
      }}
    >
      {children}

      <BottomNav /> {/* ✅ เพิ่มปุ่มล่าง */}
      <AdminFloatingChat /> {/* ✅ เพิ่มปุ่มลอยแชต */}
    </Box>
  );
};

export default AppLayout;