import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Avatar, Typography, Paper, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { db, storage } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CustomAlert from '@/components/CustomAlert';

const EditProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const data = snap.data();
      if (data) {
        setName(data.username || '');
        setBio(data.bio || '');
        setImage(data.image || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    let imageUrl = image;

    if (uploadFile) {
      const storageRef = ref(storage, `profile-images/${user.uid}`);
      await uploadBytes(storageRef, uploadFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    const refUser = doc(db, 'users', user.uid);
    await updateDoc(refUser, { username: name, bio, image: imageUrl });

    setOpen(true);
    setTimeout(() => navigate('/profile'), 1000);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#1c2a3a', pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          background: '#2b3b53',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          color: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <IconButton onClick={() => navigate('/profile')} sx={{ color: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" ml={1}>
          Edit Profile
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Paper
          elevation={4}
          sx={{
            p: 3,
            borderRadius: 4,
            maxWidth: 400,
            mx: 'auto',
            background: 'linear-gradient(to bottom, #fff, #f2f2f2)',
          }}
        >
          <Box textAlign="center">
            <Avatar
              src={image || '/images/massage/user.png'}
              sx={{ width: 90, height: 90, mb: 2 }}
            />
            <Button variant="outlined" component="label" size="small">
              Upload New Image
              <input hidden type="file" accept="image/*" onChange={handleImageChange} />
            </Button>
            <Typography fontWeight="bold" fontSize={18} mt={2}>
              Edit Your Info
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ my: 2 }}
          />
          <TextField
            fullWidth
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{
              mt: 3,
              fontWeight: 'bold',
              py: 1.3,
              borderRadius: 99,
              textTransform: 'none',
            }}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Paper>
      </Box>

      <CustomAlert
        open={open}
        onClose={() => setOpen(false)}
        message="✅ Your profile has been updated successfully!"
        severity="success"
      />
    </Box>
  );
};

export default EditProfilePage;