import { describe, it, expect } from "vitest";
import { buildPageList, validatePage, togglePick } from "./survey-logic";
import { emptyState } from "./state";
import type { SurveyState } from "./state";

import miniIpData from "./data/mini-ip.json";
import strengthsData from "./data/strengths.json";
import skillsData from "./data/skills.json";
import constraintsData from "./data/constraints.json";

function st(overrides: Partial<SurveyState> = {}): SurveyState {
  return { ...emptyState("en"), ...overrides };
}

describe("buildPageList", () => {
  const pages = buildPageList();

  it("produces 16 pages total", () => {
    expect(pages.length).toBe(16);
  });

  it("orders modules: 4 likert → tot → tags → tot → visual → passions → tot → strengths → values → tot → skills → constraints → barriers", () => {
    const kinds = pages.map((p) => p.kind);
    expect(kinds).toEqual([
      "interests-likert", "interests-likert", "interests-likert", "interests-likert",
      "tot",
      "interests-tags",
      "tot",
      "interests-visual",
      "passions",
      "tot",
      "strengths",
      "values",
      "tot",
      "skills",
      "constraints",
      "barriers",
    ]);
  });

  it("splits 20 mini-IP items across 4 pages of 5", () => {
    const likert = pages.filter((p) => p.kind === "interests-likert") as Array<
      Extract<ReturnType<typeof buildPageList>[number], { kind: "interests-likert" }>
    >;
    expect(likert).toHaveLength(4);
    likert.forEach((p) => expect(p.items.length).toBe(5));
    const allItems = likert.flatMap((p) => p.items);
    expect(allItems).toHaveLength(20);
    // No duplicates
    const ids = new Set(allItems.map((x) => x.id));
    expect(ids.size).toBe(20);
  });

  it("indexes the 4 tot pages 0..3 in order", () => {
    const tots = pages.filter((p) => p.kind === "tot") as Array<
      Extract<ReturnType<typeof buildPageList>[number], { kind: "tot" }>
    >;
    expect(tots.map((p) => p.index)).toEqual([0, 1, 2, 3]);
  });
});

describe("validatePage — likert", () => {
  const pages = buildPageList();
  const firstLikert = pages[0] as Extract<typeof pages[number], { kind: "interests-likert" }>;

  it("fails when any item is unanswered", () => {
    expect(validatePage(st(), firstLikert)).toBe("pick_one_each");
  });

  it("passes when all items answered (even with value=0)", () => {
    const miniIp: SurveyState["miniIp"] = {};
    for (const item of firstLikert.items) miniIp[item.id] = 0;
    expect(validatePage(st({ miniIp }), firstLikert)).toBe(null);
  });

  it("checks only the items on the current page, not the whole instrument", () => {
    const miniIp: SurveyState["miniIp"] = {};
    // Answer ip01..ip05 but not ip06..ip20
    for (let i = 0; i < 5; i++) miniIp[miniIpData[i].id] = 1;
    expect(validatePage(st({ miniIp }), firstLikert)).toBe(null);
    const secondLikert = pages[1] as Extract<typeof pages[number], { kind: "interests-likert" }>;
    expect(validatePage(st({ miniIp }), secondLikert)).toBe("pick_one_each");
  });
});

describe("validatePage — tags", () => {
  const page = buildPageList().find((p) => p.kind === "interests-tags")!;
  it("always passes (plan: tap any, no max)", () => {
    expect(validatePage(st(), page)).toBe(null);
    expect(validatePage(st({ tags: ["t_teach"] }), page)).toBe(null);
  });
});

describe("validatePage — workspace", () => {
  const page = buildPageList().find((p) => p.kind === "interests-visual")!;
  it("fails when none selected", () => {
    expect(validatePage(st(), page)).toBe("pick_one");
  });
  it("passes when one selected", () => {
    expect(validatePage(st({ workspace: "w_classroom" }), page)).toBe(null);
  });
});

describe("validatePage — passions (pick exactly 3)", () => {
  const page = buildPageList().find((p) => p.kind === "passions")!;
  it.each([
    [[], "pick_exact_3"],
    [["p_helping"], "pick_exact_3"],
    [["p_helping", "p_caring"], "pick_exact_3"],
    [["p_helping", "p_caring", "p_organize"], null],
    [["p_a", "p_b", "p_c", "p_d"], "pick_exact_3"],
  ] as const)("count=%i → %s", (passions, expected) => {
    expect(validatePage(st({ passions: [...passions] }), page)).toBe(expected);
  });
});

describe("validatePage — strengths", () => {
  const page = buildPageList().find((p) => p.kind === "strengths")!;
  it("fails when any of 6 strengths unanswered", () => {
    expect(validatePage(st(), page)).toBe("pick_one_each");
  });
  it("passes when all 6 answered", () => {
    const strengths: SurveyState["strengths"] = {};
    for (const s of strengthsData) strengths[s.id] = 1;
    expect(validatePage(st({ strengths }), page)).toBe(null);
  });
});

describe("validatePage — values (pick exactly 3)", () => {
  const page = buildPageList().find((p) => p.kind === "values")!;
  it("fails with 0, 1, 2, or 4 values", () => {
    expect(validatePage(st({ values: [] }), page)).toBe("pick_exact_3");
    expect(validatePage(st({ values: ["v_independence"] }), page)).toBe("pick_exact_3");
    expect(validatePage(st({ values: ["v_a", "v_b", "v_c", "v_d"] }), page)).toBe("pick_exact_3");
  });
  it("passes with exactly 3 values", () => {
    expect(validatePage(st({ values: ["v_relationships", "v_support", "v_conditions"] }), page)).toBe(null);
  });
});

describe("validatePage — skills", () => {
  const page = buildPageList().find((p) => p.kind === "skills")!;
  it("fails when any of 8 NACE skills unanswered", () => {
    expect(validatePage(st(), page)).toBe("pick_one_each");
  });
  it("passes when all 8 answered", () => {
    const skills: SurveyState["skills"] = {};
    for (const s of skillsData) skills[s.id] = 2;
    expect(validatePage(st({ skills }), page)).toBe(null);
  });
});

describe("validatePage — tot palate cleansers", () => {
  const pages = buildPageList();
  const tot0 = pages.find((p) => p.kind === "tot" && p.index === 0)!;
  const tot3 = pages.find((p) => p.kind === "tot" && p.index === 3)!;

  it("fails when no side chosen", () => {
    expect(validatePage(st(), tot0)).toBe("pick_one");
  });
  it("passes when 'a' chosen", () => {
    expect(validatePage(st({ tot: { tot1: "a" } }), tot0)).toBe(null);
  });
  it("passes when 'b' chosen", () => {
    expect(validatePage(st({ tot: { tot1: "b" } }), tot0)).toBe(null);
  });
  it("each tot validates independently by ID, not page index", () => {
    // Pick tot1's side; tot4 still fails.
    expect(validatePage(st({ tot: { tot1: "a" } }), tot3)).toBe("pick_one");
  });
});

describe("validatePage — constraints", () => {
  const page = buildPageList().find((p) => p.kind === "constraints")!;
  it("fails when any of the 4 constraints unanswered", () => {
    expect(validatePage(st(), page)).toBe("pick_one_each");
  });
  it("passes when all 4 answered", () => {
    const constraints: SurveyState["constraints"] = {};
    for (const c of constraintsData) constraints[c.id] = c.options[0].id;
    expect(validatePage(st({ constraints }), page)).toBe(null);
  });
});

describe("validatePage — barriers (optional disclosures)", () => {
  const page = buildPageList().find((p) => p.kind === "barriers")!;
  it("passes when nothing selected (skipping is valid)", () => {
    expect(validatePage(st(), page)).toBe(null);
  });
  it("passes when any subset selected", () => {
    expect(validatePage(st({ barriers: ["veteran"] }), page)).toBe(null);
    expect(validatePage(st({ barriers: ["veteran", "housing", "disability"] }), page)).toBe(null);
  });
});

describe("togglePick", () => {
  it("adds a new id", () => {
    expect(togglePick([], "a", 3)).toEqual(["a"]);
  });
  it("removes an existing id", () => {
    expect(togglePick(["a", "b"], "a", 3)).toEqual(["b"]);
  });
  it("evicts oldest when cap would be exceeded", () => {
    expect(togglePick(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
  it("does not evict when removing", () => {
    expect(togglePick(["a", "b", "c"], "b", 3)).toEqual(["a", "c"]);
  });
  it("preserves order of remaining items", () => {
    expect(togglePick(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });
  it("does not mutate the input array", () => {
    const orig = ["a", "b", "c"];
    const after = togglePick(orig, "d", 3);
    expect(orig).toEqual(["a", "b", "c"]);
    expect(after).not.toBe(orig);
  });
});
