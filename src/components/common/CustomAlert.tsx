// src/components/CustomAlert.tsx
import React, { type ReactNode } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { type AlertColor } from "@mui/material/Alert";

interface CustomAlertProps {
  open: boolean;
  message: ReactNode;
  severity?: AlertColor;
  duration?: number;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  open,
  message,
  severity = "success",
  duration = 3000,
  onClose,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%", fontWeight: "bold" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default CustomAlert;