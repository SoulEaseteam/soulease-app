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
  Button,
  Chip,
} from "@mui/material";
import therapists from '../../data/therapists';
import { Therapist } from '../../types/therapist';
// ../../ ไม่ใช่ ../ เพราะต้องย้อนออกจาก admin > pages > src
const statusColor = (status: Therapist["available"]) => {
  switch (status) {
    case "available":
      return "success";
    case "bookable":
      return "warning";
    case "resting":
      return "default";
    default:
      return "default";
  }
};

const AdminTherapistsPage: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        รายชื่อหมอนวดทั้งหมด
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ชื่อ</TableCell>
              <TableCell>ความถนัด</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">เรตติ้ง</TableCell>
              <TableCell align="center">ดูรายละเอียด</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {therapists.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.specialty}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      t.available === "available"
                        ? "ว่าง"
                        : t.available === "bookable"
                        ? "จองได้"
                        : "พัก"
                    }
                    color={statusColor(t.available)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{t.rating.toFixed(1)}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="contained"
                    href={`/therapists/${t.id}`}
                  >
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

export default AdminTherapistsPage;