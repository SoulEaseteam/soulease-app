// src/data/blogPosts.d.ts
// Types for the generated blog data module (src/data/blogPosts.mjs, written by
// scripts/buildBlogData.mjs — Round 28x.108). Import specifier
// "@/data/blogPosts" resolves to the .mjs at runtime (Vite) and to this .d.ts
// for types (tsc). The .mjs is also imported by the node prerender — one
// module, no drift.

export interface BlogPost {
  /** URL slug — /blog/<slug> */
  slug: string;
  title: string;
  /** <meta name="description"> + OG description */
  metaDescription: string;
  /** SEO target phrases (also rendered as tags on the article) */
  keywords: string[];
  /** Who the piece is written for (shown as a small byline) */
  audience: string;
  /** First paragraph, plain text — used on cards + as a fallback description */
  excerpt: string;
  /** Estimated reading time in minutes (min 3) */
  readingMinutes: number;
  /** Raw word count */
  words: number;
  /** Canonical absolute URL */
  url: string;
  /** Article body as sanitised-on-render semantic HTML (no <h1>) */
  html: string;
}

export const BLOG_POSTS: BlogPost[];
