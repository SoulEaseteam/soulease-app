import React from "react";
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
  StepLabel
} from "@mui/material";

// Mock รายการจองที่แอดมินหรือพนักงานดูสถานะได้
interface BookingStatus {
  id: string;
  customerName: string;
  therapistName: string;
  steps: string[];          // รายการขั้นตอน
  currentStep: number;      // index ขั้นตอนปัจจุบัน
  status: "processing" | "arrived" | "started" | "completed" | "cancelled";
}

const bookings: BookingStatus[] = [
  {
    id: "BK20240705001",
    customerName: "คุณส้ม",
    therapistName: "คุณแอน",
    steps: ["รอดำเนินการ", "เดินทาง", "ถึงที่หมาย", "เริ่มนวด", "เสร็จสิ้น"],
    currentStep: 3,
    status: "started",
  },
  {
    id: "BK20240705002",
    customerName: "คุณฟ้า",
    therapistName: "คุณปุ้ย",
    steps: ["รอดำเนินการ", "เดินทาง", "ถึงที่หมาย", "เริ่มนวด", "เสร็จสิ้น"],
    currentStep: 4,
    status: "completed",
  },
  {
    id: "BK20240705003",
    customerName: "คุณเบลล์",
    therapistName: "คุณน้ำ",
    steps: ["รอดำเนินการ", "เดินทาง", "ถึงที่หมาย", "เริ่มนวด", "เสร็จสิ้น"],
    currentStep: 1,
    status: "processing",
  },
];

const statusColor = (status: BookingStatus["status"]) => {
  switch (status) {
    case "processing":
      return "warning";
    case "arrived":
      return "info";
    case "started":
      return "primary";
    case "completed":
      return "success";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const statusLabel = (status: BookingStatus["status"]) => {
  switch (status) {
    case "processing":
      return "รอดำเนินการ";
    case "arrived":
      return "ถึงที่หมาย";
    case "started":
      return "กำลังนวด";
    case "completed":
      return "เสร็จสิ้น";
    case "cancelled":
      return "ยกเลิก";
    default:
      return "";
  }
};

const BookingStatusPage: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        สถานะการดำเนินการจอง
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>เลขที่จอง</TableCell>
              <TableCell>ลูกค้า</TableCell>
              <TableCell>หมอนวด</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="center">ขั้นตอน</TableCell>
              <TableCell align="center">ดูรายละเอียด</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((b) => (
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
                <TableCell align="center">
                  <Button size="small" variant="outlined">
                    รายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BookingStatusPage;