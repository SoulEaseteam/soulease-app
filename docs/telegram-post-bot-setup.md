# @SunRedPostBot — Setup & Deploy Guide

> Auto-posting bot for the @SunRed_BKK Telegram channel.
> Lives in `functions/src/telegram-post-bot/`. Separate from the
> existing booking-notification bot.
>
> Round 28s115 · 2026-06-07

---

## ⚠️ Security note up front

The first token (`8936...`) was shared in a Claude chat session. It
still works · but should be rotated once posting works end-to-end.

To rotate at any time:
```
@BotFather → /revoke → pick SunRedPostBot → get new token
```
Then re-run the Secret Manager command below with the new value.

---

## 1. Required setup (do once · 5 min)

### Step 1 — Add @SunRedPostBot as channel admin

1. Open Telegram · go to channel `@SunRed_BKK`
2. Tap channel name → Administrators → **Add Administrator**
3. Search `@SunRedPostBot` · select it
4. Grant permissions:
   - ✅ **Post Messages** (required)
   - ✅ **Edit Messages of Others** (for future live-availability updates)
   - ✅ **Delete Messages** (cleanup stale posts)
   - ❌ Anything else (least-privilege)
5. Tap **Done**

### Step 2 — Store token in Firebase Secret Manager

In terminal:
```bash
cd ~/sunred-vite/functions
firebase functions:secrets:set TELEGRAM_POST_BOT_TOKEN
```

The CLI will prompt:
```
? Enter a value for TELEGRAM_POST_BOT_TOKEN:
```

→ Paste the bot token here · press Enter
→ Token is encrypted in Google Secret Manager · never lands in your repo

To verify it exists later:
```bash
firebase functions:secrets:access TELEGRAM_POST_BOT_TOKEN
```

### Step 3 — Deploy the new Functions

```bash
cd ~/sunred-vite
firebase deploy --only functions:scheduledChannelSpotlight,functions:scheduledChannelWeekend,functions:postToChannelManual
```

Or just `firebase deploy --only functions` to deploy all (also re-deploys the
existing booking bot · safe).

---

## 2. What gets deployed

Three Cloud Functions:

| Function | Trigger | Posts |
|---|---|---|
| `scheduledChannelSpotlight` | Mon 13:00 UTC = **Mon 20:00 BKK** | Practitioner Spotlight (rotates 11 non-Yuri) |
| `scheduledChannelWeekend` | Fri 11:00 UTC = **Fri 18:00 BKK** | Weekend Forecast (static) |
| `postToChannelManual` | Callable from admin client | Tonight / Spotlight / Lineup / Welcome Back |

All writes a log row to `telegramPosts` Firestore collection:
```
{
  kind, therapistId, therapistName, messageId,
  postedAt, manual, adminUid, ok, error
}
```

---

## 3. Rotation logic

**Star therapist (Yuri) is EXCLUDED** from the recurring spotlight
rotation. Reasons documented in
`docs/customer-acquisition.md` + `docs/master-strategy.md`:
- Yuri already over-booked · spotlighting her steals oxygen from the
  underused 7
- Goal of the recurring cron = build a book for the OTHER 11

Yuri can still be spotlighted via the manual callable:
```js
postToChannelManual({ kind: "spotlight", therapistId: "YuriSunRed" })
```

Rotation state stored at Firestore `system/telegramRotation`:
```
{ idx: number, lastPickedAt, lastId, lastName }
```

`idx` increments each Monday cron run · wraps mod 11. No restart
needed when adding/removing therapists from the roster · just edit
`POST_ROSTER` in `functions/src/telegram-post-bot/rotation.ts`.

---

## 4. Manual posting from admin UI

After deploy · the callable is available at:
```
postToChannelManual({
  kind: "tonight" | "spotlight" | "lineup" | "weekend" | "welcome",
  therapistId?: "YuriSunRed",     // for tonight/spotlight
  therapistIds?: ["A","B","C"],   // for lineup
})
```

Caller must be authenticated AND have `role === "admin"` custom claim.
Returns `{ ok: true, messageId: number }`.

### Suggested admin UI buttons

In `AdminFloatingChat` or a future `AdminTelegramPanel`:

```tsx
const post = httpsCallable(functions, "postToChannelManual");

<button onClick={() => post({ kind: "tonight" })}>
  Tonight (auto-pick)
</button>

<button onClick={() => post({ kind: "spotlight", therapistId: "YuriSunRed" })}>
  Spotlight Yuri
</button>

<button onClick={() => post({ kind: "welcome" })}>
  Welcome back (after silence)
</button>
```

---

## 5. Editing the post copy

All copy lives in `functions/src/telegram-post-bot/templates.ts`:
- `renderSpotlight()`
- `renderTonightSpecial()`
- `renderTonightLineup()`
- `renderWeekendForecast()`
- `renderWelcomeBack()`

After editing → `firebase deploy --only functions:<name>` to push the
new copy.

To stage editorial changes BEFORE pushing to code · edit them first
in `docs/telegram-templates.md` (the source of truth for the
playbook · matches what View hand-posts).

---

## 6. Adding a new post type

Example: add a "Late Night Slot" type that fires sporadically when
View has unexpected last-minute availability.

1. Add `renderLateNightSlot(therapist)` to `templates.ts`
2. Add a new case to the `switch (kind)` block in `index.ts`
3. Optionally add a new `onSchedule` if you want it cron-driven
4. Deploy

---

## 7. Monitoring + debugging

Check delivery status:
```bash
firebase functions:log --only scheduledChannelSpotlight,scheduledChannelWeekend,postToChannelManual --lines 50
```

Check what got posted:
```
Firestore Console → telegramPosts collection
  → order by postedAt desc
  → ok: true = sent, ok: false = inspect error
```

Common failure modes:
- `403 chat not found` → bot was removed from channel · re-add as admin
- `401 unauthorized` → token wrong or revoked · re-set secret
- `400 message is too long` → template body grew past 4000 chars
  (the client truncates at 4000 · check templates.ts)

---

## 8. Adjusting the schedule

Cron expressions in `functions/src/telegram-post-bot/index.ts`:

```js
schedule: "0 13 * * 1"  // Mon 13:00 UTC = Mon 20:00 BKK
schedule: "0 11 * * 5"  // Fri 11:00 UTC = Fri 18:00 BKK
```

UTC reference for BKK (UTC+7):
```
20:00 BKK = 13:00 UTC
21:00 BKK = 14:00 UTC
18:00 BKK = 11:00 UTC
22:00 BKK = 15:00 UTC
```

Cron format: `min hour dayOfMonth month dayOfWeek`
DayOfWeek: `0`=Sun, `1`=Mon ... `6`=Sat

Edit · `firebase deploy --only functions:scheduledChannelSpotlight`
(or whichever schedule changed) to push.

---

## 9. Rolling back

To kill the post bot entirely without losing the code:
```bash
firebase functions:delete scheduledChannelSpotlight
firebase functions:delete scheduledChannelWeekend
firebase functions:delete postToChannelManual
```

Or just remove the export block at the bottom of
`functions/src/index.ts` and redeploy · Functions that aren't exported
get removed.

---

## 10. Files map

```
functions/src/telegram-post-bot/
├── client.ts         — Telegram API wrapper (sendMessage, editMessage)
├── rotation.ts       — POST_ROSTER + pickNextSpotlight()
├── templates.ts      — renderXxx() builders
└── index.ts          — Cloud Function bindings (3 functions)

functions/src/index.ts
└── re-exports the 3 Functions at the bottom
```

---

## ⚠️ Pre-flight checklist

Before deploying:
- [ ] `@SunRedPostBot` is admin in `@SunRed_BKK` with Post Messages
- [ ] `TELEGRAM_POST_BOT_TOKEN` is set in Secret Manager
- [ ] Functions repo TypeScript builds clean (`npx tsc --noEmit`)
- [ ] Test post manually first:
  ```bash
  firebase functions:shell
  # then in the REPL:
  postToChannelManual({ kind: "spotlight" })
  ```
  Verify post appears in channel before letting the cron loose.

---

## 🔗 Related docs

- `docs/telegram-templates.md` — editorial source of truth for post copy
- `docs/customer-acquisition.md` — strategy this serves (channel #2)
- `docs/master-strategy.md` — overall priority
