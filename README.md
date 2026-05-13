# CSC Career Compass — v0

An ~8 minute trilingual (English, Simplified Chinese, Latin American Spanish) career **assessment** for Chinatown Service Center clients in Los Angeles. Crystallizes a client's interests, natural attributes, and soft skills, then matches them to 3 LA occupations. Produces a downloadable PDF.

This is a **v0 test build**. The full-featured v1 spec lives in `~/Desktop/Projects/Research/2026-05-12-career-readiness-tool/12-design-plan.md`.

## How it works

1. Client opens the URL on their phone (or a CSC kiosk).
2. Picks English, 中文, or Español.
3. Moves through **6 short modules** in ~8–9 minutes, with 5 different question formats so it doesn't feel like a tax form:
   - **Interests** — 20 short statements (Like / Not sure / Dislike), a tag-cloud "tap any words that describe you," and a 1-of-6 illustrated-workspace picker.
   - **Passions** — pick 3 of 12 illustrated tiles ("what would you do even if no one was watching?").
   - **Natural strengths** — 6 items rated "Comes easily / I can do it / Hard for me."
   - **Natural attributes** — pick your top 3 of 6 things that energize you at work.
   - **Soft skills** — 8 NACE competencies rated "Have / Growing / Not yet" with concrete examples.
   - **Reality** — 4 short constraint questions.
   - Plus 4 "This or That" forced-choice palate cleansers scattered between modules.
4. Sees three sections on the results page:
   - **"Here's what we heard about YOU"** — six sub-headings: interests, what you're passionate about, natural attributes, what you're naturally good at, soft skills, skills you want to grow.
   - **"Careers in LA that fit who you are"** — 3 occupation cards with LA wage + training note.
   - **"Optional next step"** — Download PDF or Print (the same OS print sheet on phones offers "Save as PDF" or "Send to printer"). Then bring it to CSC.
5. Saves the PDF, prints it, or takes a screenshot — and brings it to their CSC Employment Outreach appointment.

**Accessibility features built in:**
- 18px body text, 4.5:1 contrast, 48px tap targets, keyboard-navigable.
- Persistent progress bar + step counter so the client always knows where they are.
- All data stays on the user's device in their browser. No account, no server, no PII collected — see footer disclaimer on every page.

**Deliberately cut from v0 (planned for v0.1 after first client sessions):**
read-aloud audio toggle, dedicated About page, in-app "Did this sound like you?" feedback strip, Web Share API. v0 keeps the survey + scoring + results + PDF tight so client sessions can start fast and feedback comes face-to-face.

## For the Employment Outreach Specialist — face-to-face debrief

For the first 5–10 client sessions, the EOS sits with the client right after they finish (or before — if the client picked up the QR code outside their appointment). After they hand over the PDF, ask the client:

1. **"Did the summary of your interests, attributes, and skills sound like you?"** — target ≥7 of 10 yes.
2. **"Did the 3 careers feel like real options for you?"** — target ≥6 of 10 yes.
3. **"What words from the summary will you use when someone asks what you're good at?"** — listening for whether the tool actually gave them language.
4. **"Were there any words on the screen that felt confusing or wrong in your language?"** — Chinese + Spanish locales are **DeepL drafts** (Mini-IP Spanish is verbatim Mi Próximo Paso, validated; everything else is draft). Note specific wording issues for same-day fix.
5. **"What was the part you almost stopped at?"** — drop-off signal.

Capture answers on paper, not in the app. Send notes to the build maintainer at the end of each week so v0.1 can be scoped against actual signal.

Translation review status:
- 🟢 English: native-authored, instrument items public-domain (O*NET Mini-IP).
- 🟡 Spanish: Mini-IP items public-domain (Mi Próximo Paso); UI strings + NACE skills + work values + occupation titles + why-fit templates are DeepL drafts pending native Latin American Spanish review.
- 🟡 Chinese (Simplified): all strings are DeepL drafts pending native Mandarin review.

The footer disclaimer on every page positions this as a starting point, not professional counseling, in all three languages.

## Running the tests

```bash
npm install            # one-time
npm test               # 55 unit tests (scoring + state machine)
npm run test:e2e:install  # one-time: download chromium (~150 MB)
npm run test:e2e          # 12 Playwright E2E specs (mobile + desktop)
```

CI can run `npm test` cheaply on every push; reserve `test:e2e` for pre-deploy.

## Files

- `CLAUDE.md` — project context for Claude Code
- `plan.md` — implementation plan with Design Spec
- `docs/design.md` — problem statement + user journey + scope decisions
- `src/` — source code (created during build session)
- `dist/` — build output (gitignored, created during build)

## Production URL

**https://csc-career-compass.pages.dev/**

Deployed to Cloudflare Pages, production branch `main`. Headers include CSP
(SHA-256 hash for the inline lang-bootstrap script), X-Frame-Options DENY,
nosniff, Permissions-Policy. First deploy: 2026-05-12.

## Roadmap

v0 → test with 10–20 real CSC clients over 1–2 weeks → use findings to scope v1.

v1 adds: Vietnamese + Traditional Chinese locales; full readiness snapshot (5 yes/no items); Specialist 1-page brief via 6-character handoff code; training-provider directory with funding triage; foreign-credential evaluation pointer (WES/ECE/IEN); live O\*NET and BLS wage APIs; expanded 150-occupation pool.
