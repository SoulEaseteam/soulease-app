// src/components/SocialLoginButtons.tsx
import { auth, googleProvider, facebookProvider } from '@/firebase';
import { signInWithPopup } from 'firebase/auth';
import { Button, Stack } from '@mui/material';

export default function SocialLoginButtons() {
  return (
    <Stack spacing={2}>
      <Button variant="contained" onClick={() => signInWithPopup(auth, googleProvider)}>
        Continue with Google
      </Button>
      <Button variant="contained" color="primary" onClick={() => signInWithPopup(auth, facebookProvider)}>
        Continue with Facebook
      </Button>
    </Stack>
  );
}