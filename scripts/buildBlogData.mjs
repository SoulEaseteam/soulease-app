// scripts/buildBlogData.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.108 (founder: "บลอค … เผื่อจะมีเนื้อหาไหน … ไปติดคำค้นหา" ·
//   "เจาะทุกกลุ่ม") — turn the 5 hand-written SEO_Blog_Pack/*.md drafts into
//   ONE structured data module that BOTH consumers read:
//     • the React pages (BlogIndexPage / BlogPostPage), via Vite
//     • the crawler prerender (scripts/prerender-routes.mjs), via node
//
//   Why generate instead of authoring the data by hand: the markdown IS the
//   natural authoring format and already exists. Parsing it once here means a
//   copy edit is a one-line md change + `node scripts/buildBlogData.mjs`, not a
//   hand-sync of prose across a .tsx page and a prerender string (the exact
//   drift that bit the FAQ pricing block in 28x.82).
//
//   Output is committed (src/data/blogPosts.generated.mjs) so a clean checkout
//   builds without running this first. The markdown stays the source of truth.
//
//   No runtime markdown dependency is added: this converts to clean semantic
//   HTML at build-authoring time, and the pages sanitise it with the
//   already-present DOMPurify before rendering. The subset handled is exactly
//   what these 5 files use — h1–h3, paragraphs, - / 1. lists, > quotes, GFM
//   tables, **bold**, *italic* — asserted below so an unhandled construct
//   fails loudly instead of silently dropping content.
//
// Run:  node scripts/buildBlogData.mjs
// ────────────────────────────────────────────────────────────────────────

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "SEO_Blog_Pack");
// Runtime module name matches src/data/blogPosts.d.ts so a single import
// specifier ("@/data/blogPosts") resolves to the .mjs at runtime (Vite) and
// the .d.ts for types (tsc). The AUTO-GENERATED banner is the do-not-edit
// guard, not the filename.
const OUT = join(ROOT, "src", "data", "blogPosts.mjs");
const SITEMAP = join(ROOT, "public", "sitemap.xml");

const ORIGIN = "https://sunred.vip";
// Round 28x.108 — publish order = customer-journey order the pack's README
// lays out (trust-build first, then niche, then pain-point). Keyed by slug so
// re-sorting is a one-line edit here, independent of filename numbering.
const ORDER = [
  "how-to-choose-mobile-massage-bangkok",
  "bangkok-mobile-massage-guide-singaporean",
  "after-flight-recovery-massage-bangkok",
  "late-night-massage-bangkok-options",
  "business-trip-bangkok-recovery-protocol",
];

// ── inline: escape first, then **bold** / *italic* ─────────────────────────
function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function inline(s) {
  let h = esc(s.trim());
  // bold before italic so ** isn't eaten as two single-*.
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return h;
}
// plain text (for excerpts / meta) — strip inline markers, no HTML.
function plain(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseFrontmatter(raw) {
  // Tolerate a BOM and leading blank lines before the opening `---`.
  const clean = raw.replace(/^﻿/, "").replace(/^\s*\n/, "");
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(clean);
  if (!m) throw new Error("no frontmatter");
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v.startsWith("[")) {
      // ["a", "b"] → array
      fm[k] = v
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((x) => x.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    } else {
      fm[k] = v.replace(/^"|"$/g, "");
    }
  }
  return { fm, body: clean.slice(m[0].length) };
}

// Drop the trailing promo footer: the drafts end with a `---` rule followed by
// an italic "SunRed … Booking:" blurb. The page renders its own branded CTA,
// so that hand-written footer would double it. Only cut when the tail really
// is that promo (contains "SunRed"), never a content HR.
function stripPromoFooter(body) {
  const i = body.lastIndexOf("\n---\n");
  if (i === -1) return body;
  const tail = body.slice(i);
  return /sunred/i.test(tail) ? body.slice(0, i) : body;
}

function tableHtml(rows) {
  // rows: array of raw "| a | b |" lines; row[1] is the |---| separator.
  const cells = (line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const head = cells(rows[0]);
  const bodyRows = rows.slice(2).map(cells);
  const thead =
    "<thead><tr>" +
    head.map((c) => `<th>${inline(c)}</th>`).join("") +
    "</tr></thead>";
  const tbody =
    "<tbody>" +
    bodyRows
      .map(
        (r) =>
          "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>"
      )
      .join("") +
    "</tbody>";
  return `<table>${thead}${tbody}</table>`;
}

// ── block parser ───────────────────────────────────────────────────────────
function bodyToHtml(body, slug) {
  const lines = stripPromoFooter(body).split("\n");
  const out = [];
  let i = 0;
  const isTable = (l) => /^\|.*\|\s*$/.test(l);

  while (i < lines.length) {
    let line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // headings
    let hm = /^(#{1,4})\s+(.*)$/.exec(line);
    if (hm) {
      const level = hm[1].length;
      // h1 is the article title, rendered separately by the page — skip it.
      if (level > 1) out.push(`<h${level}>${inline(hm[2])}</h${level}>`);
      i++;
      continue;
    }

    // blockquote (consecutive `>`). A bare `>` line is a paragraph break
    // WITHIN the quote (e.g. a multi-turn dialogue) — split on it so each turn
    // is its own <p> instead of one run-on block.
    if (/^>\s?/.test(line)) {
      const segs = [[]];
      while (i < lines.length && /^>/.test(lines[i])) {
        const content = lines[i].replace(/^>\s?/, "");
        if (content.trim() === "") segs.push([]);
        else segs[segs.length - 1].push(content);
        i++;
      }
      const paras = segs
        .map((s) => s.join(" ").trim())
        .filter(Boolean)
        .map((s) => `<p>${inline(s)}</p>`)
        .join("");
      out.push(`<blockquote>${paras}</blockquote>`);
      continue;
    }

    // GFM table
    if (isTable(line) && isTable(lines[i + 1] ?? "")) {
      const buf = [];
      while (i < lines.length && isTable(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(`<div class="blog-table-wrap">${tableHtml(buf)}</div>`);
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${buf.join("")}</ol>`);
      continue;
    }

    // paragraph (join consecutive plain lines until a blank / block start)
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|>|[-*]\s|\d+\.\s)/.test(lines[i]) &&
      !isTable(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  const html = out.join("\n");
  // Guard: any leftover markdown marker means the parser missed a construct.
  if (/\*\*|(^|\s)\*[^*]|^#{1,4}\s|^\|/m.test(html)) {
    throw new Error(`[${slug}] possible unparsed markdown in output`);
  }
  return html;
}

function firstParagraph(body) {
  for (const block of stripPromoFooter(body).split("\n\n")) {
    const t = block.trim();
    if (t && !/^(#|>|[-*]\s|\d+\.\s|\|)/.test(t)) return plain(t);
  }
  return "";
}

// The markdown drafts (SEO_Blog_Pack/) are marketing files, deliberately NOT
// uploaded to Vercel (see .vercelignore). The generated src/data/blogPosts.mjs
// and the sitemap block ARE committed, so a build with no source present must
// consume those committed artifacts and no-op — NOT overwrite them with an
// empty result.
//
// The guard is "did we find zero articles", not "does the directory exist":
// .vercelignore excludes the .md FILES but Vercel still materialises an empty
// SEO_Blog_Pack/ dir, so existsSync() is true there. An earlier version keyed
// on existsSync and shipped a blank blogPosts.mjs to production (0 posts) —
// the /blog index rendered with an empty article list. Key on the file count.
const files = existsSync(SRC_DIR)
  ? (await readdir(SRC_DIR)).filter((f) => /^\d+_.*\.md$/.test(f)).sort()
  : [];

if (files.length === 0) {
  console.log(
    "buildBlogData: no source articles found (expected on Vercel — " +
      "SEO_Blog_Pack is not uploaded). Keeping committed " +
      "src/data/blogPosts.mjs + sitemap. Skipping regen."
  );
  process.exit(0);
}

const posts = [];
for (const f of files) {
  const raw = await readFile(join(SRC_DIR, f), "utf8");
  // The pack ships a 00_README with no frontmatter — it's publishing notes,
  // not an article. Skip anything that isn't a real front-mattered post.
  if (!/^\s*(?:﻿)?---\s*\n/.test(raw)) {
    console.log(`  (skip ${f} — no frontmatter)`);
    continue;
  }
  const { fm, body } = parseFrontmatter(raw);
  if (!fm.slug || !fm.title) throw new Error(`${f}: missing slug/title`);

  const html = bodyToHtml(body, fm.slug);
  const words = plain(body).split(/\s+/).filter(Boolean).length;
  const excerpt = firstParagraph(body).slice(0, 200);

  posts.push({
    slug: fm.slug,
    title: fm.title,
    metaDescription: fm.meta_description ?? excerpt.slice(0, 155),
    keywords: fm.target_keywords ?? [],
    audience: fm.target_audience ?? "",
    excerpt,
    readingMinutes: Math.max(3, Math.round(words / 200)),
    words,
    url: `${ORIGIN}/blog/${fm.slug}`,
    html,
  });
}

// Apply the curated publish order; anything not listed falls to the end in
// filename order (so a newly-added draft still appears without editing ORDER).
posts.sort((a, b) => {
  const ia = ORDER.indexOf(a.slug);
  const ib = ORDER.indexOf(b.slug);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

const banner = `// AUTO-GENERATED by scripts/buildBlogData.mjs — DO NOT EDIT BY HAND.
// Source of truth: SEO_Blog_Pack/*.md. Re-run: node scripts/buildBlogData.mjs
// (Round 28x.108). Consumed by src/pages/Blog*Page.tsx AND
// scripts/prerender-routes.mjs — one module, no drift.
`;
await writeFile(
  OUT,
  banner + "export const BLOG_POSTS = " + JSON.stringify(posts, null, 2) + ";\n",
  "utf8"
);

console.log(`Wrote ${posts.length} posts → src/data/blogPosts.mjs`);
for (const p of posts) {
  console.log(
    `  • ${p.slug}  (${p.words} words · ${p.readingMinutes} min · ${p.html.length} html chars)`
  );
}

// ── keep the blog section of public/sitemap.xml in lockstep ────────────────
// The rest of the sitemap is hand-maintained, but the blog URLs are dynamic
// (add a draft → a new page exists). Rewriting the marked block on every build
// means a new article is in the sitemap the moment it ships, with no separate
// "remember to add it to the sitemap" step to forget.
try {
  const sitemap = await readFile(SITEMAP, "utf8");
  const START = "<!-- BLOG:START";
  const END = "<!-- BLOG:END -->";
  const s = sitemap.indexOf(START);
  const e = sitemap.indexOf(END);
  if (s === -1 || e === -1) {
    console.log("  (sitemap markers not found — skipped sitemap sync)");
  } else {
    const startLineEnd = sitemap.indexOf("\n", s) + 1;
    const block =
      `  <url><loc>${ORIGIN}/blog</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n` +
      posts
        .map(
          (p) =>
            `  <url><loc>${p.url}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`
        )
        .join("\n") +
      "\n  ";
    const next = sitemap.slice(0, startLineEnd) + block + sitemap.slice(e);
    if (next !== sitemap) {
      await writeFile(SITEMAP, next, "utf8");
      console.log(`  synced ${posts.length + 1} blog URLs → public/sitemap.xml`);
    } else {
      console.log("  sitemap already in sync");
    }
  }
} catch (err) {
  console.log(`  (sitemap sync skipped: ${err.message})`);
}
