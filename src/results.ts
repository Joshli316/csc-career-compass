import { t, pickShort, pickLocalized, formatWage } from "./i18n";
import type { SurveyState } from "./state";
import { escapeHtml } from "./util";
import {
  computeRiasecVector,
  getInterestAreas,
  topLetters,
  type InterestArea,
  type Letter,
  type OccupationEntry,
} from "./scoring";

import passionsData from "./data/passions.json";
import strengthsData from "./data/strengths.json";
import valuesData from "./data/values.json";
import skillsData from "./data/skills.json";
import barriersData from "./data/barriers.json";
import riasecDescriptors from "./data/riasec-descriptors.json";

export { computeRiasecVector, getInterestAreas } from "./scoring";

type AreaDescriptor = { name_en: string; name_zh: string; name_es: string; desc_en: string; desc_zh: string; desc_es: string };

// ===== Rendering =====

function renderInterestsBlock(primary: Letter): string {
  const desc = riasecDescriptors as Record<Letter, { desc_en: string; desc_zh: string; desc_es: string }>;
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
  const body = comesEasily.length === 0
    ? `<p class="lead-in">${escapeHtml(t("results.strengths_empty"))}</p>`
    : `
      <p class="lead-in">${escapeHtml(t("results.strengths_lead"))}</p>
      <ul>${comesEasily.slice(0, 3).map((s) => {
        const label = pickLocalized(s, "label");
        const example = pickLocalized(s, "example");
        return `<li><strong>${escapeHtml(label)}</strong><span class="example">${escapeHtml(example)}</span></li>`;
      }).join("")}</ul>
    `;
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.strengths_h"))}</h3>
      ${body}
    </section>
  `;
}

function renderSoftSkillsBlock(state: SurveyState): string {
  const have = skillsData.filter((s) => state.skills[s.id] === 2).slice(0, 3);
  const body = have.length === 0
    ? `<p class="lead-in">${escapeHtml(t("results.soft_empty"))}</p>`
    : `
      <p class="lead-in">${escapeHtml(t("results.soft_lead"))}</p>
      <ul>${have.map((s) => {
        const name = pickLocalized(s, "name");
        const ex = pickLocalized(s, "example");
        return `<li><strong>${escapeHtml(name)}</strong><span class="example">${escapeHtml(ex)}</span></li>`;
      }).join("")}</ul>
    `;
  return `
    <section class="summary-block">
      <h3>${escapeHtml(t("results.soft_h"))}</h3>
      ${body}
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

function renderBarriersCallout(state: SurveyState): string {
  if (!state.barriers || state.barriers.length === 0) return "";
  const picks = state.barriers
    .map((id) => barriersData.find((b) => b.id === id))
    .filter((b): b is (typeof barriersData)[number] => Boolean(b));
  if (picks.length === 0) return "";
  const items = picks.map((b) => `<li>${escapeHtml(pickLocalized(b, "label"))}</li>`).join("");
  return `
    <section class="section barriers-callout" aria-labelledby="sec-barriers">
      <h2 id="sec-barriers">${escapeHtml(t("results.barriers_callout_h"))}</h2>
      <p>${escapeHtml(t("results.barriers_callout_intro"))}</p>
      <ul>${items}</ul>
    </section>
  `;
}

function renderSampleRole(occ: OccupationEntry): string {
  const title = pickLocalized(occ, "title");
  const entry = formatWage(occ.wage_la_entry_hourly);
  const median = formatWage(occ.wage_la_median_hourly);
  const months = `${occ.time_to_credential_months} ${t("results.months")}`;
  const wageRange = occ.wage_la_entry_hourly === occ.wage_la_median_hourly
    ? entry
    : `${entry} → ${median}`;
  return `<li><strong>${escapeHtml(title)}</strong> <span class="example">${escapeHtml(wageRange)} · ${escapeHtml(months)}</span></li>`;
}

function renderInterestArea(area: InterestArea, rank: number): string {
  const desc = (riasecDescriptors as Record<Letter, AreaDescriptor>)[area.letter];
  const name = pickLocalized(desc, "name");
  const paragraph = pickLocalized(desc, "desc");
  const samples = area.samples.length > 0
    ? `
      <h4>${escapeHtml(t("results.sample_roles_h"))}</h4>
      <p class="wage-legend">${escapeHtml(t("results.wage_legend"))}</p>
      <ul class="sample-roles">${area.samples.map(renderSampleRole).join("")}</ul>
    `
    : `<p class="lead-in">${escapeHtml(t("results.no_samples_in_area"))}</p>`;
  return `
    <article class="interest-area" data-rank="${rank}">
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(paragraph)}</p>
      ${samples}
    </article>
  `;
}

export function renderResults(state: SurveyState, root: HTMLElement): void {
  const areas = getInterestAreas(state);
  // Single source of truth for the primary RIASEC letter so Section A's
  // narrative and Section B's first card cannot disagree on tie-breaks.
  const primary: Letter = areas[0]?.letter ?? topLetters(computeRiasecVector(state), 1)[0] ?? "R";
  const areaCards = areas.map((a, i) => renderInterestArea(a, i + 1)).join("");

  root.innerHTML = `
    <article class="results" aria-labelledby="r-title">
      <p class="complete-badge"><span aria-hidden="true">✓</span> ${escapeHtml(t("results.complete_badge"))}</p>
      <h1 id="r-title">${escapeHtml(t("results.title"))}</h1>

      <section class="section" aria-labelledby="sec-a">
        <h2 id="sec-a">${escapeHtml(t("results.section_a_title"))}</h2>
        ${renderInterestsBlock(primary)}
        ${renderPassionsBlock(state)}
        ${renderAttributesBlock(state)}
        ${renderStrengthsBlock(state)}
        ${renderSoftSkillsBlock(state)}
        ${renderGrowingBlock(state)}
      </section>

      <section class="section" aria-labelledby="sec-b">
        <h2 id="sec-b">${escapeHtml(t("results.section_b_title"))}</h2>
        <p>${escapeHtml(t("results.section_b_intro"))}</p>
        ${areaCards}
      </section>

      ${renderBarriersCallout(state)}

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
