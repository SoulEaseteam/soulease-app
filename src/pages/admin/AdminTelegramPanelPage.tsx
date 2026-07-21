// src/pages/admin/AdminTelegramPanelPage.tsx
//
// 🆕 Round 28x.88 (founder: "สร้างเมนูใน หลังบ้านแอดมิน ว่า SunRed bot ...
//   ตอนนี้ให้สร้างเมนูแยก Telegram bot แล้วเอาทุกอย่างที่เชื่อมต่อเกี่ยวกับ
//   Telegram ไป Settings หน้านั้น ตามหมวดหมู่") — this page used to be just
//   the 3-promo-post panel (28s224). It's now the single home for every
//   Telegram control that used to be scattered across AdminTherapistsPage
//   (sync/job-channel-code/admin-link-code) and AdminAdvancedSettingsPage
//   (the Enable Telegram Notifications toggle), organized into sections:
//     1. Notifications  — master on/off switch for real alerts
//     2. Daily Digest   — editable header/footer for dailyAdminDigest
//     3. Dispatch Bot   — @SunRed24hBot: sync, job board, admin order-intake
//     4. Promo Bot      — @SunRedPostBot: manual channel posts
//   Reachable from the sidebar under the new "SunRed Bot" group, alongside
//   LINE OA Bot / WhatsApp Bot placeholders (neither has a real
//   integration yet — see AdminBotComingSoonPage.tsx).

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  BellRinging,
  ChatCircleText,
  Broadcast,
  PaperPlaneTilt,
  FloppyDisk,
  Newspaper,
  BookOpen,
} from "phosphor-react";
import { doc, getDoc, setDoc, onSnapshot, deleteField, arrayRemove, serverTimestamp } from "firebase/firestore";
import { app, db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "./therapistFormKit";
import {
  postToChannel,
  channelForLang,
  type PostKind,
  type PostLang,
} from "@/utils/telegramPostBot";

const SANS = adminFont.sans;

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: adminColor.accent },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: adminColor.accent },
} as const;

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: "8px" }}>{children}</Box>
);

const LiveBadge: React.FC = () => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.green, background: `${adminColor.green}1A`, borderRadius: "6px", px: "8px", py: "3px" }}>
    Live · ใช้งานจริง
  </Box>
);

// 🆕 Round 28x.95 (founder: "ทำไมไม่เอาไปโชว์จริง ใน Telegram Bot หน้าแอดมิน
//   หลังบ้าน") — raw-text block, tags left literal (exactly the payload
//   sent to Telegram's sendMessage).
// 🆕 Round 28x.97 (founder: "สนใจ" — self-service edit, no code/redeploy
//   per change) — now an editable TextField + its own Save button, writing
//   straight to Firestore botCopy/{docId}.{field}.{lang}. The bots read the
//   SAME doc first (functions/src/botCopyStore.ts) before falling back to
//   the hardcoded code default, so a save here takes effect on the very
//   next message the bot sends — no deploy needed.
// Keyed by the caller as `${docId}-${field}-${lang}` so switching language
// remounts this with a fresh draft (an unsaved edit in one language is
// discarded when you switch away — mirrors every other per-language editor
// in this app, e.g. BiosEditor).
const EditableMsgBlock: React.FC<{
  label: string;
  docId: string;
  field: string;
  lang: PostLang;
  value: string;
  onSaved: (docId: string, field: string, lang: PostLang, value: string) => void;
}> = ({ label, docId, field, lang, value, onSaved }) => {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== value;

  const save = async () => {
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await setDoc(
        doc(db, "botCopy", docId),
        { [field]: { [lang]: trimmed }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setDraft(trimmed);
      onSaved(docId, field, lang, trimmed);
    } catch (e) {
      console.error("[bot-copy] save failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "4px", gap: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </Typography>
        <Button
          size="small" disabled={!dirty || saving} onClick={() => void save()}
          startIcon={saving ? <CircularProgress size={11} /> : <FloppyDisk size={11} weight="bold" />}
          sx={{ minWidth: "auto", fontSize: 11, fontWeight: 700, textTransform: "none", color: dirty ? adminColor.accent : adminColor.dim, px: "6px", py: "2px" }}
        >
          บันทึก
        </Button>
      </Box>
      <TextField
        fullWidth multiline minRows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
        sx={{
          ...fieldSx,
          "& .MuiOutlinedInput-root": { ...fieldSx["& .MuiOutlinedInput-root"], fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, lineHeight: 1.55 },
        }}
      />
    </Box>
  );
};

/** Read-only variant — used for the composed "ตัวอย่างเต็ม" preview, which
 *  is never itself editable (it's header+body+footer+reserve joined). */
const MsgPreview: React.FC<{ label: string; children: string }> = ({ label, children }) => (
  <Box sx={{ mb: 1.25 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: adminColor.dim, mb: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label}
    </Typography>
    <Box sx={{ background: adminColor.panel3, border: `1px solid ${adminColor.line}`, borderRadius: "10px", p: "10px 12px" }}>
      <Typography sx={{ fontSize: 12, color: adminColor.muted, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Box>
  </Box>
);

const subheaderSx = {
  fontSize: 12.5, fontWeight: 800, color: adminColor.text, mb: "8px", pb: "6px",
  borderBottom: `1px solid ${adminColor.line}`,
} as const;

const FAQ_LABEL_TH: Record<string, string> = {
  pricing: "ราคา", services: "บริการ", areas: "พื้นที่บริการ", howto: "วิธีจอง", membership: "สมาชิก",
};
const DAY_LABEL_TH: Record<string, string> = {
  mon: "จันทร์", tue: "อังคาร", wed: "พุธ", thu: "พฤหัสบดี", fri: "ศุกร์", sat: "เสาร์", sun: "อาทิตย์",
};
const HOLIDAY_LABEL_TH: Record<string, string> = {
  valentine: "วาเลนไทน์ · 13-14 ก.พ.", songkran: "สงกรานต์ · 12-16 เม.ย.",
  halloween: "ฮาโลวีน · 30-31 ต.ค.", christmas: "คริสต์มาส · 23-26 ธ.ค.", newyear: "ปีใหม่ · 30 ธ.ค.-2 ม.ค.",
};

interface BotCopyPreview {
  greeter: {
    welcome: Record<PostLang, string>;
    button: Record<PostLang, string>;
    nudge: Record<PostLang, string>;
    faq: { key: string; title: Record<PostLang, string>; body: Record<PostLang, string> }[];
  };
  promo: {
    footer: Record<PostLang, string>;
    days: { day: string; body: Record<PostLang, string>; preview: Record<PostLang, string> }[];
    holidays: { key: string; body: Record<PostLang, string>; preview: Record<PostLang, string> }[];
  };
}

const PROMO_KINDS: { value: PostKind; label: string; sub: string; time: string }[] = [
  { value: "evening", label: "Evening Opening · เย็นนี้", sub: "Warm-up / planning hour · เปิดบริการเย็นนี้", time: "Auto 18:00 BKK" },
  { value: "prime", label: "Prime Time · คืนนี้", sub: "Peak open / call-to-action · เปิดอย่างเป็นทางการ", time: "Auto 22:00 BKK" },
  { value: "late", label: "Late Night · ดึก", sub: "Still-open / last-call · ยังเปิดอยู่ดึก", time: "Auto 01:00 BKK" },
];
const LANG_OPTIONS: { value: PostLang; label: string }[] = [
  { value: "en", label: "EN" }, { value: "th", label: "TH" }, { value: "zh", label: "ZH" }, { value: "ja", label: "JA" }, { value: "ko", label: "KO" },
];

const AdminTelegramPanelPage: React.FC = () => {
  // ── shared toast ──────────────────────────────────────────────
  const [toastState, setToastState] = useState<{ open: boolean; severity: "success" | "error"; message: string }>(
    { open: false, severity: "success", message: "" },
  );
  const notify = (severity: "success" | "error", message: string) => setToastState({ open: true, severity, message });

  // ── 1. Notifications (adminSettings/advanced.telegramEnabled) ──
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  useEffect(() => {
    void (async () => {
      const snap = await getDoc(doc(db, "adminSettings", "advanced"));
      if (snap.exists() && typeof snap.data().telegramEnabled === "boolean") {
        setTelegramEnabled(snap.data().telegramEnabled);
      }
    })();
  }, []);
  const saveTelegramEnabled = async (checked: boolean) => {
    setTelegramEnabled(checked);
    try {
      await setDoc(doc(db, "adminSettings", "advanced"), { telegramEnabled: checked, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error("[telegram-bot] toggle failed", e);
      notify("error", "บันทึกไม่สำเร็จ");
      setTelegramEnabled(!checked);
    }
  };

  // ── 1b. Bot Copy library — live template preview (all 3 bots) ──
  const [botCopy, setBotCopy] = useState<BotCopyPreview | null>(null);
  const [botCopyLoading, setBotCopyLoading] = useState(true);
  const [botCopyError, setBotCopyError] = useState(false);
  const [contentLang, setContentLang] = useState<PostLang>("th");
  useEffect(() => {
    void (async () => {
      try {
        const fn = httpsCallable<Record<string, never>, BotCopyPreview>(
          getFunctions(app, "asia-southeast1"), "getTelegramBotCopyPreview",
        );
        const res = await fn({});
        setBotCopy(res.data);
      } catch (e) {
        console.error("[telegram-bot] copy preview failed", e);
        setBotCopyError(true);
      } finally {
        setBotCopyLoading(false);
      }
    })();
  }, []);

  // 🆕 Round 28x.97 — patch local state after a successful field save so
  // the panel reflects the edit immediately without a full reload. Promo
  // day/holiday `preview` fields are NOT recomputed here (that's a server-
  // side composed string) — they go stale until the next reload, which is
  // cosmetic only; the stored `body` (what the bot actually reads) is
  // always correct right after save.
  const handleBotCopySaved = (docId: string, field: string, lang: PostLang, value: string) => {
    setBotCopy((prev) => {
      if (!prev) return prev;
      const next: BotCopyPreview = structuredClone(prev);
      if (docId === "greeter" && (field === "welcome" || field === "button" || field === "nudge")) {
        next.greeter[field][lang] = value;
      } else if (docId.startsWith("faq_") && field === "body") {
        const key = docId.slice(4);
        const entry = next.greeter.faq.find((f) => f.key === key);
        if (entry) entry.body[lang] = value;
      } else if (docId === "promo_footer" && field === "text") {
        next.promo.footer[lang] = value;
      } else if (docId.startsWith("promo_") && field === "body") {
        const key = docId.slice(6);
        const day = next.promo.days.find((d) => d.day === key);
        if (day) day.body[lang] = value;
        const holiday = next.promo.holidays.find((h) => h.key === key);
        if (holiday) holiday.body[lang] = value;
      }
      return next;
    });
  };

  // ── 2. Daily Digest header/footer (adminSettings/telegramBot) ──
  const DEFAULT_DIGEST_HEADER = "📊 รายงานประจำวัน · SunRed";
  const [digestHeader, setDigestHeader] = useState(DEFAULT_DIGEST_HEADER);
  const [digestFooter, setDigestFooter] = useState("");
  const [digestSaving, setDigestSaving] = useState(false);
  useEffect(() => {
    void (async () => {
      const snap = await getDoc(doc(db, "adminSettings", "telegramBot"));
      const d = snap.data();
      if (d?.dailyDigestHeader) setDigestHeader(d.dailyDigestHeader as string);
      if (d?.dailyDigestFooter) setDigestFooter(d.dailyDigestFooter as string);
    })();
  }, []);
  const saveDigestCopy = async () => {
    setDigestSaving(true);
    try {
      await setDoc(
        doc(db, "adminSettings", "telegramBot"),
        {
          dailyDigestHeader: digestHeader.trim() || DEFAULT_DIGEST_HEADER,
          dailyDigestFooter: digestFooter.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      notify("success", "บันทึกข้อความรายงานแล้ว · มีผลตั้งแต่รอบถัดไป");
    } catch (e) {
      console.error("[telegram-bot] digest copy save failed", e);
      notify("error", "บันทึกไม่สำเร็จ");
    } finally {
      setDigestSaving(false);
    }
  };

  // ── 3. Dispatch bot (@SunRed24hBot) ─────────────────────────────
  const [backfilling, setBackfilling] = useState(false);
  const [chanCoding, setChanCoding] = useState(false);
  const [chanCode, setChanCode] = useState<string | null>(null);
  const [adminCoding, setAdminCoding] = useState(false);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [jobChan, setJobChan] = useState<{ id?: string; title?: string } | null>(null);
  // 🆕 28x.89 (founder: "ก็ต้องมีสิ่งที่ทำไว้แล้วด้วยสิ งั้นเราจะรู้ได้ไง ว่า
  //   แก้หรือลบอันไหน") — "รหัสเชื่อมแอดมิน" only ever showed a freshly-minted
  //   code, never who's actually linked. This is the one Telegram control
  //   in the whole page with genuinely no "what's already set up" view.
  const [adminChatIds, setAdminChatIds] = useState<string[]>([]);
  // 🆕 28x.94 — second destination for everything that isn't the raw new-
  //   booking announcement (digest, review alerts, dispatch status chatter).
  const [reportChanCoding, setReportChanCoding] = useState(false);
  const [reportChanCode, setReportChanCode] = useState<string | null>(null);
  const [reportChan, setReportChan] = useState<{ id?: string; title?: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminSettings", "advanced"),
      (snap) => {
        const d = snap.data() as {
          jobChannelId?: string;
          jobChannelTitle?: string;
          adminTelegramChatIds?: string[];
          reportChatId?: string;
          reportChannelTitle?: string;
        } | undefined;
        setJobChan(d?.jobChannelId ? { id: d.jobChannelId, title: d.jobChannelTitle } : null);
        setAdminChatIds(d?.adminTelegramChatIds ?? []);
        setReportChan(d?.reportChatId ? { id: d.reportChatId, title: d.reportChannelTitle } : null);
      },
      () => {},
    );
    return () => unsub();
  }, []);

  const clearReportChannel = async () => {
    try {
      await setDoc(
        doc(db, "adminSettings", "advanced"),
        { reportChatId: deleteField(), reportChannelTitle: deleteField() },
        { merge: true },
      );
      notify("success", "ล้างช่อง Report แล้ว · รายงานจะกลับไปเข้ากลุ่ม SunRed Booking จนกว่าจะตั้งใหม่");
    } catch (e) {
      console.error("[telegram-bot] clear report channel failed", e);
      notify("error", "ล้างไม่สำเร็จ");
    }
  };
  const makeReportChannelCode = async () => {
    setReportChanCoding(true);
    try {
      const fn = httpsCallable<Record<string, never>, { ok: boolean; code: string }>(
        getFunctions(app, "asia-southeast1"), "createReportChannelCode",
      );
      const res = await fn({});
      setReportChanCode(res.data.code);
    } catch (e) {
      console.error("[telegram-bot] report channel code failed", e);
      notify("error", "สร้างรหัสไม่สำเร็จ");
    } finally {
      setReportChanCoding(false);
    }
  };

  const removeAdminChatId = async (chatId: string) => {
    try {
      await setDoc(
        doc(db, "adminSettings", "advanced"),
        { adminTelegramChatIds: arrayRemove(chatId) },
        { merge: true },
      );
      notify("success", `เอา ${chatId} ออกจากแอดมินที่โยนออเดอร์ได้แล้ว`);
    } catch (e) {
      console.error("[telegram-bot] remove admin chat id failed", e);
      notify("error", "ลบไม่สำเร็จ");
    }
  };

  const clearJobChannel = async () => {
    try {
      await setDoc(
        doc(db, "adminSettings", "advanced"),
        { jobChannelId: deleteField(), jobChannelTitle: deleteField() },
        { merge: true },
      );
      notify("success", "ล้างช่องงานแล้ว · งานว่างจะไม่ถูกโพสต์ที่ไหนจนกว่าจะตั้งใหม่");
    } catch (e) {
      console.error("[telegram-bot] clear job channel failed", e);
      notify("error", "ล้างไม่สำเร็จ");
    }
  };
  const makeChannelCode = async () => {
    setChanCoding(true);
    try {
      const fn = httpsCallable<Record<string, never>, { ok: boolean; code: string }>(
        getFunctions(app, "asia-southeast1"), "createJobChannelCode",
      );
      const res = await fn({});
      setChanCode(res.data.code);
    } catch (e) {
      console.error("[telegram-bot] channel code failed", e);
      notify("error", "สร้างรหัสไม่สำเร็จ");
    } finally {
      setChanCoding(false);
    }
  };
  const makeAdminCode = async () => {
    setAdminCoding(true);
    try {
      const fn = httpsCallable<Record<string, never>, { ok: boolean; code: string }>(
        getFunctions(app, "asia-southeast1"), "createAdminLinkCode",
      );
      const res = await fn({});
      setAdminCode(res.data.code);
    } catch (e) {
      console.error("[telegram-bot] admin link code failed", e);
      notify("error", "สร้างรหัสไม่สำเร็จ");
    } finally {
      setAdminCoding(false);
    }
  };
  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const fn = httpsCallable<
        Record<string, never>,
        { ok: boolean; stamped: number; skipped: number; therapistsWithLogin: number; therapistsTotal: number }
      >(getFunctions(app, "asia-southeast1"), "backfillTherapistUids");
      const res = await fn({});
      const d = res.data;
      notify("success", `ซิงก์แล้ว · อัปเดต ${d.stamped} ใบ · พนักงานที่มีบัญชี ${d.therapistsWithLogin}/${d.therapistsTotal} คน`);
    } catch (e) {
      console.error("[telegram-bot] backfill failed", e);
      notify("error", "ซิงก์ไม่สำเร็จ");
    } finally {
      setBackfilling(false);
    }
  };

  const outlineBtnSx = {
    textTransform: "none", fontWeight: 700, borderRadius: "11px", fontSize: 13,
    color: adminColor.text, border: `1px solid ${adminColor.line2}`,
  } as const;

  // ── 4. Promo / channel bot (@SunRedPostBot) ─────────────────────
  const [lang, setLang] = useState<PostLang>("en");
  const [sendingKind, setSendingKind] = useState<PostKind | null>(null);
  const targetChannel = useMemo(() => channelForLang(lang), [lang]);
  const handleSend = async (kind: PostKind) => {
    setSendingKind(kind);
    try {
      const res = await postToChannel({ kind, lang });
      if (res.ok) notify("success", `ส่งเข้า ${channelForLang(lang)} แล้ว · message #${res.messageId}`);
      else notify("error", "ส่งไม่สำเร็จ — เช็ค Firestore telegramPosts");
    } catch (err) {
      notify("error", `ผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSendingKind(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto", fontFamily: SANS }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5, lineHeight: 1 }}>
        Telegram Bot
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em", mb: 2.5 }}>
        SunRed Bot → Telegram · ทุกการตั้งค่าที่เกี่ยวกับ Telegram อยู่ในหน้านี้ที่เดียว
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* ── Notifications ── */}
        <SectionCard icon={<BellRinging size={13} weight="bold" />} title="Notifications · การแจ้งเตือน">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            Token เก็บใน Firebase Secret Manager (แก้ตรงนี้ไม่ได้และไม่ควรเก็บใน Firestore เพื่อความปลอดภัย) — สวิตช์นี้แค่หยุด/เปิดการส่งข้อความจริง (ออเดอร์ใหม่ / เซสชันเกินเวลา / ตะกร้าค้าง)
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Telegram Notifications</Typography>
            <Switch checked={telegramEnabled} onChange={(e) => void saveTelegramEnabled(e.target.checked)} sx={switchSx} />
          </Row>
        </SectionCard>

        {/* ── Bot Copy library ── */}
        {/* 🆕 Round 28x.95 (founder: "ช่วยโชว์ข้อความเก่าด้วยที่เคยส่งไป ...
            แล้วทำไมไม่เอาไปโชว์จริง ใน Telegram Bot หน้าแอดมินหลังบ้าน") —
            View wanted the actual live wording of all 3 bots reviewable
            right here, not on a separate one-off link. Pulled from
            getTelegramBotCopyPreview, which calls the exact same
            welcomeFor/faqEntry/renderPrimeTime functions the bots use to
            build outbound messages — never a hand-copied mirror. */}
        <SectionCard icon={<BookOpen size={13} weight="bold" />} title="Bot Copy · ข้อความบอททั้งหมด" collapsible defaultCollapsed>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.25 }}>
            เนื้อหาจริงจากโค้ด ณ ตอนนี้ — ไม่ใช่ log ประวัติ (ระบบไม่ได้เก็บข้อความที่เคยส่งจริงไว้ที่ไหนแบบคำต่อคำ ทั้ง Daily Digest และ Promo Bot) ดูตรงนี้แทนเพื่อตัดสินใจว่าจะเพิ่ม/ลบ/แก้ตรงไหน
          </Typography>

          <ToggleButtonGroup
            value={contentLang} exclusive onChange={(_, v: PostLang | null) => v && setContentLang(v)}
            sx={{
              mb: 1.75,
              "& .MuiToggleButton-root": {
                fontFamily: SANS, fontSize: 12, fontWeight: 700, textTransform: "none",
                border: `1px solid ${adminColor.line2}`, color: adminColor.text, padding: "6px 14px",
                "&.Mui-selected": { background: adminColor.accent, color: "#fff", "&:hover": { background: adminColor.accentDeep } },
              },
            }}
          >
            {LANG_OPTIONS.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>

          {botCopyLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={20} /></Box>
          )}
          {botCopyError && (
            <Typography sx={{ fontSize: 12.5, color: adminColor.red, fontWeight: 700 }}>โหลดเนื้อหาไม่สำเร็จ ลองรีเฟรชหน้านี้</Typography>
          )}

          {botCopy && (
            <Stack spacing={2.5}>
              <Typography sx={{ fontSize: 11.5, color: adminColor.accent, fontWeight: 700, background: `${adminColor.accent}14`, borderRadius: "8px", p: "8px 10px" }}>
                แก้ตรงนี้แล้วกด &ldquo;บันทึก&rdquo; มีผลทันที ไม่ต้องรอ deploy — บอทอ่านค่านี้ก่อนเสมอ ถ้าไม่เคยแก้จะใช้ค่าเดิมในโค้ด
              </Typography>

              <Box>
                <Typography sx={subheaderSx}>SunRed Greeter · @SunRedGreeterBot</Typography>
                <EditableMsgBlock
                  key={`greeter-welcome-${contentLang}`} label="ข้อความต้อนรับ"
                  docId="greeter" field="welcome" lang={contentLang}
                  value={botCopy.greeter.welcome[contentLang]} onSaved={handleBotCopySaved}
                />
                <EditableMsgBlock
                  key={`greeter-button-${contentLang}`} label="ปุ่ม"
                  docId="greeter" field="button" lang={contentLang}
                  value={botCopy.greeter.button[contentLang]} onSaved={handleBotCopySaved}
                />
                <EditableMsgBlock
                  key={`greeter-nudge-${contentLang}`} label="ข้อความเตือน ถ้าลูกค้าพิมพ์แทนกดปุ่ม"
                  docId="greeter" field="nudge" lang={contentLang}
                  value={botCopy.greeter.nudge[contentLang]} onSaved={handleBotCopySaved}
                />
                {botCopy.greeter.faq.map((f) => (
                  <EditableMsgBlock
                    key={`faq_${f.key}-body-${contentLang}`} label={`FAQ · ${FAQ_LABEL_TH[f.key] ?? f.key}`}
                    docId={`faq_${f.key}`} field="body" lang={contentLang}
                    value={f.body[contentLang]} onSaved={handleBotCopySaved}
                  />
                ))}
              </Box>

              <Box>
                <Typography sx={subheaderSx}>Daily Digest · ตัวอย่างเต็ม</Typography>
                <MsgPreview label="โครงข้อความ (ตัวเลขคำนวณสดทุกครั้ง) — แก้หัวข้อ/ท้ายข้อความได้ในการ์ด Daily Digest ด้านล่าง">
                  {`${digestHeader}\n\n[ Funnel Analytics + Bookings ย้อนหลัง 24 ชม. ]\n\n${digestFooter || "(ไม่มีข้อความท้ายรายงาน)"}`}
                </MsgPreview>
              </Box>

              <Box>
                <Typography sx={subheaderSx}>Promo Bot · ท้ายข้อความ (ทุกโพสต์)</Typography>
                <EditableMsgBlock
                  key={`promo_footer-text-${contentLang}`} label="พื้นที่บริการ + ราคาเริ่มต้น"
                  docId="promo_footer" field="text" lang={contentLang}
                  value={botCopy.promo.footer[contentLang]} onSaved={handleBotCopySaved}
                />
              </Box>

              <Box>
                <Typography sx={subheaderSx}>Promo Bot · หมุนเวียน 7 วัน</Typography>
                <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 1 }}>
                  เนื้อหาต่อวัน — หัวข้อ/ท้ายข้อความคำนวณแยกต่างหาก ไม่ต้องพิมพ์ซ้ำ ตัวอย่างเต็มด้านล่างแต่ละวัน (อาจไม่อัปเดตทันทีถ้าเพิ่งแก้ท้ายข้อความด้านบน — รีเฟรชหน้าเพื่อดูล่าสุด)
                </Typography>
                {botCopy.promo.days.map((d) => (
                  <Box key={d.day} sx={{ mb: 1.75 }}>
                    <EditableMsgBlock
                      key={`promo_${d.day}-body-${contentLang}`} label={DAY_LABEL_TH[d.day] ?? d.day}
                      docId={`promo_${d.day}`} field="body" lang={contentLang}
                      value={d.body[contentLang]} onSaved={handleBotCopySaved}
                    />
                    <MsgPreview label="ตัวอย่างเต็ม (ช่วง Prime Time)">{d.preview[contentLang]}</MsgPreview>
                  </Box>
                ))}
              </Box>

              <Box>
                <Typography sx={subheaderSx}>Promo Bot · ธีมวันสำคัญ</Typography>
                <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 1 }}>
                  แทนที่เนื้อหาประจำวันทั้งวันตามช่วงปฏิทินจริง
                </Typography>
                {botCopy.promo.holidays.map((h) => (
                  <Box key={h.key} sx={{ mb: 1.75 }}>
                    <EditableMsgBlock
                      key={`promo_${h.key}-body-${contentLang}`} label={HOLIDAY_LABEL_TH[h.key] ?? h.key}
                      docId={`promo_${h.key}`} field="body" lang={contentLang}
                      value={h.body[contentLang]} onSaved={handleBotCopySaved}
                    />
                    <MsgPreview label="ตัวอย่างเต็ม (ช่วง Prime Time)">{h.preview[contentLang]}</MsgPreview>
                  </Box>
                ))}
              </Box>
            </Stack>
          )}
        </SectionCard>

        {/* ── Daily Digest ── */}
        <SectionCard icon={<ChatCircleText size={13} weight="bold" />} title="Daily Digest · รายงานประจำวัน">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.25 }}>
            ส่งอัตโนมัติทุกวัน 10:00 น. เข้ากลุ่ม SunRed Report (Funnel Analytics + Bookings ย้อนหลัง 24 ชม.) —
            ตัวเลขคำนวณจากระบบ แก้เองไม่ได้ แต่หัวข้อ/ท้ายข้อความแก้ได้ตรงนี้
          </Typography>
          <TextField
            label="หัวข้อรายงาน" fullWidth size="small" margin="dense" sx={fieldSx}
            value={digestHeader} onChange={(e) => setDigestHeader(e.target.value)}
          />
          <TextField
            label="ข้อความท้ายรายงาน (ไม่บังคับ)" fullWidth size="small" margin="dense" multiline minRows={2} sx={fieldSx}
            value={digestFooter} onChange={(e) => setDigestFooter(e.target.value)}
            placeholder="เช่น ทักแอดมินได้ถ้ามีคำถามเกี่ยวกับรายงานนี้"
          />
          <Button
            onClick={() => void saveDigestCopy()}
            disabled={digestSaving}
            startIcon={digestSaving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <FloppyDisk size={15} weight="bold" />}
            sx={{ mt: 1, background: adminColor.accent, color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "10px", "&:hover": { background: adminColor.accentDeep } }}
          >
            บันทึกข้อความรายงาน
          </Button>
        </SectionCard>

        {/* ── Report Channel ── */}
        {/* 🆕 Round 28x.94 (founder: "ให้รายงานทุกอย่างไปไว้ SunRed Report ·
            SunRed Booking มี แค่ Booking จากลูกค้า ก็พอ") — a second group so
            SunRed Booking only ever carries the raw new-booking announcement.
            Everything else (this Daily Digest, review alerts, overdue-session
            alerts, abandoned-booking nudges, and accept/decline/claim/status
            chatter) posts here instead. Same one-time-code claim shape as the
            Dispatch Bot's job-channel setup below. */}
        <SectionCard icon={<Newspaper size={13} weight="bold" />} title="Report Channel · SunRed Report">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.25 }}>
            ปลายทางของรายงานประจำวัน / แจ้งรีวิวคะแนนต่ำ / เซสชันเกินเวลา / ตะกร้าค้าง / สถานะรับ-ไม่รับงาน — ทุกอย่างยกเว้นข้อความแจ้งออเดอร์ใหม่ (ยังเข้า SunRed Booking เหมือนเดิม)
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Button disabled={reportChanCoding} onClick={() => void makeReportChannelCode()} sx={outlineBtnSx}>
              {reportChanCoding ? <CircularProgress size={16} /> : "รหัสตั้งช่อง Report"}
            </Button>
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mb: reportChanCode ? 1.5 : 0 }}>
            <Typography sx={{ fontSize: 12, color: adminColor.dim }}>ช่อง Report ปัจจุบัน:</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: reportChan ? adminColor.green : adminColor.amber }}>
              {reportChan ? `${reportChan.title ?? "(ไม่มีชื่อ)"} · ${reportChan.id}` : "ยังไม่ได้ตั้ง — รายงานจะเข้ากลุ่ม SunRed Booking ไปก่อน"}
            </Typography>
            {reportChan && (
              <Button size="small" onClick={() => void clearReportChannel()} sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.red, px: 0.5 }}>
                ล้างค่า
              </Button>
            )}
          </Box>

          {reportChanCode && (
            <Box sx={{ mt: 1.25, p: 1.5, borderRadius: "12px", background: `${adminColor.green}14`, border: `1px solid ${adminColor.green}55` }}>
              <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 0.5 }}>
                พิมพ์ข้อความนี้ในกลุ่ม SunRed Report · ใช้ได้ครั้งเดียว หมดอายุใน 1 ชม.
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: adminColor.text }}>/setreportchannel {reportChanCode}</Typography>
            </Box>
          )}
        </SectionCard>

        {/* ── Dispatch Bot ── */}
        <SectionCard icon={<Broadcast size={13} weight="bold" />} title="Dispatch Bot · @SunRed24hBot">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.25 }}>
            แจ้งงานใหม่ / รับ-ไม่รับงาน / แกะออเดอร์จากแชทลูกค้า — ที่เชื่อม Telegram Chat ID รายคนของหมอนวด ยังทำที่หน้าโปรไฟล์หมอนวดแต่ละคนตามเดิม (เป็นข้อมูลของหมอนวด ไม่ใช่การตั้งค่าบอท)
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Button disabled={backfilling} onClick={() => void runBackfill()} sx={outlineBtnSx}>
              {backfilling ? <CircularProgress size={16} /> : "ซิงก์สิทธิ์งานพนักงาน"}
            </Button>
            <Button disabled={chanCoding} onClick={() => void makeChannelCode()} sx={outlineBtnSx}>
              {chanCoding ? <CircularProgress size={16} /> : "รหัสตั้งช่องงาน"}
            </Button>
            <Button disabled={adminCoding} onClick={() => void makeAdminCode()} sx={outlineBtnSx}>
              {adminCoding ? <CircularProgress size={16} /> : "รหัสเชื่อมแอดมิน (โยนออเดอร์)"}
            </Button>
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mb: chanCode || adminCode ? 1.5 : 0 }}>
            <Typography sx={{ fontSize: 12, color: adminColor.dim }}>ช่องงานปัจจุบัน:</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: jobChan ? adminColor.green : adminColor.amber }}>
              {jobChan ? `${jobChan.title ?? "(ไม่มีชื่อ)"} · ${jobChan.id}` : "ยังไม่ได้ตั้ง — งานว่างจะไม่ถูกโพสต์ที่ไหน"}
            </Typography>
            {jobChan && (
              <Button size="small" onClick={() => void clearJobChannel()} sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, color: adminColor.red, px: 0.5 }}>
                ล้างค่า
              </Button>
            )}
          </Box>

          {chanCode && (
            <Box sx={{ mb: 1.25, p: 1.5, borderRadius: "12px", background: `${adminColor.green}14`, border: `1px solid ${adminColor.green}55` }}>
              <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 0.5 }}>
                พิมพ์ข้อความนี้ในกลุ่ม/ช่องงาน · ใช้ได้ครั้งเดียว หมดอายุใน 1 ชม.
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: adminColor.text }}>/setjobchannel {chanCode}</Typography>
            </Box>
          )}
          {adminCode && (
            <Box sx={{ mb: 1.25, p: 1.5, borderRadius: "12px", background: `${adminColor.green}14`, border: `1px solid ${adminColor.green}55` }}>
              <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 0.5 }}>
                พิมพ์ข้อความนี้หา @SunRed24hBot ในแชทส่วนตัว · ใช้ได้ครั้งเดียว หมดอายุใน 1 ชม.
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: adminColor.text }}>/linkadmin {adminCode}</Typography>
            </Box>
          )}

          {/* 🆕 28x.89 — who's actually linked to paste orders right now. */}
          <Box sx={{ pt: 0.5, borderTop: `1px solid ${adminColor.line}` }}>
            <Typography sx={{ fontSize: 12, color: adminColor.dim, mt: 1, mb: 0.75 }}>
              แอดมินที่โยนออเดอร์ได้ตอนนี้:
            </Typography>
            {adminChatIds.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: adminColor.amber, fontWeight: 700 }}>
                ยังไม่มีใครเชื่อม — กด &ldquo;รหัสเชื่อมแอดมิน&rdquo; ด้านบนแล้วส่งรหัสให้ @SunRed24hBot
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {adminChatIds.map((id) => (
                  <Box
                    key={id}
                    sx={{
                      display: "flex", alignItems: "center", gap: 0.75,
                      background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
                      borderRadius: "9px", pl: 1.25, pr: 0.5, py: 0.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: adminColor.text }}>{id}</Typography>
                    <Button
                      size="small"
                      onClick={() => void removeAdminChatId(id)}
                      sx={{ minWidth: "auto", p: "2px 6px", fontSize: 11, fontWeight: 700, textTransform: "none", color: adminColor.red }}
                    >
                      ลบ
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </SectionCard>

        {/* ── Promo / Channel Bot ── */}
        <SectionCard icon={<PaperPlaneTilt size={13} weight="bold" />} title="Promo Bot · @SunRedPostBot">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5 }}>
            3 โพสต์โปรโมชั่นระดับแบรนด์เข้าช่อง marketing · auto-post ทุกวัน 18:00 / 22:00 / 01:00 BKK · ปุ่มด้านล่าง = ส่ง manual แบบเลือกภาษา/ช่องเอง
          </Typography>

          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mb: 0.75 }}>
            Language → ส่งเข้า {targetChannel}
          </Typography>
          <ToggleButtonGroup
            value={lang} exclusive onChange={(_, v: PostLang | null) => v && setLang(v)}
            sx={{
              mb: 1.5,
              "& .MuiToggleButton-root": {
                fontFamily: SANS, fontSize: 12, fontWeight: 700, textTransform: "none",
                border: `1px solid ${adminColor.line2}`, color: adminColor.text, padding: "6px 14px",
                "&.Mui-selected": { background: adminColor.accent, color: "#fff", "&:hover": { background: adminColor.accentDeep } },
              },
            }}
          >
            {LANG_OPTIONS.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>

          <Stack spacing={1.25}>
            {PROMO_KINDS.map((kind) => (
              <Box
                key={kind.value}
                sx={{
                  background: adminColor.panel, borderRadius: "13px", border: `1px solid ${adminColor.line}`,
                  p: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: adminColor.text, lineHeight: 1.2 }}>{kind.label}</Typography>
                  <Typography sx={{ fontSize: 12, color: adminColor.muted, mt: "2px" }}>{kind.sub}</Typography>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.accent, mt: "4px" }}>{kind.time}</Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={sendingKind === kind.value ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <PaperPlaneTilt size={15} weight="bold" />}
                  onClick={() => void handleSend(kind.value)}
                  disabled={sendingKind !== null}
                  sx={{ background: adminColor.accent, fontWeight: 700, textTransform: "none", "&:hover": { background: adminColor.accentDeep } }}
                >
                  Send now
                </Button>
              </Box>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      <Snackbar open={toastState.open} autoHideDuration={4500} onClose={() => setToastState((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toastState.severity} variant="filled" onClose={() => setToastState((t) => ({ ...t, open: false }))}>
          {toastState.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminTelegramPanelPage;
