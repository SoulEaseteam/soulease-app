// src/components/UploadAvatar.tsx

import React, { useState } from 'react';
import { Button, Avatar, Stack, Typography } from '@mui/material';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage, db } from '../firebase';
import { useAuth } from '@/providers/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';

const UploadAvatar: React.FC = () => {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
    setUploading(true);
    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setPreviewUrl(downloadURL);

      // Update user's Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { avatar: downloadURL });

      alert('✅ Upload successful');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="h6">📸 Upload Your Avatar</Typography>
      <Avatar src={previewUrl || undefined} sx={{ width: 80, height: 80 }} />
      <Button variant="contained" component="label" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Choose File'}
        <input hidden type="file" accept="image/*" onChange={handleFileChange} />
      </Button>
    </Stack>
  );
};

export default UploadAvatar;
