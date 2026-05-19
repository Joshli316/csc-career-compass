import en from "./data/locales/en.json";
import zh from "./data/locales/zh-Hans.json";
import es from "./data/locales/es.json";

export type Lang = "en" | "zh-Hans" | "es";

const LOCALES: Record<Lang, Record<string, unknown>> = {
  en,
  "zh-Hans": zh,
  es,
};

const LS_LANG_KEY = "cscCompass.lang";
const ALLOWED: Lang[] = ["en", "zh-Hans", "es"];

type Listener = (lang: Lang) => void;
const listeners: Listener[] = [];

function readSaved(): Lang {
  try {
    const v = localStorage.getItem(LS_LANG_KEY);
    if (v && (ALLOWED as string[]).includes(v)) return v as Lang;
  } catch {
    /* localStorage unavailable — fall through to browser preference */
  }
  try {
    const prefs = (navigator as { languages?: readonly string[] }).languages ?? [navigator.language];
    for (const p of prefs) {
      const tag = (p ?? "").toLowerCase();
      if (tag.startsWith("zh")) return "zh-Hans";
      if (tag.startsWith("es")) return "es";
      if (tag.startsWith("en")) return "en";
    }
  } catch {
    /* navigator unavailable in some sandboxed environments */
  }
  return "en";
}

let currentLang: Lang = readSaved();

export function getLang(): Lang {
  return currentLang;
}

const ZH_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap";

function ensureZhFontLoaded(): void {
  if (document.getElementById("font-zh")) return;
  const link = document.createElement("link");
  link.id = "font-zh";
  link.rel = "stylesheet";
  link.href = ZH_FONT_URL;
  document.head.appendChild(link);
}

export function setLang(lang: Lang): void {
  if (!(ALLOWED as string[]).includes(lang)) return;
  currentLang = lang;
  try {
    localStorage.setItem(LS_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang;
  if (lang === "zh-Hans") ensureZhFontLoaded();
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Translate `key` and substitute `{var}` placeholders.
 * formatT("survey.step_counter", { current: 3, total: 15 }) →
 *   "Step 3 of 15" / "第 3 步，共 15 步" / "Paso 3 de 15"
 */
export function formatT(key: string, vars: Record<string, string | number>): string {
  return t(key).replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

/** Look up a dotted key like "landing.start" in the current locale. */
export function t(key: string): string {
  const dict = LOCALES[currentLang] ?? LOCALES.en;
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      // fallback to English
      cur = parts.reduce<unknown>((acc, part) => {
        if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, LOCALES.en);
      break;
    }
  }
  return typeof cur === "string" ? cur : key;
}

/** Initialize html[lang] from saved/default value. Call once at startup. */
export function initLang(): void {
  document.documentElement.lang = currentLang;
  if (currentLang === "zh-Hans") ensureZhFontLoaded();
}

/**
 * Resolve a trilingual data record { foo_en, foo_zh, foo_es } shape.
 * Accepts `unknown` so callers don't need to launder JSON-import types.
 */
export function pickLocalized(obj: unknown, prefix: string): string {
  if (!obj || typeof obj !== "object") return "";
  const rec = obj as Record<string, unknown>;
  const map: Record<Lang, string> = {
    en: `${prefix}_en`,
    "zh-Hans": `${prefix}_zh`,
    es: `${prefix}_es`,
  };
  const v = rec[map[currentLang]];
  if (typeof v === "string" && v) return v;
  const fallback = rec[`${prefix}_en`];
  return typeof fallback === "string" ? fallback : "";
}

/** For data entries with short keys: { en, zh, es }. */
export function pickShort(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const rec = obj as Record<string, unknown>;
  const map: Record<Lang, string> = { en: "en", "zh-Hans": "zh", es: "es" };
  const v = rec[map[currentLang]];
  if (typeof v === "string" && v) return v;
  const fb = rec["en"];
  return typeof fb === "string" ? fb : "";
}

/** Wage formatter respecting locale. */
export function formatWage(usdPerHour: number): string {
  const n = usdPerHour.toFixed(2);
  switch (currentLang) {
    case "zh-Hans":
      return `${n} 美元/小时`;
    case "es":
      return `$${n} USD/hora`;
    default:
      return `$${n}/hr`;
  }
}

/** Date stamp for filenames. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
