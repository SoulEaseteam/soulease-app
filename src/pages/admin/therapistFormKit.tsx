// src/pages/admin/therapistFormKit.tsx
//
// 🆕 Round 28s282 — shared building blocks for the two therapist form
// surfaces (AdminTherapistDetailPage edit mode + AddTherapistPage), so the
// "Add" and "Edit" screens can't drift apart the way the two edit pages
// did before the 28s271 merge. Everything visual + every rich-field editor
// lives here once; both pages just wire their own state in.

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, TextField, MenuItem, IconButton, Button, Avatar } from "@mui/material";
import { Plus, Trash, MagnifyingGlass, UploadSimple, CircleNotch, Camera } from "phosphor-react";
import type { Credential, LanguageSkill } from "@/types/therapist";
import { adminColor, adminFont, adminFigureSx, adminFieldSx } from "@/theme/adminTheme";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import { app } from "@/lib/firebase";
import services from "@/data/services";

// ─── constants ────────────────────────────────────────────────────────
export const FEATURE_ROWS: Array<[string, string]> = [
  ["age", "อายุ"], ["gender", "เพศ"], ["ethnicity", "เชื้อชาติ"], ["height", "ส่วนสูง"],
  ["weight", "น้ำหนัก"], ["bodyType", "รูปร่าง"], ["skintone", "สีผิว"], ["bustSize", "หน้าอก"],
  ["hairColor", "สีผม"], ["hairLength", "ความยาวผม"], ["eyeColor", "สีตา"], ["tattoos", "รอยสัก"],
  ["personality", "บุคลิก"], ["vaccinated", "วัคซีน"], ["smoker", "สูบบุหรี่"],
];
export const LANG_LABEL: Record<string, string> = { en: "อังกฤษ", th: "ไทย", zh: "จีน", ja: "ญี่ปุ่น", ko: "เกาหลี" };
export const LANG_LEVEL_TH: Record<string, string> = { Native: "เจ้าของภาษา", Fluent: "คล่อง", Conversational: "พอสื่อสาร", Basic: "พื้นฐาน" };
export const LANG_CODES = ["th", "en", "zh", "ja", "ko"] as const;
export const LANG_LEVELS: LanguageSkill["level"][] = ["Native", "Fluent", "Conversational", "Basic"];
export const CRED_TYPES: Credential["type"][] = ["license", "diploma", "background", "certification"];
export const BIO_LANGS: Array<[string, string]> = [["th", "ไทย"], ["en", "อังกฤษ"], ["zh", "จีน"], ["ja", "ญี่ปุ่น"], ["ko", "เกาหลี"]];
export const SERVICE_OPTIONS = services.map((s) => ({ id: s.id, name: s.name }));

export const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.16)" } },
} as const;
// 🆕 Round 28w.79 — this used to set radius/background/size but NEVER the
//   border or input-text colour, so MUI fell back to the theme's dark-mode
//   outline `rgba(255,255,255,0.23)` — white on the white admin panel, i.e.
//   a 1.0:1 contrast border you cannot see. Every field on the 4 pages that
//   import this (Promotions, Advanced Settings, Add/Edit Therapist) rendered
//   as a borderless box. Compose the shared adminFieldSx (which pins outline,
//   text, caret + placeholder) and keep the local sizing on top.
export const fieldSx = {
  ...adminFieldSx,
  "& .MuiOutlinedInput-root": {
    ...adminFieldSx["& .MuiOutlinedInput-root"],
    background: adminColor.panel,
    fontSize: 13.5,
  },
  "& .MuiInputLabel-root": { ...adminFieldSx["& .MuiInputLabel-root"], fontSize: 13 },
} as const;
const chipDeleteBtnSx = { color: adminColor.dim, "&:hover": { background: "rgba(220,38,38,0.09)", color: adminColor.red } } as const;
const addBtnSx = { color: adminColor.accent, textTransform: "none", fontWeight: 700, fontSize: 12.5, alignSelf: "flex-start", mt: "2px" } as const;

// ─── chrome ───────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mb: "10px", color: adminColor.dim }}>
    {icon}
    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</Typography>
  </Box>
);

export const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <Box sx={{ background: adminColor.panel2, border: `1px solid ${adminColor.line}`, borderRadius: "16px", p: "16px 16px 17px" }}>
    <SectionHeader icon={icon}>{title}</SectionHeader>
    {children}
  </Box>
);

// ─── image downscale + upload ─────────────────────────────────────────
export async function downscaleImage(file: File, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

// ─── LocationPicker (map + Places search, same as booking flow) ───────
export const LocationPicker: React.FC<{
  initial: { lat: number | null; lng: number | null };
  onPick: (r: { area: string; address: string; lat: number; lng: number }) => void;
}> = ({ initial, onPick }) => {
  const { ready, loadIfNeeded } = useGoogleMaps();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const acRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => { loadIfNeeded(); }, [loadIfNeeded]);

  useEffect(() => {
    if (!ready || !mapElRef.current || mapRef.current) return;
    const G = (window as any).google?.maps;
    if (!G) return;
    const initLat = initial.lat ?? 13.7563;
    const initLng = initial.lng ?? 100.5018;
    const map = new G.Map(mapElRef.current, { center: { lat: initLat, lng: initLng }, zoom: 15, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy" });
    mapRef.current = map;

    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) { markerRef.current.setPosition({ lat, lng }); return; }
      markerRef.current = new G.Marker({ position: { lat, lng }, map });
    };
    if (initial.lat != null && initial.lng != null) placeMarker(initLat, initLng);

    const reverseGeocode = (lat: number, lng: number) => {
      const geocoder = new G.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const addr = status === "OK" && results?.length ? (results[0].formatted_address ?? "") : "";
        onPickRef.current({ area: "", address: addr, lat, lng });
      });
    };

    map.addListener("click", (e: any) => {
      const ll = e.latLng; if (!ll) return;
      const lat = ll.lat(); const lng = ll.lng();
      placeMarker(lat, lng);
      if (e.placeId) e.stop?.();
      reverseGeocode(lat, lng);
    });

    if (G.places && searchRef.current) {
      const ac = new G.places.Autocomplete(searchRef.current, { componentRestrictions: { country: "th" }, fields: ["name", "formatted_address", "geometry"] });
      acRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location; if (!loc) return;
        const lat = loc.lat(); const lng = loc.lng();
        placeMarker(lat, lng); map.panTo({ lat, lng }); map.setZoom(17);
        onPickRef.current({ area: place.name ?? "", address: place.formatted_address ?? "", lat, lng });
      });
      const styleId = "sunred-pac-zindex-admin";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = ".pac-container{z-index:13000 !important;border-radius:12px;font-family:'Inter',sans-serif;box-shadow:0 12px 40px rgba(31,41,51,0.18);}";
        document.head.appendChild(style);
      }
    }

    return () => {
      const gEvent = (window as any).google?.maps?.event;
      if (gEvent) {
        if (mapRef.current) gEvent.clearInstanceListeners(mapRef.current);
        if (acRef.current) gEvent.clearInstanceListeners(acRef.current);
      }
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = null; acRef.current = null; mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ position: "relative" }}>
        <MagnifyingGlass size={16} color={adminColor.dim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          ref={searchRef}
          placeholder={ready ? "ค้นหาสถานที่ / โรงแรม / คอนโด…" : "กำลังโหลดแผนที่…"}
          inputMode="search" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: "10px", border: `1px solid ${adminColor.line}`, background: adminColor.panel, fontFamily: adminFont.sans, fontSize: 16, color: adminColor.text, outline: "none" }}
        />
      </Box>
      <Box ref={mapElRef} sx={{ width: "100%", height: 220, borderRadius: "12px", overflow: "hidden", border: `1px solid ${adminColor.line}`, background: adminColor.panel3 }} />
      <Typography sx={{ fontSize: 11, color: adminColor.dim }}>ค้นหาด้านบน หรือแตะบนแผนที่เพื่อปักหมุด — ระบบจะเติมพื้นที่/ที่อยู่/พิกัดให้อัตโนมัติ</Typography>
    </Box>
  );
};

// ─── field editors (value + onChange) ─────────────────────────────────
export const FeaturesEditor: React.FC<{ value: Record<string, string>; onChange: (k: string, v: string) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1 }}>
    {FEATURE_ROWS.map(([k, label]) => (
      <TextField key={k} label={label} fullWidth size="small" sx={fieldSx} value={value[k] ?? ""} onChange={(e) => onChange(k, e.target.value)} />
    ))}
  </Box>
);

export const LanguagesEditor: React.FC<{ value: LanguageSkill[]; onChange: (next: LanguageSkill[]) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {value.map((l, i) => (
      <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField select size="small" sx={{ ...fieldSx, flex: 1 }} label="ภาษา" value={l.code}
          onChange={(e) => onChange(value.map((x, idx) => (idx === i ? { ...x, code: e.target.value } : x)))}
          SelectProps={{ MenuProps: selectMenuProps }}>
          {LANG_CODES.map((c) => <MenuItem key={c} value={c}>{LANG_LABEL[c]}</MenuItem>)}
        </TextField>
        <TextField select size="small" sx={{ ...fieldSx, flex: 1 }} label="ระดับ" value={l.level}
          onChange={(e) => onChange(value.map((x, idx) => (idx === i ? { ...x, level: e.target.value as LanguageSkill["level"] } : x)))}
          SelectProps={{ MenuProps: selectMenuProps }}>
          {LANG_LEVELS.map((lv) => <MenuItem key={lv} value={lv}>{LANG_LEVEL_TH[lv]}</MenuItem>)}
        </TextField>
        <IconButton size="small" onClick={() => onChange(value.filter((_, idx) => idx !== i))} sx={chipDeleteBtnSx}><Trash size={16} /></IconButton>
      </Box>
    ))}
    <Button onClick={() => onChange([...value, { code: "th", level: "Fluent" }])} startIcon={<Plus size={14} weight="bold" />} sx={addBtnSx}>เพิ่มภาษา</Button>
  </Box>
);

export const ServicesEditor: React.FC<{ value: string[]; onChange: (next: string[]) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
    {SERVICE_OPTIONS.map((s) => {
      const on = value.includes(s.id);
      return (
        <Box key={s.id} onClick={() => onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])}
          sx={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: "9px", p: "7px 13px",
            border: `1px solid ${on ? adminColor.accent : adminColor.line}`, background: on ? "rgba(78,126,140,0.12)" : adminColor.panel, color: on ? adminColor.accent : adminColor.dim }}>
          {s.name}
        </Box>
      );
    })}
  </Box>
);

export const CredentialsEditor: React.FC<{ value: Credential[]; onChange: (next: Credential[]) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
    {value.map((c, i) => (
      <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 1, background: adminColor.panel, borderRadius: "10px", p: "10px 11px", border: `1px solid ${adminColor.line}` }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField select size="small" sx={{ ...fieldSx, width: 160 }} label="ประเภท" value={c.type}
            onChange={(e) => onChange(value.map((x, idx) => (idx === i ? { ...x, type: e.target.value as Credential["type"] } : x)))}
            SelectProps={{ MenuProps: selectMenuProps }}>
            {CRED_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField size="small" sx={{ ...fieldSx, flex: 1 }} label="หัวข้อ" value={c.label}
            onChange={(e) => onChange(value.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} />
          <IconButton size="small" onClick={() => onChange(value.filter((_, idx) => idx !== i))} sx={chipDeleteBtnSx}><Trash size={16} /></IconButton>
        </Box>
        <TextField size="small" sx={fieldSx} label="รายละเอียด" value={c.meta}
          onChange={(e) => onChange(value.map((x, idx) => (idx === i ? { ...x, meta: e.target.value } : x)))} />
      </Box>
    ))}
    <Button onClick={() => onChange([...value, { type: "certification", label: "", meta: "" }])} startIcon={<Plus size={14} weight="bold" />} sx={addBtnSx}>เพิ่มใบรับรอง</Button>
  </Box>
);

export const BiosEditor: React.FC<{ value: Record<string, string>; onChange: (code: string, v: string) => void }> = ({ value, onChange }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
    {BIO_LANGS.map(([code, label]) => (
      <TextField key={code} label={label} fullWidth size="small" multiline minRows={2} sx={fieldSx} value={value[code] ?? ""} onChange={(e) => onChange(code, e.target.value)} />
    ))}
  </Box>
);

// GalleryEditor owns its own upload state + calls Firebase Storage lazily.
// `docId` is the storage folder (the therapist's id) — pass the id the
// operator has typed even before the doc exists; the upload path just uses
// it as a folder name.
export const GalleryEditor: React.FC<{ value: string[]; onChange: (next: string[]) => void; docId: string }> = ({ value, onChange, docId }) => {
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!docId.trim()) { setUploadError("ใส่ ID ของหมอนวดก่อน แล้วค่อยอัปโหลดรูป"); return; }
    setUploadError(null);
    setUploading(files.length);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) { setUploading((n) => Math.max(0, n - 1)); continue; }
        const blob = await downscaleImage(file);
        const path = `therapists/${docId}/gallery/${Date.now()}-${Math.round(blob.size % 100000)}.jpg`;
        const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
        urls.push(await getDownloadURL(snap.ref));
        setUploading((n) => Math.max(0, n - 1));
      }
      if (urls.length) onChange([...value, ...urls]);
    } catch (err) {
      console.error("[gallery upload] failed", err);
      const msg = String((err as { code?: string })?.code ?? err ?? "");
      setUploadError(
        msg.includes("unauthorized") || msg.includes("unauthenticated")
          ? "อัปโหลดไม่ได้ — สิทธิ์ไม่พอ (ยังไม่ได้ล็อกอิน หรือ storage.rules ยังไม่อัปเดต)"
          : msg.includes("storage/unknown") || msg.includes("app/no-app")
            ? "ยังเปิด Firebase Storage ไม่ได้ในโปรเจกต์"
            : "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง (หรือใส่ลิงก์รูปด้านล่างแทน)"
      );
    } finally {
      setUploading(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => void onUploadFiles(e.target.files)} />
      <Button
        onClick={() => fileInputRef.current?.click()} disabled={uploading > 0}
        startIcon={uploading > 0 ? <CircleNotch size={15} className="spin" /> : <UploadSimple size={15} weight="bold" />}
        sx={{ alignSelf: "stretch", background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`, color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(78,126,140,0.28)", "&:hover": { background: adminColor.accentDeep }, "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
          "& .spin": { animation: "spin 0.8s linear infinite" }, "@keyframes spin": { to: { transform: "rotate(360deg)" } } }}>
        {uploading > 0 ? `กำลังอัปโหลด… (${uploading})` : "อัปโหลดรูปจากมือถือ"}
      </Button>
      {uploadError && <Typography sx={{ fontSize: 11.5, color: adminColor.red, background: "rgba(220,38,38,0.07)", borderRadius: "8px", p: "8px 10px" }}>{uploadError}</Typography>}
      {value.map((src, i) => (
        <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Avatar variant="rounded" src={src} sx={{ width: 40, height: 40, borderRadius: "9px", border: `1px solid ${adminColor.line}`, flexShrink: 0 }} />
          <TextField size="small" sx={{ ...fieldSx, flex: 1 }} label={`รูปที่ ${i + 1}`} value={src} onChange={(e) => onChange(value.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder="/images/... หรือ URL" />
          <IconButton size="small" onClick={() => onChange(value.filter((_, idx) => idx !== i))} sx={chipDeleteBtnSx}><Trash size={16} /></IconButton>
        </Box>
      ))}
      <Button onClick={() => onChange([...value, ""])} startIcon={<Plus size={14} weight="bold" />} sx={addBtnSx}>เพิ่มลิงก์รูปเอง</Button>
    </Box>
  );
};

// 🆕 Round 28s284 (founder: "เอา Image URL ออกทั้งคู่ ให้เปลี่ยนโปรไฟล์ตรงรูป
// ได้เลย") — the profile photo IS the control: tap it to pick a photo from
// the phone → downscaled + uploaded to therapists/{id}/profile → onChange
// gets the URL. Replaces the "Image URL" text field on both Add + Edit.
export const AvatarUploader: React.FC<{
  value: string;
  onChange: (url: string) => void;
  docId: string;
  size?: number;
  ringColor?: string;
}> = ({ value, onChange, docId, size = 84, ringColor }) => {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!docId.trim()) { setErr("ใส่ ID ของหมอนวดก่อน แล้วค่อยเปลี่ยนรูป"); return; }
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setErr(null);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file, 800, 0.86); // profile pic — smaller than gallery
      const path = `therapists/${docId}/profile/${Date.now()}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      onChange(await getDownloadURL(snap.ref));
    } catch (e) {
      console.error("[avatar upload] failed", e);
      const msg = String((e as { code?: string })?.code ?? e ?? "");
      setErr(msg.includes("unauthorized") ? "อัปโหลดไม่ได้ — สิทธิ์ไม่พอ" : "อัปโหลดรูปไม่สำเร็จ ลองใหม่");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", "@keyframes spinAv": { to: { transform: "rotate(360deg)" } } }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void onFile(e.target.files)} />
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          position: "relative", cursor: "pointer", width: size, height: size, borderRadius: "50%",
          boxShadow: ringColor ? `0 0 0 3px ${adminColor.panel}, 0 0 0 5px ${ringColor}` : `0 0 0 3px ${adminColor.panel}, 0 0 0 4.5px ${adminColor.line2}`,
        }}
      >
        <Avatar src={value} sx={{ width: size, height: size }} />
        <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(31,41,51,0.40)", opacity: uploading || !value ? 1 : 0, transition: "opacity .15s ease", "&:hover": { opacity: 1 } }}>
          {uploading
            ? <CircleNotch size={24} color="#fff" style={{ animation: "spinAv .8s linear infinite" }} />
            : <Camera size={24} color="#fff" weight="fill" />}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 10.5, color: adminColor.dim, fontWeight: 700 }}>{uploading ? "กำลังอัป…" : "แตะที่รูปเพื่อเปลี่ยน"}</Typography>
      {err && <Typography sx={{ fontSize: 10, color: adminColor.red, textAlign: "center" }}>{err}</Typography>}
    </Box>
  );
};

// A small labelled toggle pill (Holiday / Hidden / Blocked).
export const TogglePill: React.FC<{ on: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ on, onClick, icon, label }) => (
  <Box onClick={onClick}
    sx={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: "10px", padding: "9px 14px",
      border: `1px solid ${on ? "rgba(220,38,38,0.25)" : adminColor.line}`, background: on ? "rgba(220,38,38,0.09)" : adminColor.panel, color: on ? adminColor.red : adminColor.dim, whiteSpace: "nowrap" }}>
    {icon} {label}
  </Box>
);

// exports referenced only for figure styling reuse elsewhere
export { adminFigureSx };
