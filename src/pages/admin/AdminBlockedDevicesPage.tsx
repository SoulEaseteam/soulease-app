// src/pages/admin/AdminBlockedDevicesPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

interface BlockedDevice {
  id: string;       // deviceId
  reason?: string;  // why blocked
  createdAt: Timestamp;
}

const AdminBlockedDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<BlockedDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [action, setAction] = useState<"block" | "unblock" | null>(null);

  // ✅ Load block list realtime
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blockedDevices"), (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as BlockedDevice)
      );
      setDevices(data);
    });
    return () => unsub();
  }, []);

  // ✅ Block
  const handleBlock = async (deviceId: string) => {
    await setDoc(doc(db, "blockedDevices", deviceId), {
      reason: reason || "Blocked by admin",
      createdAt: Timestamp.now(),
    });
  };

  // ✅ Unblock
  const handleUnblock = async (deviceId: string) => {
    await deleteDoc(doc(db, "blockedDevices", deviceId));
  };

  // ✅ Confirm
  const handleConfirm = async () => {
    if (!selectedId || !action) return;
    if (action === "block") await handleBlock(selectedId);
    if (action === "unblock") await handleUnblock(selectedId);
    setSelectedId(null);
    setReason("");
    setAction(null);
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "Device ID", flex: 2 },
    { field: "reason", headerName: "Reason", flex: 2 },
    {
      field: "createdAt",
      headerName: "Blocked At",
      flex: 1,
      valueFormatter: (value: any) => value?.toDate().toLocaleString() || "-",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label="Blocked"
          color="error"
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        const deviceId = params.row.id;
        return (
          <Box>
            <IconButton
              color="success"
              onClick={() => {
                setSelectedId(deviceId);
                setAction("unblock");
              }}
            >
              <LockOpenIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={() => {
                setSelectedId(deviceId);
                setAction("block");
              }}
            >
              <LockIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        🚫 Blocked Devices
      </Typography>

      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={devices}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={!!selectedId}
        onClose={() => {
          setSelectedId(null);
          setReason("");
          setAction(null);
        }}
      >
        <DialogTitle>
          {action === "block" ? "Confirm Block" : "Confirm Unblock"}
        </DialogTitle>
        <DialogContent>
          <Typography mb={2}>
            Are you sure you want to{" "}
            <b>{action === "block" ? "BLOCK" : "UNBLOCK"}</b> this device?
          </Typography>
          <Typography color="primary"><code>{selectedId}</code></Typography>

          {action === "block" && (
            <TextField
              fullWidth
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedId(null)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            color={action === "block" ? "error" : "success"}
          >
            {action === "block" ? "Block" : "Unblock"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBlockedDevicesPage;