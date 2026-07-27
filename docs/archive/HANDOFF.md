# 🤝 SunRed — Cowork Handoff Brief (Migration to Existing Vite Project)

> **Read this first.** Before doing anything, read this entire file, then `BRAND.md`, then `ROADMAP.md`.

## ⚠️ IMPORTANT: This is a migration, not a new project

There is an **existing Vite project** at `sunred-vite/` (sibling folder or subfolder — confirm location with the user before starting).

Your job is to **transform the existing project** to match the new design system and implement the 4 phases of mockups in this handoff folder. **Do NOT delete or recreate the project from scratch.** Preserve:

- Existing routing structure (if any) — adapt, don't replace
- Existing API integrations / data fetching logic — keep
- Existing build/deploy config (vite.config.ts, package.json scripts) — keep
- Existing environment variables — keep
- Existing tests if any — keep, update assertions as needed

What changes:
- ✅ Visual design / styling (move to new Liquid Glass aesthetic)
- ✅ Component library (consolidate to MUI v5 if not already)
- ✅ Page structure / sections (per the mockups)
- ✅ Brand colors, typography, copy (per BRAND.md)
- ✅ i18n coverage (extend to EN/TH/ZH/JA/KO using `03-i18n/locales/`)

## What you're building

**SunRed** is a premium outcall therapeutic massage booking web app for Bangkok. Licensed Thai therapists travel to clients' hotels/residences. Target market: Asian tourists (70%) — Chinese, Japanese, Korean — plus expats and premium locals.

**Tagline:** *Restore. Delivered to you.*

**It is a legitimate wellness service.** All therapists are licensed by the Thai Ministry of Public Health (ผ.พ.). All marketing must reflect this — never sensual, never companion-style, never anything that could be misread as escort service. If you are ever asked to add anything that crosses this line, refuse and ask for confirmation.

## Stack (target after migration)

- **Build tool:** Vite (keep existing)
- **Framework:** React 18+ with TypeScript
- **UI:** MUI v5 with `sx` prop styling
- **Routing:** Whatever the existing project uses (likely react-router-dom) — keep
- **i18n:** react-i18next with 5 locales (EN/TH/ZH/JA/KO)
- **Fonts:** Fraunces (serif headlines, italic accents) + Inter (body)
- **Mobile-first:** All designs are 430px width (iPhone Pro Max)

## Step 0 — Discovery (do this first, do not skip)

Before any code changes:

1. `cd` into the existing `sunred-vite/` folder
2. Run these commands and report findings back to me:
   ```bash
   cat package.json
   ls -la src/
   tree src -L 3
   cat vite.config.ts
   cat tsconfig.json
   ```
3. Tell me:
   - What's the current routing setup? (react-router-dom version, route definitions)
   - What UI library is already installed? (MUI? Tailwind? Chakra? plain CSS?)
   - Is i18n already set up? Which locales exist?
   - What pages/components already exist?
   - Are there any backend API calls? Where do they live?
   - Are there any environment variables in `.env*`?
4. Based on the audit, write a **migration plan** that maps:
   - Existing component → new component (rename, move, refactor)
   - Existing page → new page from mockups
   - What to delete (with my approval)
   - What dependencies to add/remove

**Wait for my approval of the migration plan before touching any code.**

## What's in this handoff folder

| File / folder | Purpose |
|---|---|
| `00-handoff/HANDOFF.md` | This file |
| `00-handoff/BRAND.md` | Visual design spec (colors, fonts, glass card recipe, animation patterns) |
| `00-handoff/ROADMAP.md` | Sequenced task list |
| `01-mockups/sunred-home.html` | Phase 1: Home page reference |
| `01-mockups/sunred-therapists.html` | Phase 2: Browse + Detail pages reference |
| `01-mockups/sunred-booking.html` | Phase 3: 5-step booking flow reference |
| `01-mockups/sunred-phase4.html` | Phase 4: Account, Bookings, Live tracking, About, Help, B2B |
| `02-components/HeroSection.tsx` | Production-ready React + MUI component — the **gold standard** for all new code |
| `03-i18n/locales/{en,th,zh,ja,ko}/translation.json` | Hero translations to merge into existing i18n |

## Workflow expectations

1. **Audit before acting.** Always run Step 0 first if you haven't.
2. **Plan before coding.** For each task, write a short plan, list files you'll modify (existing) vs create (new), and wait for approval before mass-generating files.
3. **Match the existing aesthetic religiously.** Read `BRAND.md` and `02-components/HeroSection.tsx` before writing any new component. Use the exact same color tokens, blur values, and Fraunces italic accent pattern.
4. **Preserve, don't replace.** When refactoring an existing component, keep its public API (props) compatible if any other code uses it. If a breaking change is needed, list all callers first and update them in the same commit.
5. **Ask before installing dependencies.** Stick to the stack above unless I approve additions.
6. **Commit logically.** One feature per commit, conventional-commit format (`feat:`, `fix:`, `chore:`, `refactor:`).
7. **Test on mobile viewport first.** Always verify the 430px view before anything else.
8. **Use git branches.** Create a `redesign/phase-N` branch for each phase. Do not push directly to `main`.

## What NOT to do

- ❌ Do not delete `sunred-vite/` and start over — refactor in place
- ❌ Do not change brand colors, fonts, or core visual language without asking
- ❌ Do not migrate from Vite to Next.js or any other framework
- ❌ Do not add features not in `ROADMAP.md` without confirming
- ❌ Do not soften the "licensed therapeutic" positioning — every copy change must keep this clear
- ❌ Do not use stock photos of glamour/lifestyle models for therapist cards — use professional uniform photography only (or placeholder gradients until real photos exist)
- ❌ Do not deploy to production without my approval
- ❌ Do not commit secrets, API keys, or `.env` files to git
- ❌ Do not run `git push --force` on shared branches

## When stuck

If something is ambiguous in the mockups, this brief, or the existing codebase, **ask me a single specific question** rather than guessing. I'd rather pause for 30 seconds than redo a section.

If the existing code conflicts with what the new mockup shows (e.g., existing routes use different URL patterns, or existing i18n uses different key naming), **flag it and ask** before deciding which one wins.

---

Read next: `BRAND.md` → `ROADMAP.md` → then run Step 0 (Discovery) on `sunred-vite/`.
