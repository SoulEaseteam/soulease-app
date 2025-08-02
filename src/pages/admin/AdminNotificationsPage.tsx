// src/pages/admin/AdminNotificationPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Chip,
  Button,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase";

interface Notification {
  id: string;
  message: string;
  type: "booking" | "review" | "system";
  createdAt: any;
  read?: boolean;
}

const typeColor = {
  booking: "success",
  review: "info",
  system: "warning",
};

const AdminNotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const fetchNotifications = async () => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Notification[];
    setNotifications(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setSnackbar({ open: true, message: "Marked as read", severity: "success" });
      fetchNotifications();
    } catch (error) {
      setSnackbar({ open: true, message: "Error marking as read", severity: "error" });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setSnackbar({ open: true, message: "Deleted successfully", severity: "success" });
      fetchNotifications();
    } catch (error) {
      setSnackbar({ open: true, message: "Error deleting notification", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        🔔 Manage Notifications
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : notifications.length === 0 ? (
        <Typography>No notifications found.</Typography>
      ) : (
        <List>
          {notifications.map((n) => (
            <React.Fragment key={n.id}>
              <ListItem
                sx={{
                  bgcolor: n.read ? "#f5f5f5" : "#fff8e1",
                  borderRadius: 2,
                  mb: 1,
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    {!n.read && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => markAsRead(n.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setConfirmDialog({ open: true, id: n.id })}
                    >
                      Delete
                    </Button>
                  </Stack>
                }
              >
                <ListItemText
                  primary={n.message}
                  secondary={new Date(
                    n.createdAt?.toDate?.() || n.createdAt
                  ).toLocaleString()}
                />
                <Chip
                  label={n.type}
                  color={typeColor[n.type] as any}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* ✅ Confirm Delete Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null })}
      >
        <DialogTitle>Are you sure to delete this notification?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, id: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDialog.id) deleteNotification(confirmDialog.id);
              setConfirmDialog({ open: false, id: null });
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Snackbar แจ้งเตือน */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminNotificationPage;