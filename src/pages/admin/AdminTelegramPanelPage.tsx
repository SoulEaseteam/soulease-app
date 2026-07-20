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
} from "phosphor-react";
import { doc, getDoc, setDoc, onSnapshot, deleteField, serverTimestamp } from "firebase/firestore";
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

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminSettings", "advanced"),
      (snap) => {
        const d = snap.data() as { jobChannelId?: string; jobChannelTitle?: string } | undefined;
        setJobChan(d?.jobChannelId ? { id: d.jobChannelId, title: d.jobChannelTitle } : null);
      },
      () => {},
    );
    return () => unsub();
  }, []);

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

        {/* ── Daily Digest ── */}
        <SectionCard icon={<ChatCircleText size={13} weight="bold" />} title="Daily Digest · รายงานประจำวัน">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.25 }}>
            ส่งอัตโนมัติทุกวัน 10:00 น. เข้ากลุ่ม SunRed Booking (Funnel Analytics + Bookings ย้อนหลัง 24 ชม.) —
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
            <Box sx={{ p: 1.5, borderRadius: "12px", background: `${adminColor.green}14`, border: `1px solid ${adminColor.green}55` }}>
              <Typography sx={{ fontSize: 11.5, color: adminColor.dim, mb: 0.5 }}>
                พิมพ์ข้อความนี้หา @SunRed24hBot ในแชทส่วนตัว · ใช้ได้ครั้งเดียว หมดอายุใน 1 ชม.
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: adminColor.text }}>/linkadmin {adminCode}</Typography>
            </Box>
          )}
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
