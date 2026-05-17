import { test, expect } from "@playwright/test";

const MINI_IP_IDS = [
  "ip01", "ip02", "ip03", "ip04", "ip05",
  "ip06", "ip07", "ip08", "ip09", "ip10",
  "ip11", "ip12", "ip13", "ip14", "ip15",
  "ip16", "ip17", "ip18", "ip19", "ip20",
];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("landing page renders and shows outcome bullet", async ({ page }) => {
  await expect(page.locator("h1")).toContainText("Discover your skills, interests");
  await expect(page.locator(".bullets li").first()).toContainText("1-page summary");
});

test("language toggle swaps copy and updates html[lang]", async ({ page }) => {
  await page.click('button[data-lang="zh-Hans"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.locator(".brand")).toHaveText(/职业指南针/);
  await page.click('button[data-lang="es"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("h1")).toContainText("Descubre");
  await page.click('button[data-lang="en"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("validation: clicking Next without answering shows an error", async ({ page }) => {
  await page.click('button[data-action="start"]');
  await page.click('button[data-action="next"]');
  await expect(page.locator(".field-error")).toBeVisible();
});

test("full survey end-to-end completes and shows results", async ({ page }) => {
  await page.click('button[data-action="start"]');

  // 4 likert pages: pick "Not sure" (val=1) for every item
  for (let p = 0; p < 4; p++) {
    const pageIds = MINI_IP_IDS.slice(p * 5, (p + 1) * 5);
    for (const id of pageIds) {
      await page.click(`[data-action="likert"][data-qid="${id}"][data-val="1"]`);
    }
    await page.click('button[data-action="next"]');
  }

  // tot1
  await page.click('[data-action="tot"][data-id="tot1"][data-side="a"]');
  await page.click('button[data-action="next"]');

  // tags: pick 3
  for (const id of ["t_teach", "t_help", "t_listen"]) {
    await page.click(`[data-action="tag"][data-id="${id}"]`);
  }
  await page.click('button[data-action="next"]');

  // tot2
  await page.click('[data-action="tot"][data-id="tot2"][data-side="a"]');
  await page.click('button[data-action="next"]');

  // workspace
  await page.click('[data-action="workspace"][data-id="w_classroom"]');
  await page.click('button[data-action="next"]');

  // passions: pick 3
  for (const id of ["p_helping", "p_caring", "p_organize"]) {
    await page.click(`[data-action="passion"][data-id="${id}"]`);
  }
  await page.click('button[data-action="next"]');

  // tot3
  await page.click('[data-action="tot"][data-id="tot3"][data-side="b"]');
  await page.click('button[data-action="next"]');

  // strengths: answer 6
  for (const id of ["s_details", "s_calming", "s_explaining", "s_fixing", "s_patterns", "s_organize"]) {
    await page.click(`[data-action="strength"][data-qid="${id}"][data-val="2"]`);
  }
  await page.click('button[data-action="next"]');

  // values: pick 3
  for (const id of ["v_relationships", "v_support", "v_conditions"]) {
    await page.click(`[data-action="value"][data-id="${id}"]`);
  }
  await page.click('button[data-action="next"]');

  // tot4
  await page.click('[data-action="tot"][data-id="tot4"][data-side="a"]');
  await page.click('button[data-action="next"]');

  // skills: answer 8
  for (const id of ["sk_career", "sk_comm", "sk_critical", "sk_equity", "sk_lead", "sk_prof", "sk_team", "sk_tech"]) {
    await page.click(`[data-action="skill"][data-qid="${id}"][data-val="2"]`);
  }
  await page.click('button[data-action="next"]');

  // constraints: answer 4
  await page.click('[data-action="constraint"][data-qid="education"][data-val="hs"]');
  await page.click('[data-action="constraint"][data-qid="english"][data-val="conversational"]');
  await page.click('[data-action="constraint"][data-qid="work_auth"][data-val="yes"]');
  await page.click('[data-action="constraint"][data-qid="hours"][data-val="ft"]');
  await page.click('button[data-action="next"]');

  // results
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.locator("h1")).toContainText("Your Career Compass");
  await expect(page.locator(".complete-badge")).toBeVisible();
  await expect(page.locator(".occ-card")).toHaveCount(3);
  // Social-heavy profile should surface S-primary or S-secondary occupations
  const titles = await page.locator(".occ-card h3").allTextContents();
  expect(titles.join(" ")).toMatch(/CNA|Nursing|Medical|Dental|Receptionist|Educator/);
});

test("results page Download PDF button is present and clickable", async ({ page }) => {
  // Seed a completed state directly
  await page.evaluate(() => {
    const state = {
      version: 1, startedAt: Date.now(), updatedAt: Date.now(), lang: "en", pageIndex: 14,
      miniIp: Object.fromEntries(
        ["ip01","ip02","ip03","ip04","ip05","ip06","ip07","ip08","ip09","ip10","ip11","ip12","ip13","ip14","ip15","ip16","ip17","ip18","ip19","ip20"]
          .map((id) => [id, 1]),
      ),
      tags: ["t_teach"], workspace: "w_classroom",
      passions: ["p_helping","p_caring","p_organize"],
      strengths: { s_details:2,s_calming:2,s_explaining:2,s_fixing:1,s_patterns:1,s_organize:2 },
      values: ["v_relationships","v_support","v_conditions"],
      skills: { sk_career:1,sk_comm:2,sk_critical:1,sk_equity:2,sk_lead:0,sk_prof:2,sk_team:2,sk_tech:1 },
      tot: { tot1:"a",tot2:"a",tot3:"b",tot4:"a" },
      constraints: { education:"hs",english:"conversational",work_auth:"yes",hours:"ft" }
    };
    localStorage.setItem("cscCompass.state", JSON.stringify(state));
  });
  await page.goto("/#/results");
  await expect(page.locator('button[data-action="pdf"]')).toBeVisible();
  // Don't actually click — we don't want to trigger window.print() in CI
});

test("resume link returns user to the page they left, not page 1", async ({ page }) => {
  // Seed mid-survey state at pageIndex 5 (a passions/tags-ish point)
  await page.evaluate(() => {
    const state = {
      version: 1, startedAt: Date.now(), updatedAt: Date.now(), lang: "en",
      pageIndex: 5,
      miniIp: { ip01: 1, ip02: 1, ip03: 1, ip04: 1, ip05: 1 },
      tags: [], workspace: null, passions: [], strengths: {}, values: [],
      skills: {}, tot: {}, constraints: {},
    };
    localStorage.setItem("cscCompass.state", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator('[data-action="resume"]')).toBeVisible();
  await page.click('[data-action="resume"]');
  // After resume, the survey state object must keep pageIndex at 5, not reset to 0.
  const parsed = await page.evaluate(() => {
    const raw = localStorage.getItem("cscCompass.state");
    return raw ? JSON.parse(raw) : null;
  });
  expect(parsed?.pageIndex).toBe(5);
});

test("restart link returns to landing and resets the survey state", async ({ page }) => {
  await page.click('button[data-action="start"]');
  // Answer one item to ensure non-empty state
  await page.click('[data-action="likert"][data-qid="ip01"][data-val="1"]');
  await page.goto("/#/results");
  await page.click('a[data-action="restart"]');
  await expect(page).toHaveURL(/\/$|\/#\/$|\/#?$/);

  // After restart, the survey state must be reset (pageIndex=0 and all answer
  // collections empty). The state object itself stays in localStorage as a
  // fresh empty record — same effect as no state for the landing-page UX.
  const parsed = await page.evaluate(() => {
    const raw = localStorage.getItem("cscCompass.state");
    return raw ? JSON.parse(raw) : null;
  });
  if (parsed !== null) {
    expect(parsed.pageIndex).toBe(0);
    expect(parsed.miniIp).toEqual({});
    expect(parsed.passions).toEqual([]);
    expect(parsed.values).toEqual([]);
  }
});
