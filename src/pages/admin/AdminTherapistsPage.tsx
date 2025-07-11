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
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      const snapshot = await getDocs(collection(db, "therapists"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Therapist[];
      setTherapists(data);
      setLoading(false);
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
                    label={t.available}
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