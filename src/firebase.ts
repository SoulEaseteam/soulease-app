import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // ✅ เพิ่มบรรทัดนี้

const firebaseConfig = {
  apiKey: "AIzaSyCQ1gEIHBQYJJ5rGVMBbnsn1dw-P0siuok",
  authDomain: "soulease-spa.firebaseapp.com",
  projectId: "soulease-spa",
  storageBucket: "soulease-spa.appspot.com",
  messagingSenderId: "394341744641",
  appId: "1:93414744641:web:9a846196f707de80208000",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ เพิ่มบรรทัดนี้
export default app;