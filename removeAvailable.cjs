const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json'); // ใช้ชื่อที่เปลี่ยนแล้ว

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const therapistsRef = db.collection('therapists');

async function removeAvailableField() {
  const snapshot = await therapistsRef.get();
  snapshot.forEach(async (doc) => {
    await doc.ref.update({
      available: admin.firestore.FieldValue.delete(),
    });
    console.log(`✅ Removed 'available' from: ${doc.id}`);
  });
}

removeAvailableField();