import type { Lang } from "./i18n";

export type LikertValue = 2 | 1 | 0; // Like / Not-sure / Dislike
export type AbilityValue = 2 | 1 | 0; // Comes easily / Can do / Hard
export type SkillValue = 2 | 1 | 0; // Have / Growing / Not yet

export interface SurveyState {
  version: number;
  startedAt: number;
  updatedAt: number;
  lang: Lang;
  pageIndex: number;
  miniIp: Record<string, LikertValue>;
  tags: string[];
  workspace: string | null;
  passions: string[];
  strengths: Record<string, AbilityValue>;
  values: string[];
  skills: Record<string, SkillValue>;
  tot: Record<string, "a" | "b">;
  constraints: Record<string, string>;
  barriers: string[];
}

const LS_STATE_KEY = "cscCompass.state";
const STATE_VERSION = 2;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function emptyState(lang: Lang): SurveyState {
  const now = Date.now();
  return {
    version: STATE_VERSION,
    startedAt: now,
    updatedAt: now,
    lang,
    pageIndex: 0,
    miniIp: {},
    tags: [],
    workspace: null,
    passions: [],
    strengths: {},
    values: [],
    skills: {},
    tot: {},
    constraints: {},
    barriers: [],
  };
}

export function loadState(): SurveyState | null {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SurveyState;
    if (parsed.version !== STATE_VERSION) {
      clearState();
      return null;
    }
    return parsed;
  } catch {
    clearState();
    return null;
  }
}

export function saveState(state: SurveyState): void {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(LS_STATE_KEY);
  } catch {
    /* ignore */
  }
}

export function isFresh(state: SurveyState): boolean {
  return Date.now() - state.updatedAt < TWENTY_FOUR_HOURS;
}
