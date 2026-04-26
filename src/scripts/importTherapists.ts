import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { therapistsSeed } from "../src/data/therapistsSeed";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE,
  messagingSenderId: process.env.FB_MSG,
  appId: process.env.FB_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importTherapists() {
  console.log("🚀 Importing therapists...");

  for (const t of therapistsSeed) {
    await setDoc(doc(db, "therapists", t.id), t, { merge: true });
    console.log(`✔ Imported: ${t.name}`);
  }

  console.log("🎉 All therapists imported successfully!");
}

importTherapists();