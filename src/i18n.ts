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
    /* localStorage unavailable */
  }
  return "en";
}

let currentLang: Lang = readSaved();

export function getLang(): Lang {
  return currentLang;
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
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
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
}

/** Resolve a trilingual data record { foo_en, foo_zh, foo_es } shape. */
export function pickLocalized<T extends Record<string, unknown>>(
  obj: T,
  prefix: string
): string {
  const map: Record<Lang, string> = {
    en: `${prefix}_en`,
    "zh-Hans": `${prefix}_zh`,
    es: `${prefix}_es`,
  };
  const key = map[currentLang];
  const v = obj[key];
  if (typeof v === "string" && v) return v;
  const fallback = obj[`${prefix}_en`];
  return typeof fallback === "string" ? fallback : "";
}

/** For data entries with short keys: { en, zh, es }. */
export function pickShort(obj: Record<string, unknown>): string {
  const map: Record<Lang, string> = { en: "en", "zh-Hans": "zh", es: "es" };
  const v = obj[map[currentLang]];
  if (typeof v === "string" && v) return v;
  const fb = obj["en"];
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
