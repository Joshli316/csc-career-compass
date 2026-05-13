import { t, getLang, setLang, onLangChange, initLang } from "./i18n";
import type { Lang } from "./i18n";
import { renderSurvey, resetSurvey, reloadStateFromStorage, setPageIndex } from "./survey";
import { renderResults } from "./results";
import { loadState, isFresh, clearState } from "./state";
import { downloadPdf } from "./pdf";
import { escapeHtml } from "./util";

function renderHeader(): void {
  const header = document.getElementById("site-header");
  if (!header) return;
  const lang = getLang();
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="#/" data-action="home">${escapeHtml(t("header.brand"))}</a>
      <div class="lang-toggle" role="group" aria-label="Language">
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
  const showResume =
    !!saved &&
    isFresh(saved) &&
    saved.pageIndex > 0;

  root.innerHTML = `
    <section class="landing" aria-labelledby="l-title">
      <h1 id="l-title">${escapeHtml(t("landing.h1"))}</h1>
      <p class="subhead">${escapeHtml(t("landing.subhead"))}</p>
      <ul class="bullets">
        <li>${escapeHtml(t("landing.bullet_free"))}</li>
        <li>${escapeHtml(t("landing.bullet_private"))}</li>
        <li>${escapeHtml(t("landing.bullet_time"))}</li>
      </ul>
      <button type="button" class="btn block" data-action="start">${escapeHtml(t("landing.start"))}</button>
      ${
        showResume
          ? `<p class="resume-link"><a href="#/q/start" data-action="resume">${escapeHtml(t("landing.resume"))}</a></p>`
          : ""
      }
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
  } else if (hash.startsWith("/q")) {
    // Survey routes — single state machine; sub-paths just kept for back/forward UX
    reloadStateFromStorage();
    if (hash === "/q/start") {
      setPageIndex(0);
    }
    renderSurvey(root);
  } else if (hash === "/results") {
    renderResultsView(root);
  } else {
    renderLanding(root);
  }
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
