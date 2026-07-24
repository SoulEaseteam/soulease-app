// src/pages/BlogPostPage.tsx
//
// 🆕 Round 28x.108 — a single blog article at /blog/:slug. Body HTML comes
// pre-built from src/data/blogPosts.mjs (generated from the markdown drafts);
// it is authored by us, but sanitised with DOMPurify on render anyway —
// defence in depth, and DOMPurify is already a project dependency so no new
// package. The same HTML is emitted into the prerender <noscript> so crawlers
// index the full text.
//
// Unknown slug → redirect to /blog rather than a dead 404, so an old shared
// link still lands somewhere useful.

import React from "react";
import { Box, Button } from "@mui/material";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import DOMPurify from "dompurify";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import { fonts, neutrals, grays } from "@/theme";
import { responsiveShellNarrow } from "@/theme/breakpoints";
import { useDocumentMeta } from "@/utils/useDocumentMeta";
import { BLOG_POSTS } from "@/data/blogPosts";

const ORIGIN = "https://sunred.vip";

// Typographic rules for the rendered article body. Kept in one place so every
// article reads identically. Targets the exact tags buildBlogData emits.
const proseSx = {
  fontFamily: fonts.body,
  color: grays.g800,
  fontSize: { xs: 15.5, md: 16.5 },
  lineHeight: 1.72,
  "& h2": {
    fontFamily: fonts.heading,
    fontWeight: 500,
    fontSize: { xs: 22, md: 27 },
    lineHeight: 1.25,
    letterSpacing: "-0.01em",
    color: grays.g900,
    margin: "2.2em 0 0.6em",
  },
  "& h3": {
    fontFamily: fonts.heading,
    fontWeight: 500,
    fontSize: { xs: 18, md: 20 },
    lineHeight: 1.3,
    color: grays.g900,
    margin: "1.6em 0 0.4em",
  },
  "& p": { margin: "0 0 1.1em" },
  "& strong": { fontWeight: 700, color: grays.g900 },
  "& em": { fontStyle: "italic" },
  "& ul, & ol": { margin: "0 0 1.2em", paddingLeft: "1.35em" },
  "& li": { margin: "0 0 0.5em", paddingLeft: "0.15em" },
  "& li::marker": { color: "#C96F89" },
  "& blockquote": {
    margin: "1.4em 0",
    padding: "14px 18px",
    borderLeft: "3px solid #D97C95",
    background: "#FBEEF2",
    borderRadius: "0 12px 12px 0",
    "& p": { margin: 0, fontStyle: "italic", color: grays.g800 },
  },
  // GFM tables — wrapped by buildBlogData in .blog-table-wrap for x-scroll on
  // narrow phones so a wide rate table never blows out the page width.
  "& .blog-table-wrap": { overflowX: "auto", margin: "1.4em 0" },
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: { xs: 13.5, md: 14.5 },
    minWidth: 460,
  },
  "& th, & td": {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: `1px solid ${neutrals.n200}`,
    verticalAlign: "top",
  },
  "& th": {
    fontFamily: fonts.body,
    fontWeight: 700,
    color: grays.g900,
    background: neutrals.n100,
    whiteSpace: "nowrap",
  },
} as const;

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const post = BLOG_POSTS.find((p) => p.slug === slug);

  // Hook order must stay stable, so compute meta inputs unconditionally.
  useDocumentMeta({
    title: post ? `${post.title} | SunRed Journal` : "SunRed Journal",
    description: post?.metaDescription ?? "",
    url: post ? post.url : `${ORIGIN}/blog`,
    type: "article",
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${post.url}#article`,
          headline: post.title,
          description: post.metaDescription,
          url: post.url,
          inLanguage: "en",
          keywords: post.keywords.join(", "),
          wordCount: post.words,
          isPartOf: { "@id": `${ORIGIN}/blog#blog` },
          publisher: { "@id": `${ORIGIN}/#business` },
          mainEntityOfPage: post.url,
        }
      : undefined,
  });

  if (!post) return <Navigate to="/blog" replace />;

  const cleanHtml = DOMPurify.sanitize(post.html);
  const idx = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const others = [
    BLOG_POSTS[(idx + 1) % BLOG_POSTS.length],
    BLOG_POSTS[(idx + 2) % BLOG_POSTS.length],
  ].filter((p) => p.slug !== post.slug);

  return (
    <Box
      sx={{
        ...responsiveShellNarrow,
        background: neutrals.n50,
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        position: "relative",
        boxShadow: { xs: "0 16px 40px rgba(45, 45, 43, 0.06)", md: "none" },
        padding: { xs: "24px 20px 44px", md: "44px 32px 72px" },
      }}
    >
      {/* back to index */}
      <Box
        onClick={() => navigate("/blog")}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          fontFamily: fonts.body,
          fontSize: 13.5,
          fontWeight: 600,
          color: grays.g600,
          "&:hover": { color: "#C96F89" },
        }}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 17 }} />
        The SunRed Journal
      </Box>

      {/* title block */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontFamily: fonts.body,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#C96F89",
          margin: "22px 0 0",
        }}
      >
        <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
        {post.readingMinutes} min read
      </Box>
      <Box
        component="h1"
        sx={{
          fontFamily: fonts.heading,
          fontSize: { xs: 27, md: 38 },
          fontWeight: 500,
          lineHeight: 1.16,
          letterSpacing: "-0.015em",
          color: grays.g900,
          margin: "10px 0 0",
        }}
      >
        {post.title}
      </Box>
      {post.audience && (
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: 13.5,
            color: grays.g500,
            margin: "12px 0 0",
          }}
        >
          {/* Keep original casing — the audience strings carry proper nouns
              and acronyms ("Bangkok", "PRs") that lowercasing would mangle. */}
          Written for {post.audience}.
        </Box>
      )}

      <Box
        sx={{
          height: "1px",
          background: neutrals.n200,
          margin: { xs: "22px 0", md: "28px 0" },
        }}
      />

      {/* article body */}
      <Box sx={proseSx} dangerouslySetInnerHTML={{ __html: cleanHtml }} />

      {/* reserve CTA */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #E38EA5 0%, #D97C95 55%, #C96F89 100%)",
          borderRadius: "18px",
          padding: { xs: "22px 20px", md: "28px 28px" },
          margin: { xs: "32px 0 0", md: "44px 0 0" },
          textAlign: "center",
        }}
      >
        <Box
          component="h2"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 20, md: 24 },
            fontWeight: 500,
            lineHeight: 1.2,
            color: "#fff",
            margin: 0,
          }}
        >
          SunRed is built to pass this test
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 15 },
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.9)",
            margin: "10px auto 0",
            maxWidth: 460,
          }}
        >
          Named practitioners, fixed pricing, live availability, and a concierge
          who confirms every reservation before anyone is dispatched.
        </Box>
        <Button
          onClick={() => navigate("/")}
          sx={{
            marginTop: "18px",
            background: "#fff",
            color: "#B4526C",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 15,
            textTransform: "none",
            borderRadius: "999px",
            padding: "11px 30px",
            boxShadow: "0 6px 16px rgba(138, 58, 87, 0.28)",
            "&:hover": { background: "#fff", opacity: 0.94 },
          }}
        >
          See tonight’s availability
        </Button>
      </Box>

      {/* keep reading */}
      {others.length > 0 && (
        <Box sx={{ margin: { xs: "34px 0 0", md: "48px 0 0" } }}>
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: grays.g500,
              margin: "0 0 12px",
            }}
          >
            Keep reading
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {others.map((o) => (
              <Box
                key={o.slug}
                onClick={() => {
                  void navigate(`/blog/${o.slug}`);
                  window.scrollTo({ top: 0 });
                }}
                sx={{
                  cursor: "pointer",
                  background: "#fff",
                  border: `1px solid ${neutrals.n200}`,
                  borderRadius: "14px",
                  padding: "14px 16px",
                  transition: "border-color .18s ease",
                  "&:hover": { borderColor: "#D97C9566" },
                }}
              >
                <Box
                  component="h3"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: { xs: 16, md: 18 },
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: grays.g900,
                    margin: 0,
                  }}
                >
                  {o.title}
                </Box>
                <Box
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 12.5,
                    color: "#C96F89",
                    fontWeight: 600,
                    margin: "6px 0 0",
                  }}
                >
                  {o.readingMinutes} min read →
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BlogPostPage;
