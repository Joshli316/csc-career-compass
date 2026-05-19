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
  wage_la_entry_hourly: number;
  wage_la_median_hourly: number;
  job_zone: number;
  english_level: "beginner" | "conversational" | "advanced" | "native";
  work_auth_required: "any" | "us_only";
  time_to_credential_months: number;
}

function levelOf(constraintId: string, optionId: string | undefined): number | undefined {
  const c = constraintsData.find((c) => c.id === constraintId);
  const o = c?.options.find((o) => o.id === optionId);
  return (o as { level?: number } | undefined)?.level;
}

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

const ENGLISH_LEVEL_RANK: Record<string, number> = {
  beginner: 1,
  conversational: 2,
  advanced: 3,
  native: 4,
};

export function filterOccupationsByConstraints(state: SurveyState): OccupationEntry[] {
  // Defaults are deliberately MOST-PERMISSIVE on the user side, not least.
  // Missing data = client never answered, so we should not silently filter
  // them out as if they had a high-level credential or native English.
  const userEnglish = levelOf("english", state.constraints.english) ?? 1;
  const userEdu = levelOf("education", state.constraints.education) ?? 1;
  const workAuthOpt = constraintsData
    .find((c) => c.id === "work_auth")?.options
    .find((o) => o.id === state.constraints.work_auth);
  const userAuth = ((workAuthOpt as { value?: string } | undefined)?.value) ?? "any";

  return (occupationsData as OccupationEntry[]).filter((occ) => {
    if (ENGLISH_LEVEL_RANK[occ.english_level] > userEnglish + 1) return false;
    if (occ.job_zone > userEdu + 1) return false;
    if (occ.work_auth_required === "us_only" && userAuth !== "us_only") return false;
    return true;
  });
}

export interface InterestArea {
  letter: Letter;
  samples: OccupationEntry[];
}

export function getInterestAreas(state: SurveyState, samplesPerArea = 3): InterestArea[] {
  const userVec = computeRiasecVector(state);
  const tops = topLetters(userVec, 3);
  const candidates = filterOccupationsByConstraints(state);
  return tops.map((letter) => {
    const inArea = candidates
      .filter((occ) => occ.riasec[0] === letter)
      .map((occ) => ({ occ, score: cosine(userVec, occ.riasec_vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, samplesPerArea)
      .map((x) => x.occ);
    return { letter, samples: inArea };
  });
}
