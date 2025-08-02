// src/pages/admin/AdminUsersPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const theme = useTheme();

  const fetchUsers = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as User[];
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (editingUser) {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: editingUser.name || "",
        email: editingUser.email || "",
        phone: editingUser.phone || "",
        role: editingUser.role || "user",
      });
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("❗ ต้องการลบผู้ใช้นี้หรือไม่?")) {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "phone", headerName: "Phone", flex: 1 },
    { field: "role", headerName: "Role", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setEditingUser(params.row)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        👥 Manage Users
      </Typography>

      <Paper
        sx={{
          height: 600,
          p: 2,
          borderRadius: 3,
          bgcolor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fff",
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: theme.palette.mode === "dark" ? "#333" : "#f5f5f5",
            color: theme.palette.mode === "dark" ? "#fff" : "#000",
            fontWeight: "bold",
          },
          "& .MuiDataGrid-cell": {
            color: theme.palette.mode === "dark" ? "#fff" : "#000",
          },
        }}
      >
        <DataGrid
          rows={users || []}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
        />
      </Paper>

      {editingUser && (
        <Dialog open onClose={() => setEditingUser(null)} fullWidth>
          <DialogTitle>✏️ Edit User</DialogTitle>
          <DialogContent>
            <TextField
              label="Name"
              fullWidth
              margin="dense"
              value={editingUser.name || ""}
              onChange={(e) =>
                setEditingUser((prev) =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
            />
            <TextField
              label="Email"
              fullWidth
              margin="dense"
              value={editingUser.email || ""}
              onChange={(e) =>
                setEditingUser((prev) =>
                  prev ? { ...prev, email: e.target.value } : null
                )
              }
            />
            <TextField
              label="Phone"
              fullWidth
              margin="dense"
              value={editingUser.phone || ""}
              onChange={(e) =>
                setEditingUser((prev) =>
                  prev ? { ...prev, phone: e.target.value } : null
                )
              }
            />

            {/* 🔹 Role Dropdown */}
            <TextField
              select
              label="Role"
              fullWidth
              margin="dense"
              value={editingUser.role || ""}
              onChange={(e) =>
                setEditingUser((prev) =>
                  prev ? { ...prev, role: e.target.value } : null
                )
              }
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="therapist">Therapist</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </TextField>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default AdminUsersPage;