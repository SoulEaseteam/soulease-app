# Telegram Concierge Bot — Setup Guide

> Customer-facing bot that greets in the visitor's language, forwards
> all DMs to the admin Telegram group, and relays View's replies back
> to the customer. Lets View answer Chinese / Japanese / Korean
> inquiries from one inbox without learning each language.
>
> Round 28s117 · 2026-06-07

---

## 🎯 What this bot does

```
Chinese tourist (Bangkok)
     ↓ scans QR · WeChat bio · LINE redirect · taxi card
     ↓ DMs @SunRedConciergeBot on Telegram
     ↓
Bot auto-detects language from Telegram profile
     ↓ sends welcome message in their language
     ↓ forwards the customer's message into admin group
     ↓ acknowledges customer ("concierge notified")
     ↓
View sees forwarded message in admin Telegram group
     ↓ swipes-to-reply with her response
     ↓ bot relays the reply back to the original customer
```

**Single Telegram inbox for View · 5 languages auto · zero admin UI work.**

---

## 1. Required setup (do once · 10 min)

### Step 1 — Create the bot via @BotFather

1. Open Telegram · `@BotFather`
2. `/newbot`
3. Display name: `SunRed Concierge` (or whatever View prefers)
4. Username: `SunRedConciergeBot` (must end in `bot`)
5. BotFather returns token like `1234567890:AAE...`
6. **⚠️ Keep the token offline — don't paste in chat sessions**

Optional bot polish via BotFather:
- `/setdescription` → "Premium outcall massage concierge · 24/7 ·
  EN/中文/日本語/한국어/Thai"
- `/setabouttext` → short tagline shown on bot profile
- `/setuserpic` → brand avatar (SunRed logo · square)
- `/setcommands` → start command:
  ```
  start - Start conversation
  ```

### Step 2 — Disable group privacy (important!)

By default, Telegram bots only see messages directed AT them (replies
or mentions). For our admin-reply-relay to work, the bot must see
ALL replies in the admin group.

1. `@BotFather` → `/mybots` → SunRed Concierge → Bot Settings
2. Group Privacy → **Turn off**
3. Confirm

Without this step, the bot can't see View's swipe-to-reply replies in
the admin group · admin → customer relay will silently fail.

### Step 3 — Store the token in Secret Manager

In terminal:
```bash
cd ~/sunred-vite/functions
firebase functions:secrets:set TELEGRAM_CONCIERGE_BOT_TOKEN
```

When prompted "Enter a value", paste the bot token and press Enter.

### Step 4 — Deploy the Function

```bash
cd ~/sunred-vite
firebase deploy --only functions:telegramConciergeWebhook
```

Wait for `✔ Deploy complete!`. The function URL will be printed —
copy it. It looks like:
```
https://us-central1-soulease-spa.cloudfunctions.net/telegramConciergeWebhook
```

### Step 5 — Register the webhook with Telegram

Tell Telegram to POST every Bot API update to our Function:

```bash
TOKEN="<paste your bot token here · then remove from history>"
URL="https://us-central1-soulease-spa.cloudfunctions.net/telegramConciergeWebhook"

curl -s "https://api.telegram.org/bot${TOKEN}/setWebhook?url=${URL}" \
  | python3 -m json.tool
```

Success response:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

After running, clear shell history: `history -c`

### Step 6 — Add bot to the admin group

1. Open the SunRed admin Telegram group (the one that receives booking
   alerts · chat_id `-1002962073895`)
2. Tap group name → Add members
3. Search `@SunRedConciergeBot` (or whatever username you picked)
4. Add · **promote to Administrator** with at least "Send Messages"
   permission

Without this step, the bot can't post forwarded customer messages
into the admin group.

---

## 2. Test it works (5 min)

### Step A — DM the bot from a fresh account

1. Open Telegram in incognito (or use a second account / friend's phone)
2. Search `@SunRedConciergeBot`
3. Tap **Start**

Expected:
- Welcome message in your Telegram UI language
- (If your Telegram is set to 中文 → welcome in 中文 etc.)

### Step B — Send a test inquiry

Type: `Hello, do you have availability tonight?`

Expected:
- Bot replies: "Got it — concierge has been notified. We'll reply shortly."
- The message appears in the admin group with a header like:
  ```
  [chat:123456789] [lang:en] John Doe (@john_doe)
  Hello, do you have availability tonight?
  ```

### Step C — Reply from admin group

In the admin group, **swipe-to-reply** to the forwarded message and
type: `Yes — Yuri is available from 22:00. Where are you staying?`

Expected:
- Customer receives your reply in their DM with the bot

---

## 3. Where to direct customers TO the bot

Now that the bot is live, route ALL customer inquiries through it:

| Channel | Link format |
|---|---|
| **WeChat bio** | `预约请加 Telegram t.me/SunRedConciergeBot` |
| **LINE auto-reply** | `For full menu & booking: t.me/SunRedConciergeBot` |
| **WhatsApp Business** | Same redirect |
| **Website footer** | "Reserve via concierge" → `t.me/SunRedConciergeBot` |
| **Taxi cards (back)** | QR code resolving to `t.me/SunRedConciergeBot` |
| **Stickman listing** | "DM @SunRedConciergeBot" |

Why redirect to the bot vs. View's personal Telegram:
- 24/7 instant acknowledgement (View can sleep)
- Auto language detection (no awkward "do you speak English?")
- One inbox for View (admin group)
- Track every inquiry in Firestore `conciergeChats` collection

---

## 4. Architecture & limits

### Files

```
functions/src/telegram-concierge-bot/
├── client.ts       — sendMessage / copyMessage wrappers
├── greetings.ts    — 5-language welcome + ack messages
├── relay.ts        — customer→admin and admin→customer routing
└── index.ts        — Cloud Function export
```

### Firestore

`conciergeChats/{customerTelegramId}`:
```
{
  chatId: number,
  lang: "en"|"th"|"zh"|"ja"|"ko",
  languageCode: string | null,
  firstName, lastName, username,
  firstSeenAt: timestamp,
  lastMessageAt: timestamp,
  messageCount: number
}
```

### Reply-tracking mechanism

The bot embeds a `[chat:123456789]` marker at the start of every
forwarded message's caption. When View swipes-to-reply on that
message, the bot reads `reply_to_message.text`, extracts the marker,
and posts back to that customer's chat ID.

**Side effects:**
- The `[chat:123]` text is VISIBLE in the admin group. That's OK
  because the admin group is private to View.
- If a non-View admin replies to a forwarded msg, the bot still
  forwards back — no per-admin auth gate.
- If View types a NEW message in the admin group (not a reply), it's
  ignored — won't accidentally broadcast.

### Limitations

- **Stickers / voice / photos:** forwarded via `copyMessage`, so they
  carry through to admin · but the language detection is based on
  Telegram profile, not message content
- **Long DMs > 4000 chars:** truncated by `sendMessage`
- **Customer changes language mid-conversation:** bot doesn't re-detect ·
  always uses whatever was detected on `/start`. Edge case — fine for MVP.
- **Multiple admins replying simultaneously:** all replies forwarded ·
  customer may see multiple. Acceptable for SunRed scale.

---

## 5. Monitor + audit

### Firestore — see all conversations
```
Firebase Console → Firestore → conciergeChats
  → order by lastMessageAt desc
```

### Function logs
```bash
firebase functions:log --only telegramConciergeWebhook --lines 30
```

### Common failure modes
- **Bot not seeing replies in admin group:** group privacy is ON ·
  fix at @BotFather → /mybots → Bot Settings → Group Privacy → Turn off
- **403 "Forbidden: bot was blocked by the user":** customer blocked
  the bot · acceptable · stop trying
- **400 "chat not found":** customer chat_id stale (rare) · log only
- **Webhook returns 401/403:** TELEGRAM_CONCIERGE_BOT_TOKEN wrong ·
  re-set the secret

---

## 6. Rolling back

To pause the concierge bot:
```bash
TOKEN="<token>"
curl "https://api.telegram.org/bot${TOKEN}/deleteWebhook"
```

Bot stops receiving updates · DMs queue silently · re-enable by
re-running setWebhook.

To kill entirely:
```bash
firebase functions:delete telegramConciergeWebhook
```

Remove the export at the bottom of `functions/src/index.ts` and
re-deploy to clean up.

---

## 7. Next phase ideas

Not in this round but possible:

- **Saved reply templates** — admin types `/t pricing` → bot expands
  to a multi-line pricing message in customer's language
- **Service quick-buttons** — inline keyboard on welcome with "View
  services" "Book now" "Pricing" buttons
- **Stale chat alerts** — if a customer DM goes unanswered > 30 min,
  bot pings admin group again
- **Booking handoff** — if customer DM says `/book`, hand off to the
  existing BookingFlow on sunred.vip with a deep-link
- **Analytics dashboard** — `/admin/concierge` page showing inquiries/
  day, top languages, response times

---

## 🔗 Related docs

- `docs/wechat-setup.md` — why redirect WeChat → Telegram
- `docs/telegram-post-bot-setup.md` — the OTHER bot (channel posts)
- `docs/customer-acquisition.md` — strategic framing
- `CLAUDE.md` §6 — channel strategy + Telegram preference
