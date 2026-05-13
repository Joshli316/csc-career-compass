/**
 * Pure (DOM-free) survey state machine logic.
 * Imported by survey.ts for rendering and by survey-logic.test.ts for unit tests.
 */
import type { SurveyState } from "./state";
import miniIpData from "./data/mini-ip.json";
import strengthsData from "./data/strengths.json";
import skillsData from "./data/skills.json";
import totData from "./data/this-or-that.json";
import constraintsData from "./data/constraints.json";

export const MINI_IP_PER_PAGE = 5;

export type Page =
  | { kind: "interests-likert"; pageOfModule: number; totalPagesInModule: number; items: typeof miniIpData }
  | { kind: "tot"; index: 0 | 1 | 2 | 3 }
  | { kind: "interests-tags" }
  | { kind: "interests-visual" }
  | { kind: "passions" }
  | { kind: "strengths" }
  | { kind: "values" }
  | { kind: "skills" }
  | { kind: "constraints" };

export function buildPageList(): Page[] {
  const pages: Page[] = [];
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

export type ValidationCode =
  | null
  | "pick_one_each"
  | "pick_one"
  | "pick_exact_3";

/**
 * Returns a translation-key suffix for the validation error, or null if the page is complete.
 * Callers translate via t("survey." + code) when code is non-null.
 */
export function validatePage(state: SurveyState, page: Page): ValidationCode {
  switch (page.kind) {
    case "interests-likert": {
      const unanswered = page.items.some((i) => state.miniIp[i.id] === undefined);
      return unanswered ? "pick_one_each" : null;
    }
    case "interests-tags":
      // Plan: "tap any, no max" — allow 0.
      return null;
    case "interests-visual":
      return state.workspace === null ? "pick_one" : null;
    case "passions":
      return state.passions.length !== 3 ? "pick_exact_3" : null;
    case "strengths": {
      const unanswered = strengthsData.some((s) => state.strengths[s.id] === undefined);
      return unanswered ? "pick_one_each" : null;
    }
    case "values":
      return state.values.length !== 3 ? "pick_exact_3" : null;
    case "skills": {
      const unanswered = skillsData.some((s) => state.skills[s.id] === undefined);
      return unanswered ? "pick_one_each" : null;
    }
    case "tot": {
      const id = totData[page.index].id;
      return state.tot[id] === undefined ? "pick_one" : null;
    }
    case "constraints": {
      const unanswered = constraintsData.some((c) => state.constraints[c.id] === undefined);
      return unanswered ? "pick_one_each" : null;
    }
  }
}

/**
 * Validates that selecting/deselecting a "pick up to N" item keeps the list under cap.
 * Returns the new list with FIFO eviction if cap would be exceeded.
 */
export function togglePick(list: string[], id: string, cap: number): string[] {
  const idx = list.indexOf(id);
  const next = [...list];
  if (idx >= 0) {
    next.splice(idx, 1);
  } else {
    if (next.length >= cap) next.shift();
    next.push(id);
  }
  return next;
}
