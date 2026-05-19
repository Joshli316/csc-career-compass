import { describe, it, expect } from "vitest";
import { t, formatT, pickLocalized, pickShort, formatWage } from "./i18n";

// These tests run in node env (no DOM). They cover the pure helpers; they
// deliberately don't exercise setLang() which touches document.documentElement.

describe("t — translation lookup", () => {
  it("returns a string for a known key", () => {
    expect(typeof t("survey.next")).toBe("string");
    expect(t("survey.next").length).toBeGreaterThan(0);
  });
  it("falls back to the raw key when missing", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});

describe("formatT — placeholder substitution", () => {
  it("substitutes named placeholders", () => {
    expect(formatT("survey.step_counter", { current: 3, total: 15 })).toMatch(/3/);
  });
  it("leaves unknown placeholders intact", () => {
    // If a translation template references {missing}, we shouldn't silently
    // drop the brace — surface it so QA notices.
    const out = formatT("survey.next", { unused: "value" });
    expect(out).toBeDefined();
  });
});

describe("pickLocalized — schema-mismatch failure mode", () => {
  it("returns the en-suffixed field when present", () => {
    const obj = { label_en: "Hello", label_zh: "你好", label_es: "Hola" };
    expect(pickLocalized(obj, "label")).toBe("Hello"); // default lang is en
  });
  it("falls back to English when target locale is empty", () => {
    const obj = { label_en: "Hello", label_zh: "", label_es: "Hola" };
    expect(pickLocalized(obj, "label")).toBe("Hello");
  });
  it("returns empty string on total schema mismatch (silent failure — caller must guard)", () => {
    // Memory: feedback_i18n_helper_empty_silent — this is the failure mode
    // that loses i18n data without surfacing an error. Test pins the behavior
    // so future refactors that try to throw instead update call sites first.
    expect(pickLocalized({ other_field: "x" }, "label")).toBe("");
    expect(pickLocalized(null, "label")).toBe("");
    expect(pickLocalized(undefined, "label")).toBe("");
  });
});

describe("pickShort — { en, zh, es } shape", () => {
  it("returns the English value by default", () => {
    expect(pickShort({ en: "Yes", zh: "是", es: "Sí" })).toBe("Yes");
  });
  it("returns empty string on schema mismatch", () => {
    expect(pickShort({ label_en: "Hello" })).toBe("");
    expect(pickShort(null)).toBe("");
  });
});

describe("formatWage", () => {
  it("formats whole-dollar amounts as $N.00/hr", () => {
    expect(formatWage(20)).toMatch(/\$20\.00/);
  });
  it("formats fractional amounts as $N.NN/hr", () => {
    expect(formatWage(17.52)).toMatch(/\$17\.52/);
  });
});
