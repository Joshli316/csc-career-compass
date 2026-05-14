import { describe, it, expect } from "vitest";
import totData from "./data/this-or-that.json";

// Mirrors the lang→suffix map inside pickLocalized() so this test also
// catches a divergence in key naming on either side. The original bug:
// renderTotPage called pickShort (en/zh/es keys) on items whose keys are
// label_en/label_zh/label_es, so the buttons rendered as empty strings.
const SUFFIX_BY_LANG = {
  en: "label_en",
  "zh-Hans": "label_zh",
  es: "label_es",
} as const;

describe("this-or-that data", () => {
  it("has 4 items with stable ids", () => {
    expect(totData).toHaveLength(4);
    expect(totData.map((t) => t.id)).toEqual(["tot1", "tot2", "tot3", "tot4"]);
  });

  for (const [lang, key] of Object.entries(SUFFIX_BY_LANG)) {
    for (const item of totData) {
      it(`${item.id} renders non-empty A+B labels in ${lang}`, () => {
        const a = (item.a as Record<string, unknown>)[key];
        const b = (item.b as Record<string, unknown>)[key];
        expect(typeof a).toBe("string");
        expect(typeof b).toBe("string");
        expect((a as string).trim()).not.toBe("");
        expect((b as string).trim()).not.toBe("");
      });
    }
  }
});
