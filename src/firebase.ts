import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCPJkRTNE1XuP_xkDq18bs3ygsSfk5kgRM",
  authDomain: "soulease-spa.firebaseapp.com",
  projectId: "soulease-spa",
  storageBucket: "soulease-spa.appspot.com",
  messagingSenderId: "394341744641",
  appId: "1:394341744641:web:9a868196770d7b80308000",
  measurementId: "G-XEMLVVPN4W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;