import React from "react";
import { Card, CardContent, Typography, Button, Stack, Divider } from "@mui/material";

interface BookingCardProps {
  booking: any;
  onAccept: () => void;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onOpenMap: () => void;
  onCall: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onAccept,
  onStart,
  onFinish,
  onCancel,
  onOpenMap,
  onCall,
}) => {
  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 4,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {booking.customerName || "ลูกค้า"}
        </Typography>

        <Stack spacing={0.5} mb={1.5}>
          <Typography fontSize={14}>📞 {booking.phone}</Typography>
          <Typography fontSize={14}>📍 {booking.address}</Typography>
          <Typography fontSize={14}>
            💆 {booking.serviceName} - ฿{booking.servicePrice}
          </Typography>
          <Typography fontSize={14}>
            🕒 {booking.date} {booking.time}
          </Typography>
          <Typography fontSize={14} color="text.secondary">
            สถานะ: {booking.status}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {booking.status === "pending" && (
            <Button size="small" variant="contained" color="primary" onClick={onAccept}>
              ✅ รับงาน
            </Button>
          )}
          {booking.status === "confirmed" && (
            <Button size="small" variant="contained" color="warning" onClick={onStart}>
              ▶️ เริ่มงาน
            </Button>
          )}
          {booking.status === "in-progress" && (
            <Button size="small" variant="contained" color="success" onClick={onFinish}>
              ✔️ เสร็จงาน
            </Button>
          )}
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Button size="small" variant="outlined" color="error" onClick={onCancel}>
              ❌ ยกเลิก
            </Button>
          )}

          <Button size="small" variant="outlined" onClick={onOpenMap}>
            📍 นำทาง
          </Button>
          <Button size="small" variant="outlined" onClick={onCall}>
            📞 โทร
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BookingCard;