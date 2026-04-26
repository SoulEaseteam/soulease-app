// scripts/generate-sitemap-therapists.ts
import fs from "fs";
import path from "path";

// ---------- ปรับ path ให้ตรงกับโปรเจกต์คุณ ----------
// ไฟล์นี้สมมติว่า src/data/therapists.ts export เป็น array เช่น:
// export const therapists = [{ slug: "yuri", name: "Yuri", updatedAt: "2025-08-30" }, ...]
import { therapists } from "../src/data/therapists";

// สร้าง slug ถ้าใน data ไม่มี
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")                // ตัด tone/accents
    .replace(/[\u0300-\u036f]/g, "")  // ลบ combining marks
    .replace(/[^a-z0-9]+/g, "-")      // เว้นวรรค/สัญลักษณ์ -> -
    .replace(/(^-|-$)/g, "");         // ตัด - ต้น/ท้าย

// แปลงวันที่ให้เป็น YYYY-MM-DD
const fmtDate = (d: Date | string | undefined) => {
  const date = d ? new Date(d) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const baseUrl = "https://sunred.vip";

const items = therapists
  .filter(Boolean)
  .map((t: any) => {
    const slug: string =
      t.slug?.toString() || slugify(t.name || t.displayName || "profile");
    const lastmod: string = fmtDate(t.updatedAt || t.lastUpdated || Date.now());

    return `
  <url>
    <loc>${baseUrl}/therapists/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`.trim();

const outPath = path.join(process.cwd(), "public", "sitemap-therapists.xml");

// สร้างโฟลเดอร์ public ถ้ายังไม่มี
fs.mkdirSync(path.dirname(outPath), { recursive: true });

// เขียนไฟล์
fs.writeFileSync(outPath, xml, "utf8");
console.log("✔ Generated:", outPath, `(${therapists.length} profiles)`);