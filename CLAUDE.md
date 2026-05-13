# CSC Career Compass — v0

An ~8–9 minute trilingual (English, Simplified Chinese, Spanish) career assessment for clients at Chinatown Service Center (Los Angeles). Crystallizes **six dimensions** for the client — interests, passions, natural attributes, natural strengths, soft skills, and matching careers — using **five mixed question formats** (3-point Likert, tag cloud, visual tile picker, top-3 card picker, "This or That" forced choice) to keep the assessment fun, varied, and insightful. Generates a downloadable PDF the client can take home or to their CSC appointment.

**v0 scope (deliberate cuts):** No read-aloud audio, no separate About page (replaced by a 1-line footer disclaimer), no in-app feedback strip (face-to-face debrief instead), no Web Share API (PDF/Print only). All four are slated for v0.1 after first client sessions.

This is **v0** — a single-day build to put in front of real clients for feedback. The full-featured version (5 locales, training providers, funding triage, Specialist brief, recommendation engine with cosine matching) is planned separately in `~/Desktop/Projects/Research/2026-05-12-career-readiness-tool/12-design-plan.md`.

## Tech Stack
- Vanilla HTML + TypeScript SPA. No framework.
- Bun for dev server and build.
- Static JSON data files (no API calls in v0).
- Hosted on Cloudflare Pages.

## Structure
```
csc-career-compass/
  index.html              entry point
  src/
    main.ts               app bootstrap + router
    survey.ts             question rendering + state
    results.ts            scoring + occupation cards
    pdf.ts                PDF (window.print + html2pdf fallback)
    i18n.ts               translation helper (html[lang] aware)
    styles.css            Civic Plain styles
    data/
      mini-ip.json            20 O*NET Mini-IP statements, trilingual (Module 1a)
      tag-cloud.json          24 RIASEC self-descriptor tags, trilingual (Module 1b)
      workspaces.json         6 illustrated workspace tiles, inline SVG (Module 1c)
      passions.json           12 illustrated activity tiles, inline SVG, RIASEC-weighted (Module 2)
      strengths.json          6 natural-strength items, "comes easily" scale (Module 3)
      values.json             6 O*NET Work Values, plain-language one-liners (Module 4)
      skills.json             8 NACE Career Readiness Competencies + examples (Module 5)
      this-or-that.json       4 forced-choice palate-cleanser pairs
      constraints.json        4 constraint questions (Module 6)
      occupations.json        15 LA occupations with RIASEC + wage + training note
      riasec-descriptors.json 1-paragraph plain-language descriptor per RIASEC letter
      locales/
        en.json
        zh-Hans.json
        es.json
  docs/
    design.md             why this exists, who it's for, what it isn't
  dist/                   build output (gitignored)
  CLAUDE.md
  plan.md
  README.md
```

## Entry Point
`index.html` → loads `src/main.ts` via `<script type="module">`. Hash-based routing:
- `#/` — landing
- `#/q/interests`, `#/q/passions`, `#/q/strengths`, `#/q/values`, `#/q/skills`, `#/q/constraints` — survey modules
- `#/results` — results page (Section A + B + C)

Every page shows a small italic footer disclaimer: "This is a starting point, not professional career counseling. For personalized guidance, talk to your CSC Specialist."

## Deployment
- Build: `bun run build` → emits `dist/`
- Local preview: `bun run dev` → http://localhost:3000
- Production: `wrangler pages deploy dist/ --project-name csc-career-compass`

## Conventions
- **Language toggle:** persistent in header (EN | 中文 | Español). Updates `localStorage.lang` AND `document.documentElement.lang` on click (a11y critical — screen readers pick voice from `html[lang]`). Default is English on first load.
- **Plain language:** target Flesch-Kincaid Grade 5–6 in English (and equivalent simplicity in 中文 and Español). Chinese and Spanish translations are reviewed by a native speaker before any client testing. Spanish dialect: Latin American Spanish (`es-419`) — no `vosotros`, use `computadora` / `celular` / `trabajo`.
- **No PII:** nothing stored server-side. `localStorage` only for resume + language preference. No analytics on v0.
- **Accessibility:** WCAG 2.1 AA. 18px body minimum. 4.5:1 contrast. Keyboard-navigable. `aria-live` on screen transitions.
- **Responsive breakpoints:** 375px (phone), 768px (tablet), 1024px (desktop). Mobile-first.
- **Print CSS:** results page must print cleanly to one page (US Letter portrait).
- **No emoji** in production UI text (except the language toggle's globe). Use simple SVG icons for the 6 RIASEC categories.
- **No backup files** when editing. Just overwrite.
- **No auto-deploy** after code changes — wait for the explicit "deploy" instruction.
