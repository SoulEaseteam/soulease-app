// src/pages/admin/AdminTherapistsPage.tsx
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
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  available: "available" | "bookable" | "resting";
  rating: number;
}

// ฟังก์ชันแปลงสถานะเป็นสีของ Chip
const statusColor = (status: Therapist["available"]) => {
  switch (status) {
    case "available":
      return "success";  // สีเขียว
    case "bookable":
      return "warning";  // สีส้ม
    case "resting":
      return "default";  // สีเทา
    default:
      return "default";
  }
};

// ฟังก์ชันแปลงสถานะเป็นคำที่อ่านง่าย
const statusLabel = (status: Therapist["available"]) => {
  switch (status) {
    case "available":
      return "Available";
    case "bookable":
      return "Bookable";
    case "resting":
      return "Resting";
    default:
      return status;
  }
};

const AdminTherapistsPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "therapists"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Therapist[];
        setTherapists(data);
      } catch (error) {
        console.error("Failed to fetch therapists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapists();
  }, []);

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        All Therapists
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Specialty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Rating</TableCell>
              <TableCell align="center">Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {therapists.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.specialty}</TableCell>
                <TableCell>
                  <Chip
                    label={statusLabel(t.available)}
                    color={statusColor(t.available)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{t.rating?.toFixed(1) || "N/A"}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="contained"
                    href={`/admin/therapists/${t.id}`}
                  >
                    View
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