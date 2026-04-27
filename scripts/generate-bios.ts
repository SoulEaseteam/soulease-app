// scripts/generate-bios.ts
//
// 🌍 Multi-language SEO bio generator for therapists (one-off script)
//
// อ่าน therapists ทั้งหมดใน Firestore → ถ้ายังไม่มี `bios` field
// → generate bio professional ใน 5 ภาษา (EN/TH/ZH/JA/KO) ผ่าน Gemini Flash
// → เขียนกลับ Firestore: { bios: { en, th, zh, ja, ko }, bioGeneratedAt }
//
// Setup:
//   1. signup ที่ https://aistudio.google.com → New API key (free 1500 req/day)
//   2. download Firebase Admin SDK key:
//      Firebase Console → Project Settings → Service accounts → Generate new private key
//      → save เป็น scripts/serviceAccountKey.json (gitignored แล้ว)
//   3. cd scripts && npm install firebase-admin @google/generative-ai tsx
//   4. รัน: GEMINI_API_KEY=xxxxx npx tsx generate-bios.ts
//
// ⚠️ Cost: ~$0 (Gemini Flash free tier 1500 req/day)
// ⚠️ Idempotent: skip therapist ที่มี bios แล้ว — รันซ้ำได้ปลอดภัย

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── config ───────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY env var");
  console.error("   Get one at: https://aistudio.google.com");
  console.error("   Then run: GEMINI_API_KEY=xxx npx tsx generate-bios.ts");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH = resolve(__dirname, "serviceAccountKey.json");

let serviceAccount: ServiceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf8")) as ServiceAccount;
} catch {
  console.error(`❌ Cannot read ${KEY_PATH}`);
  console.error("   Download from Firebase Console → Settings → Service accounts");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ─── prompt template ──────────────────────────────────────────
interface TherapistBrief {
  name: string;
  specialty?: string;
  experience?: number | string;
  features?: {
    age?: string;
    language?: string;
    bodyType?: string;
    height?: string;
  };
  servicesAvailable?: string[];
}

interface MultilingualBios {
  en: string;
  th: string;
  zh: string;
  ja: string;
  ko: string;
}

function buildPrompt(t: TherapistBrief): string {
  return `You are a professional copywriter for a luxury outcall massage service in Bangkok.

Write a SHORT bio (2 sentences, ~30 words) for this therapist in 5 languages.

Tone: warm, professional, sophisticated. NO explicit/sexual content.
Style: tourist-friendly, premium hotel concierge level.
Focus: skill, hospitality, customer experience.

Therapist:
- Name: ${t.name}
- Specialty: ${t.specialty ?? "Thai/Aromatherapy massage"}
- Experience: ${t.experience ?? "experienced"} years
- Languages: ${t.features?.language ?? "Thai, basic English"}
- Services: ${t.servicesAvailable?.join(", ") ?? "Thai Massage, Aromatherapy"}

Output STRICT JSON (no markdown, no \`\`\` fences):
{
  "en": "English bio here...",
  "th": "ภาษาไทย...",
  "zh": "中文...",
  "ja": "日本語...",
  "ko": "한국어..."
}`;
}

async function generateBio(t: TherapistBrief): Promise<MultilingualBios> {
  const prompt = buildPrompt(t);
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // strip ```json fences ถ้าโมเดลใส่มา
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  const parsed = JSON.parse(cleaned) as MultilingualBios;

  // validate ครบ 5 ภาษา
  const requiredLangs: (keyof MultilingualBios)[] = ["en", "th", "zh", "ja", "ko"];
  for (const lang of requiredLangs) {
    if (!parsed[lang] || typeof parsed[lang] !== "string") {
      throw new Error(`Missing or invalid lang: ${lang}`);
    }
  }

  return parsed;
}

// ─── main ─────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Fetching therapists...");
  const snap = await db.collection("therapists").get();
  console.log(`   Found ${snap.size} therapists\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const t = doc.data() as TherapistBrief & { bios?: MultilingualBios };

    if (t.bios && Object.keys(t.bios).length >= 5) {
      skipped++;
      console.log(`⏭️  ${t.name} — already has bios (skip)`);
      continue;
    }

    try {
      console.log(`✨ Generating: ${t.name} ...`);
      const bios = await generateBio(t);

      await doc.ref.update({
        bios,
        bioGeneratedAt: Timestamp.now(),
      });

      processed++;
      console.log(`   ✓ Updated\n`);

      // กัน rate limit (Gemini free = 15 RPM)
      await new Promise((r) => setTimeout(r, 4500));
    } catch (err) {
      failed++;
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  console.log("─".repeat(50));
  console.log(`✅ Done. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
