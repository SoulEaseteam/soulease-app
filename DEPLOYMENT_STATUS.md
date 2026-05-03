# SunRed — Deployment Status (Round 28)

_Last updated: 2026-05-03_

## Production: Ready ✅

| Field | Value |
|---|---|
| **Status** | Ready (Production) |
| **URL** | https://sunred.vip |
| **Aliases** | sunred-app-git-main-sunred-projects.vercel.app · sunred-776z9eb85-sunred-projects.vercel.app |
| **Branch** | `main` |
| **Commit** | `b7a41b8` — merge: Round 28 design refresh + booking real-time + GrabCar pricing |
| **Build duration** | 56s |
| **Framework** | Vite + React 18 + TypeScript |
| **Hosting** | Vercel |

---

## Database — Firestore

### Collections in production

| Collection | Purpose | Owner / RW |
|---|---|---|
| `therapists/{id}` | Therapist profiles, status, gallery, features | Read: public · Write: self (uid) or admin |
| `bookings/{id}` | Booking records (status, times, location, payment, fees) | Read: user/therapist/admin · Write: user |
| `admins/{adminId}` | Admin user records | Read: self or admin · Write: admin |
| `auditLogs/{logId}` | Therapist doc change audit trail | Read: admin · Write: Cloud Function only |
| `services/{id}` | Live service catalog (mirrors `data/services.ts`) | Read: public · Write: admin |
| `notifications/{id}` | Customer in-app notifications post-booking | Read: owner · Write: Cloud Function |

### Therapist doc shape (key fields)

```ts
{
  id, name, image, email, uid,           // identity + auth-link
  rating, reviews, experience,           // public stats
  startTime, endTime,                    // shift HH:mm
  statusOverride, isHoliday, busyUntil,  // availability engine inputs
  activeBooking, isBooked,
  homeLocation, currentLocation,         // standby + live coords
  homeAddress, area,                     // standby address (admin-only) + zone label
  lat, lng, distanceKm,
  gallery, features (height, weight, bodyType, bustSize,
    skintone, gender, ethnicity, language, employmentType, age),
  servicesAvailable, services,
  bios, bioGeneratedAt,                  // AI multi-language bios
  badgeKey (VIP/HOT/NEW), badgeUpdatedAt,
  credentials, serviceExperience,        // structured trust + experience
  languageSkills,                        // structured proficiency
  rebookRate, totalSessions, todayBookings,
}
```

### Booking doc shape (key fields)

```ts
{
  userId, therapistId, therapistName,
  serviceId, serviceName, servicePrice, basePrice, duration,
  date, time, startAt (Timestamp), endAt (Timestamp),
  locationName, address, addressDetails, location {lat, lng},
  mapUrl, meetingPoint, locationType, addressNote,
  contactName, phone, language,
  addons, addonsTotal, note,
  discountCode, payment, paymentMethodId,
  taxiFee, taxiTier, taxiBaseFee,
  rainTier, rainSurchargePct,
  grabEstimate, savingsVsGrab, distanceKm,
  totalPrice, status, paymentStatus,
  yearMonth, createdAt (serverTimestamp),
  reviewText, rating,                    // populated post-completion
}
```

### Indexes deployed

- `therapists` — composite indexes for status + ranking
- `bookings` — `(therapistId, createdAt)` for review aggregation
- No `(therapistId, startAt)` — queries iterate client-side to avoid silent failure

---

## API endpoints — Cloud Functions

### Active

| Function | Trigger | Purpose |
|---|---|---|
| `setRoleOnSignup` | v1 `auth.user().onCreate` | Auto-assigns `admin` / `therapist` / `customer` custom claim on Auth account creation. Writes `uid` back to therapist doc when email matches. |
| `onTherapistUpdate` | v2 `firestore` (onWrite) | Writes `auditLogs/{id}` entry whenever a therapist doc changes — captures `changedBy`, `before`, `after`, `timestamp`. |

### Auth flow

1. Therapist doc created with `email` field by admin
2. Therapist signs up via Firebase Auth using same email
3. `setRoleOnSignup` fires → matches email → sets custom claim `role: "therapist"` + writes `uid` to therapist doc
4. `firestore.rules` reads `request.auth.token.role` for permission checks

### Required secrets / env

- `OPENAI_API_KEY` — set as Firebase Functions secret (placeholder for future AI features)
- `TELEGRAM_BOT_TOKEN` — set in Vercel env (booking notifications)
- `GOOGLE_MAPS_API_KEY` — set in Vercel env (Directions API + Maps embed)
- `OPENWEATHERMAP_API_KEY` — set in Vercel env (rain surcharge)
- Firebase config — `import.meta.env.VITE_FIREBASE_*` (Vercel env)

---

## Firestore security rules — current

```
match /therapists/{therapistId} {
  allow read: if true;
  allow create, delete: if isAdmin();
  allow update: if isAdmin() ||
    (isTherapistOwner(therapistId) &&
     onlyEditingFields(therapistEditableKeys()));
}

match /bookings/{bookingId} {
  allow read: if isOwner(resource.data.userId) ||
                 isTherapist(resource.data.therapistId) ||
                 isAdmin();
  allow create: if request.auth != null;
  allow update: if isAdmin() || isOwnerForBooking() || isTherapistForBooking();
}

match /admins/{adminId} {
  allow read: if isOwner(adminId) || isAdmin();
  allow write: if isAdmin();
}

match /auditLogs/{logId} {
  allow read: if isAdmin();
  allow write: if false;        // only Cloud Function via Admin SDK
}
```

---

## Minor cleanup items (non-blocking)

- [ ] **Node.js version override** — Vercel notes warning. Add `"engines": {"node": ">=20"}` to `package.json` or set in Vercel project settings.
- [ ] **3 Vercel Recommendations** — likely Speed Insights enable / Web Analytics enable / suggested perf tweaks. Open in dashboard to address.
- [ ] **1 build log warning** — non-blocking, view in Vercel build logs to identify.
- [ ] **Backfill emails for all therapists** — only 3/12 therapists have `email` field on doc. Need to collect real emails before they can self-onboard via Auth.
- [ ] **Audit + clean orphan therapist docs in Firestore** — `scripts/auditTherapistsCollection.ts` ready to run, not yet executed against prod.
- [ ] **Run `migrateTherapistProfiles.ts` post-merge** — ensures Firestore docs match latest data file shape (homeAddress, lat/lng, email).
- [ ] **Activate Speed Insights / Web Analytics** in Vercel for real-user metrics.
- [ ] **Set up scheduled job** to mark stale `pending` bookings (>24hr old) as `cancelled`.

---

## Round 28 highlights deployed

- **Clean v3 palette** — cool neutral `#FAFBFC → #F1F3F5` (cards/shells), warm coral kept as accents
- **About card** — collapsible, 3 rows (Work / Body / Origin), Female/Male gender icon next to name
- **Embedded gallery** — inside About card expansion, 3-col grid 4:5, lightbox with horizontal swipe + swipe-down dismiss + tap-outside close
- **DetailHero** — same lightbox gestures applied; prev/next arrows removed
- **Verified badge** — bare blue checkmark site-wide (no white circle frame)
- **TherapistProfileCard** — Avail pill on footer (green / coral / gray), price LEFT, white card + slate border
- **Search bar** — solid white + red icon (Round 28b1)
- **Real-time bookings** — every surface reads live `bookings` collection; "Next booked at HH:mm" hint on StatusPill / cards / Map floating card
- **GrabCar taxi pricing** — `฿45 base + tiered per-km × 1.5` (return at half-price)
- **Booking form persistence** — sessionStorage keyed by therapistId; map data survives Payment Methods round-trip
- **PaymentMethodsPage** — Clean v3 refresh
- **ServicesPage** — full Clean v3 refresh, About Us rewritten (4 pillars + service area + languages), How To Book rewritten (Basics + Payment FAQ in cool palette)
- **Live "Used by N customers" chip** — `useServiceUsageStats.servedCount` (only `completed`/`done`)
- **No emoji** — every emoji glyph replaced with MUI icons site-wide
