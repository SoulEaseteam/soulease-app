import React from 'react';
import { Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const dashboardItems = [
  {
    title: 'All Users',
    description: 'View and manage user data',
    path: '/admin/users',
  },
  {
    title: 'All Therapists',
    description: 'View and manage therapists',
    path: '/admin/therapists',
  },
  {
    title: 'All Bookings',
    description: 'View and manage bookings',
    path: '/admin/bookings',
  },
  {
    title: 'Manage Holidays',
    description: 'Update therapist holiday status',
    path: '/admin/holiday-toggle',
    span: true,
  },
];

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map(({ title, description, path, span }) => (
          <Card
            key={title}
            onClick={() => navigate(path)}
            className={`cursor-pointer hover:shadow-xl transition-all ${span ? 'sm:col-span-2 lg:col-span-3' : ''}`}
          >
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
              <p className="text-gray-500">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;