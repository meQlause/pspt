#!/usr/bin/env node
// pspt smoke runner — opens a real browser on a running app (or local HTML files),
// visits each target once, and records whether it works. Not a test suite: one
// visit per target, the checks below, and a full-page PNG of each.
//
//   node smoke.mjs <plan.json>
//
// Exit 0 = every target passed · 1 = at least one failed · 2 = no browser could be launched.
// The plan format is documented in skills/smoke/SKILL.md.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const planPath = process.argv[2];
if (!planPath) { console.error('usage: node smoke.mjs <plan.json>'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const out = path.resolve(plan.out || '.pspt-smoke/run');
fs.mkdirSync(out, { recursive: true });

// ---------- find Playwright: the project's own first, then a global install ----------
function loadPlaywright() {
  const tried = [];
  const roots = [plan.projectDir, process.cwd()].filter(Boolean).map(d => path.resolve(d));
  for (const root of roots) {
    const req = createRequire(path.join(root, 'package.json'));
    for (const name of ['@playwright/test', 'playwright']) {
      try { return { pw: req(name), from: path.dirname(req.resolve(`${name}/package.json`)) }; } catch { tried.push(`${name} in ${root}`); }
    }
  }
  const globalRoot = process.env.NODE_PATH || '';
  for (const dir of globalRoot.split(path.delimiter).filter(Boolean)) {
    try { return { pw: createRequire(path.join(dir, 'x.js'))('playwright'), from: `playwright in ${dir}` }; } catch { tried.push(`playwright in ${dir}`); }
  }
  return { pw: null, tried };
}

// ---------- launch: installed Google Chrome first, then Playwright's Chromium ----------
async function launch(pw) {
  const chromium = pw.chromium;
  const headless = plan.headless !== false;
  const attempts = plan.channel ? [{ channel: plan.channel }] : [{ channel: 'chrome' }, {}];
  if (process.env.PSPT_CHROMIUM) attempts.push({ executablePath: process.env.PSPT_CHROMIUM });
  const errors = [];
  for (const opts of attempts) {
    try {
      const browser = await chromium.launch({ headless, ...opts });
      return { browser, label: opts.channel ? `Google Chrome (channel ${opts.channel})` : opts.executablePath ? opts.executablePath : 'Playwright Chromium', version: browser.version() };
    } catch (e) { errors.push(`${JSON.stringify(opts)}: ${String(e.message).split('\n')[0]}`); }
  }
  return { browser: null, errors };
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
function urlFor(target) {
  if (target.file) return pathToFileURL(path.resolve(target.file)).href;
  if (/^https?:/.test(target.path || '')) return target.path;
  return new URL(target.path || '/', plan.baseUrl).href;
}
function sameOrigin(u) { try { return plan.baseUrl && new URL(u).origin === new URL(plan.baseUrl).origin; } catch { return false; } }
function apiOrigin(u) { try { return (plan.apiUrl && new URL(u).origin === new URL(plan.apiUrl).origin) || sameOrigin(u); } catch { return false; } }

async function runActions(page, actions = []) {
  for (const a of actions) {
    if (a.fill) await page.locator(a.fill).fill(String(a.value ?? ''), { timeout: 10000 });
    else if (a.click) await page.locator(a.click).first().click({ timeout: 10000 });
    else if (a.press) await page.keyboard.press(a.press);
    else if (a.waitFor) await page.locator(a.waitFor).first().waitFor({ state: 'visible', timeout: 15000 });
    else if (a.waitForUrl) await page.waitForURL(u => u.href.includes(a.waitForUrl), { timeout: 15000 });
    else if (a.wait) await page.waitForTimeout(a.wait);
  }
}

async function login(context, auth) {
  const page = await context.newPage();
  await page.goto(new URL(auth.path || '/login', plan.baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await runActions(page, auth.actions);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.close();
}

async function visit(context, target, i) {
  const page = await context.newPage();
  const r = { name: target.name, url: urlFor(target), status: null, consoleErrors: [], pageErrors: [], failedRequests: [], checks: [], ok: true };
  page.on('console', m => { if (m.type() === 'error') r.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => r.pageErrors.push(String(e.message).slice(0, 300)));
  page.on('requestfailed', q => { if (apiOrigin(q.url())) r.failedRequests.push(`${q.method()} ${q.url()} — ${q.failure()?.errorText}`); });
  page.on('response', s => { if (s.status() >= 500 && apiOrigin(s.url())) r.failedRequests.push(`${s.request().method()} ${s.url()} — ${s.status()}`); });
  try {
    const res = await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    r.status = res ? res.status() : (target.file ? 'file' : null);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => r.checks.push('network never went idle within 15 s (polling or a long request)'));
    if (typeof r.status === 'number' && r.status >= 400) { r.ok = false; r.checks.push(`page returned HTTP ${r.status}`); }
    if (target.expect) {
      const visible = await page.locator(target.expect).first().isVisible({ timeout: 10000 }).catch(() => false);
      if (!visible) { r.ok = false; r.checks.push(`expected "${target.expect}" to be visible — it is not`); }
    }
    if (target.notAt && page.url().includes(target.notAt)) { r.ok = false; r.checks.push(`ended at ${page.url()} — redirected to "${target.notAt}" (not logged in?)`); }
    if (target.actions?.length) {
      try { await runActions(page, target.actions); await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}); }
      catch (e) { r.ok = false; r.checks.push(`action failed: ${String(e.message).split('\n')[0]}`); }
    }
  } catch (e) { r.ok = false; r.checks.push(`could not open: ${String(e.message).split('\n')[0]}`); }
  if (r.pageErrors.length) r.ok = false;
  if (r.failedRequests.length) r.ok = false;
  if (r.consoleErrors.length && !plan.allowConsoleErrors) r.ok = false;
  r.screenshot = path.join(out, `${String(i + 1).padStart(2, '0')}-${slug(target.name)}.png`);
  await page.screenshot({ path: r.screenshot, fullPage: true }).catch(e => r.checks.push(`screenshot failed: ${e.message}`));
  r.finalUrl = page.url();
  await page.close();
  return r;
}

const { pw, from, tried } = loadPlaywright();
if (!pw) {
  console.error(`smoke: Playwright not found. Tried: ${tried.join(', ')}`);
  console.error('Add it to the frontend (npm i -D @playwright/test) or install it globally.');
  process.exit(2);
}
const { browser, label, version, errors } = await launch(pw);
if (!browser) {
  console.error('smoke: no browser could be launched.');
  for (const e of errors) console.error('  ' + e);
  console.error('Install Google Chrome, or run: npx playwright install chromium');
  process.exit(2);
}

const vp = plan.viewport || { width: 1440, height: 900 };
const results = [];
try {
  const groups = [[false, plan.targets.filter(t => !t.auth)], [true, plan.targets.filter(t => t.auth)]];
  let i = 0;
  for (const [needsAuth, targets] of groups) {
    if (!targets.length) continue;
    const context = await browser.newContext({ viewport: vp, locale: plan.locale, timezoneId: plan.timezone });
    if (needsAuth) {
      if (!plan.login) { for (const t of targets) results.push({ name: t.name, ok: false, checks: ['needs login, but the plan has no "login" block'] }); await context.close(); continue; }
      try { await login(context, plan.login); }
      catch (e) { for (const t of targets) results.push({ name: t.name, ok: false, checks: [`login failed: ${String(e.message).split('\n')[0]}`] }); await context.close(); continue; }
    }
    for (const t of targets) results.push(await visit(context, t, i++));
    await context.close();
  }
} finally {
  await browser.close();
}

const report = { at: new Date().toISOString(), browser: `${label} ${version}`, playwright: from, viewport: vp, baseUrl: plan.baseUrl || null, results };
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

console.log(`smoke · ${report.browser} · ${vp.width}×${vp.height} · Playwright from ${from}`);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(28)} ${r.status ?? ''}  ${r.screenshot ? path.relative(process.cwd(), r.screenshot) : ''}`);
  for (const c of r.checks || []) console.log(`    ${c}`);
  for (const e of r.pageErrors || []) console.log(`    page error: ${e}`);
  for (const e of r.failedRequests || []) console.log(`    request: ${e}`);
  for (const e of (r.consoleErrors || []).slice(0, 5)) console.log(`    console: ${e}`);
}
const failed = results.filter(r => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed · report ${path.relative(process.cwd(), path.join(out, 'report.json'))}`);
process.exit(failed ? 1 : 0);
