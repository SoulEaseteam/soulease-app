// src/components/CustomAlert.tsx
import React, { ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface CustomAlertProps {
  open: boolean;
  message: ReactNode;
  severity?: AlertColor;
  duration?: number;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
}

const CustomAlert = ({
  open,
  message,
  severity = 'success',
  duration = 3000,
  onClose,
}: CustomAlertProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%', fontWeight: 'bold' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default CustomAlert;