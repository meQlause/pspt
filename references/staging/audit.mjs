#!/usr/bin/env node
// pspt staging audit — the mechanics behind /pspt:staging-fix.
// Checks one package against references/staging.md: health endpoints, the /api/v1
// prefix, and the split between application environment and secrets.
//
//   node audit.mjs <package-dir> [--json]        static audit
//   node audit.mjs --probe <baseUrl> [--json]    check a running service
//
// Never prints a secret: findings carry file, line and key NAMES only.
// Exit 0 = nothing to fix · 1 = findings (or a failed probe) · 3 = unsupported stack.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const json = args.includes('--json');
const PREFIX = '/api/v1';
const HEALTH = ['healthz', 'liveness', 'readiness'];
const LEGACY = ['health', 'ready', 'live', 'ping', 'status'];
const SECRET_KEY = /(SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|API_?KEY|CREDENTIAL|SIGNING|ENCRYPTION|ACCESS_?KEY|CLIENT_SECRET|DSN)/i;
const PLAIN_KEY = /^(NODE_ENV|PORT|HOST|LOG_LEVEL|APP_[A-Z_]+|CORS[A-Z_]*|FEATURE_[A-Z_]+|.*_(HOST|PORT|NAME|ENABLED|USER|REGION))$/;
const BROWSER_KEY = /^(NEXT_PUBLIC_|VITE_|REACT_APP_)/;

const out = (v) => console.log(json ? JSON.stringify(v, null, 2) : v);

// ------------------------------------------------------------------ probe mode
if (args[0] === '--probe') {
  const base = (args[1] || '').replace(/\/$/, '');
  if (!base) { console.error('usage: node audit.mjs --probe <baseUrl>'); process.exit(2); }
  const results = [];
  const get = async (p) => { try { const r = await fetch(base + p, { signal: AbortSignal.timeout(5000) }); const text = await r.text(); let body = null; try { body = JSON.parse(text); } catch { /* not json */ } return { r, body, text }; } catch (e) { return { error: String(e.message || e) }; } };
  const expect = (name, ok, detail) => results.push({ name, ok, detail });
  for (const h of HEALTH) {
    const { r, body, error } = await get(`${PREFIX}/${h}`);
    if (error) { expect(`GET ${PREFIX}/${h}`, false, error); continue; }
    const codes = h === 'readiness' ? [200, 503] : [200];
    expect(`GET ${PREFIX}/${h} answers ${codes.join(' or ')}`, codes.includes(r.status), `got ${r.status}`);
    expect(`GET ${PREFIX}/${h} answers JSON with "status"`, !!(body && typeof body.status === 'string'), body ? 'ok' : 'body is not JSON');
    expect(`GET ${PREFIX}/${h} sends Cache-Control: no-store`, /no-store/i.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control') || 'missing');
    if (h === 'liveness') expect('liveness never reports dependency checks', !(body && body.checks), body && body.checks ? 'has "checks"' : 'ok');
    if (h === 'readiness') expect('readiness reports "checks"', !!(body && body.checks && typeof body.checks === 'object'), body && body.checks ? 'ok' : 'missing');
  }
  for (const l of LEGACY.map((x) => `/${x}`)) {
    const { r } = await get(l);
    if (r && r.status !== 404) expect(`legacy ${l} is gone`, false, `answers ${r.status}`);
  }
  const unknown = await get(`${PREFIX}/__no_such_route__`);
  expect('unknown path answers 404', !!unknown.r && unknown.r.status === 404, unknown.error || `got ${unknown.r && unknown.r.status}`);
  expect('unknown path answers JSON, not HTML', !!unknown.body, unknown.body ? 'ok' : 'body is not JSON');
  const failed = results.filter((x) => !x.ok);
  if (json) out({ base, results, failed: failed.length });
  else {
    console.log(`probe ${base}`);
    for (const x of results) console.log(`${x.ok ? '✓' : '✗'} ${x.name}${x.ok ? '' : ' — ' + x.detail}`);
    console.log(`${results.length - failed.length}/${results.length} passed`);
  }
  process.exit(failed.length ? 1 : 0);
}

// ----------------------------------------------------------------- static audit
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
if (!fs.existsSync(path.join(dir, 'package.json'))) { console.error(`no package.json in ${dir}`); process.exit(2); }
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const stack = deps.next ? 'nextjs' : deps['@nestjs/core'] ? 'nestjs' : deps.react ? 'react' : deps.express ? 'express' : null;
if (!stack) { console.error(`unsupported: no Express, NestJS, Next.js or React in ${dir}`); process.exit(3); }

const SKIP = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', '.husky', '.pspt-smoke', 'out']);
const walk = (root, accept, depth = 8) => {
  const acc = [];
  const rec = (d, n) => {
    if (n > depth) return;
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p, n + 1);
      else if (accept(p) && fs.statSync(p).size < 300_000) acc.push(p);
    }
  };
  rec(root, 0);
  return acc;
};
const rel = (p) => path.relative(dir, p) || '.';
const isTest = (p) => /(^|\/)(tests?|__tests__|e2e|fixtures)\//.test(rel(p)) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
const code = walk(dir, (p) => /\.[cm]?[jt]sx?$/.test(p)).filter((p) => !isTest(p) && !/(^|\/)(eslint|vite|vitest|next|tailwind|postcss|commitlint)\.config\./.test(rel(p)) || /vite\.config\./.test(p));
const read = (p) => fs.readFileSync(p, 'utf8').split('\n');
const findings = [];
const seen = new Set();
const add = (id, severity, file, line, message, fix) => { const k = `${id}|${file}|${line}`; if (seen.has(k)) return; seen.add(k); findings.push({ id, severity, file: file ? rel(file) : null, line: line || null, message, fix }); };
const grep = (files, re, fn) => { for (const f of files) read(f).forEach((l, i) => { const m = re.exec(l); if (m) fn(f, i + 1, m, l); }); };

// --- 1. /api/v1 ----------------------------------------------------------------
const prefixFiles = code.filter((f) => fs.readFileSync(f, 'utf8').includes(PREFIX));
if (stack === 'express') {
  if (!prefixFiles.length) add('P0', 'error', null, null, `no ${PREFIX} prefix declared`, `mount one router: app.use('${PREFIX}', api)`);
  grep(code, /\b(app|server)\.(get|post|put|patch|delete|all|options|head)\(\s*(['"`])(\/[^'"`]*)\3/, (f, n, m) => { if (!m[4].startsWith(PREFIX)) add('P1', 'error', f, n, `route ${m[2].toUpperCase()} ${m[4]} is registered outside ${PREFIX}`, `register it on the router mounted at ${PREFIX}`); });
  grep(code, /\b(app|server)\.use\(\s*(['"`])(\/[^'"`]*)\2/, (f, n, m) => { if (m[3] !== PREFIX && !m[3].startsWith(PREFIX + '/')) add('P1', 'error', f, n, `app.use('${m[3]}', …) mounts outside ${PREFIX}`, `mount it inside the router at ${PREFIX}`); });
}
if (stack === 'nestjs') {
  const main = code.filter((f) => /(^|\/)main\.[jt]s$/.test(f));
  const text = main.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  if (!/setGlobalPrefix\(\s*['"`]\/?api\/v1['"`]/.test(text)) add('P0', 'error', main[0], null, `no app.setGlobalPrefix('api/v1') in main.ts`, `app.setGlobalPrefix('api/v1')`);
  if (/setGlobalPrefix\([^)]*exclude/s.test(text)) add('P2', 'error', main[0], null, 'setGlobalPrefix has an exclude list — every route must be under the prefix', 'remove the exclude list');
  grep(code, /@Controller\(\s*['"`]\/?api\//, (f, n) => add('P3', 'warn', f, n, 'controller repeats the global prefix', "use the bare path: @Controller('courts')"));
}
if (stack === 'nextjs') {
  const routes = walk(dir, (p) => /(^|\/)(src\/)?app\/api\/.*\/route\.[jt]sx?$/.test(rel(p)) || /(^|\/)(src\/)?pages\/api\/.+\.[jt]sx?$/.test(rel(p)));
  for (const f of routes) { const r = rel(f); const after = r.replace(/^.*?(app|pages)\/api\//, ''); if (!after.startsWith('v1/')) add('P4', 'error', f, null, `route handler is outside api/v1 (${r})`, `move it under api/v1/`); }
}
if (stack === 'react') {
  grep(code, /\b(fetch|axios(?:\.\w+)?|get|post|put|patch|delete)\(\s*(['"`])\/(?!api\/v1)(?!\/)([\w/-]*)/, (f, n, m) => { if (!/\.(css|png|svg|jpg|ico|woff2?)/.test(m[3])) add('C1', 'error', f, n, `client calls /${m[3]} outside ${PREFIX}`, `call ${PREFIX}/… through one API client constant`); });
  grep(code, /['"`]\/api\/(?!v1)/, (f, n) => add('C1', 'error', f, n, `client calls /api/… without v1`, `use ${PREFIX}`));
}
if (stack === 'react') grep(code.filter((f) => /vite\.config\./.test(f)), /rewrite:.*replace\(\s*\/\^\\\/api/, (f, n) => add('C2', 'error', f, n, 'the dev proxy strips /api, so /api/v1/… would reach the backend as /v1/…', 'forward /api/v1 unchanged: remove the rewrite'));
if (prefixFiles.length > 1 && stack !== 'nextjs') add('P5', 'warn', prefixFiles[0], null, `'${PREFIX}' is written in ${prefixFiles.length} files`, 'keep it as one constant in one place');

// --- 2. health -------------------------------------------------------------------
if (stack !== 'react') {
  const haystack = walk(dir, (p) => /\.[cm]?[jt]sx?$/.test(p)).filter((p) => !isTest(p));
  for (const h of HEALTH) {
    const hit = haystack.filter((f) => new RegExp(`['"\`/]${h}['"\`/]`).test(fs.readFileSync(f, 'utf8')) || (stack === 'nextjs' && rel(f).includes(`/${h}/`)));
    if (!hit.length) add(`H-${h}`, 'error', null, null, `no ${PREFIX}/${h} endpoint`, `add GET ${PREFIX}/${h} (references/staging.md §1)`);
    if (h === 'readiness' && hit.length && !hit.some((f) => /503|ServiceUnavailable/.test(fs.readFileSync(f, 'utf8')))) add('H4', 'warn', hit[0], null, 'readiness never answers 503', 'answer 503 when a dependency fails, before startup and while shutting down');
    if (h === 'liveness' && hit.length) {
      for (const f of hit) { const lines = read(f); const i = lines.findIndex((l) => /liveness/.test(l)); let j = i + 1; while (j < lines.length && j < i + 8 && !/(\.(get|post|put|patch|delete)\(|@Get\(|@Controller|export (async )?function)/.test(lines[j])) j++; const win = lines.slice(i, j).join('\n'); if (/\b(prisma|pool|knex|sequelize|redis|database|db\.|query)\b/i.test(win)) add('H6', 'warn', f, i + 1, 'liveness appears to touch a dependency — it must not', 'return 200 without any I/O'); }
    }
  }
  if (stack === 'express' || stack === 'nestjs') {
    const all = haystack.map((f) => [f, fs.readFileSync(f, 'utf8')]);
    if (stack === 'nestjs') { if (!all.some(([, t]) => /enableShutdownHooks\(/.test(t))) add('H7', 'warn', null, null, 'no graceful shutdown: readiness cannot go 503 before the listener closes', 'app.enableShutdownHooks() and wait SHUTDOWN_GRACE_MS before closing'); }
    else {
      const hit = all.find(([, t]) => /SIGTERM/.test(t));
      if (!hit) add('H7', 'warn', null, null, 'no SIGTERM handler: readiness cannot go 503 before the listener closes', 'flip readiness, keep listening for SHUTDOWN_GRACE_MS, then close and exit');
      else { const lines = hit[1].split('\n'); const i = lines.findIndex((l) => /SIGTERM/.test(l)); if (!/setTimeout|SHUTDOWN_GRACE/.test(lines.slice(i, i + 14).join('\n'))) add('H8', 'warn', hit[0], i + 1, 'SIGTERM closes the listener at once — the probe never sees readiness 503', 'wait SHUTDOWN_GRACE_MS (default 5000) after flipping readiness, then close'); }
    }
  }
  grep(haystack, new RegExp(`['"\`]/(${LEGACY.join('|')})['"\`]`), (f, n, m) => add('H5', 'warn', f, n, `legacy health path /${m[1]}`, `replace with ${PREFIX}/healthz, /liveness or /readiness`));
}

// --- 3. environment ---------------------------------------------------------------
const envFiles = fs.readdirSync(dir).filter((n) => /^\.env(\..+)?$/.test(n));
const keysOf = (file) => fs.readFileSync(path.join(dir, file), 'utf8').split('\n').map((l, i) => ({ l, i: i + 1 })).filter(({ l }) => /^\s*[A-Z_][A-Z0-9_]*\s*=/.test(l)).map(({ l, i }) => ({ key: l.split('=')[0].trim(), value: l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, ''), line: i }));
let tracked = [];
try { tracked = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean); } catch { /* not a repository: nothing is tracked */ }
for (const f of tracked.filter((t) => /(^|\/)\.env(\..+)?$/.test(t) && !/\.example$/.test(t))) add('E1', 'critical', path.join(dir, f), null, 'an env file is committed', `git rm --cached ${f}, ignore it, and rotate every secret that was in it`);
const gitignore = ['.', '..', '../..'].map((d) => path.join(dir, d, '.gitignore')).filter(fs.existsSync).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
const ignored = (name) => gitignore.split('\n').some((l) => { const t = l.trim(); return t === name || t === '.env*' || t === '.env.*' || t === '*.env' || (name === '.env' && t === '.env'); });
if (!ignored('.env')) add('E3', 'error', null, null, '.env is not in .gitignore', 'add .env and .env.* with !.env.example and !.env.secret.example');
if (!ignored('.env.secret')) add('E3', 'error', null, null, '.env.secret is not in .gitignore', 'add .env.secret');
if (!envFiles.includes('.env.example')) add('E5', 'error', null, null, 'no .env.example (application environment template)', 'create it with every non-secret key');
if (stack !== 'react' && !envFiles.includes('.env.secret.example')) add('E6', 'error', null, null, 'no .env.secret.example (secrets template)', 'create it with every secret key and an EMPTY value');
const exampleKeys = new Set();
if (envFiles.includes('.env.example')) for (const { key, value, line } of keysOf('.env.example')) {
  exampleKeys.add(key);
  if (SECRET_KEY.test(key) || /:\/\/[^/\s:@]+:[^@\s]+@/.test(value)) add('E7', 'error', path.join(dir, '.env.example'), line, `${key} looks like a secret in the application env`, 'move the key to .env.secret and .env.secret.example');
  if (BROWSER_KEY.test(key) && SECRET_KEY.test(key)) add('E13', 'critical', path.join(dir, '.env.example'), line, `${key} would be exposed to the browser`, 'a frontend holds no secret — remove it');
}
if (envFiles.includes('.env.secret.example')) for (const { key, value, line } of keysOf('.env.secret.example')) {
  exampleKeys.add(key);
  if (value !== '') add('E9', 'error', path.join(dir, '.env.secret.example'), line, `${key} has a value in the secrets template`, 'leave the value empty');
  if (!SECRET_KEY.test(key) && PLAIN_KEY.test(key)) add('E8', 'warn', path.join(dir, '.env.secret.example'), line, `${key} is not a secret`, 'move it to .env.example');
}
const reads = new Map();
grep(walk(dir, (p) => /\.[cm]?[jt]sx?$/.test(p)).filter((p) => !isTest(p)), /(?:process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]|import\.meta\.env\.([A-Z_][A-Z0-9_]*))/, (f, n, m) => { const k = m[1] || m[2] || m[3]; if (!reads.has(k)) reads.set(k, [f, n]); });
for (const [k, [f, n]] of reads) {
  if (['NODE_ENV', 'MODE', 'DEV', 'PROD', 'BASE_URL', 'SSR'].includes(k)) continue;
  if (!exampleKeys.has(k)) add('E10', 'warn', f, n, `${k} is read but listed in neither .env.example nor .env.secret.example`, `add it to the right template (${SECRET_KEY.test(k) ? '.env.secret.example' : '.env.example'})`);
  if (BROWSER_KEY.test(k) && SECRET_KEY.test(k)) add('E13', 'critical', f, n, `${k} is read in browser code and looks like a secret`, 'a frontend holds no secret — remove it');
}
if (stack !== 'react' && !walk(dir, (p) => /secrets?[.\-]config|secrets\.[jt]s/.test(rel(p))).length) add('E11', 'warn', null, null, 'no separate secrets schema', 'add src/config/app.config.ts and src/config/secrets.config.ts, each validated at startup');
grep(code, /\b([A-Za-z_]*(password|passwd|secret|api[_-]?key|token|private[_-]?key)[A-Za-z_]*)\s*[:=]\s*(['"`])([^'"`\s$]{8,})\3/i, (f, n, m, l) => { if (!/process\.env|import\.meta|z\.|schema|describe|example/i.test(l)) add('E12', 'critical', f, n, `${m[1]} is hardcoded`, 'read it from .env.secret and rotate it'); });

// --- 4. deploy files --------------------------------------------------------------
// Deploy files: the package itself (recursive), plus the parent folder's own files and its infra-style
// directories — never a sibling package (backend/ and frontend/ each answer for their own files).
const DEPLOY_FILE = /(^|\/)(Dockerfile[^/]*|(docker-)?compose[^/]*\.ya?ml|.+\.ya?ml)$/;
const parent = path.dirname(dir);
const parentFiles = fs.existsSync(path.join(parent, '.git')) || fs.existsSync(path.join(parent, 'docker-compose.yml')) || fs.existsSync(path.join(parent, 'compose.yaml'))
  ? fs.readdirSync(parent, { withFileTypes: true }).flatMap((e) => (e.isFile() && DEPLOY_FILE.test(e.name) ? [path.join(parent, e.name)] : e.isDirectory() && /^(k8s|kubernetes|deploy|deployment|infra|manifests|charts|helm|gitops)$/i.test(e.name) ? walk(path.join(parent, e.name), (x) => DEPLOY_FILE.test(x), 4) : []))
  : [];
const deploy = [...new Set([...walk(dir, (p) => DEPLOY_FILE.test(p), 4), ...parentFiles])].filter((p) => !/node_modules|pnpm-lock|package-lock|\.github/.test(p));
const EXPECT = { livenessProbe: 'liveness', readinessProbe: 'readiness', startupProbe: 'healthz' };
for (const f of deploy) {
  const lines = read(f); const base = path.basename(f);
  if (/^Dockerfile/.test(base)) {
    lines.forEach((l, i) => {
      const hc = /HEALTHCHECK.*?(https?:\/\/[^\s'"]*)?(\/[\w/-]*health[\w/-]*|\/(?:ready|live|ping|status)\b|\/api\/v1\/\w+)/.exec(l);
      if (hc && !new RegExp(`${PREFIX}/(${HEALTH.join('|')})`).test(l)) add('D1', 'error', f, i + 1, 'HEALTHCHECK does not use a health endpoint under ' + PREFIX, `point it at ${PREFIX}/liveness`);
      if (/^\s*ARG\s+\w*(SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL)/i.test(l)) add('E14', 'error', f, i + 1, 'a secret is passed as a build ARG (it stays in the image history)', 'inject it at run time instead');
      if (/^\s*COPY\s+.*\.env\b(?!\.example)/.test(l)) add('E15', 'error', f, i + 1, 'an env file is copied into the image', 'inject env at run time');
    });
    if (!fs.existsSync(path.join(path.dirname(f), '.dockerignore')) || !/\.env/.test(fs.readFileSync(path.join(path.dirname(f), '.dockerignore'), 'utf8'))) add('E4', 'warn', f, null, '.dockerignore does not exclude .env files', 'add .env and .env.* to .dockerignore');
  } else if (/\.ya?ml$/.test(base)) {
    const text = lines.join('\n');
    const isK8s = /^kind:\s*(Deployment|StatefulSet|Rollout|DaemonSet)/m.test(text);
    const isCompose = /^services:/m.test(text);
    if (!isK8s && !isCompose && !/^kind:\s*Secret/m.test(text)) continue;
    if (/^kind:\s*Secret/m.test(text) && /^(data|stringData):/m.test(text)) add('E16', 'critical', f, null, 'a plain Secret manifest is committed', 'commit a SealedSecret or ExternalSecret instead; rotate what it held');
    let probe = null;
    lines.forEach((l, i) => {
      const pm = /^\s*(livenessProbe|readinessProbe|startupProbe):/.exec(l);
      if (pm) probe = [pm[1], i];
      const pp = /^\s*path:\s*(\S+)/.exec(l);
      if (pp && probe && i - probe[1] < 8) { const want = `${PREFIX}/${EXPECT[probe[0]]}`; if (pp[1] !== want) add('D2', 'error', f, i + 1, `${probe[0]} path is ${pp[1]}`, `use ${want}`); probe = null; }
      if (isCompose && /test:/.test(l) && /(health|ready|live|ping)/.test(l) && !new RegExp(`${PREFIX}/(${HEALTH.join('|')})`).test(l)) add('D3', 'error', f, i + 1, 'compose healthcheck does not use a health endpoint under ' + PREFIX, `use ${PREFIX}/liveness`);
      const ev = /^\s*-?\s*name:\s*([A-Z_][A-Z0-9_]*)\s*$/.exec(l);
      if (isK8s && ev && SECRET_KEY.test(ev[1]) && /^\s*value:\s*\S+/.test(lines[i + 1] || '')) add('E16', 'critical', f, i + 1, `${ev[1]} has a plaintext value in a manifest`, 'use secretKeyRef or envFrom a Secret');
    });
  }
}

// --- report ----------------------------------------------------------------------
const order = { critical: 0, error: 1, warn: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || (a.file || '').localeCompare(b.file || '') || (a.line || 0) - (b.line || 0));
const summary = { critical: 0, error: 0, warn: 0 };
for (const f of findings) summary[f.severity]++;
const result = { package: rel(dir) === '.' ? path.basename(dir) : rel(dir), stack, findings, summary };
if (json) out(result);
else {
  console.log(`staging audit · ${result.package} · ${stack}`);
  if (!findings.length) console.log('✓ nothing to fix — health endpoints, /api/v1 and the env split all hold');
  for (const f of findings) console.log(`${f.severity === 'critical' ? '‼' : f.severity === 'error' ? '✗' : '!'} ${f.id.padEnd(9)} ${f.file ? f.file + (f.line ? ':' + f.line : '') : '(package)'}  ${f.message}\n            → ${f.fix}`);
  if (findings.length) console.log(`${summary.critical} critical · ${summary.error} errors · ${summary.warn} warnings`);
}
process.exit(findings.length ? 1 : 0);
