// src/utils/getErrorMessage.ts
//
// helper เล็กๆ สำหรับ extract message จาก unknown error
// ใช้แทน `catch (e: any) { e.message }` ที่ TS strict ไม่ชอบ
//
// รองรับทั้ง:
// - native Error
// - FirebaseError (มี .code, .message)
// - { message: string } objects
// - string / อื่นๆ → JSON.stringify

export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "string") return err;

  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

/** ดึง Firebase error code (ถ้ามี) สำหรับ map เป็น i18n key */
export function getErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === "string") return c;
  }
  return null;
}
