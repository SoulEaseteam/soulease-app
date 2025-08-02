import React from "react";
import { Card, CardContent, Typography, Button, Stack } from "@mui/material";

interface BookingCardProps {
  booking: any;
  onAccept: () => void;
  onStart: () => void;
  onFinish: () => void;
  onOpenMap: () => void;
  onCall: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onAccept, onStart, onFinish, onOpenMap, onCall }) => {
  return (
    <Card sx={{ mb: 2, p: 1 }}>
      <CardContent>
        <Typography variant="h6">{booking.customerName}</Typography>
        <Typography>📞 {booking.phone}</Typography>
        <Typography>📍 {booking.address}</Typography>
        <Typography>💆 {booking.service} - ฿{booking.price}</Typography>
        <Typography>🕒 {booking.startTime} - {booking.endTime}</Typography>
        <Typography>Status: {booking.status}</Typography>

        <Stack direction="row" spacing={1} mt={2}>
          {booking.status === "pending" && (
            <Button size="small" variant="contained" onClick={onAccept}>รับงาน</Button>
          )}
          {booking.status === "accepted" && (
            <Button size="small" variant="contained" onClick={onStart}>เริ่มงาน</Button>
          )}
          {booking.status === "in-progress" && (
            <Button size="small" variant="contained" onClick={onFinish}>เสร็จงาน</Button>
          )}
          <Button size="small" variant="outlined" onClick={onOpenMap}>📍 นำทาง</Button>
          <Button size="small" variant="outlined" onClick={onCall}>📞 โทร</Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BookingCard;