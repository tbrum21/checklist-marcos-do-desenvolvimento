import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = require("../milestones.js");

test("all 12 age groups exist and contain milestones across all 4 domains", () => {
  assert.equal(data.AGE_GROUPS.length, 12);
  for (const group of data.AGE_GROUPS) {
    const milestones = data.getMilestones(group.value);
    assert.ok(milestones.length >= 10, `Expected >= 10 milestones for ${group.label}, got ${milestones.length}`);
    assert.equal(data.getAgeLabel(group.value), group.label);
  }
});

test("computeTotals counts yes, unsure, no and unanswered accurately", () => {
  const milestones = data.getMilestones(12);
  const answers = {
    "social-0": "yes",
    "language-0": "yes",
    "language-1": "unsure",
    "cognitive-0": "no"
  };
  const totals = data.computeTotals(12, answers);
  assert.equal(totals.yes, 2);
  assert.equal(totals.unsure, 1);
  assert.equal(totals.no, 1);
  assert.equal(totals.unanswered, milestones.length - 4);
  assert.equal(totals.total, milestones.length);
});

test("computeDomainBreakdown calculates percentages per domain", () => {
  const breakdown = data.computeDomainBreakdown(2, {
    "social-0": "yes",
    "social-1": "yes",
    "social-2": "no",
    "social-3": "unsure",
    "language-0": "yes",
    "language-1": "yes"
  });
  const social = breakdown.find((d) => d.key === "social");
  const language = breakdown.find((d) => d.key === "language");
  assert.equal(social.yes, 2);
  assert.equal(social.pctYes, 50);
  assert.equal(language.yes, 2);
  assert.equal(language.pctYes, 100);
});

test("suggestAgeGroup and formatChildAge compute expected values", () => {
  const fixedNow = new Date("2026-11-23T12:00:00Z");
  const suggestion = data.suggestAgeGroup("2025-11-23", fixedNow.getTime());
  assert.equal(suggestion.closest.value, 12);
  assert.equal(data.formatChildAge("2025-11-23", fixedNow), "1 ano");
  assert.equal(data.formatChildAge("2024-05-23", fixedNow), "2 anos e 6 meses");
});

test("compareAssessments detects progress delta and newly gained milestones", () => {
  const previous = {
    age_months: 12,
    yes_count: 3,
    total_count: 10,
    answers: { "social-0": "yes", "language-0": "no", "cognitive-0": "unsure" }
  };
  const latest = {
    age_months: 12,
    yes_count: 5,
    total_count: 10,
    answers: { "social-0": "yes", "language-0": "yes", "cognitive-0": "yes" }
  };
  const diff = data.compareAssessments(latest, previous);
  assert.equal(diff.deltaPct, 20);
  assert.equal(diff.sameAgeGroup, true);
  assert.equal(diff.gained.length, 2);
  assert.deepEqual(
    diff.gained.map((m) => m.id),
    ["language-0", "cognitive-0"]
  );
});

test("index.html references all required scripts and DOM mount points", () => {
  const html = fs.readFileSync(path.resolve("index.html"), "utf8");
  assert.match(html, /@supabase\/supabase-js@2\.49\.4/);
  assert.match(html, /src="\.\/config\.js"/);
  assert.match(html, /src="\.\/milestones\.js"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /id="header-actions"/);
  assert.match(html, /id="toast-region"/);
  assert.match(html, /id="app"/);
});

test("app.js enforces login-only auth, superadmin panel, and first-access password change", () => {
  const js = fs.readFileSync(path.resolve("app.js"), "utf8");
  assert.doesNotMatch(js, /auth\.signUp\(/, "Self-signup must not exist in frontend");
  assert.match(js, /function renderSuperadmin\(/);
  assert.match(js, /function renderChangePassword\(/);
  assert.match(js, /must_change_password/);
  assert.match(js, /admin_create_professional/);
});

test("landing page includes SEO metadata, interactive age explorer, pricing and lead capture modal", () => {
  const html = fs.readFileSync(path.resolve("index.html"), "utf8");
  const css = fs.readFileSync(path.resolve("styles.css"), "utf8");
  const js = fs.readFileSync(path.resolve("app.js"), "utf8");
  assert.match(html, /meta\s+name="description"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /id="modal-root"/);
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch, "JSON-LD script block must exist");
  const ld = JSON.parse(ldMatch[1]);
  assert.equal(ld["@type"], "SoftwareApplication");
  const openBraces = (css.match(/\{/g) || []).length;
  const closeBraces = (css.match(/\}/g) || []).length;
  assert.equal(openBraces, closeBraces, "CSS braces must be balanced");
  assert.match(js, /function buildLpExplorerHtml\(/);
  assert.match(js, /function openLeadModal\(/);
  assert.match(js, /id="planos"/);
  assert.match(js, /id="seguranca"/);
  assert.match(js, /access_leads/);
});
