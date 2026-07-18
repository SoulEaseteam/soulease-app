// src/pages/admin/AddTherapistPage.tsx
//
// 🆕 Round 28s282 (founder: "Add New Therapist (ULTRA) ปรับแก้ให้ตามดีเทล
// ทั้งหมด และดีไซน์สวย") — rebuilt to mirror AdminTherapistDetailPage's
// edit form field-for-field, sharing the same building blocks via
// therapistFormKit so the Add + Edit screens stay identical and can't
// drift. Creates a new therapists/{id} document.
import React, { useState } from "react";
import { Box, Typography, TextField, MenuItem, Button, Snackbar, Alert } from "@mui/material";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { logAdminAction } from "@/utils/auditLog";
import { adminColor, adminFont } from "@/theme/adminTheme";
import type { Credential, LanguageSkill } from "@/types/therapist";
import {
  ArrowLeft, FloppyDisk, X, Sparkle, Clock, MapPinLine, UserFocus, Globe,
  Info, Notebook, Image as ImageIcon, EyeSlash, TelegramLogo, Umbrella, Prohibit, IdentificationCard, Bank,
} from "phosphor-react";
import {
  SectionCard, LocationPicker, FeaturesEditor, LanguagesEditor, ServicesEditor,
  CredentialsEditor, BiosEditor, GalleryEditor, TogglePill, AvatarUploader, fieldSx, selectMenuProps,
} from "./therapistFormKit";

const badgeOptions = ["", "VIP", "HOT", "NEW"] as const;

interface AddForm {
  id: string;
  name: string;
  email: string;
  telegramChatId: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  image: string;
  specialty: string;
  badge: string;
  startTime: string;
  endTime: string;
  statusOverride: "Auto" | "available" | "bookable" | "resting";
  isHoliday: boolean;
  area: string;
  homeAddress: string;
  currentLocation: string;
  features: Record<string, string>;
  languageSkills: LanguageSkill[];
  servicesAvailable: string[];
  credentials: Credential[];
  gallery: string[];
  bios: Record<string, string>;
  hidden: boolean;
  blocked: boolean;
}

const EMPTY: AddForm = {
  id: "", name: "", email: "", telegramChatId: "", bankName: "", bankAccount: "", bankAccountName: "", image: "", specialty: "", badge: "",
  startTime: "10:00", endTime: "04:00", statusOverride: "Auto", isHoliday: false,
  area: "", homeAddress: "", currentLocation: "", features: {}, languageSkills: [],
  servicesAvailable: [], credentials: [], gallery: [], bios: {}, hidden: false, blocked: false,
};

const slugify = (s: string) => s.trim().replace(/[^\w-]+/g, "").replace(/^-|-$/g, "");

const AddTherapistPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<AddForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ msg: string; sev: "error" | "success" } | null>(null);

  const set = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const id = slugify(form.id);
    if (!id) { setSnackbar({ msg: "ต้องใส่ ID (สำหรับ URL) ก่อน", sev: "error" }); return; }
    if (!form.name.trim()) { setSnackbar({ msg: "ต้องใส่ชื่อหมอนวด", sev: "error" }); return; }

    setSaving(true);
    try {
      const ref = doc(db, "therapists", id);
      if ((await getDoc(ref)).exists()) {
        setSnackbar({ msg: `ID "${id}" มีอยู่แล้ว — ใช้ ID อื่น`, sev: "error" });
        setSaving(false);
        return;
      }

      // Parse "lat, lng" → {lat,lng} object, same convention as the detail page.
      let locationValue: unknown = form.currentLocation;
      if (typeof locationValue === "string" && locationValue.includes(",")) {
        const [a, b] = locationValue.split(",");
        const lat = parseFloat(a.trim()); const lng = parseFloat(b.trim());
        if (!isNaN(lat) && !isNaN(lng)) locationValue = { lat, lng };
      }

      const features: Record<string, string> = {};
      for (const [k, v] of Object.entries(form.features)) if ((v ?? "").trim()) features[k] = v.trim();
      const bios: Record<string, string> = {};
      for (const [k, v] of Object.entries(form.bios)) if ((v ?? "").trim()) bios[k] = v.trim();

      const payload = {
        id,
        name: form.name.trim(),
        email: form.email.trim(),
        telegramChatId: form.telegramChatId.trim(),
        image: form.image.trim(),
        specialty: form.specialty.trim(),
        badge: form.badge,
        startTime: form.startTime,
        endTime: form.endTime,
        statusOverride: form.statusOverride,
        overrideUntil: null,
        isHoliday: form.isHoliday,
        area: form.area.trim(),
        homeAddress: form.homeAddress.trim(),
        currentLocation: locationValue || "",
        features,
        languageSkills: form.languageSkills.filter((l) => l.code),
        servicesAvailable: form.servicesAvailable,
        credentials: form.credentials.filter((c) => (c.label ?? "").trim()),
        gallery: form.gallery.map((g) => g.trim()).filter(Boolean),
        bios,
        hidden: form.hidden,
        blocked: form.blocked,
        // creation defaults — rating/reviews are live-computed from
        // bookings (see AdminTherapistDetailPage), a new therapist starts 0.
        rating: 0,
        reviews: 0,
        todayBookings: 0,
        totalBookings: 0,
        isBooked: false,
        activeBooking: false,
        busyUntil: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(ref, payload);
      // 🆕 Round 28s314 — bank details go to the ADMIN-ONLY payoutAccounts doc,
      //   never the world-readable therapist doc. Only write if provided.
      if (form.bankName.trim() || form.bankAccount.trim() || form.bankAccountName.trim()) {
        await setDoc(doc(db, "payoutAccounts", id), {
          bankName: form.bankName.trim(),
          bankAccount: form.bankAccount.trim(),
          bankAccountName: form.bankAccountName.trim(),
          therapistName: form.name.trim(),
          updatedAt: serverTimestamp(),
        });
      }
      void logAdminAction("therapist.create", { therapistId: id, therapistName: form.name.trim() });
      setSnackbar({ msg: `เพิ่ม "${form.name.trim()}" เรียบร้อย`, sev: "success" });
      setTimeout(() => navigate(`/admin/therapists/${id}`), 900);
    } catch (err) {
      console.error("[AddTherapist]", err);
      setSnackbar({ msg: `เพิ่มไม่สำเร็จ: ${getErrorMessage(err)}`, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const locInitial = (() => {
    const p = (form.currentLocation || "").split(",").map((s) => parseFloat(s.trim()));
    return { lat: Number.isFinite(p[0]) ? p[0] : null, lng: Number.isFinite(p[1]) ? p[1] : null };
  })();

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: `radial-gradient(120% 90% at 15% 0%, ${adminColor.panel3} 0%, ${adminColor.bg} 55%)`, minHeight: "100%" }}>
      <Button
        onClick={() => navigate("/admin/therapists")}
        startIcon={<ArrowLeft size={13} weight="bold" />}
        variant="outlined"
        sx={{ borderColor: adminColor.accent, color: adminColor.accent, fontWeight: "bold", textTransform: "none", borderRadius: "10px", mb: 2.5, "&:hover": { borderColor: adminColor.accentDeep, background: adminColor.panel2 } }}
      >
        Back
      </Button>

      <Box sx={{ background: adminColor.panel, borderRadius: "20px", border: `1px solid ${adminColor.line}`, boxShadow: "0 4px 18px rgba(31,41,51,0.08)", p: { xs: 2.5, md: 3.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 700, fontSize: 24, color: adminColor.text }}>เพิ่มหมอนวดใหม่</Typography>
            <Typography sx={{ fontSize: 12.5, color: adminColor.dim, mt: "2px" }}>กรอกรายละเอียดให้ครบ · รูปอัปจากมือถือได้ · ค้นหาที่อยู่จากแผนที่จริง</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={() => void handleSave()} disabled={saving}
              startIcon={<FloppyDisk size={15} weight="bold" />}
              sx={{ background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`, color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "10px", boxShadow: "0 3px 10px rgba(78,126,140,0.32)", "&:hover": { background: adminColor.accentDeep }, "&.Mui-disabled": { color: "#fff", opacity: 0.7 } }}
            >
              {saving ? "กำลังบันทึก…" : "บันทึกหมอนวด"}
            </Button>
            <Button onClick={() => navigate("/admin/therapists")} startIcon={<X size={15} weight="bold" />} variant="outlined" sx={{ borderColor: adminColor.line2, color: adminColor.muted, textTransform: "none", fontWeight: 700, borderRadius: "10px" }}>
              Cancel
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          <SectionCard icon={<IdentificationCard size={13} />} title="ข้อมูลระบุตัวตน">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {/* 🆕 Round 28s284 — profile photo = the control (tap to upload);
                  the old Image URL text field is gone. */}
              <Box sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
                <AvatarUploader value={form.image} onChange={(url) => set("image", url)} docId={slugify(form.id)} />
              </Box>
              <TextField
                label="ID (สำหรับ URL · ห้ามซ้ำ · เช่น BarbieSunRed)" fullWidth size="small" sx={fieldSx}
                value={form.id} onChange={(e) => set("id", e.target.value)}
                helperText="ใช้เป็นลิงก์ /therapists/<ID> — ตั้งครั้งเดียว เปลี่ยนภายหลังไม่ได้ · ต้องใส่ก่อนถึงจะอัปรูปได้"
              />
              <TextField label="ชื่อ" fullWidth size="small" sx={fieldSx} value={form.name} onChange={(e) => set("name", e.target.value)} />
              <TextField label="Specialty (ความถนัด)" fullWidth size="small" sx={fieldSx} value={form.specialty} onChange={(e) => set("specialty", e.target.value)} />
              {/* 🆕 Round 28s283 — InputLabelProps shrink:true so the floating
                  "Badge" label doesn't overlap the "None" text that
                  displayEmpty renders while the value is still "". */}
              <TextField select label="Badge" fullWidth size="small" sx={fieldSx} value={form.badge} onChange={(e) => set("badge", e.target.value)} InputLabelProps={{ shrink: true }} SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}>
                {badgeOptions.map((b) => <MenuItem key={b} value={b}>{b || "None"}</MenuItem>)}
              </TextField>
            </Box>
          </SectionCard>

          <SectionCard icon={<Clock size={13} />} title="ตารางเวลาและสถานะ">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField label="Start Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
                <TextField label="End Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField select label="Status Override" fullWidth size="small" sx={fieldSx} value={form.statusOverride}
                  onChange={(e) => set("statusOverride", e.target.value as AddForm["statusOverride"])} SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}>
                  <MenuItem value="Auto">Auto</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="bookable">Bookable</MenuItem>
                  <MenuItem value="resting">Resting</MenuItem>
                </TextField>
                <TogglePill on={form.isHoliday} onClick={() => set("isHoliday", !form.isHoliday)} icon={<Umbrella size={14} weight={form.isHoliday ? "fill" : "regular"} />} label="Holiday" />
              </Box>
            </Box>
          </SectionCard>

          <SectionCard icon={<MapPinLine size={13} />} title="พื้นที่ / ที่อยู่">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <LocationPicker
                initial={locInitial}
                onPick={({ area, address, lat, lng }) => setForm((f) => ({ ...f, area: area || f.area, homeAddress: address || f.homeAddress, currentLocation: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }))}
              />
              <TextField label="พื้นที่ (เช่น Din Daeng · Ratchada)" fullWidth size="small" sx={fieldSx} value={form.area} onChange={(e) => set("area", e.target.value)} />
              <TextField label="ที่อยู่ standby (เต็ม · admin เท่านั้น)" fullWidth size="small" multiline minRows={2} sx={fieldSx} value={form.homeAddress} onChange={(e) => set("homeAddress", e.target.value)} />
              <TextField label="พิกัด (lat, lng)" fullWidth size="small" sx={fieldSx} value={form.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} />
            </Box>
          </SectionCard>

          <SectionCard icon={<UserFocus size={13} />} title="ลักษณะเฉพาะตัว">
            <FeaturesEditor value={form.features} onChange={(k, v) => setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }))} />
          </SectionCard>

          <SectionCard icon={<Globe size={13} />} title="ภาษา">
            <LanguagesEditor value={form.languageSkills} onChange={(next) => set("languageSkills", next)} />
          </SectionCard>

          <SectionCard icon={<Sparkle size={13} />} title="บริการที่ทำได้">
            <ServicesEditor value={form.servicesAvailable} onChange={(next) => set("servicesAvailable", next)} />
          </SectionCard>

          <SectionCard icon={<Info size={13} />} title="ใบรับรอง / ประวัติ">
            <CredentialsEditor value={form.credentials} onChange={(next) => set("credentials", next)} />
          </SectionCard>

          <SectionCard icon={<Notebook size={13} />} title="ประวัติแนะนำ (แต่ละภาษา)">
            <BiosEditor value={form.bios} onChange={(code, v) => setForm((f) => ({ ...f, bios: { ...f.bios, [code]: v } }))} />
          </SectionCard>

          <SectionCard icon={<ImageIcon size={13} />} title={`แกลเลอรี (${form.gallery.filter(Boolean).length})`}>
            <GalleryEditor value={form.gallery} onChange={(next) => set("gallery", next)} docId={slugify(form.id)} />
          </SectionCard>

          <SectionCard icon={<EyeSlash size={13} />} title="การมองเห็น">
            <Box sx={{ display: "flex", gap: 1 }}>
              <TogglePill on={form.hidden} onClick={() => set("hidden", !form.hidden)} icon={<EyeSlash size={14} weight={form.hidden ? "fill" : "regular"} />} label="Hide from Homepage" />
              <TogglePill on={form.blocked} onClick={() => set("blocked", !form.blocked)} icon={<Prohibit size={14} weight={form.blocked ? "fill" : "regular"} />} label="Blocked (Unavailable)" />
            </Box>
          </SectionCard>

          <SectionCard icon={<TelegramLogo size={13} />} title="ติดต่อ">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <TextField label="Email (สำหรับผูกบัญชี login หมอนวด · ไม่บังคับ)" fullWidth size="small" sx={fieldSx} value={form.email} onChange={(e) => set("email", e.target.value)} />
              <TextField
                label="Telegram Chat ID (สำหรับแจ้งงาน)" fullWidth size="small" sx={fieldSx}
                value={form.telegramChatId} onChange={(e) => set("telegramChatId", e.target.value)}
                helperText="ให้หมอนวดส่ง /myid ไปที่ @SunRed24hBot เพื่อรับรหัสนี้ · ไม่มีก็เว้นว่างได้"
                placeholder="เช่น 123456789" inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              />
            </Box>
          </SectionCard>

          {/* 🆕 Round 28s314 — bank account for the Pay-Therapists transfer flow. */}
          <SectionCard icon={<Bank size={13} />} title="บัญชีธนาคาร (สำหรับโอนเงินหมอ)">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <TextField label="ธนาคาร" fullWidth size="small" sx={fieldSx} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="เช่น กสิกรไทย · SCB · พร้อมเพย์" />
              <TextField label="เลขบัญชี / พร้อมเพย์" fullWidth size="small" sx={fieldSx} value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="เช่น 123-4-56789-0" inputProps={{ inputMode: "numeric" }} />
              <TextField label="ชื่อบัญชี" fullWidth size="small" sx={fieldSx} value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} placeholder="ชื่อ-นามสกุลเจ้าของบัญชี" />
            </Box>
          </SectionCard>
        </Box>
      </Box>

      <Snackbar open={!!snackbar} autoHideDuration={3500} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar?.sev ?? "info"} variant="filled" onClose={() => setSnackbar(null)}>{snackbar?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTherapistPage;
