import { t, pickShort, pickLocalized, getLang, formatWage } from "./i18n";
import type { SurveyState } from "./state";

import miniIpData from "./data/mini-ip.json";
import tagCloudData from "./data/tag-cloud.json";
import workspacesData from "./data/workspaces.json";
import passionsData from "./data/passions.json";
import strengthsData from "./data/strengths.json";
import valuesData from "./data/values.json";
import skillsData from "./data/skills.json";
import totData from "./data/this-or-that.json";
import constraintsData from "./data/constraints.json";
import occupationsData from "./data/occupations.json";
import riasecDescriptors from "./data/riasec-descriptors.json";

type Letter = "R" | "I" | "A" | "S" | "E" | "C";
const LETTERS: Letter[] = ["R", "I", "A", "S", "E", "C"];
const LETTER_INDEX: Record<Letter, number> = { R: 0, I: 1, A: 2, S: 3, E: 4, C: 5 };

interface OccupationEntry {
  id: string;
  soc: string | null;
  title_en: string;
  title_zh: string;
  title_es: string;
  riasec: string;
  riasec_vector: number[];
  wage_la_median_hourly: number;
  job_zone: number;
  english_level: "beginner" | "conversational" | "advanced" | "native";
  work_auth_required: "any" | "us_only";
  time_to_credential_months: number;
  training_note_en: string;
  training_note_zh: string;
  training_note_es: string;
  why_fit_template_en: string[];
  why_fit_template_zh: string[];
  why_fit_template_es: string[];
}

const ENGLISH_LEVEL_RANK: Record<string, number> = {
  beginner: 1,
  conversational: 2,
  advanced: 3,
  native: 4,
};

function emptyVector(): number[] {
  return [0, 0, 0, 0, 0, 0];
}

export function computeRiasecVector(state: SurveyState): number[] {
  const v = emptyVector();
  // Mini-IP Likert: 2/1/0 → add to letter
  for (const item of miniIpData) {
    const a = state.miniIp[item.id];
    if (a === undefined) continue;
    v[LETTER_INDEX[item.riasec as Letter]] += a;
  }
  // Tag cloud: +1 per pick
  for (const tag of tagCloudData) {
    if (state.tags.includes(tag.id)) {
      v[LETTER_INDEX[tag.riasec as Letter]] += 1;
    }
  }
  // Workspace pick: +2 in its letter
  if (state.workspace) {
    const w = workspacesData.find((x) => x.id === state.workspace);
    if (w) v[LETTER_INDEX[w.riasec as Letter]] += 2;
  }
  // Passions: riasec_weight × 1 per chosen tile
  for (const id of state.passions) {
    const p = passionsData.find((x) => x.id === id);
    if (!p) continue;
    for (const letter of LETTERS) {
      const weight = (p.riasec_weight as Record<string, number>)[letter] ?? 0;
      v[LETTER_INDEX[letter]] += weight;
    }
  }
  // This-or-That: +1 in chosen side's letter
  for (const item of totData) {
    const choice = state.tot[item.id];
    if (!choice) continue;
    const side = choice === "a" ? item.a : item.b;
    v[LETTER_INDEX[side.riasec as Letter]] += 1;
  }
  return v;
}

function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  if (mag === 0) return [...v];
  return v.map((x) => x / mag);
}

function cosine(a: number[], b: number[]): number {
  const na = normalize(a);
  const nb = normalize(b);
  let dot = 0;
  for (let i = 0; i < na.length; i++) dot += na[i] * nb[i];
  return dot;
}

function topLetters(v: number[], n: number): Letter[] {
  const ranked = LETTERS.map((l, i) => ({ l, val: v[i] }))
    .sort((a, b) => b.val - a.val);
  return ranked.slice(0, n).map((x) => x.l);
}

function filterOccupationsByConstraints(state: SurveyState): OccupationEntry[] {
  const userEnglish = ENGLISH_LEVEL_RANK[state.constraints.english ?? "native"] ?? 4;
  // education -> level
  const educationOpt = constraintsData
    .find((c) => c.id === "education")?.options
    .find((o) => o.id === state.constraints.education);
  const userEdu = ((educationOpt as { level?: number })?.level) ?? 5;
  // work auth
  const workAuthOpt = constraintsData
    .find((c) => c.id === "work_auth")?.options
    .find((o) => o.id === state.constraints.work_auth);
  const userAuth = ((workAuthOpt as { value?: string })?.value) ?? "us_only";

  return (occupationsData as OccupationEntry[]).filter((occ) => {
    if (ENGLISH_LEVEL_RANK[occ.english_level] > userEnglish + 1) return false;
    if (occ.job_zone > userEdu + 1) return false;
    if (occ.work_auth_required === "us_only" && userAuth !== "us_only") return false;
    return true;
  });
}

export function rankOccupations(state: SurveyState): OccupationEntry[] {
  const userVec = computeRiasecVector(state);
  const candidates = filterOccupationsByConstraints(state);
  if (candidates.length === 0) return [];
  const scored = candidates
    .map((occ) => ({ occ, score: cosine(userVec, occ.riasec_vector) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.occ);
}

// ===== Rendering =====

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

function renderInterestsBlock(state: SurveyState): string {
  const v = computeRiasecVector(state);
  const tops = topLetters(v, 2);
  const desc = riasecDescriptors as Record<Letter, { desc_en: string; desc_zh: string; desc_es: string }>;
  const primary = tops[0];
  const paragraph = pickLocalized(desc[primary] as unknown as Record<string, unknown>, "desc");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.interests_h"))}</h3>
      <p>${escapeHtml(paragraph)}</p>
    </section>
  `;
}

function renderPassionsBlock(state: SurveyState): string {
  const tiles = state.passions
    .map((id) => passionsData.find((p) => p.id === id))
    .filter((p): p is (typeof passionsData)[number] => Boolean(p));
  if (tiles.length === 0) return "";
  const items = tiles.map((p) => `<li>${escapeHtml(pickLocalized(p as unknown as Record<string, unknown>, "label"))}</li>`).join("");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.passions_h"))}</h3>
      <p class="lead-in">${escapeHtml(t("results.passions_lead"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderAttributesBlock(state: SurveyState): string {
  const picks = state.values
    .map((id) => valuesData.find((v) => v.id === id))
    .filter((v): v is (typeof valuesData)[number] => Boolean(v));
  if (picks.length === 0) return "";
  const items = picks.map((v) => {
    const title = pickShort(v as unknown as Record<string, unknown>);
    const one = pickLocalized(v as unknown as Record<string, unknown>, "one_liner");
    return `<li><strong>${escapeHtml(title)}</strong> <span class="example">— ${escapeHtml(one)}</span></li>`;
  }).join("");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.attrs_h"))}</h3>
      <p class="lead-in">${escapeHtml(t("results.attrs_lead"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderStrengthsBlock(state: SurveyState): string {
  const comesEasily = strengthsData.filter((s) => state.strengths[s.id] === 2);
  if (comesEasily.length === 0) return "";
  const items = comesEasily.slice(0, 3).map((s) => {
    const label = pickLocalized(s as unknown as Record<string, unknown>, "label");
    const example = pickLocalized(s as unknown as Record<string, unknown>, "example");
    return `<li><strong>${escapeHtml(label)}</strong><span class="example">${escapeHtml(example)}</span></li>`;
  }).join("");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.strengths_h"))}</h3>
      <p class="lead-in">${escapeHtml(t("results.strengths_lead"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderSoftSkillsBlock(state: SurveyState): string {
  const have = skillsData.filter((s) => state.skills[s.id] === 2).slice(0, 3);
  if (have.length === 0) return "";
  const items = have.map((s) => {
    const name = pickLocalized(s as unknown as Record<string, unknown>, "name");
    const ex = pickLocalized(s as unknown as Record<string, unknown>, "example");
    return `<li><strong>${escapeHtml(name)}</strong><span class="example">${escapeHtml(ex)}</span></li>`;
  }).join("");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.soft_h"))}</h3>
      <p class="lead-in">${escapeHtml(t("results.soft_lead"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderGrowingBlock(state: SurveyState): string {
  const growing = skillsData.filter((s) => state.skills[s.id] === 1);
  if (growing.length === 0) return "";
  const items = growing.map((s) => {
    const name = pickLocalized(s as unknown as Record<string, unknown>, "name");
    return `<li>${escapeHtml(name)}</li>`;
  }).join("");
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.growing_h"))}</h3>
      <p class="lead-in">${escapeHtml(t("results.growing_lead"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderOccupationCard(occ: OccupationEntry, state: SurveyState): string {
  const title = pickLocalized(occ as unknown as Record<string, unknown>, "title");
  const training = pickLocalized(occ as unknown as Record<string, unknown>, "training_note");
  const lang = getLang();
  const whyKey = lang === "zh-Hans"
    ? "why_fit_template_zh"
    : lang === "es"
    ? "why_fit_template_es"
    : "why_fit_template_en";
  const bullets = (occ as unknown as Record<string, string[]>)[whyKey] ?? occ.why_fit_template_en;
  const wage = formatWage(occ.wage_la_median_hourly);
  const months = `${occ.time_to_credential_months} ${t("results.months")}`;
  const items = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  return `
    <article class="occ-card">
      <h3>${escapeHtml(title)}</h3>
      <p class="meta">
        <strong>${escapeHtml(t("results.wage_label"))}:</strong> ${escapeHtml(wage)} ·
        <strong>${escapeHtml(t("results.time_label"))}:</strong> ${escapeHtml(months)}
      </p>
      <p class="meta"><strong>${escapeHtml(t("results.training_label"))}:</strong> ${escapeHtml(training)}</p>
      <div class="why">
        <h4>${escapeHtml(t("results.why_fit_h"))}</h4>
        <ul>${items}</ul>
      </div>
    </article>
  `;
  // Note: omitting unused `state` warning — kept for parity if templates ever reference state.
  void state;
}

export function renderResults(state: SurveyState, root: HTMLElement): void {
  const occs = rankOccupations(state);
  const occCards = occs.length > 0
    ? occs.map((o) => renderOccupationCard(o, state)).join("")
    : `<p>${escapeHtml(t("results.no_matches"))}</p>`;

  root.innerHTML = `
    <article class="results" aria-labelledby="r-title">
      <h1 id="r-title">${escapeHtml(t("results.title"))}</h1>

      <section class="section" aria-labelledby="sec-a">
        <h2 id="sec-a">${escapeHtml(t("results.section_a_title"))}</h2>
        ${renderInterestsBlock(state)}
        ${renderPassionsBlock(state)}
        ${renderAttributesBlock(state)}
        ${renderStrengthsBlock(state)}
        ${renderSoftSkillsBlock(state)}
        ${renderGrowingBlock(state)}
      </section>

      <section class="section" aria-labelledby="sec-b">
        <h2 id="sec-b">${escapeHtml(t("results.section_b_title"))}</h2>
        <p>${escapeHtml(t("results.section_b_intro"))}</p>
        ${occCards}
      </section>

      <section class="section" aria-labelledby="sec-c">
        <h2 id="sec-c">${escapeHtml(t("results.section_c_title"))}</h2>
        <div class="next-step-card" id="pdf-controls">
          <button type="button" class="btn block" data-action="pdf">${escapeHtml(t("results.pdf_button"))}</button>
          <p class="helper">${escapeHtml(t("results.pdf_helper"))}</p>
          <p class="helper">${escapeHtml(t("results.specialist_note"))}</p>
          <p class="restart">
            ${escapeHtml(t("results.restart_note"))} <a href="#/" data-action="restart">${escapeHtml(t("results.restart_link"))}</a>
          </p>
        </div>
      </section>

      <p class="print-only print-footer">${escapeHtml(t("footer.disclaimer"))}</p>
    </article>
  `;
}
