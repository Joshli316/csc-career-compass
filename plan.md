# Implementation Plan: CSC Career Compass v0

## Overview
Build a single-day, **trilingual (English, Simplified Chinese, Latin American Spanish)**, ~8–9 minute career **assessment** that crystallizes **six dimensions** for each CSC client:
1. **Interests** — what kind of work draws them (Mini-IP + tag cloud + image picker)
2. **Passions** — what they'd do even if no one was watching (12-tile visual picker)
3. **Natural attributes** — what energizes them at work (Work Values top-3)
4. **Natural strengths** — what comes easily to them (6-item ability scale)
5. **Soft skills** — what they've developed (NACE 8, self-rated)
6. **Careers that fit** — 3 LA occupations matching dimensions 1–5

The assessment uses **five different question formats** to keep it fun and varied: 3-point Likert, tag cloud, visual tile picker, top-3 card picker, and "This or That" forced choice. The client sees themselves in plain language across six sub-headings, then sees 3 careers that line up with who they are. The downloadable PDF / printable handout is a side benefit, not the headline.

Deploy to Cloudflare Pages so the Employment Outreach Specialist can put it in front of real CSC clients within 24 hours.

Riskiest assumptions to test in v0:
1. **Does the client see themselves across all six sub-headings?** When asked "did the summary sound like you?" do ≥ 7 of 10 say yes?
2. **Do the 3 recommended occupations feel like real options for them?** Do ≥ 6 of 10 say yes?
3. **Does the assessment give them language?** When the Specialist asks them what they're good at, can they now answer with specifics from the tool?
4. **Will they finish ~60 items in one sitting?** Completion rate ≥ 60% — varied formats should help vs. all-Likert.
5. **Does the format variety help or hurt?** Watch for which format triggers drop-off — if a specific format kills completion, simplify in v0.1.

If yes → build v1 (full feature set per `~/Desktop/Projects/Research/2026-05-12-career-readiness-tool/12-design-plan.md`). If no → fix v0 before adding features.

## Design Spec — Civic Plain

### Type
- Body font: `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, sans-serif
- Chinese font: `Noto Sans SC`, `PingFang SC`, `Hiragino Sans GB`, sans-serif (applied via `html[lang="zh-Hans"]`)
- Base size: **18px** (mobile + desktop)
- Line height: **1.6** body, **1.3** headings
- Heading scale: H1 32/28px (desktop/mobile), H2 24/22, H3 20/18
- Letter spacing: 0 (no tracking changes)
- Font weight: 400 body, 600 headings, 600 buttons

### Color
- Primary: `#1d4ed8` (blue-700)
- Primary hover: `#1e40af` (blue-800)
- Primary text on dark: `#ffffff`
- Surface: `#f8fafc` (slate-50)
- Surface elevated: `#ffffff`
- Border: `#e2e8f0` (slate-200)
- Text: `#0f172a` (slate-900)
- Text muted: `#475569` (slate-600)
- Success: `#15803d` (green-700)
- Warning: `#b45309` (amber-700)
- Focus ring: `#1d4ed8` with `outline-offset: 3px`
- All foreground/background pairs verified ≥ 4.5:1 contrast.

### Layout
- Max content width: **640px** (single column, mobile-first)
- Page padding: 16px mobile, 24px tablet, 32px desktop
- Vertical rhythm: 24px between major blocks, 16px between sub-blocks
- Tap targets: **48px minimum** (buttons, language toggle, radio rows)

### Components
- **Buttons:** 12px vertical / 24px horizontal padding, 6px radius, 600 weight, 1px border. Primary = `#1d4ed8` background; secondary = white background with `#1d4ed8` border + text.
- **Radio rows (survey items):** full-width tap target, label on left, three icon buttons (Like / Not sure / Dislike) on right. Selected = `#1d4ed8` border + `#dbeafe` background.
- **Cards (results):** white background, 1px `#e2e8f0` border, 6px radius, 24px padding. No drop shadows.
- **Progress bar:** required on every survey page. 6px tall (visible without being heavy), `#1d4ed8` fill on `#e2e8f0` track, fixed at the top of the survey page just below the header. Width animates smoothly on each "Next" tap. Paired with a text counter at the bottom of the page ("Question 8 of 60 / 第 8 题，共 60 题 / Pregunta 8 de 60") so the client always knows two things: how far along they are visually, and exact step number for orientation.
- **Form errors:** never appear unless user tries to advance without answering — then show `#b45309` text below the unanswered item.

### Motion
- Page transitions: none in v0 (instant). Just scroll-to-top on route change.
- Button hover: background swap, no scale.
- Focus ring: `outline 3px #1d4ed8`, no animation.

### Imagery
- **No emoji** anywhere in the body UI (except the language picker label "EN | 中文").
- 6 inline SVG icons for RIASEC categories (Realistic / Investigative / Artistic / Social / Enterprising / Conventional). Stroke icons, currentColor, 20px square, paired with the matching survey statement when relevant.
- No stock photos, no gradients, no decorative graphics. The tool is the message.

### Responsive
- Mobile (375px): single column, 16px padding, full-width buttons.
- Tablet (768px): same single column, centered, 24px padding.
- Desktop (1024px+): same column at 640px max-width, centered, 32px page padding.

### Print
- Hide header, footer, progress bar.
- Show results page at full width, no max-width constraint.
- One-page US Letter portrait.
- Black on white. Underline links so they remain identifiable in print.

### Anti-AI guardrails
- No purple/teal gradient hero. No emoji headers. No "sparkles ✨ icon." No card-flip animations. No glassmorphism. No "powered by AI" language. The tool's job is to feel like a public service, not a startup demo.

## Steps

1. **Project scaffolding.** `bun init`, `tsconfig.json`, `bunfig.toml`. Set up `bun run dev` and `bun run build` scripts. Add `index.html`, `src/main.ts`, `src/styles.css`, empty `src/data/`. Add `.gitignore`, `wrangler.toml`.

2. **i18n module.** `src/i18n.ts` reads `localStorage.lang` (default `en`), exposes `t(key)` and `setLang(lang)`. `setLang` updates `localStorage`, sets `document.documentElement.lang` (`en`, `zh-Hans`, or `es`), dispatches a re-render. Provide `src/data/locales/en.json`, `src/data/locales/zh-Hans.json`, and `src/data/locales/es.json` with: header, landing copy, survey UI labels, results headings, print/PDF buttons, footer. Spanish dialect = Latin American (`es-419`) — avoid Castilian forms. Default font stack switches based on `html[lang]`: Inter for `en` and `es`, Noto Sans SC for `zh-Hans`.

3. **Hash router.** `src/main.ts` listens for `hashchange` and renders one of: `#/` landing, `#/q/interests` survey, `#/q/constraints` constraints, `#/results` results. Scroll to top on route change. Persist progress in `localStorage`.

4. **Landing page.** Header with logo "CSC Career Compass" + language toggle. Body: H1 + 1-line subhead, "Free / No account / Private" bullet list, primary "Start →" button. Match the Civic Plain preview ASCII exactly.

5. **Interest items `src/data/mini-ip.json`.** 20 statements (abbreviated from the full 30 — pick the highest-loading items per RIASEC category, ~3-4 per category). Each entry: `{ id, riasec: 'R'|'I'|'A'|'S'|'E'|'C', en, zh, es }`. Pull EN and ES statements verbatim from the O\*NET Mini-IP Short Form and **Mi Próximo Paso** (both public domain). Chinese translations drafted with DeepL, reviewed by a native Mandarin reader before client testing. Items stay at FK Grade 5–6 equivalent.

6. **Tag cloud `src/data/tag-cloud.json`.** 24 single-word self-descriptors that map to RIASEC dimensions. Each: `{ id, riasec, en, zh, es }`. Tap-any selection (no max). Examples — R: build, repair, outdoor, hands-on. I: research, analyze, curious, solve. A: design, create, imagine, express. S: teach, help, listen, care. E: lead, sell, persuade, decide. C: organize, plan, detail, list.

7. **Image picker `src/data/workspaces.json`.** 6 illustrated "ideal workspace" tiles (one per RIASEC category — workshop / lab / studio / classroom / boardroom / office desk). Each: `{ id, riasec, label_en, label_zh, label_es, svg_inline }`. Client picks 1 favorite. Drawn as inline SVG (no PNG dependencies, no image-credit complications). Single page, one decision, ~10 seconds.

8. **Passions tiles `src/data/passions.json`.** 12 illustrated activity tiles. Each: `{ id, riasec_weight: { R: 0|1|2, I: ..., A: ..., S: ..., E: ..., C: ... }, label_en, label_zh, label_es, svg_inline }`. The 12: helping someone in need (S), fixing what's broken (R), learning new ideas (I), making something beautiful (A), organizing a system (C), leading a group (E), building something with my hands (R), caring for kids or elders (S), telling stories (A), solving puzzles (I), growing things / gardening (R), running a small business (E). Client picks exactly 3. RIASEC weights feed back into the matching score with a small multiplier.

9. **Natural-strengths items `src/data/strengths.json`.** 6 short items, 3-point ability scale ("Comes easily / I can do it / Hard for me"). Each: `{ id, riasec, label_en, label_zh, label_es, example_en, example_zh, example_es }`. The 6: noticing small details (C/I), calming people who are upset (S), explaining things clearly (S/A), fixing what's broken (R), seeing patterns and connections (I), organizing a messy situation (C). Items deliberately do NOT overlap NACE soft skills — strengths are innate capability, skills are learned.

10. **Values cards `src/data/values.json`.** 6 O\*NET Work Values reframed as "what energizes you at work." Each: `{ id, en, zh, es, one_liner_en, one_liner_zh, one_liner_es }`. The 6: Achievement, Independence, Recognition, Relationships, Support, Working Conditions. Client picks top 3 (unordered).

11. **Soft-skills items `src/data/skills.json`.** 8 NACE Career Readiness Competencies (April 2024 definitions): Career & Self-Development, Communication, Critical Thinking, Equity & Inclusion, Leadership, Professionalism, Teamwork, Technology. Each: `{ id, name_en, name_zh, name_es, description_en, description_zh, description_es, example_en, example_zh, example_es }`. The `example_*` field is a 1-sentence concrete example ("I write emails my coworkers understand quickly") that helps the client know what each skill looks like in practice. Self-rated on a 3-point scale: "I have this / I'm growing / Not yet".

12. **This-or-That pairs `src/data/this-or-that.json`.** 4 forced-choice palate-cleanser items, scattered between modules. Each: `{ id, a: { riasec, label_en, label_zh, label_es }, b: { riasec, label_en, label_zh, label_es } }`. Example pairs:
    - A: "Organize a closet" (C) vs. B: "Figure out how a clock works" (I)
    - A: "Teach a friend a new skill" (S) vs. B: "Pitch a friend on a business idea" (E)
    - A: "Paint a wall a bold new color" (A) vs. B: "Plant a vegetable garden" (R)
    - A: "Lead a team meeting" (E) vs. B: "Solve a tricky math problem alone" (I)
    Fun-feeling but RIASEC-informative.

13. **Constraints `src/data/constraints.json`.** 4 questions: highest education, English level, work authorization, hours available. Each with options keyed by ID and trilingual labels (en, zh, es).

14. **Survey renderer `src/survey.ts`.** 6 modules + 4 palate-cleanser pages, in this order:
    - **Module 1a — Interests (Likert):** 20 Mini-IP items in 4 pages of 5. Three-icon Like / Not sure / Dislike row per item.
    - **Palate cleanser:** This-or-That pair #1.
    - **Module 1b — Interests (tag cloud):** 1 page. 24 self-descriptor tags as tappable chips. Pick any.
    - **Palate cleanser:** This-or-That pair #2.
    - **Module 1c — Interests (visual):** 1 page. Pick 1 of 6 illustrated workspace tiles.
    - **Module 2 — Passions:** 1 page. Pick exactly 3 of 12 illustrated activity tiles. Validates count = 3 before advancing.
    - **Palate cleanser:** This-or-That pair #3.
    - **Module 3 — Natural strengths:** 1 page. 6 items, 3-button ability scale (Comes easily / I can do it / Hard for me).
    - **Module 4 — Natural attributes (values):** 1 page. 6 work-value cards. Pick exactly 3.
    - **Palate cleanser:** This-or-That pair #4.
    - **Module 5 — Soft skills:** 1 page. 8 NACE competencies with icon + 1-line example. Each row has 3 buttons (Have / Growing / Not yet).
    - **Module 6 — Reality:** 1 page. 4 constraint questions, single-select.

    Top progress bar shows overall progress across all modules. Bottom counter shows current step ("3 of 11" / "第 3 步，共 11 步" / "Paso 3 de 11"). Module headers ("Step 2: What are you passionate about?" / etc) on the first page of each module. Next/Back buttons validate page completion before advancing. State persisted to `localStorage`. `aria-live="polite"` announces module transitions for screen readers.

    **"Why we ask this" intro per module.** Below each module header (first page of each module only), include 1 short sentence explaining the purpose, pulled from `src/data/locales/<lang>.json`. Examples:
    - Module 1: "This helps us see what kind of work draws you." / "这能帮我们看出你被什么样的工作吸引。" / "Esto nos ayuda a ver qué tipo de trabajo te atrae."
    - Module 2: "These are the things that energize you, even when no one's watching."
    - Module 3: "These show what comes naturally to you."
    - Module 4: "These tell us what you need at work to feel like yourself."
    - Module 5: "These are skills you've built up over time."
    - Module 6: "This helps us match you to jobs you can take on right now."
    Reduces "why am I being asked this?" friction. Plain language. ~1 short sentence each.

15. **Occupation data file `src/data/occupations.json`.** 15 LA occupations from Report 05's top-20 table. Schema per entry:
   ```
   {
     id, soc, title_en, title_zh, title_es,
     riasec: 'SRI' (3-letter Holland code),
     riasec_vector: [R, I, A, S, E, C] floats,
     wage_la_median_hourly,
     job_zone: 1|2|3|4|5,
     english_level: 'beginner'|'conversational'|'advanced'|'native',
     work_auth_required: 'any'|'us_only',
     time_to_credential_months,
     training_note_en, training_note_zh, training_note_es,
     why_fit_template_en: ['line 1 template', 'line 2', 'line 3'],
     why_fit_template_zh: ['...', '...', '...'],
     why_fit_template_es: ['...', '...', '...']
   }
   ```
   Initial 15 selected from Report 05's accessibility tiers 1–3 (no-/minimal-/conversational-English roles): Medical Assistant, CNA, HHA, Pharmacy Tech, Dental Assistant, EMT, Bookkeeper, Paralegal (bilingual premium), IT Support, CDL Driver, HVAC, Solar Installer, Early Childhood Educator, Bilingual Receptionist, Phlebotomist.

16. **Scoring & ranking `src/results.ts`.** Compute six derived outputs from the survey data:
    - **RIASEC vector (interests):** sum Like=2 / Not-sure=1 / Dislike=0 from Mini-IP (×1.0); plus tag-cloud taps (each = +1.0 in matching letter); plus workspace pick (= +2.0 in its letter); plus passion tiles (each = riasec_weight × 1.0); plus This-or-That picks (chosen side = +1.0 in its letter). Normalize to a 6-vector → user `riasec_vec`.
    - **Top interests:** the 1–2 highest letters in `riasec_vec` → "You're drawn to..." paragraph from `riasec-descriptors.json`.
    - **Passions:** the 3 tile IDs the client picked → render as a list with each tile's label.
    - **Natural attributes:** the 3 value IDs the client picked → render as a list with each value's one-liner.
    - **Natural strengths:** filter strengths.json to items marked "Comes easily"; render up to 3 ("You're naturally good at noticing details, calming people, and seeing patterns").
    - **Soft skills (Have):** filter NACE skills to items marked "Have"; take top 3 in original NACE order.
    - **Soft skills (Growing):** any NACE items marked "Growing".
    - **Occupation matching:** filter `occupations.json` by hard constraints (English level ≤ user + 1; job zone ≤ user education + 1; work auth compatible). Score each remaining occupation: `cosine(user_riasec_vec, occupation_riasec_vec)`. Sort desc. Take top 3.

17. **Results page — three sections, in this order.**

    **Section A — "Here's what we heard about YOU"** (the crystallization, six sub-headings)
    - **1. Your interests** — H3 + 2–3 sentence plain-language paragraph derived from the user's top RIASEC letter(s) via `riasec-descriptors.json`. Example: "You're drawn to working with people and helping others grow. You like work where you can listen, teach, or care."
    - **2. What you're passionate about** — H3 + bulleted list of the 3 passion tiles the client picked, each with its illustrated icon and label. Optional 1-line lead-in: "These are the things you said you'd do even if no one was watching."
    - **3. Your natural attributes** — H3 + bulleted list of the 3 work values picked, each with its one-liner. Lead-in: "These are what energize you at work."
    - **4. What you're naturally good at** — H3 + bulleted list of up to 3 "Comes easily" strengths, each with its concrete example. Lead-in: "These come naturally to you."
    - **5. Your soft skills** — H3 + bulleted list of up to 3 NACE skills marked "Have", each with its 1-sentence example. Lead-in: "These are skills you've built."
    - **6. Skills you want to grow** — H3 + bulleted list of any NACE skills marked "Growing", or hide this sub-heading if the user marked none.
    - This whole section must read as if the tool is reflecting the client back to themselves, not lecturing. Use second-person ("you") consistently. No "based on your responses..." framing — just speak directly.

    **Section B — "Careers in LA that fit who you are"** (the bridge)
    - Brief 1-sentence intro: "Based on everything above, these 3 LA jobs line up with who you are and the work you can take on right now."
    - 3 occupation cards in priority order. Each card: title (EN / 中文 / Español depending on lang), LA wage, time-to-credential, training note, 3 "Why this fits you" bullets (rendered from `why_fit_template_*` with the user's top RIASEC letter and one of their top values substituted in).

    **Section C — "Optional next step"** (footer, demoted)
    - "Download PDF / 下载 PDF / Descargar PDF" primary button. (Print/PDF logic per Step 19.)
    - Small text: "Bring this to your CSC Employment Specialist — they can help you plan training, funding, and the next steps."
    - Small text: "Want to retake the assessment? [Start over]"
    - **Footer disclaimer (every page, including print/PDF):** small italic 1-liner at the very bottom of the page: "This is a starting point, not professional career counseling. For personalized guidance, talk to your CSC Employment Outreach Specialist. / 这只是一个起点，并非专业职业咨询。如需个性化指导，请联系您的 CSC 就业服务专员。/ Este es un punto de partida, no una consulta profesional. Para orientación personalizada, habla con tu especialista de CSC."

18. **Print CSS.** `@media print` block in `src/styles.css`. Hide header, language toggle, all action buttons, footer, and the feedback strip. Section A + Section B + Section C stack vertically full-width. Force single-page US Letter portrait (use a smaller font scale + tighter line height in print to fit). Black on white. Show all language strings in the user's current language only (no toggling needed in print). Add `page-break-inside: avoid` on cards so they don't split across pages.

19. **PDF generation `src/pdf.ts`.** Section C exposes a single primary button: "Download PDF / 下载 PDF / Descargar PDF". Two-tier approach:
    - **Tier 1 (preferred, $0 deps, text-based PDF):** wire the button to `window.print()`. On every modern desktop and mobile browser, the print sheet offers "Save as PDF" as the destination. The output is a clean, text-selectable, accessible PDF that uses the print CSS above. (Users who want to actually print on paper use the same sheet, picking their printer instead.)
    - **Tier 2 (in-app-browser fallback):** some clients open links from WeChat, Facebook Messenger, or Instagram, whose in-app browsers don't expose the print dialog. Detect via `navigator.userAgent` matching `MicroMessenger|FB_IAB|FBAN|Instagram` and swap to a direct-download path using `html2pdf.js` (CDN-loaded only when needed). Renders Section A + B + C to a single-page PDF and triggers a download.
    - Both paths produce a PDF named `csc-career-compass-results-YYYY-MM-DD.pdf`. Tier 1 ≈ 50 KB text-based; Tier 2 ≈ 500 KB image-based.
    - Small helper-text under the button: "Save the PDF, print it, or share it with your family. / 保存 PDF、打印或分享给家人。/ Guarda el PDF, imprímelo, o compártelo con tu familia."

20. **Save & resume.** On every survey-page render, save the entire state (current page, answers so far, language) to `localStorage.cscCompassState`. On landing-page load, if state exists and is < 24h old, show a small "Resume where you left off? / 继续上次？/ ¿Continuar donde lo dejaste?" link below the Start button.

21. **Accessibility audit.** Tab through every page. Verify focus rings visible, keyboard-only navigation works, all interactive elements have accessible names, `aria-live` regions announce page changes, color contrast ≥ 4.5:1 (run a quick check with browser devtools).

22. **Mobile QA.** Test in Chrome DevTools at 375px, 768px, 1024px. Verify no horizontal scroll, tap targets ≥ 48px, language toggle reachable with one thumb, survey items don't wrap awkwardly in any language. Verify PDF generation on at least one Android profile and one iOS profile in DevTools.

23. **Trilingual QA.** Toggle through all 3 languages (EN, 中文, Español) on every screen. Confirm all visible strings switch (header, buttons, items, results — all three sections, footer disclaimer, PDF button). Confirm `html[lang]` updates (`en`, `zh-Hans`, `es`). Confirm Chinese characters and Spanish diacritics (á é í ó ú ñ ¿ ¡) render correctly. Confirm wage formatting respects locale (`$22/hr` in EN, `22 美元/小时` in ZH, `$22 USD/hora` in ES).

24. **Verify.** Run `/verify` skill. Address any findings.

25. **Preview locally.** `bun run dev`, open `http://localhost:3000`, walk through a full survey in each language + PDF download. Confirm the user can confirm visually before deploy (per CLAUDE.md preview-before-deploy rule).

26. **Deploy to Cloudflare Pages.** `wrangler pages deploy dist/ --project-name csc-career-compass`. Verify production URL returns 200 and the survey + PDF generation work end-to-end on the deployed version. Save the production URL into README.md.

27. **Hand off.** Update README.md with the production URL, brief feedback-collection guidance for the EOS (face-to-face debrief protocol for the first 5 client sessions), and a "what's missing" pointer to v1 spec.

## Files to Create/Modify

- `index.html` — minimal shell, mounts `<main id="app">`, loads `src/main.ts`
- `src/main.ts` — entry, hash router, mounts views
- `src/survey.ts` — survey rendering + state machine
- `src/results.ts` — scoring, ranking, results rendering
- `src/i18n.ts` — translation helper
- `src/pdf.ts` — PDF generation (window.print() primary, html2pdf fallback for in-app browsers)
- `src/styles.css` — Civic Plain styles + print CSS
- `src/data/mini-ip.json` — 20 abbreviated O\*NET Mini-IP items, trilingual (en, zh, es from Mi Próximo Paso)
- `src/data/tag-cloud.json` — 24 RIASEC self-descriptor tags, trilingual (Module 1b)
- `src/data/workspaces.json` — 6 illustrated workspace tiles (inline SVG), trilingual (Module 1c)
- `src/data/passions.json` — 12 illustrated activity tiles (inline SVG) with RIASEC weights, trilingual (Module 2)
- `src/data/strengths.json` — 6 natural-strength items with concrete examples, trilingual (Module 3)
- `src/data/values.json` — 6 O\*NET Work Values, trilingual, with plain-language one-liners (Module 4)
- `src/data/skills.json` — 8 NACE Career Readiness Competencies with examples, trilingual (Module 5)
- `src/data/this-or-that.json` — 4 forced-choice palate-cleanser pairs, trilingual
- `src/data/constraints.json` — 4 constraint questions, trilingual (Module 6)
- `src/data/occupations.json` — 15 LA occupations with trilingual titles, training notes, and why-fit templates
- `src/data/riasec-descriptors.json` — 1-paragraph plain-language descriptor for each of the 6 RIASEC letters in all 3 languages (used in Section A "Your interests" summary)
- `src/data/locales/en.json` — English UI strings
- `src/data/locales/zh-Hans.json` — Simplified Chinese UI strings
- `src/data/locales/es.json` — Latin American Spanish UI strings
- `bunfig.toml`, `tsconfig.json`, `package.json`
- `wrangler.toml` — Cloudflare Pages config
- `.gitignore`
- `README.md` — production URL + feedback guidance

## Open Questions

- **Source of the 15 occupations:** Report 05 has the top-20 list. The build session should pick the 15 with the most diverse Holland codes (not all SRI/SIR healthcare) so the recommendation engine has signal in every category. If stuck, default to: Medical Assistant (SIA), CNA (SRI), HHA (SCA), Pharmacy Tech (CIR), Dental Assistant (SRC), EMT (RIS), Bookkeeper (CRE), Paralegal (CSI), IT Support (RCI), CDL Driver (RCE), HVAC (RIC), Solar Installer (RCI), Early Childhood Educator (SAE), Bilingual Receptionist (CSE), Phlebotomist (RIS).
- **Translation review timeline:**
  - **Chinese:** UI strings + 8 NACE skills + 6 work values + occupation titles + "why fits" templates need a native-Mandarin-reader review before showing a real client. (Mini-IP Chinese statements are also DeepL-drafted — review them too.)
  - **Spanish:** the 30 Mini-IP statements come verbatim from Mi Próximo Paso so they're already validated. UI strings + 8 NACE skills + 6 work values + occupation titles + "why fits" templates still need a native-Spanish-reader (Latin American) review.
  - If review can't happen before client testing, ship English first and add each language same-day after its review pass clears.
- **Feedback capture:** the EOS will collect feedback verbally + on paper for the first round (no in-app survey in v0).
