// scripts/updateGalleries.ts
//
// One-shot: push updated gallery + image fields for YaYa, Nicky, Richie
// into Firestore after new photos were added to public/images/.
//
// Usage:
//   cd scripts
//   npx tsx updateGalleries.ts

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const updates: { id: string; image: string; gallery: string[] }[] = [
  {
    id: "YaYaSunRed",
    image: "/images/yaya/yaya.jpeg",
    gallery: [
      "/images/yaya/yaya.jpeg",
      "/images/yaya/yaya1.jpeg",
      "/images/yaya/yaya2.jpeg",
      "/images/yaya/yaya3.jpeg",
      "/images/yaya/yaya4.jpeg",
      "/images/yaya/yaya2.PNG",
    ],
  },
  {
    id: "NickySunRed",
    image: "/images/nicky/nicky.JPG",
    gallery: [
      "/images/nicky/nicky.JPG",
      "/images/nicky/nicky1.JPG",
      "/images/nicky/nicky2.JPG",
      "/images/nicky/nicky3.PNG",
      "/images/nicky/nicky4.PNG",
    ],
  },
  {
    id: "RichieSunRed",
    image: "/images/richie/richie.jpg",
    gallery: [
      "/images/richie/richie.jpg",
      "/images/richie/richie2.jpg",
      "/images/richie/richie3.jpg",
      "/images/richie/richie4.jpg",
    ],
  },
];

async function run() {
  for (const t of updates) {
    const ref = db.collection("therapists").doc(t.id);
    await ref.update({ image: t.image, gallery: t.gallery });
    console.log(`✅ ${t.id} — ${t.gallery.length} photos`);
  }
  console.log("Done.");
}

void run();
