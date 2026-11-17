const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const feature = fs.readFileSync("public-investment-projects.js", "utf8");
const css = fs.readFileSync("public-investment-projects.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261113000000_public_investment_projects.sql", "utf8");

[
  'data-view="public-investment-projects"',
  'id="public-investment-projects"',
  'data-public-investment-workspace="projects"',
  'data-public-investment-workspace="appraisal"',
  'id="publicInvestmentProjectMetrics"',
  'id="publicInvestmentProjectDialog"',
  'data-public-project-tab="overview"',
  'data-public-project-tab="stages"',
  'data-public-project-tab="legal"',
  'data-public-project-tab="schedule"',
  'data-public-project-tab="links"',
  'data-public-project-tab="risks"',
  'public-investment-projects.js',
].forEach((token) => assert.ok(html.includes(token), `Thiếu giao diện phân hệ: ${token}`));

[
  '"publicInvestmentProjects"',
  '"public-investment-projects"',
  'PUBLIC_INVESTMENT_PROJECT_DEPLOYMENT_VERSION',
  'window.PublicInvestmentProjects?.normalizeCollection',
  'window.PublicInvestmentProjects?.render',
].forEach((token) => assert.ok(script.includes(token), `Thiếu tích hợp runtime: ${token}`));

[
  'const STAGES = Object.freeze',
  'const CHECKLIST = Object.freeze',
  'function validateGates',
  'function projectLinks',
  'function normalizeCollection',
  'saveState?.()',
  'logActivity?.(',
  'window.PublicInvestmentProjects =',
].forEach((token) => assert.ok(feature.includes(token), `Thiếu nghiệp vụ hồ sơ dự án: ${token}`));

[
  'publicInvestmentProjects',
  'public-investment-projects',
  'public_investment_projects',
  'normalizePublicInvestmentProject(',
  'validPublicInvestmentProjectGates(',
  'canViewPublicInvestmentProjectRecord(',
  'canUpdatePublicInvestmentProjectRecord(',
  'Invalid public investment project record.',
].forEach((token) => assert.ok(edge.includes(token), `Thiếu bảo vệ máy chủ: ${token}`));

[
  'create table if not exists public.public_investment_projects',
  'public_investment_projects_project_id_idx',
  'public_investment_projects_department_id_idx',
  'alter table public.public_investment_projects enable row level security',
  'revoke all on table public.public_investment_projects from anon, authenticated',
].forEach((token) => assert.ok(migration.includes(token), `Thiếu migration: ${token}`));

assert.match(css, /\.public-project-metrics\s*\{[\s\S]*grid-template-columns:/, "Thiếu bố cục chỉ số.");
assert.match(css, /\.public-investment-hub-tabs\s*\{[\s\S]*overflow-x:\s*auto/, "Tab phân hệ chưa hỗ trợ màn hình hẹp.");
assert.match(css, /\.public-project-tabs\s*\{[\s\S]*overflow-x:\s*auto/, "Tab chưa hỗ trợ màn hình hẹp.");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.public-project-modal/, "Thiếu bố cục mobile.");

console.log("public_investment_projects=passed");
