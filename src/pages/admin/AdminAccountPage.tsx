// src/pages/admin/AdminAccountPage.tsx
//
// 🆕 Round 28x.2 (founder: "admin ไม่มี Settings ของตัวเอง หรอ ว่าเป็นใคร") — the
//   back office had no account page at all.
//
//   What existed before:
//     • "Settings" in the avatar menu → /admin/advanced-settings, which is the
//       SYSTEM config (maintenance mode, booking windows). Nothing personal.
//     • "My Profile" → /profile, the CUSTOMER page. An admin clicking it landed
//       on the guest's booking-history screen.
//     • Her identity appeared only as a small email line at the bottom of the drawer.
//
//   So: who am I, what can I do, and how do I change my password — in one place.
//
// Deliberately NOT here: role editing. Admin rights are granted by the existence
// of an /admins/{uid} doc, which firestore.rules makes admin-only to write. A
// "make me admin" control on a page you can only reach BY being an admin would be
// theatre; a page that let an admin demote themselves would be a footgun.

import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { toast } from "react-toastify";
import { Crown, SignOut, Key, ShieldCheck, Clock, Phone } from "phosphor-react";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { adminColor, adminFont, adminFieldSx, adminPanelSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";
import { isAliasEmail } from "@/utils/loginId";
import { useAdminIdentity } from "@/hooks/useAdminIdentity";

const SANS = adminFont.sans;

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, py: 1 }}>
    <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>{label}</Typography>
    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: adminColor.text, textAlign: "right", wordBreak: "break-all" }}>
      {value}
    </Typography>
  </Box>
);

const AdminAccountPage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // 🆕 28x.3 (founder: "เบอร์โทรแอดมินละ จะระบุได้ไง ใครจอง")
  const { phone, saving: phoneSaving, savePhone } = useAdminIdentity();
  const [phoneDraft, setPhoneDraft] = useState("");
  useEffect(() => { setPhoneDraft(phone ?? ""); }, [phone]);

  const doSavePhone = async () => {
    const ok = await savePhone(phoneDraft);
    if (ok) toast.success("บันทึกเบอร์แล้ว · ออเดอร์ที่คุณเปิดจะติดเบอร์นี้");
    else toast.error("เบอร์ไม่ถูกต้อง");
  };

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const created = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
  const lastLogin = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;
  const fmt = (d: Date | null) =>
    d ? d.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  // A phone/username signup has no real inbox behind it (28w.81), so "email me a
  // reset link" would silently go nowhere. Offer it only when the address is real.
  const canEmailReset = !isAliasEmail(user.email);

  const changePassword = async () => {
    if (!current || !next || !confirm) { toast.warning("กรอกให้ครบทุกช่อง"); return; }
    if (next.length < 8) { toast.error("รหัสผ่านใหม่ต้องอย่างน้อย 8 ตัวอักษร"); return; }
    if (next !== confirm) { toast.error("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    if (next === current) { toast.error("รหัสผ่านใหม่ต้องไม่ซ้ำกับของเดิม"); return; }
    if (!user.email) { toast.error("บัญชีนี้ไม่มีอีเมล เปลี่ยนรหัสผ่านที่นี่ไม่ได้"); return; }

    setSaving(true);
    try {
      // Firebase requires a RECENT login to change a password. Re-authenticating
      // with the current password both satisfies that and proves the person at the
      // keyboard is the account owner — not someone who walked up to an open laptop.
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, next);
      void logAdminAction("admin.password_change", { uid: user.uid });
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("เปลี่ยนรหัสผ่านแล้ว");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      toast.error(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "รหัสผ่านปัจจุบันไม่ถูกต้อง"
          : code === "auth/too-many-requests"
            ? "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่"
            : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  };

  const emailReset = async () => {
    if (!user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`ส่งลิงก์รีเซตไปที่ ${user.email} แล้ว`);
    } catch {
      toast.error("ส่งอีเมลไม่สำเร็จ");
    }
  };

  const doSignOut = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>
        My Account
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim, mt: 0.4, mb: 2.5 }}>
        บัญชีของฉัน · ใครกำลังใช้งานอยู่ · เปลี่ยนรหัสผ่าน
      </Typography>

      {/* Who am I */}
      <Box sx={{ ...adminPanelSx, p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
              background: `${adminColor.accent}1F`, color: adminColor.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: SANS, fontSize: 19, fontWeight: 800,
            }}
          >
            {(user.email?.[0] ?? "?").toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: adminColor.text, wordBreak: "break-all" }}>
              {user.displayName || user.email}
            </Typography>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.4, px: 1, py: "2px", borderRadius: 999, background: `${adminColor.accent}14`, border: `1px solid ${adminColor.accent}44` }}>
              <Crown size={12} weight="fill" color={adminColor.accent} />
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {role ?? "—"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ borderTop: `1px solid ${adminColor.line}`, pt: 0.5 }}>
          <Row label="อีเมล" value={user.email ?? "—"} />
          <Row label="สมัครเมื่อ" value={fmt(created)} />
          <Row label="เข้าสู่ระบบล่าสุด" value={fmt(lastLogin)} />
          <Row
            label="สิทธิ์แอดมิน"
            value={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: adminColor.green }}>
                <ShieldCheck size={14} weight="fill" /> ยืนยันแล้ว
              </Box>
            }
          />
        </Box>

        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 1.25, lineHeight: 1.5 }}>
          <Clock size={11} style={{ verticalAlign: -1 }} /> สิทธิ์แอดมินมาจากรายการใน <code>admins/</code> ของฐานข้อมูล —
          แก้ที่นี่ไม่ได้โดยตั้งใจ (กันตัวเองถอดสิทธิ์ตัวเองพลาด) · เวลาปัจจุบัน{" "}
          {new Date(now).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
        </Typography>
      </Box>

      {/* 🆕 28x.3 — the admin's own phone.
          It lives on users/{uid}, NOT admins/{uid}: firestore.rules makes the
          admins collection `allow write: if false` on purpose (rights come from
          the Firebase console, never from the app), so there is nowhere on that
          doc for the client to write. users/{uid} already whitelists `phone` for
          its owner.
          Stored via normPhone — the SAME normalised form members, blocked numbers
          and the returning-guest test key on — so an admin's number is comparable
          with everything else instead of being a lone free-text string. */}
      <Box sx={{ ...adminPanelSx, p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
          <Phone size={16} weight="duotone" color={adminColor.accent} />
          <Typography sx={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: adminColor.text }}>
            เบอร์โทรของฉัน
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, mb: 1.5, lineHeight: 1.55 }}>
          ทุกออเดอร์ที่คุณเป็นคนเปิด จะติดชื่อ + เบอร์นี้ไว้ → <b>ย้อนดูได้ว่าใครจอง</b> ·
          เบอร์คือสิ่งที่หมอนวดหรือลูกค้าโทรหาจริงตอนมีปัญหาตอนตี 2 (อีเมลใช้ไม่ได้หน้างาน)
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small" label="เบอร์โทร" placeholder="081-234-5678"
            value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)}
            sx={{ ...adminFieldSx, width: 220 }}
          />
          <Button
            variant="contained" disabled={phoneSaving || !phoneDraft.trim()}
            onClick={() => void doSavePhone()}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
              background: "linear-gradient(135deg,#D97C95,#C96F89)",
              "&.Mui-disabled": { opacity: 0.5, color: "#fff" },
            }}
          >
            {phoneSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึกเบอร์"}
          </Button>
          {!phone && (
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.amber }}>
              ⚠️ ยังไม่ได้ตั้งเบอร์ — ออเดอร์ที่เปิดจะไม่มีเบอร์ติดไป
            </Typography>
          )}
        </Box>
      </Box>

      {/* Password */}
      <Box sx={{ ...adminPanelSx, p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
          <Key size={16} weight="duotone" color={adminColor.accent} />
          <Typography sx={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: adminColor.text }}>
            เปลี่ยนรหัสผ่าน
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, mb: 1.5 }}>
          ต้องใส่รหัสผ่านปัจจุบันเพื่อยืนยันตัวตน (Firebase บังคับ และกันคนอื่นมาแก้ตอนเปิดจอทิ้งไว้)
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <TextField
            type="password" size="small" label="รหัสผ่านปัจจุบัน" autoComplete="current-password"
            value={current} onChange={(e) => setCurrent(e.target.value)} sx={adminFieldSx}
          />
          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
            <TextField
              type="password" size="small" label="รหัสผ่านใหม่" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)}
              sx={{ ...adminFieldSx, flex: 1, minWidth: 160 }}
            />
            <TextField
              type="password" size="small" label="ยืนยันรหัสผ่านใหม่" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              sx={{ ...adminFieldSx, flex: 1, minWidth: 160 }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.25, mt: 1.75, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            variant="contained" disabled={saving} onClick={() => void changePassword()}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
              background: "linear-gradient(135deg,#D97C95,#C96F89)",
              "&.Mui-disabled": { opacity: 0.5, color: "#fff" },
            }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึกรหัสผ่านใหม่"}
          </Button>
          {canEmailReset && (
            <Button
              variant="text" onClick={() => void emailReset()}
              sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, color: adminColor.muted }}
            >
              ลืมรหัสผ่าน? ส่งลิงก์ไปที่อีเมล
            </Button>
          )}
        </Box>
      </Box>

      {/* Sign out */}
      <Box sx={{ ...adminPanelSx, p: 2 }}>
        <Button
          variant="outlined" onClick={() => void doSignOut()}
          startIcon={<SignOut size={16} weight="bold" />}
          sx={{
            textTransform: "none", fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
            color: adminColor.red, borderColor: `${adminColor.red}55`,
            "&:hover": { borderColor: adminColor.red, background: `${adminColor.red}0D` },
          }}
        >
          ออกจากระบบ
        </Button>
      </Box>
    </Box>
  );
};

export default AdminAccountPage;
