#!/usr/bin/env node
// pspt fix-flow — detect a package's stack and language, compare its toolchain
// with references/toolchain/manifest.json, and (with --apply) make it match.
//
//   node references/toolchain/fix-flow.mjs <package-dir>            report only
//   node references/toolchain/fix-flow.mjs <package-dir> --apply    copy, remove, pin
//   add --json for machine-readable output
//
// --apply never installs, autofixes or commits: /pspt:fix-flow does those, in
// order, after this script. It never edits source code, tsconfig.json, or any
// dependency that is not a lint, format or hook tool.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLCHAIN = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(TOOLCHAIN, '..', '..');
const manifest = JSON.parse(readFileSync(join(TOOLCHAIN, 'manifest.json'), 'utf8'));

const STACK_ORDER = [
  ['next', 'nextjs'],
  ['@nestjs/core', 'nestjs'],
  ['react', 'react'],
  ['express', 'express'],
];
const KNOWN_UNSUPPORTED = ['fastify', 'koa', '@hapi/hapi', 'hono', 'vue', 'nuxt', 'svelte', '@sveltejs/kit', '@angular/core', 'solid-js', 'astro', 'remix', '@remix-run/react'];
const SECOND_CONFIGS = [
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
  'eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts',
  'knip.ts', 'knip.js', 'knip.jsonc', '.knip.json', '.knip.jsonc',
  'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs', 'prettier.config.ts',
  '.prettierrc', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.json5', '.prettierrc.toml',
  'commitlint.config.js', 'commitlint.config.cjs', 'commitlint.config.ts', '.commitlintrc', '.commitlintrc.json', '.commitlintrc.js', '.commitlintrc.cjs', '.commitlintrc.yml', '.commitlintrc.yaml',
  '.lintstagedrc', '.lintstagedrc.json', '.lintstagedrc.js', '.lintstagedrc.cjs', 'lint-staged.config.js', 'lint-staged.config.cjs', 'lint-staged.config.mjs',
];
const PACKAGE_JSON_CONFIG_KEYS = ['eslintConfig', 'prettier', 'commitlint', 'lint-staged', 'husky', 'knip'];
const TOOLCHAIN_PACKAGE = [/^eslint-plugin-/, /^eslint-config-/, /^@eslint\//, /^@typescript-eslint\//, /^typescript-eslint$/, /^prettier-plugin-/, /^@commitlint\//, /^lint-staged$/, /^globals$/];

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

function walk(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function detect(pkgDir) {
  const pkg = readJson(join(pkgDir, 'package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const match = STACK_ORDER.find(([dep]) => dep in deps);
  const sources = walk(join(pkgDir, 'src'));
  const tsFiles = sources.filter((file) => /\.tsx?$/.test(file) && !file.endsWith('.d.ts'));
  const jsFiles = sources.filter((file) => /\.(c|m)?jsx?$/.test(file));
  const hasTsconfig = existsSync(join(pkgDir, 'tsconfig.json'));
  const language = hasTsconfig && tsFiles.length > 0 ? 'ts' : 'js';
  const evidence = [
    match ? `${match[0]} in dependencies` : 'no supported framework in dependencies',
    hasTsconfig ? 'tsconfig.json' : 'no tsconfig.json',
    `${tsFiles.length} .ts/.tsx and ${jsFiles.length} .js/.jsx files in src/`,
  ];
  if (!match) {
    const other = KNOWN_UNSUPPORTED.filter((dep) => dep in deps);
    return { supported: false, reason: other.length ? `${other.join(', ')} — pspt ships no verified toolchain for it` : 'no Express, NestJS, React or Next.js dependency', evidence };
  }
  const stack = match[1];
  const key = language === 'ts' ? stack : `${stack}-js`;
  if (!manifest.stacks[key]) {
    return { supported: false, reason: `${stack} in JavaScript — pspt ships ${stack} in TypeScript only`, evidence };
  }
  const strayJs = language === 'ts' ? [...jsFiles, ...walk(join(pkgDir, 'tests')).filter((file) => /\.jsx?$/.test(file))].map((file) => relative(pkgDir, file)) : [];
  return { supported: true, stack, language, key, evidence, strayJs };
}

function hooksPath(pkgDir) {
  try {
    return execFileSync('git', ['-C', pkgDir, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function tsStrict(pkgDir) {
  const file = join(pkgDir, 'tsconfig.json');
  if (!existsSync(file)) return false;
  return /"strict"\s*:\s*true/.test(readFileSync(file, 'utf8'));
}

function compare(pkgDir, found) {
  const want = manifest.stacks[found.key];
  const pkg = readJson(join(pkgDir, 'package.json'));
  const devDeps = pkg.devDependencies ?? {};
  const allDeps = { ...pkg.dependencies, ...devDeps };
  const files = Object.entries(want.files).map(([path, spec]) => {
    const target = join(pkgDir, path);
    const state = !existsSync(target) ? 'missing' : sha256(target) === spec.sha256 ? 'ok' : 'differs';
    return { path, state };
  });
  const secondConfigs = SECOND_CONFIGS.filter((name) => existsSync(join(pkgDir, name)));
  const packageKeys = PACKAGE_JSON_CONFIG_KEYS.filter((key) => key in pkg);
  const deps = Object.entries(want.devDependencies)
    .map(([name, version]) => ({ name, want: version, have: devDeps[name] ?? null }))
    .filter((dep) => dep.have !== dep.want);
  const extraTools = Object.keys(allDeps).filter((name) => TOOLCHAIN_PACKAGE.some((pattern) => pattern.test(name)) && !(name in want.devDependencies));
  const scripts = Object.entries(want.scripts)
    .map(([name, command]) => ({ name, want: command, have: pkg.scripts?.[name] ?? null }))
    .filter((script) => script.have !== script.want);
  const hooks = hooksPath(pkgDir);
  const checks = {
    files: files.every((file) => file.state === 'ok'),
    secondConfigs: secondConfigs.length === 0 && packageKeys.length === 0,
    devDependencies: deps.length === 0 && extraTools.length === 0,
    scripts: scripts.length === 0,
    hooks: hooks === '.husky/_',
  };
  const notes = [];
  if (found.language === 'ts' && !tsStrict(pkgDir)) notes.push('tsconfig.json lacks "strict": true — never edited here; fix it in the project');
  if (found.strayJs.length) notes.push(`${found.strayJs.length} JavaScript files in a TypeScript package (${found.strayJs.slice(0, 3).join(', ')}${found.strayJs.length > 3 ? ', …' : ''}) — converting them is a ticket`);
  const psptProject = [pkgDir, dirname(pkgDir)].some((dir) => existsSync(join(dir, 'docs', '.pspt.json')));
  if (found.language === 'js' && psptProject) notes.push('pspt project: the spec fixes TypeScript — migration is a ticket');
  return { files, secondConfigs, packageKeys, deps, extraTools, scripts, hooks, checks, notes, clean: Object.values(checks).every(Boolean) };
}

function apply(pkgDir, found, diff) {
  const want = manifest.stacks[found.key];
  for (const [path, spec] of Object.entries(want.files)) {
    const target = join(pkgDir, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(PLUGIN_ROOT, spec.source), target);
  }
  for (const name of diff.secondConfigs) rmSync(join(pkgDir, name));
  const pkgFile = join(pkgDir, 'package.json');
  const pkg = readJson(pkgFile);
  for (const key of diff.packageKeys) delete pkg[key];
  for (const name of diff.extraTools) {
    if (pkg.dependencies) delete pkg.dependencies[name];
    if (pkg.devDependencies) delete pkg.devDependencies[name];
  }
  pkg.devDependencies = { ...pkg.devDependencies };
  for (const [name, version] of Object.entries(want.devDependencies)) {
    if (pkg.dependencies) delete pkg.dependencies[name];
    pkg.devDependencies[name] = version;
  }
  pkg.devDependencies = Object.fromEntries(Object.entries(pkg.devDependencies).sort(([left], [right]) => left.localeCompare(right)));
  pkg.scripts = { ...pkg.scripts, ...want.scripts };
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
}

function report(pkgDir, found, diff, applied) {
  const name = relative(process.cwd(), pkgDir) || '.';
  if (!found.supported) return `${name}/  ✗ not supported — ${found.reason}\n  evidence  ${found.evidence.join(' · ')}\n  nothing changed`;
  const head = `${name}/  ${found.key} · ${found.language === 'ts' ? 'TypeScript' : 'JavaScript'}`;
  const lines = [`${head}\n  evidence  ${found.evidence.join(' · ')}`];
  if (diff.clean) {
    lines.push(`  ✓ matches pspt ${found.key} exactly — nothing to fix`);
  } else {
    const bad = diff.files.filter((file) => file.state !== 'ok');
    if (bad.length) lines.push(`  files     ${bad.map((file) => `${file.path} (${file.state})`).join(' · ')}`);
    if (diff.secondConfigs.length || diff.packageKeys.length) lines.push(`  remove    ${[...diff.secondConfigs, ...diff.packageKeys.map((key) => `package.json "${key}"`)].join(' · ')}`);
    if (diff.deps.length) lines.push(`  deps      ${diff.deps.map((dep) => `${dep.name} ${dep.have ?? '—'} → ${dep.want}`).join(' · ')}`);
    if (diff.extraTools.length) lines.push(`  drop      ${diff.extraTools.join(' · ')}`);
    if (diff.scripts.length) lines.push(`  scripts   ${diff.scripts.map((script) => script.name).join(' · ')}`);
    if (!diff.checks.hooks) lines.push(`  hooks     core.hooksPath is "${diff.hooks || 'unset'}" — install activates .husky/_`);
    lines.push(applied ? '  → applied: files copied, second configs removed, dependencies and scripts pinned. Next: install, autofix, check.' : '  ✗ drifted — run with --apply to fix');
  }
  for (const note of diff.notes) lines.push(`  note      ${note}`);
  return lines.join('\n');
}

const args = process.argv.slice(2);
const pkgDir = resolve(args.find((arg) => !arg.startsWith('--')) ?? '.');
if (!existsSync(join(pkgDir, 'package.json'))) {
  console.error(`${pkgDir}: no package.json`);
  process.exit(2);
}
const found = detect(pkgDir);
let diff = found.supported ? compare(pkgDir, found) : null;
const applied = Boolean(found.supported && !diff.clean && args.includes('--apply'));
if (applied) apply(pkgDir, found, diff);
if (args.includes('--json')) {
  console.log(JSON.stringify({ package: pkgDir, ...found, ...(diff ?? {}), applied }, null, 2));
} else {
  console.log(report(pkgDir, found, diff ?? { notes: [] }, applied));
}
if (applied) diff = compare(pkgDir, found);
process.exit(!found.supported ? 3 : diff.clean || applied ? 0 : 1);
