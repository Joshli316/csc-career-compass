import { describe, it, expect } from "vitest";
import {
  computeRiasecVector,
  cosine,
  normalize,
  topLetters,
  filterOccupationsByConstraints,
  getInterestAreas,
  LETTER_INDEX,
} from "./scoring";
import { emptyState } from "./state";

const baseConstraints = {
  education: "hs",
  english: "conversational",
  work_auth: "yes",
  hours: "ft",
};

function stateWith(overrides: Record<string, unknown>) {
  const s = emptyState("en");
  s.constraints = { ...baseConstraints };
  return { ...s, ...overrides } as ReturnType<typeof emptyState>;
}

describe("normalize", () => {
  it("returns zero vector unchanged", () => {
    expect(normalize([0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("unit-magnitude result", () => {
    const n = normalize([3, 4, 0, 0, 0, 0]);
    const mag = Math.sqrt(n.reduce((a, b) => a + b * b, 0));
    expect(mag).toBeCloseTo(1, 6);
  });
});

describe("cosine", () => {
  it("identical direction = 1", () => {
    expect(cosine([1, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0])).toBeCloseTo(1, 6);
  });
  it("orthogonal = 0", () => {
    expect(cosine([1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0])).toBeCloseTo(0, 6);
  });
  it("opposite direction = -1", () => {
    expect(cosine([1, 0, 0, 0, 0, 0], [-1, 0, 0, 0, 0, 0])).toBeCloseTo(-1, 6);
  });
});

describe("topLetters", () => {
  it("ranks by raw value descending", () => {
    // R=2, I=5, A=1, S=8, E=3, C=4
    const v = [2, 5, 1, 8, 3, 4];
    expect(topLetters(v, 2)).toEqual(["S", "I"]);
  });
  it("returns N letters", () => {
    expect(topLetters([1, 1, 1, 1, 1, 1], 3)).toHaveLength(3);
  });
});

describe("computeRiasecVector", () => {
  it("returns zero vector for an empty state", () => {
    const v = computeRiasecVector(emptyState("en"));
    expect(v).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("Mini-IP 'Like' (val=2) adds 2 to the item's letter", () => {
    // ip01 is RIASEC=R
    const s = stateWith({ miniIp: { ip01: 2 } });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.R]).toBe(2);
    expect(v[LETTER_INDEX.I]).toBe(0);
  });

  it("Mini-IP 'Not sure' (val=1) adds 1; 'Dislike' (val=0) adds 0", () => {
    const s = stateWith({ miniIp: { ip01: 1, ip02: 0 } });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.R]).toBe(1);
  });

  it("Each tag adds +1 to its letter", () => {
    // t_teach -> S, t_help -> S
    const s = stateWith({ tags: ["t_teach", "t_help"] });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.S]).toBe(2);
  });

  it("Workspace pick adds +2 in its letter", () => {
    // w_classroom -> S
    const s = stateWith({ workspace: "w_classroom" });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.S]).toBe(2);
  });

  it("Passion tiles apply riasec_weight per letter", () => {
    // p_helping is S+2 only; p_fixing is R+2, I+1
    const s = stateWith({ passions: ["p_helping", "p_fixing"] });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.S]).toBe(2);
    expect(v[LETTER_INDEX.R]).toBe(2);
    expect(v[LETTER_INDEX.I]).toBe(1);
  });

  it("This-or-That picks add +1 to chosen side's letter", () => {
    // tot1: a -> C, b -> I
    const s = stateWith({ tot: { tot1: "a", tot2: "b" } });
    const v = computeRiasecVector(s);
    // a side of tot1 is C; b side of tot2 is E
    expect(v[LETTER_INDEX.C]).toBe(1);
    expect(v[LETTER_INDEX.E]).toBe(1);
  });

  it("Combines signal from all five channels", () => {
    const s = stateWith({
      miniIp: { ip13: 2 }, // S +2
      tags: ["t_teach"], // S +1
      workspace: "w_classroom", // S +2
      passions: ["p_helping"], // S +2
      tot: { tot2: "a" }, // S +1
    });
    const v = computeRiasecVector(s);
    expect(v[LETTER_INDEX.S]).toBe(8);
  });
});

describe("filterOccupationsByConstraints", () => {
  it("returns a conservative subset when user has no constraints filled", () => {
    // Defaults flipped to most-permissive on user side: beginner English (rank 1),
    // education level 1, work_auth='any'. Filter still requires occupations to be
    // within reach (english ≤ user+1, job_zone ≤ user+1). This protects vulnerable
    // clients from being filtered into roles they can't reach when they skip the page.
    const s = emptyState("en");
    const candidates = filterOccupationsByConstraints(s);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThan(15);
    // No advanced/native English roles, no roles requiring US auth
    expect(candidates.every((o) => o.english_level === "beginner" || o.english_level === "conversational")).toBe(true);
    expect(candidates.every((o) => o.work_auth_required === "any")).toBe(true);
  });

  it("filters out occupations requiring more English than user has", () => {
    const s = stateWith({
      constraints: { ...baseConstraints, english: "beginner" }, // rank 1; allows beginner or conversational (rank ≤ 2)
    });
    const candidates = filterOccupationsByConstraints(s);
    // No 'advanced' or 'native' English roles should appear
    expect(candidates.every((o) => o.english_level === "beginner" || o.english_level === "conversational")).toBe(true);
  });

  it("filters out occupations requiring US-only auth when user reported 'not yet'", () => {
    const s = stateWith({
      constraints: { ...baseConstraints, work_auth: "no" }, // -> userAuth = 'any'
    });
    const candidates = filterOccupationsByConstraints(s);
    expect(candidates.every((o) => o.work_auth_required === "any")).toBe(true);
  });

  it("permits a one-step stretch on English level", () => {
    const s = stateWith({
      constraints: { ...baseConstraints, english: "conversational" }, // rank 2; allows up to rank 3 (advanced)
    });
    const candidates = filterOccupationsByConstraints(s);
    // 'advanced' should be allowed but 'native' should not
    expect(candidates.some((o) => o.english_level === "advanced")).toBe(true);
    expect(candidates.every((o) => o.english_level !== "native")).toBe(true);
  });
});

describe("getInterestAreas", () => {
  it("returns top 3 RIASEC areas in score order (Social-heavy profile)", () => {
    const s = stateWith({
      miniIp: { ip13: 2, ip14: 2, ip15: 2 }, // all S
      tags: ["t_teach", "t_help", "t_listen"], // all S
      workspace: "w_classroom", // S
      passions: ["p_helping", "p_caring", "p_organize"], // S, S, C
      tot: { tot1: "a", tot2: "a", tot3: "b", tot4: "a" }, // C, S, R, E
    });
    const areas = getInterestAreas(s);
    expect(areas).toHaveLength(3);
    expect(areas[0].letter).toBe("S");
  });

  it("samples for each area are filtered by primary RIASEC letter", () => {
    const s = stateWith({
      miniIp: { ip13: 2, ip14: 2, ip15: 2 }, // S-heavy
      tags: ["t_teach", "t_help", "t_listen"],
    });
    const areas = getInterestAreas(s);
    for (const area of areas) {
      for (const occ of area.samples) {
        expect(occ.riasec[0]).toBe(area.letter);
      }
    }
  });

  it("respects constraint filter when picking samples", () => {
    const s = stateWith({
      constraints: { ...baseConstraints, english: "beginner" },
      miniIp: { ip01: 2 }, // R signal
    });
    const areas = getInterestAreas(s);
    const allSamples = areas.flatMap((a) => a.samples);
    // beginner English clients shouldn't see advanced/native-required roles
    for (const occ of allSamples) {
      expect(["beginner", "conversational"]).toContain(occ.english_level);
    }
  });

  it("returns 3 areas even when one has zero samples (empty samples array)", () => {
    const s = stateWith({
      constraints: { ...baseConstraints, english: "beginner" },
    });
    const areas = getInterestAreas(s);
    expect(areas).toHaveLength(3);
    // each area is well-formed even if samples is empty
    for (const a of areas) expect(Array.isArray(a.samples)).toBe(true);
  });

  it("respects samplesPerArea parameter", () => {
    const s = stateWith({
      miniIp: { ip13: 2, ip14: 2, ip15: 2 },
    });
    const areas = getInterestAreas(s, 1);
    for (const a of areas) expect(a.samples.length).toBeLessThanOrEqual(1);
  });
});
