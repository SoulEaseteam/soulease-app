// src/utils/createMapShortLink.ts
export async function createMapShortLink(
  address: string,
  lat?: number,
  lng?: number
) {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_DYNAMIC_LINK_KEY;
    if (!apiKey) {
      console.warn("❌ Missing VITE_FIREBASE_DYNAMIC_LINK_KEY");
      return null;
    }

    // Long URL สำหรับค้นหา location ใน Google Maps
    const longUrl =
      lat && lng
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address
          )}`;

    const payload = {
      dynamicLinkInfo: {
        domainUriPrefix: "https://mapsappgoo.page.link", // ใช้ Firebase Dynamic Links domain ของโปรเจค
        link: longUrl,
        androidInfo: {
          androidPackageName: "com.google.android.apps.maps",
        },
        iosInfo: {
          iosBundleId: "com.google.Maps",
        },
      },
      suffix: { option: "SHORT" },
    };

    const res = await fetch(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (data.shortLink) {
      // ทำให้เหมือนลิงก์จริงของ Google Maps
      return data.shortLink.replace("https://mapsappgoo.page.link", "https://maps.app.goo.gl");
    }

    console.warn("Dynamic Link Error:", data);
    return null;
  } catch (err) {
    console.error("createMapShortLink failed:", err);
    return null;
  }
}