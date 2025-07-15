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
  Avatar,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Link, useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

interface Therapist {
  id: string;
  name: string;
  image?: string;
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, "therapists", deleteId));
      setTherapists((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
        <Typography mt={2}>Loading therapists...</Typography>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        🧘‍♀️ All Therapists
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate("/admin/add-therapist")}
      >
        ➕ Add Therapist
      </Button>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>👩‍💼 Name</TableCell>
              <TableCell>🧖 Specialty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">⭐ Rating</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {therapists.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar src={t.image || "/images/default-avatar.png"} />
                    <Typography>{t.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{t.specialty || "-"}</TableCell>
                <TableCell>
                  <Chip
                    label={statusLabel(t.available)}
                    color={statusColor(t.available)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {t.rating ? t.rating.toFixed(1) : "N/A"}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/admin/therapists/${t.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this therapist?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTherapistsPage;
