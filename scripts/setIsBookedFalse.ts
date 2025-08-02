// scripts/setIsBookedFalse.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url); // 👈 ใช้ require ได้ใน ES module scope

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const updateAllTherapists = async () => {
  const snapshot = await db.collection('therapists').get();

  const updates = snapshot.docs.map((doc) =>
    doc.ref.update({ isBooked: false })
  );

  await Promise.all(updates);

  console.log(`✅ Updated ${updates.length} therapists to isBooked = false`);
};

updateAllTherapists()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error updating therapists:', error);
    process.exit(1);
  });