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
  index.html              entry point (synchronous html[lang] bootstrap script)
  src/
    main.ts               app bootstrap + hash router + header/footer/landing
    survey.ts             page renderers + click delegate + state machine
    survey-logic.ts       pure (DOM-free) page list + validation + togglePick
    results.ts            results page rendering (delegates math to scoring.ts)
    scoring.ts            pure (DOM-free) RIASEC vector + cosine + ranking
    state.ts              SurveyState type + localStorage persistence
    pdf.ts                window.print primary + html2pdf fallback (SRI-pinned)
    i18n.ts               t / formatT / pickLocalized / setLang (lazy ZH font)
    util.ts               escapeHtml
    styles.css            Civic Plain styles + print + reduced-motion
    data/                 (same 11 JSON instruments + 3 locale files)
  public/
    _headers              Cloudflare Pages security headers (CSP, X-Frame, etc.)
    robots.txt            allow all
    og-image.svg          1200x630 trilingual brand card
  tests-e2e/
    survey.spec.ts        Playwright E2E: 6 specs × mobile+desktop = 12 tests
  docs/
    design.md             problem, audience, scope, scoring algorithm rationale
  src/*.test.ts           Vitest unit tests (scoring + state-machine, 55 total)
  vite.config.ts          dev/build config (target es2020 for older Android)
  vitest.config.ts        unit-test runner (excludes tests-e2e)
  playwright.config.ts    E2E runner: mobile + desktop chromium profiles
  dist/                   build output (gitignored)
```

## Scripts
- `npm run dev` — vite dev server on :3000
- `npm test` — 55 vitest unit tests
- `npm run test:e2e` — 12 Playwright E2E (needs `test:e2e:install` once)
- `npm run build` — vite production build → dist/

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
