#!/usr/bin/env node
// pspt staging scan — the mechanics behind /pspt:staging-scan. READ-ONLY.
// Reads a project's Dockerfiles, .dockerignore, package files, env-var usage, git
// remotes and submodules, and Kubernetes / Helm / Kustomize files, and works out how
// to build and push each app's image to GHCR. It writes nothing, runs no docker, uses
// no network, and never opens a real secret file (.env, .env.secret, keys, tokens):
// only key NAMES from *.example files, and the names — never values — in .npmrc.
//
//   node scan.mjs <root> [--json]
//
// Exit 0 = every app can be built as scanned · 1 = at least one blocker · 2 = no Dockerfile found.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const json = args.includes('--json');
const root = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const SKIP = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', '.husky', '.pspt-smoke', 'out', '.turbo']);
const SECRET_NAME = /(SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|API_?KEY|CREDENTIAL|SIGNING|ENCRYPTION|ACCESS_?KEY|DSN)/i;
const BUILD_PREFIX = /^(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_|NG_APP_|NUXT_PUBLIC_)/;
const WORKLOAD = /^(Deployment|StatefulSet|DaemonSet|Rollout|CronJob|Job)$/;

const rel = (p) => path.relative(root, p) || '.';
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);
const walk = (start, accept, depth = 5) => {
  const acc = [];
  const rec = (d, n) => {
    if (n > depth) return;
    let es = [];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p, n + 1);
      else if (accept(p, e.name)) acc.push(p);
    }
  };
  rec(start, 0);
  return acc;
};
const git = (cwd, ...a) => { try { return execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };

// ------------------------------------------------------------------ Dockerfile
function parseDockerfile(file) {
  const raw = readText(file).replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    let l = raw[i], n = i + 1;
    while (/\\\s*$/.test(l) && i + 1 < raw.length) { i++; l = l.replace(/\\\s*$/, ' ') + raw[i].trim(); }
    if (/^\s*#/.test(l) || !l.trim()) continue;
    lines.push({ text: l.trim(), n });
  }
  const d = { stages: [], args: [], env: [], copies: [], runs: [], cmd: null, expose: [], healthcheck: null, secretMounts: [], from: [], lines };
  let stage = null;
  for (const { text, n } of lines) {
    const m = /^([A-Za-z]+)\s*(.*)$/.exec(text); if (!m) continue;
    const ins = m[1].toUpperCase(), rest = m[2];
    if (ins === 'FROM') {
      const f = /^(?:--platform=(\S+)\s+)?(\S+)(?:\s+AS\s+(\S+))?/i.exec(rest) || [];
      stage = { index: d.stages.length, image: f[2], platform: f[1] || null, name: f[3] || String(d.stages.length), line: n };
      d.stages.push(stage); d.from.push(stage);
    } else if (ins === 'ARG') {
      for (const tok of rest.split(/\s+/).filter(Boolean)) { const [name, ...v] = tok.split('='); d.args.push({ name, default: v.length ? v.join('=').replace(/^["']|["']$/g, '') : null, scope: stage ? stage.name : 'global', line: n }); }
    } else if (ins === 'ENV') {
      const pairs = /=/.test(rest.split(/\s+/)[0]) ? rest.match(/(\w+)=("[^"]*"|'[^']*'|\S*)/g) || [] : [rest.replace(/\s+/, '=')];
      for (const p of pairs) { const i = p.indexOf('='); d.env.push({ name: p.slice(0, i), value: p.slice(i + 1).replace(/^["']|["']$/g, ''), stage: stage && stage.name, line: n }); }
    } else if (ins === 'COPY' || ins === 'ADD') {
      let toks = []; const jm = /^(?:--\S+\s+)*(\[.*\])\s*$/.exec(rest);
      if (jm) { try { toks = JSON.parse(jm[1]); } catch { toks = []; } } else toks = rest.split(/\s+/).filter((t) => !t.startsWith('--'));
      const from = /--from=(\S+)/.exec(rest);
      d.copies.push({ sources: toks.slice(0, -1), dest: toks[toks.length - 1], from: from ? from[1] : null, line: n, text });
    } else if (ins === 'RUN') {
      d.runs.push({ text: rest, line: n, stage: stage && stage.name });
      for (const sm of rest.matchAll(/--mount=type=secret,[^\s]*id=([\w.-]+)/g)) d.secretMounts.push(sm[1]);
    } else if (ins === 'CMD' || ins === 'ENTRYPOINT') d.cmd = text;
    else if (ins === 'EXPOSE') d.expose.push(rest);
    else if (ins === 'HEALTHCHECK') d.healthcheck = text;
  }
  return d;
}

// ------------------------------------------------------------------ .dockerignore
function ignoredBy(patterns, p) {
  let ignored = false;
  for (const raw of patterns) {
    const neg = raw.startsWith('!'); const pat = (neg ? raw.slice(1) : raw).replace(/^\/+|\/+$/g, '');
    if (!pat) continue;
    const re = new RegExp('^' + pat.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '(/.*)?$');
    if (re.test(p.replace(/^\.\//, '').replace(/\/+$/, ''))) ignored = !neg;
  }
  return ignored;
}

// ------------------------------------------------------------------ discover apps
const dockerfiles = walk(root, (p, n) => /^Dockerfile(\..+)?$/.test(n) || /\.Dockerfile$/.test(n), 4);
// evidence from compose and CI
const composeBuilds = []; const ciBuilds = [];
for (const f of walk(root, (p, n) => /^(docker-)?compose[^/]*\.ya?ml$/.test(n), 4)) {
  const t = readText(f).split('\n'); let svc = null;
  t.forEach((l, i) => {
    const sm = /^  ([\w-]+):\s*$/.exec(l); if (sm) svc = sm[1];
    const cm = /^\s+context:\s*(\S+)/.exec(l); if (cm) { const df = (t.slice(i, i + 4).join('\n').match(/dockerfile:\s*(\S+)/) || [])[1] || 'Dockerfile'; const args = {}; const ai = t.slice(i, i + 12).join('\n').match(/args:\s*\n((?:\s+[-\w.=${}:/ ]+\n?)+)/); if (ai) for (const a of ai[1].split('\n')) { const am = /^\s*-?\s*([A-Z_][A-Z0-9_]*)\s*[:=]\s*(.*)$/.exec(a); if (am) args[am[1]] = am[2].trim(); } composeBuilds.push({ file: rel(f), service: svc, context: path.normalize(path.join(path.dirname(f), cm[1])), dockerfile: path.normalize(path.join(path.dirname(f), cm[1], df)), args }); }
  });
}
for (const f of walk(root, (p) => /\.github\/workflows\/[^/]+\.ya?ml$/.test(p) || /(^|\/)\.gitlab-ci\.yml$/.test(p), 6).concat(walk(path.join(root, '.github'), (p) => /workflows\/[^/]+\.ya?ml$/.test(p), 3))) {
  const t = readText(f); if (!/build-push-action|docker\s+(buildx\s+)?build/.test(t)) continue;
  const ctx = (/context:\s*(\S+)/.exec(t) || [])[1]; const file = (/file:\s*(\S+)/.exec(t) || [])[1]; const args = {};
  const ba = /build-args:\s*\|?\s*\n((?:\s+[A-Z_][A-Z0-9_]*=.*\n?)+)/.exec(t); if (ba) for (const a of ba[1].split('\n')) { const am = /^\s*([A-Z_][A-Z0-9_]*)=(.*)$/.exec(a); if (am) args[am[1]] = am[2].trim(); }
  ciBuilds.push({ file: rel(f), context: ctx, dockerfile: file, args });
}

// kubernetes / helm / kustomize
const k8s = { images: [], configMapKeys: new Set(), envNames: new Map(), refs: { configMap: new Set(), secret: new Set() }, pullSecrets: new Set(), files: [] };
for (const f of walk(root, (p, n) => /\.ya?ml$/.test(n) && !/compose|\.github|pnpm-lock|package-lock/.test(p), 5)) {
  const text = readText(f);
  for (const doc of text.split(/^---\s*$/m)) {
    const kind = (/^kind:\s*(\w+)/m.exec(doc) || [])[1];
    if (kind && WORKLOAD.test(kind)) {
      k8s.files.push(rel(f)); const ls = doc.split('\n'); let inEnv = false; let envIndent = 0;
      ls.forEach((l, i) => {
        const im = /^\s*-?\s*image:\s*["']?([^\s"']+)/.exec(l); if (im && !im[1].includes('{{')) k8s.images.push({ ref: im[1], file: rel(f), line: i + 1 });
        const cm = /configMapRef:\s*$/.test(l) ? /name:\s*(\S+)/.exec(ls[i + 1] || '') : null; if (cm) k8s.refs.configMap.add(cm[1]);
        const sm = /secretRef:\s*$/.test(l) ? /name:\s*(\S+)/.exec(ls[i + 1] || '') : null; if (sm) k8s.refs.secret.add(sm[1]);
        const ips = /imagePullSecrets:/.test(l); if (ips) for (const nx of ls.slice(i + 1, i + 4)) { const nm = /name:\s*(\S+)/.exec(nx); if (nm) k8s.pullSecrets.add(nm[1]); }
        if (/^\s*env:\s*$/.test(l)) { inEnv = true; envIndent = l.search(/\S/); return; }
        if (inEnv && l.trim() && l.search(/\S/) <= envIndent && !/^\s*-/.test(l)) inEnv = false;
        const en = inEnv && /^\s*-\s*name:\s*([A-Z_][A-Z0-9_]*)\s*$/.exec(l);
        if (en) { const nxt = ls.slice(i + 1, i + 5).join('\n'); k8s.envNames.set(en[1], /secretKeyRef/.test(nxt) ? 'secret' : /configMapKeyRef/.test(nxt) ? 'configmap' : 'env'); }
      });
    }
    if (kind === 'ConfigMap') { k8s.files.push(rel(f)); const dm = /^data:\s*\n((?:\s+[\w.-]+:.*\n?)+)/m.exec(doc); if (dm) for (const l of dm[1].split('\n')) { const km = /^\s+([A-Z_][A-Z0-9_]*):/.exec(l); if (km) k8s.configMapKeys.add(km[1]); } }
    if (/^images:\s*$/m.test(doc) && /newName|newTag/.test(doc)) for (const m of doc.matchAll(/-\s*name:\s*(\S+)\s*\n(?:\s+newName:\s*(\S+)\s*\n)?(?:\s+newTag:\s*(\S+))?/g)) k8s.images.push({ ref: `${m[2] || m[1]}${m[3] ? ':' + m[3] : ''}`, file: rel(f), line: null });
  }
  if (/(^|\/)values[^/]*\.ya?ml$/.test(f)) { const m = /image:\s*\n\s+repository:\s*(\S+)\s*\n(?:\s+tag:\s*["']?(\S+?)["']?\s*\n)?/.exec(text); if (m) k8s.images.push({ ref: `${m[1]}${m[2] ? ':' + m[2] : ''}`, file: rel(f), line: null }); }
}

// submodules
const gitmodules = readText(path.join(root, '.gitmodules'));
const subs = [...gitmodules.matchAll(/\[submodule "([^"]+)"\]\s*\n\s*path\s*=\s*(\S+)\s*\n\s*url\s*=\s*(\S+)/g)].map((m) => ({ name: m[1], path: m[2], url: m[3] }));
const subStatus = git(root, 'submodule', 'status') || '';
const uninit = subStatus.split('\n').filter((l) => l.startsWith('-')).map((l) => l.slice(1).trim().split(/\s+/)[1]);

// ------------------------------------------------------------------ per app
const apps = []; const blockers = []; const seenDockerfiles = new Set();
for (const df of dockerfiles) {
  const dir = path.dirname(df); const d = parseDockerfile(df);
  const app = { name: path.basename(dir) === path.basename(root) ? path.basename(root) : path.basename(dir), dir: rel(dir), dockerfile: rel(df), blockers: [], warnings: [], buildArgs: [], skippedArgs: [], runtime: { configmap: [], secret: [], env: [], unmatched: [] }, image: null, context: null };
  const B = (id, message, fix) => app.blockers.push({ id, message, fix });
  const W = (id, message, fix) => app.warnings.push({ id, message, fix });

  // package files
  let pkgDir = dir; while (!exists(path.join(pkgDir, 'package.json')) && pkgDir !== root && pkgDir !== path.dirname(pkgDir)) pkgDir = path.dirname(pkgDir);
  const pkgFile = path.join(pkgDir, 'package.json'); let pkg = null; try { pkg = JSON.parse(readText(pkgFile)); } catch { /* none */ }

  // build context from the COPY sources
  const literalSources = d.copies.filter((c) => !c.from).flatMap((c) => c.sources).filter((s) => s && !s.includes('$') && !/^https?:/.test(s));
  const outside = literalSources.filter((s) => s.startsWith('..'));
  const candidates = []; for (let c = dir; ; c = path.dirname(c)) { candidates.push(c); if (c === root || c === path.dirname(c)) break; }
  const present = (c, s) => { if (s === '.' || s === './') return true; const g = s.split('*')[0]; const base = g.endsWith('/') ? g : path.dirname(g) + '/'; return exists(path.join(c, s.includes('*') ? base : s)); };
  let ctx = candidates.find((c) => literalSources.filter((s) => !s.startsWith('..')).every((s) => present(c, s)));
  const compose = composeBuilds.find((b) => path.normalize(b.dockerfile) === path.normalize(df)) || null;
  const ci = ciBuilds.find((b) => b.dockerfile && path.basename(b.dockerfile) === path.basename(df) && (b.context || '').length) || null;
  let evidence = 'COPY paths';
  if (outside.length) { ctx = path.dirname(dir) === root || path.dirname(dir) === path.dirname(root) ? root : path.dirname(dir); evidence = 'COPY paths reach outside the Dockerfile folder'; B('B1', `COPY reaches outside the Dockerfile's folder (${outside.join(', ')}), so the context must be the parent`, `build from ${rel(ctx)} with -f ${rel(df)}, and make the COPY paths relative to that context`); }
  else if (!ctx) { ctx = dir; for (const s of literalSources) if (!present(dir, s)) B('B2', `COPY source "${s}" does not exist under the build context`, `create ${s}, or correct the COPY path in ${rel(df)}:${(d.copies.find((c) => c.sources.includes(s)) || {}).line}`); }
  if (compose && path.normalize(compose.context) !== path.normalize(ctx)) W('W9', `docker-compose builds this with context ${rel(compose.context)}, the scan chose ${rel(ctx)}`, 'check which one is intended');
  if (compose && path.normalize(compose.context) === path.normalize(ctx)) evidence += ' + docker-compose';
  if (ci && ci.context) evidence += ' + CI';
  app.context = rel(ctx); app.contextEvidence = evidence;

  // .dockerignore
  const ignoreFile = [`${df}.dockerignore`, path.join(ctx, '.dockerignore')].find(exists);
  if (!ignoreFile) W('W7', 'no .dockerignore: node_modules, .git and any .env files are sent to the daemon', 'add one that excludes node_modules, .git and .env*');
  else {
    const pats = readText(ignoreFile).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    for (const s of literalSources) { if (s === '.' || s === './') continue; const p = path.normalize(s); if (ignoredBy(pats, p)) B('B3', `.dockerignore excludes "${s}", which the Dockerfile COPYs (${rel(ignoreFile)})`, `remove the "${s}" pattern from ${rel(ignoreFile)}`); }
    if (d.runs.some((r) => /\bnpm ci\b/.test(r.text)) && ignoredBy(pats, 'package-lock.json')) B('B3', 'package-lock.json is in .dockerignore but the Dockerfile runs npm ci', 'remove package-lock.json from .dockerignore');
    if (!pats.some((p) => /^\.env/.test(p)) && d.copies.some((c) => c.sources.includes('.'))) W('W10', '.dockerignore does not exclude .env files and the Dockerfile copies "." — a local .env would end up in the image', 'add .env* to .dockerignore');
  }
  const copiesEnv = d.copies.find((c) => c.sources.some((s) => /(^|\/)\.env(\.[\w-]+)?$/.test(s) && !/example$/.test(s)));
  if (copiesEnv) W('W2', `the Dockerfile copies an env file into the image (${rel(df)}:${copiesEnv.line})`, 'remove that COPY and inject the environment at run time');

  // package.json: build script, lockfile
  if (pkg) {
    for (const r of d.runs) {
      const bm = /\b(?:npm run|yarn|pnpm(?: run)?)\s+([\w:.-]+)/.exec(r.text);
      if (bm && /npm run/.test(r.text) && !['install', 'ci', 'add'].includes(bm[1]) && !(pkg.scripts || {})[bm[1]]) B('B4', `the Dockerfile runs "npm run ${bm[1]}" (${rel(df)}:${r.line}) but package.json has no "${bm[1]}" script`, `add "${bm[1]}" to scripts in ${rel(pkgFile)} (for TypeScript: "tsc -p tsconfig.json" with an outDir that CMD points at)`);
      if (/\bnpm ci\b/.test(r.text) && !exists(path.join(pkgDir, 'package-lock.json'))) B('B5', `the Dockerfile runs npm ci but there is no package-lock.json in ${rel(pkgDir)}`, 'commit package-lock.json, or use npm install');
      if (/yarn (install )?--frozen-lockfile|yarn install/.test(r.text) && !exists(path.join(pkgDir, 'yarn.lock'))) B('B5', 'the Dockerfile uses yarn but there is no yarn.lock', 'commit yarn.lock');
      if (/pnpm (i|install)/.test(r.text) && !exists(path.join(pkgDir, 'pnpm-lock.yaml'))) B('B5', 'the Dockerfile uses pnpm but there is no pnpm-lock.yaml', 'commit pnpm-lock.yaml');
    }
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const priv = Object.entries(all).filter(([, v]) => /^(git\+ssh:|git\+https?:|github:|git@)/.test(v));
    const npmrc = readText(path.join(pkgDir, '.npmrc')); const npmrcAuth = /_authToken|_auth\b|:_password|always-auth/.test(npmrc) || /^registry=(?!https:\/\/registry\.npmjs\.org)/m.test(npmrc);
    const needsSecret = priv.length || npmrcAuth;
    app.privateDeps = { gitDeps: priv.map(([k]) => k), npmrcAuth: !!npmrcAuth };
    const literalToken = /_authToken\s*=\s*(?!\$\{)\S+/.test(npmrc);
    if (literalToken) W('W13', `${rel(path.join(pkgDir, '.npmrc'))} holds a literal auth token (the value is not shown)`, 'rotate it and use _authToken=${NPM_TOKEN}; never commit a token');
    const copiesNpmrc = d.copies.find((c) => !c.from && c.sources.some((x) => /(^|\/)\.npmrc$/.test(x)));
    if (npmrcAuth && copiesNpmrc) W('W14', `the Dockerfile COPYs .npmrc, which holds auth (${rel(df)}:${copiesNpmrc.line}) — the token lands in an image layer`, 'remove .npmrc from COPY and provide it only through --mount=type=secret');
    if (needsSecret && !d.secretMounts.length) B('B7', `private dependencies${priv.length ? ` (${priv.map(([k]) => k).join(', ')})` : ''}${npmrcAuth ? ' and an authenticated .npmrc' : ''}, but the Dockerfile has no --mount=type=secret`, 'in the install RUN add --mount=type=secret,id=npmrc,target=/root/.npmrc and build with --secret id=npmrc,src=$HOME/.npmrc (never a build arg)');
    if (needsSecret && d.secretMounts.length) app.secrets = d.secretMounts.map((id) => ({ id, flag: `--secret id=${id},src=<PATH_TO_${id.toUpperCase()}_FILE>` }));
    const native = ['bcrypt', 'sharp', 'sqlite3', 'canvas', 'node-gyp', 'argon2', 'better-sqlite3', 'prisma', '@prisma/client'].filter((k) => all[k]);
    if (native.length) W('W4', `native or binary dependencies (${native.join(', ')}) must be built for linux/amd64`, 'fine with --platform linux/amd64; from an ARM machine it builds under emulation and is slower');
  }
  for (const s of d.from) { if (s.platform && !/amd64/.test(s.platform)) W('W3', `FROM --platform=${s.platform} (${rel(df)}:${s.line}) is not amd64`, 'drop the --platform flag or use linux/amd64'); }

  // env usage in the app's source
  const reads = new Map();
  for (const f of walk(pkgDir, (p) => /\.([cm]?[jt]sx?|vue|svelte)$/.test(p) && !/(^|\/)(tests?|__tests__|e2e)\//.test(rel(p)) && !/\.(test|spec)\./.test(p), 7)) readText(f).split('\n').forEach((l, i) => { for (const m of l.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g)) { const k = m[1] || m[2]; if (!reads.has(k)) reads.set(k, { file: rel(f), line: i + 1 }); } });
  const examples = {};
  for (const n of ['.env.example', '.env.production.example', '.env.staging.example']) for (const l of readText(path.join(pkgDir, n)).split('\n')) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(l); if (m && m[2] !== '' && !SECRET_NAME.test(m[1])) examples[m[1]] = { value: m[2].replace(/^["']|["']$/g, ''), source: n }; }
  const lookup = (name, def) => (ci && ci.args[name] != null && { value: ci.args[name], source: `CI ${ci.file}` }) || (compose && compose.args[name] != null && { value: compose.args[name], source: `docker-compose (${compose.file})` }) || (examples[name] && { value: examples[name].value, source: examples[name].source }) || (def != null && { value: def, source: 'Dockerfile default' }) || null;

  // build args: only ARGs the Dockerfile accepts AND the app uses
  const envFromArg = new Map();
  for (const e of d.env) for (const m of e.value.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) envFromArg.set(m[1], [...(envFromArg.get(m[1]) || []), e.name]);
  const declared = new Set(d.args.map((a) => a.name));
  for (const a of d.args) {
    const refs = d.lines.filter((l) => new RegExp(`\\$\\{?${a.name}\\}?`).test(l.text) && !/^ARG\b/i.test(l.text));
    const targets = envFromArg.get(a.name) || [];
    const used = reads.has(a.name) || targets.some((t) => reads.has(t)) || refs.some((r) => /^RUN\b/i.test(r.text));
    if (SECRET_NAME.test(a.name)) { app.skippedArgs.push({ name: a.name, reason: 'secret-looking name — never a build arg; use --secret or Kubernetes config' }); W('W1', `ARG ${a.name} looks like a secret (${rel(df)}:${a.line}); it would stay in the image history`, 'remove the ARG and inject it at run time'); continue; }
    if (!refs.length && !reads.has(a.name)) { app.skippedArgs.push({ name: a.name, reason: 'declared but never used by the Dockerfile or the app' }); continue; }
    if (!used) { app.skippedArgs.push({ name: a.name, reason: 'declared and referenced, but the app never reads it' }); continue; }
    const v = lookup(a.name, a.default);
    app.buildArgs.push({ name: a.name, value: v ? v.value : `<${a.name}>`, source: v ? v.source : 'placeholder — not found in the project', optional: a.default != null });
  }
  // build-time variables the app reads that the Dockerfile cannot receive
  for (const [name, at] of reads) {
    if (!BUILD_PREFIX.test(name)) continue;
    const accepted = declared.has(name) || d.env.some((e) => e.name === name);
    if (!accepted) B('B6', `the app reads ${name} at build time (${at.file}:${at.line}) but the Dockerfile has no ARG or ENV for it, so it is baked in as undefined`, `before the build step add:  ARG ${name}  and  ENV ${name}=$${name}`);
    else if (!app.buildArgs.some((b) => b.name === name) && declared.has(name) === false) { /* ENV-only value: fixed in the image, no arg to pass */ }
  }
  // runtime variables: where Kubernetes provides them
  for (const [name] of reads) {
    if (BUILD_PREFIX.test(name) || ['NODE_ENV', 'PORT', 'npm_package_version'].includes(name)) continue;
    const kind = k8s.configMapKeys.has(name) ? 'configmap' : k8s.envNames.get(name) === 'secret' ? 'secret' : k8s.envNames.has(name) ? (SECRET_NAME.test(name) ? 'env-plaintext' : 'env') : null;
    if (kind === 'configmap' || kind === 'env') app.runtime.configmap.push(name);
    else if (kind === 'secret') app.runtime.secret.push(name);
    else if (kind === 'env-plaintext') { app.runtime.env.push(name); W('W11', `${name} has a plaintext value in a Kubernetes manifest`, 'use a secretKeyRef or envFrom a Secret'); }
    else app.runtime.unmatched.push(name);
  }
  const last = d.stages[d.stages.length - 1];
  if (!d.cmd && !(last && /^(nginx|httpd|caddy|traefik|apache)/.test(last.image || ''))) W('W12', 'no CMD or ENTRYPOINT found', 'the image has nothing to run');

  // git + image name
  const top = git(dir, 'rev-parse', '--show-toplevel');
  const remote = top ? git(dir, 'remote', 'get-url', 'origin') : null;
  const rm = remote && /github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote);
  const sha = top ? git(dir, 'rev-parse', '--short', 'HEAD') : null;
  const dirty = top ? (git(dir, 'status', '--porcelain') || '').split('\n').filter(Boolean).length : 0;
  app.git = { isRepo: !!top, repoRoot: top ? rel(top) : null, remote: remote ? remote.replace(/\/\/[^/@]+@/, '//') : null, owner: rm ? rm[1] : null, repoName: rm ? rm[2] : null, sha, dirtyFiles: dirty };
  if (dirty) W('W5', `${dirty} uncommitted file(s) in ${rel(dir)}: the image is built from the working tree, but the tag points at the last commit`, 'commit first, or use a tag that says so');
  const matchImg = k8s.images.find((i) => { const last = i.ref.split('/').pop().split(':')[0]; return [app.name, app.git.repoName].filter(Boolean).some((n) => last === n || last.endsWith('-' + n) || last.startsWith(n)); }) || (k8s.images.length === 1 && apps.length === 0 && dockerfiles.length === 1 ? k8s.images[0] : null);
  const ghcrOwner = matchImg && (/^ghcr\.io\/([^/]+)\//.exec(matchImg.ref) || [])[1];
  const realOwner = app.git.owner || ghcrOwner; const owner = realOwner ? realOwner.toLowerCase() : '<OWNER>';
  const imgName = (matchImg ? matchImg.ref.split('/').pop().split(':')[0] : app.git.repoName || app.name || '<IMAGE>').toLowerCase();
  app.image = { name: `ghcr.io/${owner}/${imgName}`, owner, ownerFromRepo: !!app.git.owner, manifest: matchImg ? matchImg.ref : null, manifestFile: matchImg ? matchImg.file : null };
  if (matchImg && !matchImg.ref.startsWith('ghcr.io/')) W('W6', `the manifest ${matchImg.file} points at ${matchImg.ref}, not GHCR`, `after pushing, set the image to ghcr.io/${owner}/${imgName}:<TAG> in ${matchImg.file} (not changed here)`);
  if (matchImg && /:latest$/.test(matchImg.ref)) W('W8', `the manifest uses :latest (${matchImg.file})`, 'deploy a specific tag so a rollout can be rolled back');
  app.tag = sha ? `$(git -C ${app.git.repoRoot} rev-parse --short HEAD)` : '<TAG>';

  // the command
  const bargs = app.buildArgs.map((b) => `--build-arg ${b.name}=${b.value}`).join(' ');
  const secrets = (app.secrets || []).map((s) => s.flag).join(' ');
  app.command = ['docker buildx build --platform linux/amd64', bargs, secrets, `-t ${app.image.name}:${app.tag}`, '--push', `-f ${rel(df)}`, app.context].filter(Boolean).join(' ');
  apps.push(app);
}

// packages that look like deployable apps but have no Dockerfile
for (const c of ['backend', 'frontend']) { const p = path.join(root, c); if (exists(path.join(p, 'package.json')) && !apps.some((a) => a.dir === c || a.dir.startsWith(c + '/')) && !uninit.includes(c)) apps.push({ name: c, dir: c, dockerfile: null, blockers: [{ id: 'B9', message: `${c}/ has a package.json but no Dockerfile`, fix: `add a Dockerfile to ${c}/ (not created by the scan)` }], warnings: [], buildArgs: [], skippedArgs: [], runtime: {}, command: null }); }
for (const u of uninit) if (!apps.some((a) => a.dir === u)) apps.push({ name: u, dir: u, dockerfile: null, blockers: [{ id: 'B8', message: `${u}/ is a git submodule that is not initialised, so its Dockerfile cannot be read`, fix: 'git submodule update --init --recursive, then scan again' }], warnings: [], buildArgs: [], skippedArgs: [], runtime: {}, command: null });

if (!apps.length) {
  console.log(json ? JSON.stringify({ root, apps: [], note: 'no Dockerfile found under the folder' }, null, 2) : `staging scan · ${root}\nno Dockerfile found — nothing can be built as scanned.`);
  process.exit(2);
}

const commands = {
  login: 'echo "$GHCR_TOKEN" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin   # a personal access token with write:packages',
  submodules: subs.length ? 'git submodule update --init --recursive' : null,
  verify: apps.filter((a) => a.command).map((a) => `docker buildx imagetools inspect ${a.image.name}:${a.tag}`),
};
const result = { root, git: { isRepo: !!git(root, 'rev-parse', '--show-toplevel'), submodules: subs.map((s) => ({ ...s, url: s.url.replace(/\/\/[^/@]+@/, '//'), initialised: !uninit.includes(s.path) })) }, k8s: { files: [...new Set(k8s.files)], images: k8s.images, pullSecrets: [...k8s.pullSecrets], configMapRefs: [...k8s.refs.configMap], secretRefs: [...k8s.refs.secret] }, apps, commands };
const blocked = apps.some((a) => a.blockers.length);

if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`staging scan · ${root}`);
  if (commands.submodules) console.log(`\nsubmodules  ${subs.map((s) => `${s.path}${uninit.includes(s.path) ? ' (NOT initialised)' : ''}`).join(' · ')}\n  ${commands.submodules}`);
  console.log(`\nlogin\n  ${commands.login}`);
  for (const a of apps) {
    console.log(`\n── ${a.name}  (${a.dockerfile || 'no Dockerfile'})`);
    if (a.context != null) console.log(`   context ${a.context}  [${a.contextEvidence}]   image ${a.image.name}${a.image.manifest ? `  (manifest: ${a.image.manifest})` : a.image.ownerFromRepo ? '  (owner from git remote)' : ''}`);
    for (const b of a.buildArgs) console.log(`   build-arg ${b.name}=${b.value}   [${b.source}]`);
    for (const s of a.skippedArgs) console.log(`   not passed ${s.name} — ${s.reason}`);
    if (a.runtime && (a.runtime.configmap || []).length + (a.runtime.secret || []).length + (a.runtime.unmatched || []).length) console.log(`   runtime env (stays out of the build): ${['configmap', 'secret', 'unmatched'].flatMap((k) => (a.runtime[k] || []).map((n) => `${n}${k === 'configmap' ? '' : ` [${k}]`}`)).join(', ')}`);
    for (const b of a.blockers) console.log(`   ✗ ${b.id} ${b.message}\n       → ${b.fix}`);
    for (const w of a.warnings) console.log(`   ! ${w.id} ${w.message}\n       → ${w.fix}`);
    if (a.command) console.log(`   ${a.command}`);
  }
  if (commands.verify.length) console.log(`\nverify\n  ${commands.verify.join('\n  ')}`);
  console.log(`\n${blocked ? '✗ at least one blocker — see above' : '✓ no blockers'}`);
}
process.exit(blocked ? 1 : 0);
