// src/pages/admin/AdminBookingListPage.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Button,
} from '@mui/material';

// ตัวอย่าง mock data สามารถเปลี่ยนเป็นข้อมูลจริงจาก backend ได้
const mockBookings = [
  {
    id: 'b1',
    customerName: 'คุณฟ้าใส',
    therapistName: 'น้องแอม',
    service: 'นวดน้ำมัน',
    status: 'กำลังดำเนินการ',
    date: '5 ก.ค. 2025 - 14:00',
  },
  {
    id: 'b2',
    customerName: 'คุณบอล',
    therapistName: 'พี่บีม',
    service: 'นวดแผนไทย',
    status: 'สำเร็จแล้ว',
    date: '4 ก.ค. 2025 - 17:30',
  },
  {
    id: 'b3',
    customerName: 'คุณตูน',
    therapistName: 'น้องมุก',
    service: 'นวดอโรม่า',
    status: 'ยกเลิก',
    date: '3 ก.ค. 2025 - 13:00',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'กำลังดำเนินการ':
      return 'warning';
    case 'สำเร็จแล้ว':
      return 'success';
    case 'ยกเลิก':
      return 'error';
    default:
      return 'default';
  }
};

const AdminBookingListPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        รายการจองทั้งหมด
      </Typography>
      <Paper elevation={2}>
        <List>
          {mockBookings.map((booking, index) => (
            <React.Fragment key={booking.id}>
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={500}>
                    🧖 {booking.service}
                  </Typography>
                  <Chip
                    label={booking.status}
                    color={getStatusColor(booking.status)}
                    size="small"
                    sx={{ minWidth: 90, textAlign: 'center' }}
                  />
                </Box>
                <ListItemText
                  sx={{ mt: 1 }}
                  secondary={
                    <>
                      👤 <b>ผู้จอง:</b> {booking.customerName} <br />
                      💆‍♀️ <b>หมอนวด:</b> {booking.therapistName} <br />
                      ⏰ <b>เวลา:</b> {booking.date}
                    </>
                  }
                />
                <Box width="100%" display="flex" justifyContent="flex-end" mt={1}>
                  <Button size="small" variant="outlined">
                    รายละเอียด
                  </Button>
                </Box>
              </ListItem>
              {index < mockBookings.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminBookingListPage;