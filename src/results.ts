import { t, pickShort, pickLocalized, pickLocalizedArray, formatWage } from "./i18n";
import type { SurveyState } from "./state";
import { escapeHtml } from "./util";
import {
  computeRiasecVector,
  rankOccupations,
  topLetters,
  type Letter,
  type OccupationEntry,
} from "./scoring";

import passionsData from "./data/passions.json";
import strengthsData from "./data/strengths.json";
import valuesData from "./data/values.json";
import skillsData from "./data/skills.json";
import riasecDescriptors from "./data/riasec-descriptors.json";

export { computeRiasecVector, rankOccupations } from "./scoring";

// ===== Rendering =====

function renderInterestsBlock(state: SurveyState): string {
  const v = computeRiasecVector(state);
  const tops = topLetters(v, 2);
  const desc = riasecDescriptors as Record<Letter, { desc_en: string; desc_zh: string; desc_es: string }>;
  const primary = tops[0];
  const paragraph = pickLocalized(desc[primary], "desc");
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
  const items = tiles.map((p) => `<li>${escapeHtml(pickLocalized(p, "label"))}</li>`).join("");
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
    const title = pickShort(v);
    const one = pickLocalized(v, "one_liner");
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
    const label = pickLocalized(s, "label");
    const example = pickLocalized(s, "example");
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
    const name = pickLocalized(s, "name");
    const ex = pickLocalized(s, "example");
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
    const name = pickLocalized(s, "name");
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

function renderOccupationCard(occ: OccupationEntry): string {
  const title = pickLocalized(occ, "title");
  const training = pickLocalized(occ, "training_note");
  const bullets = pickLocalizedArray(occ, "why_fit_template");
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
}

export function renderResults(state: SurveyState, root: HTMLElement): void {
  const occs = rankOccupations(state);
  const occCards = occs.length > 0
    ? occs.map((o) => renderOccupationCard(o)).join("")
    : `<p>${escapeHtml(t("results.no_matches"))}</p>`;

  root.innerHTML = `
    <article class="results" aria-labelledby="r-title">
      <p class="complete-badge"><span aria-hidden="true">✓</span> ${escapeHtml(t("results.complete_badge"))}</p>
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
