import { t, pickShort, getLang, pickLocalized } from "./i18n";
import type { SurveyState, LikertValue, AbilityValue, SkillValue } from "./state";
import { emptyState, loadState, saveState } from "./state";

import miniIpData from "./data/mini-ip.json";
import tagCloudData from "./data/tag-cloud.json";
import workspacesData from "./data/workspaces.json";
import passionsData from "./data/passions.json";
import strengthsData from "./data/strengths.json";
import valuesData from "./data/values.json";
import skillsData from "./data/skills.json";
import totData from "./data/this-or-that.json";
import constraintsData from "./data/constraints.json";

type Page =
  | { kind: "interests-likert"; pageOfModule: number; totalPagesInModule: number; items: typeof miniIpData }
  | { kind: "tot"; index: 0 | 1 | 2 | 3 }
  | { kind: "interests-tags" }
  | { kind: "interests-visual" }
  | { kind: "passions" }
  | { kind: "strengths" }
  | { kind: "values" }
  | { kind: "skills" }
  | { kind: "constraints" };

const MINI_IP_PER_PAGE = 5;

function buildPageList(): Page[] {
  const pages: Page[] = [];
  // Module 1a: 4 Likert pages of 5 items each
  for (let i = 0; i < 4; i++) {
    pages.push({
      kind: "interests-likert",
      pageOfModule: i + 1,
      totalPagesInModule: 4,
      items: miniIpData.slice(i * MINI_IP_PER_PAGE, (i + 1) * MINI_IP_PER_PAGE),
    });
  }
  pages.push({ kind: "tot", index: 0 });
  pages.push({ kind: "interests-tags" });
  pages.push({ kind: "tot", index: 1 });
  pages.push({ kind: "interests-visual" });
  pages.push({ kind: "passions" });
  pages.push({ kind: "tot", index: 2 });
  pages.push({ kind: "strengths" });
  pages.push({ kind: "values" });
  pages.push({ kind: "tot", index: 3 });
  pages.push({ kind: "skills" });
  pages.push({ kind: "constraints" });
  return pages;
}

const PAGES = buildPageList();
const TOTAL_PAGES = PAGES.length;

let state: SurveyState = ((): SurveyState => {
  const saved = loadState();
  return saved ?? emptyState(getLang());
})();

let errorMessage: string | null = null;

function getCurrentPage(): Page {
  const idx = Math.max(0, Math.min(state.pageIndex, TOTAL_PAGES - 1));
  return PAGES[idx];
}

function progressPct(): number {
  return Math.round((state.pageIndex / Math.max(1, TOTAL_PAGES)) * 100);
}

function setError(msg: string | null) {
  errorMessage = msg;
}

function clearError() {
  errorMessage = null;
}

// ===== Renderers per page type =====

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

function renderModuleIntro(titleKey: string, whyKey: string): string {
  return `
    <section class="module-intro" aria-labelledby="mod-title">
      <h2 id="mod-title">${escapeHtml(t(titleKey))}</h2>
      <p>${escapeHtml(t(whyKey))}</p>
    </section>
  `;
}

function renderLikertPage(page: Page & { kind: "interests-likert" }): string {
  const isFirstOfModule = page.pageOfModule === 1;
  const intro = isFirstOfModule
    ? renderModuleIntro("modules.interests_likert.title", "modules.interests_likert.why")
    : "";
  const labels = {
    2: t("scale.like"),
    1: t("scale.neutral"),
    0: t("scale.dislike"),
  };
  const rows = page.items.map((item) => {
    const v = state.miniIp[item.id];
    const label = pickShort(item as unknown as Record<string, unknown>);
    return `
      <li class="q-row" data-qid="${item.id}">
        <span class="label">${escapeHtml(label)}</span>
        <div class="opts" role="radiogroup" aria-label="${escapeHtml(label)}">
          ${[2, 1, 0].map((val) => `
            <button type="button" class="opt" data-action="likert" data-qid="${item.id}" data-val="${val}"
              aria-pressed="${v === val ? "true" : "false"}" role="radio" aria-checked="${v === val ? "true" : "false"}">
              ${escapeHtml(labels[val as 0 | 1 | 2])}
            </button>
          `).join("")}
        </div>
      </li>
    `;
  }).join("");
  return `
    ${intro}
    <ul class="q-list" aria-label="${escapeHtml(t("modules.interests_likert.title"))}">${rows}</ul>
  `;
}

function renderTagsPage(): string {
  const intro = renderModuleIntro("modules.interests_tags.title", "modules.interests_tags.why");
  const chips = tagCloudData.map((tag) => {
    const label = pickShort(tag as unknown as Record<string, unknown>);
    const active = state.tags.includes(tag.id);
    return `
      <button type="button" class="chip" data-action="tag" data-id="${tag.id}" aria-pressed="${active}">
        ${escapeHtml(label)}
      </button>
    `;
  }).join("");
  return `${intro}<div class="tag-cloud" role="group" aria-label="${escapeHtml(t("modules.interests_tags.title"))}">${chips}</div>`;
}

function renderWorkspacePage(): string {
  const intro = renderModuleIntro("modules.interests_visual.title", "modules.interests_visual.why");
  const tiles = workspacesData.map((w) => {
    const label = pickLocalized(w as unknown as Record<string, unknown>, "label");
    const active = state.workspace === w.id;
    return `
      <button type="button" class="tile" data-action="workspace" data-id="${w.id}" aria-pressed="${active}">
        <span class="svg-wrap" aria-hidden="true">${w.svg_inline}</span>
        <span class="label">${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
  return `${intro}<div class="tile-grid" role="radiogroup" aria-label="${escapeHtml(t("modules.interests_visual.title"))}">${tiles}</div>`;
}

function renderPassionsPage(): string {
  const intro = renderModuleIntro("modules.passions.title", "modules.passions.why");
  const tiles = passionsData.map((p) => {
    const label = pickLocalized(p as unknown as Record<string, unknown>, "label");
    const active = state.passions.includes(p.id);
    const order = state.passions.indexOf(p.id);
    return `
      <button type="button" class="tile" data-action="passion" data-id="${p.id}" aria-pressed="${active}">
        ${active ? `<span class="count-badge" aria-hidden="true">${order + 1}</span>` : ""}
        <span class="svg-wrap" aria-hidden="true">${p.svg_inline}</span>
        <span class="label">${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
  const counter = t("survey.selected_count")
    .replace("{n}", String(state.passions.length))
    .replace("{max}", "3");
  return `
    ${intro}
    <div class="tile-grid" role="group" aria-label="${escapeHtml(t("modules.passions.title"))}">${tiles}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderStrengthsPage(): string {
  const intro = renderModuleIntro("modules.strengths.title", "modules.strengths.why");
  const labels = {
    2: t("scale.comes_easily"),
    1: t("scale.can_do"),
    0: t("scale.hard"),
  };
  const rows = strengthsData.map((s) => {
    const v = state.strengths[s.id];
    const label = pickLocalized(s as unknown as Record<string, unknown>, "label");
    const example = pickLocalized(s as unknown as Record<string, unknown>, "example");
    return `
      <li class="q-row" data-qid="${s.id}">
        <div>
          <div class="label">${escapeHtml(label)}</div>
          <div class="ex">${escapeHtml(example)}</div>
        </div>
        <div class="opts" role="radiogroup" aria-label="${escapeHtml(label)}">
          ${[2, 1, 0].map((val) => `
            <button type="button" class="opt" data-action="strength" data-qid="${s.id}" data-val="${val}"
              aria-pressed="${v === val ? "true" : "false"}" role="radio" aria-checked="${v === val ? "true" : "false"}">
              ${escapeHtml(labels[val as 0 | 1 | 2])}
            </button>
          `).join("")}
        </div>
      </li>
    `;
  }).join("");
  return `${intro}<ul class="q-list">${rows}</ul>`;
}

function renderValuesPage(): string {
  const intro = renderModuleIntro("modules.values.title", "modules.values.why");
  const cards = valuesData.map((v) => {
    const title = pickShort(v as unknown as Record<string, unknown>);
    const one = pickLocalized(v as unknown as Record<string, unknown>, "one_liner");
    const active = state.values.includes(v.id);
    const order = state.values.indexOf(v.id);
    return `
      <button type="button" class="value-card" data-action="value" data-id="${v.id}" aria-pressed="${active}">
        ${active ? `<span class="count-badge" aria-hidden="true">${order + 1}</span>` : ""}
        <span class="title">${escapeHtml(title)}</span>
        <span class="one-liner">${escapeHtml(one)}</span>
      </button>
    `;
  }).join("");
  const counter = t("survey.selected_count")
    .replace("{n}", String(state.values.length))
    .replace("{max}", "3");
  return `
    ${intro}
    <div class="values-grid">${cards}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderSkillsPage(): string {
  const intro = renderModuleIntro("modules.skills.title", "modules.skills.why");
  const labels = {
    2: t("scale.have"),
    1: t("scale.growing"),
    0: t("scale.not_yet"),
  };
  const rows = skillsData.map((s) => {
    const v = state.skills[s.id];
    const name = pickLocalized(s as unknown as Record<string, unknown>, "name");
    const ex = pickLocalized(s as unknown as Record<string, unknown>, "example");
    return `
      <li class="q-row" data-qid="${s.id}">
        <div>
          <div class="label">${escapeHtml(name)}</div>
          <div class="ex">${escapeHtml(ex)}</div>
        </div>
        <div class="opts" role="radiogroup" aria-label="${escapeHtml(name)}">
          ${[2, 1, 0].map((val) => `
            <button type="button" class="opt" data-action="skill" data-qid="${s.id}" data-val="${val}"
              aria-pressed="${v === val ? "true" : "false"}" role="radio" aria-checked="${v === val ? "true" : "false"}">
              ${escapeHtml(labels[val as 0 | 1 | 2])}
            </button>
          `).join("")}
        </div>
      </li>
    `;
  }).join("");
  return `${intro}<ul class="q-list">${rows}</ul>`;
}

function renderTotPage(page: Page & { kind: "tot" }): string {
  const item = totData[page.index];
  const aLabel = pickShort(item.a as unknown as Record<string, unknown>);
  const bLabel = pickShort(item.b as unknown as Record<string, unknown>);
  const chosen = state.tot[item.id];
  return `
    <section class="module-intro">
      <h2>${escapeHtml(t("modules.tot_intro"))}</h2>
    </section>
    <div class="tot-wrap">
      <button type="button" class="tot-card" data-action="tot" data-id="${item.id}" data-side="a"
        aria-pressed="${chosen === "a"}">${escapeHtml(aLabel)}</button>
      <span class="tot-or" aria-hidden="true">— or —</span>
      <button type="button" class="tot-card" data-action="tot" data-id="${item.id}" data-side="b"
        aria-pressed="${chosen === "b"}">${escapeHtml(bLabel)}</button>
    </div>
  `;
}

function renderConstraintsPage(): string {
  const intro = renderModuleIntro("modules.constraints.title", "modules.constraints.why");
  const rows = constraintsData.map((q) => {
    const label = pickLocalized(q as unknown as Record<string, unknown>, "label");
    const current = state.constraints[q.id];
    const opts = q.options.map((o) => {
      const optLabel = pickLocalized(o as unknown as Record<string, unknown>, "label");
      return `
        <button type="button" class="opt" data-action="constraint" data-qid="${q.id}" data-val="${o.id}"
          aria-pressed="${current === o.id ? "true" : "false"}">
          ${escapeHtml(optLabel)}
        </button>
      `;
    }).join("");
    return `
      <li class="q-row" data-qid="${q.id}">
        <div class="label">${escapeHtml(label)}</div>
        <div class="select-row" role="radiogroup" aria-label="${escapeHtml(label)}">${opts}</div>
      </li>
    `;
  }).join("");
  return `${intro}<ul class="q-list">${rows}</ul>`;
}

// ===== Validation per page =====

function validateCurrent(): string | null {
  const page = getCurrentPage();
  switch (page.kind) {
    case "interests-likert": {
      const unanswered = page.items.some((i) => state.miniIp[i.id] === undefined);
      return unanswered ? t("survey.pick_one_each") : null;
    }
    case "interests-tags":
      // Allowed to skip (tap any), but require at least 1 to be meaningful
      return state.tags.length === 0 ? t("survey.pick_one") : null;
    case "interests-visual":
      return state.workspace === null ? t("survey.pick_one") : null;
    case "passions":
      return state.passions.length !== 3 ? t("survey.pick_exact_3") : null;
    case "strengths": {
      const unanswered = strengthsData.some((s) => state.strengths[s.id] === undefined);
      return unanswered ? t("survey.pick_one_each") : null;
    }
    case "values":
      return state.values.length !== 3 ? t("survey.pick_exact_3") : null;
    case "skills": {
      const unanswered = skillsData.some((s) => state.skills[s.id] === undefined);
      return unanswered ? t("survey.pick_one_each") : null;
    }
    case "tot": {
      const id = totData[page.index].id;
      return state.tot[id] === undefined ? t("survey.pick_one") : null;
    }
    case "constraints": {
      const unanswered = constraintsData.some((c) => state.constraints[c.id] === undefined);
      return unanswered ? t("survey.pick_one_each") : null;
    }
  }
}

// ===== Main render =====

export function renderSurvey(root: HTMLElement): void {
  // Keep state's lang in sync
  state.lang = getLang();

  const page = getCurrentPage();
  let body = "";
  switch (page.kind) {
    case "interests-likert": body = renderLikertPage(page); break;
    case "tot": body = renderTotPage(page); break;
    case "interests-tags": body = renderTagsPage(); break;
    case "interests-visual": body = renderWorkspacePage(); break;
    case "passions": body = renderPassionsPage(); break;
    case "strengths": body = renderStrengthsPage(); break;
    case "values": body = renderValuesPage(); break;
    case "skills": body = renderSkillsPage(); break;
    case "constraints": body = renderConstraintsPage(); break;
  }

  const isLast = state.pageIndex === TOTAL_PAGES - 1;
  const nextLabel = isLast ? t("survey.finish") : t("survey.next");
  const backLabel = t("survey.back");
  const stepCounter = t("survey.step_counter")
    .replace("{current}", String(state.pageIndex + 1))
    .replace("{total}", String(TOTAL_PAGES));

  root.innerHTML = `
    <div class="progress" aria-hidden="true">
      <span class="bar"><span class="fill" style="width:${progressPct()}%"></span></span>
    </div>
    <div class="survey-page" data-page-index="${state.pageIndex}">
      ${body}
      ${errorMessage ? `<p class="field-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
      <div class="survey-nav">
        <button type="button" class="btn ghost" data-action="back" ${state.pageIndex === 0 ? "disabled" : ""}>${escapeHtml(backLabel)}</button>
        <button type="button" class="btn" data-action="next">${escapeHtml(nextLabel)}</button>
      </div>
      <p class="step-counter">${escapeHtml(stepCounter)}</p>
    </div>
  `;

  // Wire up click handlers (delegated)
  const wrap = root.querySelector(".survey-page");
  if (!wrap) return;
  wrap.addEventListener("click", onClick);
}

function onClick(ev: Event): void {
  const target = ev.target as HTMLElement | null;
  if (!target) return;
  const actionEl = target.closest<HTMLElement>("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action!;
  switch (action) {
    case "likert": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as LikertValue;
      state.miniIp[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "strength": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as AbilityValue;
      state.strengths[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "skill": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as SkillValue;
      state.skills[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "tag": {
      const id = actionEl.dataset.id!;
      const idx = state.tags.indexOf(id);
      if (idx >= 0) state.tags.splice(idx, 1);
      else state.tags.push(id);
      saveState(state);
      rerender();
      break;
    }
    case "workspace": {
      state.workspace = actionEl.dataset.id!;
      saveState(state);
      rerender();
      break;
    }
    case "passion": {
      const id = actionEl.dataset.id!;
      const idx = state.passions.indexOf(id);
      if (idx >= 0) {
        state.passions.splice(idx, 1);
      } else {
        if (state.passions.length >= 3) {
          // replace oldest to honor "pick 3"
          state.passions.shift();
        }
        state.passions.push(id);
      }
      saveState(state);
      rerender();
      break;
    }
    case "value": {
      const id = actionEl.dataset.id!;
      const idx = state.values.indexOf(id);
      if (idx >= 0) {
        state.values.splice(idx, 1);
      } else {
        if (state.values.length >= 3) state.values.shift();
        state.values.push(id);
      }
      saveState(state);
      rerender();
      break;
    }
    case "tot": {
      const id = actionEl.dataset.id!;
      state.tot[id] = actionEl.dataset.side as "a" | "b";
      saveState(state);
      rerender();
      break;
    }
    case "constraint": {
      const qid = actionEl.dataset.qid!;
      state.constraints[qid] = actionEl.dataset.val!;
      saveState(state);
      rerender();
      break;
    }
    case "back": {
      if (state.pageIndex > 0) {
        clearError();
        state.pageIndex -= 1;
        saveState(state);
        rerender();
      }
      break;
    }
    case "next": {
      const err = validateCurrent();
      if (err) {
        setError(err);
        rerender();
        return;
      }
      clearError();
      if (state.pageIndex >= TOTAL_PAGES - 1) {
        saveState(state);
        location.hash = "#/results";
        return;
      }
      state.pageIndex += 1;
      saveState(state);
      rerender();
      break;
    }
  }
}

function rerender(): void {
  const root = document.getElementById("main");
  if (!root) return;
  // Reset listener bindings by full re-render
  renderSurvey(root);
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function resetSurvey(): void {
  state = emptyState(getLang());
  errorMessage = null;
  saveState(state);
}

export function getSurveyState(): SurveyState {
  return state;
}

export function reloadStateFromStorage(): void {
  const saved = loadState();
  if (saved) {
    state = saved;
  }
}

export function setPageIndex(idx: number): void {
  state.pageIndex = Math.max(0, Math.min(idx, TOTAL_PAGES - 1));
  saveState(state);
}
