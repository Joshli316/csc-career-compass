# CSC Career Compass — Design Doc (v0)

## Problem

CSC clients (new immigrants, low-income adults, recent grads) arrive with the same opening line: *"I need a job."* But underneath that sentence is a deeper problem — they **don't yet have language for their own skills, interests, and natural attributes**. Without that language, they can't choose a career, can't write a resume, can't answer "tell me about yourself" in an interview, can't sort which trainings are worth their time.

The tool's job is to **give the client that language**: name what they're good at, name what they're drawn to, name what energizes them — and then connect those names to real LA careers and wages.

A useful downstream effect is that the client walks into their CSC Employment Outreach appointment with self-knowledge already in hand, so the Specialist can focus on planning instead of discovery. But that's a *side benefit*, not the product. The product is the client's clarified picture of themselves.

## Target users (v0)

Three real CSC client types — all from Report 04 personas:

1. **Mei Lin** — Cantonese-speaking former teacher, B1 English, currently dishwashing. Reads Chinese.
2. **María** — DACA, Spanish/English bilingual, dental receptionist. Reads Spanish + English.
3. **Andre** — Cal State LA 2024 grad, English-native, DoorDashing. Reads English fine.

v0 audience = English-, Chinese-, and Spanish-reading CSC clients (the three largest LEP/bilingual segments in CSC's catchment). Vietnamese and Traditional Chinese ship in v1 after feedback.

## User journey

```
Client arrives at CSC (or sees a QR code in the waiting room).
   │
   ▼
Opens https://career-compass.pages.dev on their phone.
   │
   ▼
[Landing]  "Discover your skills, interests, and best-fit careers.
            8 minutes. Free. No account."
           Picks EN or 中文.
   │
   ▼
[Survey — 6 short modules with mixed question formats, ~8–9 minutes]
   1. Interests          — 20 Mini-IP statements + tag cloud + image picker
                            (3-point Likert + tag-pick + visual)
   2. Passions           — pick 3 of 12 illustrated activity tiles
                            ("what would you do even if no one was watching?")
   3. Natural strengths  — 6 items, "Comes easily / I can do it / Hard for me"
   4. Natural attributes — top-3 of 6 work-value cards
   5. Soft skills        — 8 NACE competencies, "Have / Growing / Not yet"
   6. Reality            — 4 constraint questions
   + scattered between: 4 "This or That" forced-choice palate cleansers
   │
   ▼
[Results — three sections in order]
   1. "Here's what we heard about YOU" — six sub-headings:
       • Your interests          (plain-language RIASEC summary)
       • What you're passionate about  (the 3 tiles you picked)
       • Your natural attributes  (the 3 values that energize you)
       • What you're naturally good at  (your "comes easily" strengths)
       • Your soft skills         (top 3 NACE competencies marked "Have")
       • Skills you want to grow  (any NACE marked "Growing")
       → THIS is the crystallization. The client now has rich,
         distinct language for who they are at work.
   2. "Careers in LA that fit who you are" — 3 occupation cards
       • Plain-language title in EN / 中文 / Español
       • LA median hourly wage
       • 1-line training note
       • 3-bullet "Why this fits you" explanation
   3. "Optional next step"
       Download PDF + Print + small footer pointing to CSC visit.
```

## What this product IS (v0)

- An **assessment** that crystallizes **six dimensions** for the client:
  1. **Interests** — what kind of work draws them (RIASEC via O\*NET Mini-IP + a visual workplace picker + a "describe you" tag cloud)
  2. **Passions** — what they'd do even if no one was watching (illustrated tile picker)
  3. **Natural attributes** — what energizes them at work (O\*NET Work Values top-3)
  4. **Natural strengths** — what comes easily to them (6-item "comes easily / I can do it / hard for me" scale)
  5. **Soft skills** — what they've developed, what they want to grow (NACE 8 Career Readiness Competencies)
  6. **Matching careers** — 3 specific LA occupations that line up with 1–5
- A free, trilingual EN / 中文 / Español self-discovery tool, ~8–9 min on a phone.
- A **downloadable PDF + printable handout** the client can take home and bring to CSC (side benefit).
- Built around publicly validated instruments: O\*NET Mini Interest Profiler, Mi Próximo Paso (Spanish O\*NET), O\*NET 6 Work Values, NACE 8 Career Readiness Competencies, plus original short scales for passions and natural strengths.
- A **test instrument** for v1 — we will throw away anything that doesn't survive client feedback.

### Why six dimensions, not three
The client should walk away with rich, distinct language for who they are at work — not a single muddled "personality type" label. Each report sub-heading uses different words for a different facet:
- **Interests** ≠ **Passions** (interests = what activities appeal; passions = what activities you'd do for free)
- **Natural attributes** ≠ **Natural strengths** (attributes = what *values* you bring; strengths = what *abilities* come easily)
- **Natural strengths** ≠ **Soft skills** (strengths = innate; skills = learned and developed)

The client may not have words to articulate these distinctions on their own — the assessment gives them the words.

## What this product IS NOT (v0)

- Not a job board.
- Not a personality test.
- Not a resume builder.
- Not a credential evaluator.
- Not a training-program finder. (v0 names a representative LA training option per occupation but doesn't promise an exhaustive list.)
- Not a funding-aid wizard.
- Not a replacement for the Specialist appointment — it leads *into* it.
- Not accessible to Spanish or Vietnamese speakers yet — they ship in v1.

## Key design rationale

### Why O\*NET Mini-IP and not a custom interest list
30 items, α 0.78–0.85, free, public domain, maps directly to all 1,016 O\*NET occupations. Existing Spanish translation (Mi Próximo Paso). Already validated on adults with varying education levels. Anything we'd write ourselves would be worse and untested.

### Why include work-values and soft-skills in v0 (reversed from earlier draft)
An earlier v0 spec cut these to hit a 5–7 min target. That was the wrong tradeoff. The user explicitly asked the tool to crystallize *skills, interests, and natural attributes* — cutting two of those three would mean the tool fails at its named job. The extra ~2 minutes of survey is worth the assessment being complete on all four dimensions the user named. Drop-off risk past 8 minutes is real but acceptable for the assessment dimensions to actually be present.

### Why "Civic Plain" design vibe
CSC's audience overlaps the audience for GetCalFresh, ImmigrationHelp.org, USA.gov — they're used to trusting (or distrusting) civic-style design. Anything too friendly/playful will be read as marketing or a scam. Tall whitespace, system fonts, high-contrast blue/white, and no gradients communicate "this is a real public service."

### Why no login, no account, no SSN, no PII storage
~13% of LA County is undocumented; many CSC clients are DACA, refugee, or asylum-seeking. *Any* PII collection — even a name field — kills trust and engagement. v0 stores nothing server-side. localStorage only, on the user's phone, that they can clear themselves.

### Why a printable handout instead of a digital handoff
- Many clients don't bring phones with charge to appointments.
- Many CSC Specialists work with paper files.
- A printed result becomes a physical artifact the client owns.
- v0 specifically *avoids* the 6-character handoff code from v1 — that's a feature to validate after seeing whether clients even bring the page back.

### Why trilingual (EN + 中文 + Español) in v0
Per Report 04, Chinese-born CSC clients have a 71% LEP rate and Spanish-speaking CSC clients are an equally large segment in the LA catchment. English-only v0 would test only the upper-English-skill cohort, the smallest segment by need. Adding Simplified Chinese and Spanish roughly triples the addressable test audience.

Spanish content benefits from existing public-domain translations: the **O\*NET Mini Interest Profiler is already translated to Latin American Spanish** as part of Mi Próximo Paso (the Spanish My Next Move). We reuse those statements verbatim. Work values and NACE competencies need fresh translation but are short.

### Why not Traditional Chinese or Vietnamese in v0
Most newer Chinese immigrants in CSC's catchment read Simplified. Older Cantonese-speaking clients largely read either. Vietnamese has no public-domain O\*NET translation — would require ~4 hours of manual translation for the 30 IP statements alone, and v0 needs to ship in 1 day. v1 adds both as separate locales per Report 08.

### Why "Download PDF" and not just "Print"
Clients on phones often don't know that the print sheet has a "Save as PDF" option. A single, labeled "Download PDF / 下载 PDF / Descargar PDF" button removes the guesswork and produces an artifact the client can:
- Save in their phone's Files app and pull up at the CSC appointment
- AirDrop or send via WeChat / WhatsApp to family for input
- Email to themselves
- Hand to the CSC Specialist as a physical printout (CSC prints from PDF)
The PDF and the print path produce the same content; the button is just a more reliable UX entry point.

## Success criteria for v0 testing (next 1–2 weeks)

The primary test is whether the assessment helps the client see themselves clearly. Career matches are secondary.

1. **"Sounds like me" — interests/attributes/skills.** Ask the client after they finish: *"Did the summary of your interests, attributes, and skills sound like you?"* ≥ 7 of 10 say yes.
2. **"Sounds like me" — careers.** *"Did the 3 careers feel like real options for you?"* ≥ 6 of 10 say yes.
3. **Completion rate** ≥ 60% of clients who start finish the survey.
4. **Average time** in 7–10 minute range.
5. **Did it give the client language?** When the Specialist asks them in the appointment "what are you good at?" or "what do you want?", does the client now answer with specifics they got from the tool — instead of "I don't know"? Specialist judgment, qualitative.
6. **No PII leakage incidents.**

If criteria 1, 2, 3, 5 are met, build v1.
If criterion 1 is < 70%, the assessment dimensions need work — the survey items don't translate to summary language the client recognizes. Fix that before adding features.
If criterion 2 is < 60%, the occupation pool is wrong — re-curate before adding features.
If completion rate < 60%, the survey is too long — shrink the Mini-IP from 30 to 15 items before adding features.

## Source material

- O\*NET Interest Profiler Short Form: https://www.onetcenter.org/IP.html
- Report 02 — Assessment frameworks (RIASEC justification)
- Report 03 — Survey design best practices (item count, plain language)
- Report 04 — Target audience and personas
- Report 05 — Top-20 LA occupations (we pick 15 for v0)
- Report 09 — O\*NET deep dive
- Report 10 — Recommendation engine logic (we use a simplified version in v0)
- Report 12 — Synthesis design plan (v1 spec)
