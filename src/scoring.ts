import type { SurveyState } from "./state";

import miniIpData from "./data/mini-ip.json";
import tagCloudData from "./data/tag-cloud.json";
import workspacesData from "./data/workspaces.json";
import passionsData from "./data/passions.json";
import totData from "./data/this-or-that.json";
import constraintsData from "./data/constraints.json";
import occupationsData from "./data/occupations.json";

export type Letter = "R" | "I" | "A" | "S" | "E" | "C";

const LETTERS: Letter[] = ["R", "I", "A", "S", "E", "C"];
export const LETTER_INDEX: Record<Letter, number> = { R: 0, I: 1, A: 2, S: 3, E: 4, C: 5 };

export interface OccupationEntry {
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

export function computeRiasecVector(state: SurveyState): number[] {
  const v = [0, 0, 0, 0, 0, 0];
  for (const item of miniIpData) {
    const a = state.miniIp[item.id];
    if (a === undefined) continue;
    v[LETTER_INDEX[item.riasec as Letter]] += a;
  }
  for (const tag of tagCloudData) {
    if (state.tags.includes(tag.id)) {
      v[LETTER_INDEX[tag.riasec as Letter]] += 1;
    }
  }
  if (state.workspace) {
    const w = workspacesData.find((x) => x.id === state.workspace);
    if (w) v[LETTER_INDEX[w.riasec as Letter]] += 2;
  }
  for (const id of state.passions) {
    const p = passionsData.find((x) => x.id === id);
    if (!p) continue;
    for (const letter of LETTERS) {
      const weight = (p.riasec_weight as Record<string, number>)[letter] ?? 0;
      v[LETTER_INDEX[letter]] += weight;
    }
  }
  for (const item of totData) {
    const choice = state.tot[item.id];
    if (!choice) continue;
    const side = choice === "a" ? item.a : item.b;
    v[LETTER_INDEX[side.riasec as Letter]] += 1;
  }
  return v;
}

export function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  if (mag === 0) return [...v];
  return v.map((x) => x / mag);
}

export function cosine(a: number[], b: number[]): number {
  const na = normalize(a);
  const nb = normalize(b);
  let dot = 0;
  for (let i = 0; i < na.length; i++) dot += na[i] * nb[i];
  return dot;
}

export function topLetters(v: number[], n: number): Letter[] {
  const ranked = LETTERS.map((l, i) => ({ l, val: v[i] }))
    .sort((a, b) => b.val - a.val);
  return ranked.slice(0, n).map((x) => x.l);
}

export function filterOccupationsByConstraints(state: SurveyState): OccupationEntry[] {
  const userEnglish = ENGLISH_LEVEL_RANK[state.constraints.english ?? "native"] ?? 4;
  const educationOpt = constraintsData
    .find((c) => c.id === "education")?.options
    .find((o) => o.id === state.constraints.education);
  const userEdu = ((educationOpt as { level?: number })?.level) ?? 5;
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
