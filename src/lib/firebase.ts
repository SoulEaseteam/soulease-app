// src/lib/firebase.ts
// Single source of truth for Firebase SDK initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCPJkRTNE1XuP_xkDq18bs3ygsSfk5kgRM",
  authDomain: "soulease-spa.firebaseapp.com",
  projectId: "soulease-spa",
  storageBucket: "soulease-spa.firebasestorage.app",
  messagingSenderId: "394341744641",
  appId: "1:394341744641:web:9a868196770d7b80308000",
  measurementId: "G-XEMLVVPN4W"
};

const app = initializeApp(firebaseConfig);

// Core services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// OAuth providers — used by SocialLoginButtons
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export { app };