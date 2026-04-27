# Scripts

One-off scripts for SunRed admin tasks.

## generate-bios.ts

🌍 สร้าง bio สำหรับ therapist ใน 5 ภาษา (EN/TH/ZH/JA/KO) ด้วย Gemini Flash

### Setup (ครั้งเดียว)

1. **Get Gemini API key** (free 1500 req/day):
   - https://aistudio.google.com → "Get API key"

2. **Download Firebase Admin key**:
   - Firebase Console → Project Settings → Service accounts
   - "Generate new private key"
   - Save as `scripts/serviceAccountKey.json` (already in .gitignore)

3. **Install deps** (ใน `scripts/` ครั้งเดียว):
   ```bash
   cd scripts
   npm init -y
   npm install firebase-admin @google/generative-ai
   npm install -D tsx typescript @types/node
   ```

### Run

```bash
cd scripts
GEMINI_API_KEY=AIzaSy... npx tsx generate-bios.ts
```

### Output

อัปเดต Firestore: `therapists/{id}` →
```json
{
  "bios": {
    "en": "Yuri brings 5 years of expertise in...",
    "th": "ยูริมีประสบการณ์ 5 ปี...",
    "zh": "Yuri 拥有 5 年经验...",
    "ja": "ユリさんは5年以上の経験...",
    "ko": "유리는 5년 이상의 경험..."
  },
  "bioGeneratedAt": "<timestamp>"
}
```

### Notes

- **Idempotent**: รันซ้ำได้ — skip therapist ที่มี bios แล้ว
- **Rate limit**: หน่วง 4.5 วินาที/คน (Gemini free = 15 RPM)
- **Cost**: $0 (free tier ครอบคลุม)
- **Time**: ~5 วินาที/คน → 50 therapists ≈ 4-5 นาที
