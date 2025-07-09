// src/pages/admin/AdminDashboardPage.tsx
import React from 'react';
import { Card, CardContent } from '@mui/material';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดผู้ดูแลระบบ</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card onClick={() => navigate('/admin/users')} className="cursor-pointer hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold">ผู้ใช้ทั้งหมด</h2>
            <p className="text-gray-500">ดูและจัดการข้อมูลผู้ใช้</p>
          </CardContent>
        </Card>

        <Card onClick={() => navigate('/admin/therapists')} className="cursor-pointer hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold">หมอนวดทั้งหมด</h2>
            <p className="text-gray-500">ดูและจัดการหมอนวด</p>
          </CardContent>
        </Card>

        <Card onClick={() => navigate('/admin/bookings')} className="cursor-pointer hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold">การจองทั้งหมด</h2>
            <p className="text-gray-500">ดูและจัดการการจอง</p>
          </CardContent>
        </Card>
        <Button href="/admin/holiday-toggle" variant="outlined">
  จัดการวันหยุดพนักงาน
</Button>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
