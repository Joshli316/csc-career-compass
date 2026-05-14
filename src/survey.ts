import { t, pickShort, getLang, pickLocalized, formatT } from "./i18n";
import type { SurveyState, LikertValue, AbilityValue, SkillValue } from "./state";
import { emptyState, loadState, saveState } from "./state";
import { escapeHtml } from "./util";
import { buildPageList, validatePage, togglePick, type Page } from "./survey-logic";

import tagCloudData from "./data/tag-cloud.json";
import workspacesData from "./data/workspaces.json";
import passionsData from "./data/passions.json";
import strengthsData from "./data/strengths.json";
import valuesData from "./data/values.json";
import skillsData from "./data/skills.json";
import totData from "./data/this-or-that.json";
import constraintsData from "./data/constraints.json";

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
  // (pageIndex + 1) / TOTAL_PAGES so page 1 shows a visible sliver
  // rather than a 0% empty container.
  return Math.round(((state.pageIndex + 1) / Math.max(1, TOTAL_PAGES)) * 100);
}

function setError(msg: string | null) {
  errorMessage = msg;
}

function clearError() {
  errorMessage = null;
}

// ===== Renderers per page type =====

// Module chapter numbers — the six self-discovery dimensions. Repeats for
// interests sub-pages (likert/tags/visual) so the user feels anchored in
// "still on module 1 of 6" while the format varies.
const MODULE_NUM_BY_KEY: Record<string, number> = {
  "modules.interests_likert.title": 1,
  "modules.interests_tags.title": 1,
  "modules.interests_visual.title": 1,
  "modules.passions.title": 2,
  "modules.strengths.title": 3,
  "modules.values.title": 4,
  "modules.skills.title": 5,
  "modules.constraints.title": 6,
};

function renderModuleIntro(titleKey: string, whyKey: string): string {
  const num = MODULE_NUM_BY_KEY[titleKey];
  const numEl = num
    ? `<span class="module-num" aria-hidden="true">${num}</span>`
    : "";
  return `
    <section class="module-intro" aria-labelledby="mod-title">
      ${numEl}
      <div class="module-intro-body">
        <h2 id="mod-title">${escapeHtml(t(titleKey))}</h2>
        <p>${escapeHtml(t(whyKey))}</p>
      </div>
    </section>
  `;
}

/**
 * Render a 3-button rating row group. Used by Mini-IP Likert, natural-strengths
 * ability scale, and NACE soft-skills scale — same structural shape, different
 * data sources and scale labels.
 */
type RatingAction = "likert" | "strength" | "skill";

interface RatingItem {
  id: string;
  label: string;
  example?: string;
}
function renderRatingPage(opts: {
  introTitleKey: string;
  introWhyKey: string;
  showIntro: boolean;
  items: RatingItem[];
  action: RatingAction;
  scale: { 2: string; 1: string; 0: string };
  selected: (id: string) => 0 | 1 | 2 | undefined;
}): string {
  const intro = opts.showIntro ? renderModuleIntro(opts.introTitleKey, opts.introWhyKey) : "";
  const rows = opts.items.map((item) => {
    const v = opts.selected(item.id);
    const hasExample = typeof item.example === "string" && item.example.length > 0;
    return `
      <li class="q-row" data-qid="${item.id}">
        ${hasExample
          ? `<div><div class="label">${escapeHtml(item.label)}</div><div class="ex">${escapeHtml(item.example!)}</div></div>`
          : `<span class="label">${escapeHtml(item.label)}</span>`}
        <div class="opts" role="radiogroup" aria-label="${escapeHtml(item.label)}">
          ${[2, 1, 0].map((val) => `
            <button type="button" class="opt" data-action="${opts.action}" data-qid="${item.id}" data-val="${val}"
              aria-pressed="${v === val ? "true" : "false"}" role="radio" aria-checked="${v === val ? "true" : "false"}">
              ${escapeHtml(opts.scale[val as 0 | 1 | 2])}
            </button>
          `).join("")}
        </div>
      </li>
    `;
  }).join("");
  // Only label the list when the heading is not on this page; otherwise the
  // h2 already names the group and adding aria-label would double-announce.
  const listLabel = opts.showIntro
    ? ""
    : ` aria-label="${escapeHtml(t(opts.introTitleKey))}"`;
  return `${intro}<ul class="q-list"${listLabel}>${rows}</ul>`;
}

function renderLikertPage(page: Page & { kind: "interests-likert" }): string {
  return renderRatingPage({
    introTitleKey: "modules.interests_likert.title",
    introWhyKey: "modules.interests_likert.why",
    showIntro: page.pageOfModule === 1,
    items: page.items.map((item) => ({ id: item.id, label: pickShort(item) })),
    action: "likert",
    scale: { 2: t("scale.like"), 1: t("scale.neutral"), 0: t("scale.dislike") },
    selected: (id) => state.miniIp[id],
  });
}

function renderTagsPage(): string {
  const intro = renderModuleIntro("modules.interests_tags.title", "modules.interests_tags.why");
  const chips = tagCloudData.map((tag) => {
    const label = pickShort(tag);
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
    const label = pickLocalized(w, "label");
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
    const label = pickLocalized(p, "label");
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
  const counter = formatT("survey.selected_count", { n: state.passions.length, max: 3 });
  return `
    ${intro}
    <div class="tile-grid" role="group" aria-label="${escapeHtml(t("modules.passions.title"))}">${tiles}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderStrengthsPage(): string {
  return renderRatingPage({
    introTitleKey: "modules.strengths.title",
    introWhyKey: "modules.strengths.why",
    showIntro: true,
    items: strengthsData.map((s) => ({
      id: s.id,
      label: pickLocalized(s, "label"),
      example: pickLocalized(s, "example"),
    })),
    action: "strength",
    scale: { 2: t("scale.comes_easily"), 1: t("scale.can_do"), 0: t("scale.hard") },
    selected: (id) => state.strengths[id],
  });
}

function renderValuesPage(): string {
  const intro = renderModuleIntro("modules.values.title", "modules.values.why");
  const cards = valuesData.map((v) => {
    const title = pickShort(v);
    const one = pickLocalized(v, "one_liner");
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
  const counter = formatT("survey.selected_count", { n: state.values.length, max: 3 });
  return `
    ${intro}
    <div class="values-grid">${cards}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderSkillsPage(): string {
  return renderRatingPage({
    introTitleKey: "modules.skills.title",
    introWhyKey: "modules.skills.why",
    showIntro: true,
    items: skillsData.map((s) => ({
      id: s.id,
      label: pickLocalized(s, "name"),
      example: pickLocalized(s, "example"),
    })),
    action: "skill",
    scale: { 2: t("scale.have"), 1: t("scale.growing"), 0: t("scale.not_yet") },
    selected: (id) => state.skills[id],
  });
}

function renderTotPage(page: Page & { kind: "tot" }): string {
  const item = totData[page.index];
  const aLabel = pickLocalized(item.a, "label");
  const bLabel = pickLocalized(item.b, "label");
  const chosen = state.tot[item.id];
  return `
    <section class="module-intro">
      <h2>${escapeHtml(t("modules.tot_intro"))}</h2>
    </section>
    <div class="tot-wrap">
      <button type="button" class="tot-card" data-action="tot" data-id="${item.id}" data-side="a"
        aria-pressed="${chosen === "a"}">${escapeHtml(aLabel)}</button>
      <span class="tot-or" aria-hidden="true">${escapeHtml(t("survey.or_separator"))}</span>
      <button type="button" class="tot-card" data-action="tot" data-id="${item.id}" data-side="b"
        aria-pressed="${chosen === "b"}">${escapeHtml(bLabel)}</button>
    </div>
  `;
}

function renderConstraintsPage(): string {
  const intro = renderModuleIntro("modules.constraints.title", "modules.constraints.why");
  const rows = constraintsData.map((q) => {
    const label = pickLocalized(q, "label");
    const current = state.constraints[q.id];
    const opts = q.options.map((o) => {
      const optLabel = pickLocalized(o, "label");
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
  const code = validatePage(state, getCurrentPage());
  return code === null ? null : t(`survey.${code}`);
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
  const stepCounter = formatT("survey.step_counter", {
    current: state.pageIndex + 1,
    total: TOTAL_PAGES,
  });

  root.innerHTML = `
    <div class="progress">
      <span class="bar" role="progressbar"
            aria-valuenow="${state.pageIndex + 1}" aria-valuemin="1" aria-valuemax="${TOTAL_PAGES}"
            aria-label="${escapeHtml(stepCounter)}">
        <span class="fill" style="width:${progressPct()}%"></span>
      </span>
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
      if (state.miniIp[qid] === val) break;
      state.miniIp[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "strength": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as AbilityValue;
      if (state.strengths[qid] === val) break;
      state.strengths[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "skill": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as SkillValue;
      if (state.skills[qid] === val) break;
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
      const id = actionEl.dataset.id!;
      if (state.workspace === id) break;
      state.workspace = id;
      saveState(state);
      rerender();
      break;
    }
    case "passion": {
      state.passions = togglePick(state.passions, actionEl.dataset.id!, 3);
      saveState(state);
      rerender();
      break;
    }
    case "value": {
      state.values = togglePick(state.values, actionEl.dataset.id!, 3);
      saveState(state);
      rerender();
      break;
    }
    case "tot": {
      const id = actionEl.dataset.id!;
      const side = actionEl.dataset.side as "a" | "b";
      if (state.tot[id] === side) break;
      state.tot[id] = side;
      saveState(state);
      rerender();
      break;
    }
    case "constraint": {
      const qid = actionEl.dataset.qid!;
      const val = actionEl.dataset.val!;
      if (state.constraints[qid] === val) break;
      state.constraints[qid] = val;
      saveState(state);
      rerender();
      break;
    }
    case "back": {
      if (state.pageIndex > 0) {
        clearError();
        state.pageIndex -= 1;
        saveState(state);
        rerender({ scrollToTop: true, focusHeading: true });
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
      rerender({ scrollToTop: true, focusHeading: true });
      break;
    }
  }
}

// tabindex=-1 keeps the heading focusable for SR announcements without
// inserting it into the tab order. styles.css suppresses the outline.
function focusFirstHeading(root: HTMLElement): void {
  const h = root.querySelector<HTMLHeadingElement>("h1, h2");
  if (!h) return;
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: true });
}

function focusKeyFor(el: Element | null): string | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  const action = el.dataset.action;
  if (!action) return null;
  const parts = [`[data-action="${action}"]`];
  for (const key of ["qid", "id", "side", "val", "lang"] as const) {
    const v = el.dataset[key];
    if (v) parts.push(`[data-${key}="${v}"]`);
  }
  return parts.join("");
}

function rerender(opts: { scrollToTop?: boolean; focusHeading?: boolean } = {}): void {
  const root = document.getElementById("main");
  if (!root) return;
  const prevFocusKey = focusKeyFor(document.activeElement);
  renderSurvey(root);
  if (opts.scrollToTop) {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
  if (opts.focusHeading) {
    focusFirstHeading(root);
    return;
  }
  if (prevFocusKey) {
    const next = root.querySelector<HTMLElement>(prevFocusKey);
    next?.focus();
  }
}

export function resetSurvey(): void {
  state = emptyState(getLang());
  errorMessage = null;
  saveState(state);
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
