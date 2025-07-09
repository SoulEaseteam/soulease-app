import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import LoadingSpinner from './LoadingSpinner';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

interface Props {
  children: JSX.Element;
  onlyAdmin?: boolean;
}

const PrivateRoute: React.FC<Props> = ({ children, onlyAdmin = false }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // 👮‍♂️ ตรวจสอบว่าเฉพาะแอดมินเท่านั้น
  if (onlyAdmin && user.email !== 'admin@soulease.team@gmail.com') {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ fontFamily: 'Orson, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </Box>
  );
};

export default PrivateRoute;