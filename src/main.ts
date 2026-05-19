import { t, formatT, getLang, setLang, onLangChange, initLang } from "./i18n";
import type { Lang } from "./i18n";
import { renderSurvey, resetSurvey, reloadStateFromStorage, TOTAL_PAGES } from "./survey";
import { renderResults } from "./results";
import { loadState, isFresh, clearState } from "./state";
import { downloadPdf } from "./pdf";
import { escapeHtml } from "./util";

import enMeta from "./data/locales/en.json";
import zhMeta from "./data/locales/zh-Hans.json";
import esMeta from "./data/locales/es.json";

const LOCALE_DRAFT: Record<Lang, boolean> = {
  en: (enMeta as { _meta?: { draft?: boolean } })._meta?.draft === true,
  "zh-Hans": (zhMeta as { _meta?: { draft?: boolean } })._meta?.draft === true,
  es: (esMeta as { _meta?: { draft?: boolean } })._meta?.draft === true,
};

function renderHeader(): void {
  const header = document.getElementById("site-header");
  if (!header) return;
  const lang = getLang();
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="#/" data-action="home">${escapeHtml(t("header.brand"))}</a>
      <div class="lang-toggle" role="group" aria-label="${escapeHtml(t("lang.aria_label"))}">
        <button type="button" data-lang="en" aria-pressed="${lang === "en"}">${escapeHtml(t("lang.en"))}</button>
        <button type="button" data-lang="zh-Hans" aria-pressed="${lang === "zh-Hans"}">${escapeHtml(t("lang.zh"))}</button>
        <button type="button" data-lang="es" aria-pressed="${lang === "es"}">${escapeHtml(t("lang.es"))}</button>
      </div>
    </div>
  `;
  header.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang as Lang);
    });
  });
}

function renderFooter(): void {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `<p class="inner">${escapeHtml(t("footer.disclaimer"))}</p>`;
}

function renderLanding(root: HTMLElement): void {
  const saved = loadState();
  const isMidSurvey = !!saved && isFresh(saved) && saved.pageIndex > 0 && saved.pageIndex < TOTAL_PAGES - 1;
  const isFinished = !!saved && isFresh(saved) && saved.pageIndex >= TOTAL_PAGES - 1;

  let secondaryLink = "";
  if (isMidSurvey && saved) {
    const label = formatT("landing.resume_with_step", {
      current: saved.pageIndex + 1,
      total: TOTAL_PAGES,
    });
    secondaryLink = `<p class="resume-link"><a href="#/q/start" data-action="resume">${escapeHtml(label)}</a></p>`;
  } else if (isFinished) {
    secondaryLink = `<p class="resume-link"><a href="#/results" data-action="view-results">${escapeHtml(t("landing.view_results"))}</a></p>`;
  }

  root.innerHTML = `
    <section class="landing" aria-labelledby="l-title">
      ${draftBannerHtml()}
      <h1 id="l-title">${escapeHtml(t("landing.h1"))}</h1>
      <p class="subhead">${escapeHtml(t("landing.subhead"))}</p>
      <ul class="bullets">
        <li>${escapeHtml(t("landing.bullet_outcome"))}</li>
        <li>${escapeHtml(t("landing.bullet_free"))}</li>
        <li>${escapeHtml(t("landing.bullet_private"))}</li>
      </ul>
      <button type="button" class="btn block" data-action="start">${escapeHtml(t("landing.start"))}</button>
      ${secondaryLink}
    </section>
  `;

  root.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    resetSurvey();
    location.hash = "#/q/start";
  });
  root.querySelector('[data-action="resume"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    reloadStateFromStorage();
    location.hash = "#/q/start";
  });
}

function draftBannerHtml(): string {
  if (!LOCALE_DRAFT[getLang()]) return "";
  return `<p class="draft-banner" role="status">${escapeHtml(t("landing.draft_banner"))}</p>`;
}

function renderResultsView(root: HTMLElement): void {
  reloadStateFromStorage();
  const saved = loadState();
  if (!saved) {
    // No state — bounce to landing
    location.hash = "#/";
    return;
  }
  renderResults(saved, root);
  root.querySelector('[data-action="pdf"]')?.addEventListener("click", () => {
    void downloadPdf();
  });
  root.querySelector('[data-action="restart"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState();
    resetSurvey();
    location.hash = "#/";
  });
}

function route(): void {
  const root = document.getElementById("main");
  if (!root) return;
  const hash = location.hash.replace(/^#/, "") || "/";

  if (hash === "/" || hash === "") {
    renderLanding(root);
    document.title = t("page_title.landing");
  } else if (hash.startsWith("/q")) {
    // Survey routes — single state machine; sub-paths just kept for back/forward UX.
    // pageIndex is owned by the click handlers in renderLanding (start = reset → 0,
    // resume = reload saved index); the route handler must NOT overwrite it.
    reloadStateFromStorage();
    renderSurvey(root);
    document.title = t("page_title.survey");
  } else if (hash === "/results") {
    renderResultsView(root);
    document.title = t("page_title.results");
  } else {
    renderLanding(root);
    document.title = t("page_title.landing");
  }
  // Two-arg form: works in all WebViews including WeChat/FB in-app browsers.
  window.scrollTo(0, 0);
  announce(document.title);
}

function announce(text: string): void {
  const el = document.getElementById("sr-announce");
  if (!el) return;
  el.textContent = "";
  // Force re-announcement by toggling on next tick.
  requestAnimationFrame(() => { el.textContent = text; });
}

function ensureCanonicalAndOgUrl(): void {
  // Hash-routed SPA: canonical is the bare origin+pathname (no hash).
  const url = `${location.origin}${location.pathname}`;
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.content = url;

  // Many social crawlers (WhatsApp, Facebook) prefer absolute URLs for og:image.
  // Promote whatever was set statically to an origin-prefixed absolute URL.
  const base = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}`;
  for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    const tag = document.querySelector<HTMLMetaElement>(sel);
    if (!tag) continue;
    const src = tag.content;
    if (!src || /^https?:/i.test(src)) continue;
    tag.content = new URL(src, base).href;
  }
}

function init(): void {
  initLang();
  ensureCanonicalAndOgUrl();
  renderHeader();
  renderFooter();
  route();
  window.addEventListener("hashchange", route);
  onLangChange(() => {
    renderHeader();
    renderFooter();
    route();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
