// src/pages/admin/BookingStatusPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
} from "@mui/material";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

interface BookingStatus {
  id: string;
  customerName: string;
  therapistName: string;
  steps: string[];
  currentStep: number;
  status: "processing" | "arrived" | "started" | "completed" | "cancelled";
  service?: string;
  date?: string;
}

const statusColor = (status: BookingStatus["status"]) => {
  switch (status) {
    case "processing": return "warning";
    case "arrived": return "info";
    case "started": return "primary";
    case "completed": return "success";
    case "cancelled": return "error";
    default: return "default";
  }
};

const statusLabel = (status: BookingStatus["status"]) => {
  switch (status) {
    case "processing": return "Processing";
    case "arrived": return "Arrived";
    case "started": return "In Progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return "";
  }
};

const BookingStatusPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus["status"]>('processing');
  const [selectedStep, setSelectedStep] = useState<number>(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
        ...(doc.data() as BookingStatus),
        id: doc.id,
        steps: ["Processing", "En Route", "Arrived", "Massage Started", "Completed"],
      }));
      setBookings(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, bookingId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedBookingId(bookingId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBookingId(null);
  };

  const handleStatusChangeClick = (status: BookingStatus["status"], step: number) => {
    setSelectedStatus(status);
    setSelectedStep(step);
    setConfirmOpen(true);
    handleMenuClose();
  };

  const confirmStatusChange = async () => {
    if (!selectedBookingId) return;
    await updateDoc(doc(db, "bookings", selectedBookingId), {
      status: selectedStatus,
      currentStep: selectedStep,
    });
    setConfirmOpen(false);
  };

  const filteredBookings = bookings.filter(
    (b) => b.customerName.toLowerCase().includes(search.toLowerCase()) ||
           b.therapistName.toLowerCase().includes(search.toLowerCase()) ||
           b.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <Box p={3} textAlign="center"><CircularProgress /></Box>;
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Booking Status</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>Refresh</Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by customer, therapist or booking ID"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Booking ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Therapist</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Steps</TableCell>
              <TableCell align="center">Service</TableCell>
              <TableCell align="center">Date</TableCell>
              <TableCell align="center">Manage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.id}</TableCell>
                <TableCell>{b.customerName}</TableCell>
                <TableCell>{b.therapistName}</TableCell>
                <TableCell>
                  <Chip label={statusLabel(b.status)} color={statusColor(b.status)} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Stepper activeStep={b.currentStep} alternativeLabel>
                    {b.steps.map((label, idx) => (
                      <Step key={label} completed={b.currentStep > idx}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </TableCell>
                <TableCell align="center">{b.service || '-'}</TableCell>
                <TableCell align="center">{b.date || '-'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => handleMenuOpen(e, b.id)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {["processing", "arrived", "started", "completed", "cancelled"].map((status, index) => (
          <MenuItem key={status} onClick={() => handleStatusChangeClick(status as any, index)}>
            {statusLabel(status as any)}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to update the booking to <b>{statusLabel(selectedStatus)}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmStatusChange}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingStatusPage;
