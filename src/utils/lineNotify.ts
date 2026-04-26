// src/utils/lineNotify.ts
export const sendLineNotify = async (
  message: string,
  opts?: { imageThumbnail?: string; imageFullsize?: string }
): Promise<boolean> => {
  try {
    const res = await fetch("/api/line-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, ...opts }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Line Notify failed:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Network error sending Line Notify:", e);
    return false;
  }
};