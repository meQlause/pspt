#!/usr/bin/env node
// pspt findings — the work queue for /pspt:fix-flow-proceed.
// Runs the toolchain's own tools and prints what is left, grouped by file,
// in the order the loop works: types, lint, knip. Compact on purpose: the
// loop reads this instead of raw tool output.
//
//   node references/toolchain/findings.mjs <package-dir>                 whole queue
//   node references/toolchain/findings.mjs <package-dir> --file <path>   one file
//   add --json for machine-readable output
//
// Exit 0 when nothing is left, 1 when findings remain.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const fileFlag = args.indexOf('--file');
const onlyFile = fileFlag === -1 ? null : args[fileFlag + 1];
const positional = args.filter((arg, index) => !arg.startsWith('--') && (fileFlag === -1 || index !== fileFlag + 1));
const pkgDir = resolve(positional[0] ?? '.');
const bin = (name) => join(pkgDir, 'node_modules', '.bin', name);

function run(command, commandArgs) {
  try {
    return execFileSync(command, commandArgs, { cwd: pkgDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (failure) {
    return failure.stdout ?? '';
  }
}

const queue = new Map();
const add = (file, gate, rule, line) => {
  const key = relative(pkgDir, resolve(pkgDir, file));
  if (onlyFile && key !== onlyFile) return;
  if (!queue.has(key)) queue.set(key, []);
  queue.get(key).push({ gate, rule, line });
};

// types — TypeScript packages only
if (existsSync(join(pkgDir, 'tsconfig.json')) && existsSync(bin('tsc'))) {
  for (const line of run(bin('tsc'), ['--noEmit', '--pretty', 'false']).split('\n')) {
    const match = /^(.+?)\((\d+),\d+\): error (TS\d+):/.exec(line);
    if (match) add(match[1], 'types', match[3], Number(match[2]));
  }
}

// lint
const lintTargets = onlyFile ? [onlyFile] : ['.'];
const lintOut = run(bin('eslint'), [...lintTargets, '-f', 'json']);
for (const file of lintOut.trim() ? JSON.parse(lintOut) : []) {
  for (const message of file.messages) add(file.filePath, 'lint', message.ruleId ?? 'parse-error', message.line);
}

// knip — whole-project by nature, so only in the full queue
if (!onlyFile && existsSync(bin('knip'))) {
  const knipOut = run(bin('knip'), ['--reporter', 'json']);
  const report = knipOut.trim() ? JSON.parse(knipOut) : { issues: [] };
  for (const issue of report.issues ?? []) {
    if (issue.files?.length) add(issue.file, 'knip', 'unused-file', 0);
    for (const kind of ['exports', 'types', 'enumMembers', 'dependencies', 'devDependencies', 'binaries', 'unlisted', 'unresolved', 'duplicates']) {
      for (const item of issue[kind] ?? []) add(issue.file, 'knip', `unused-${kind}:${item.name}`, item.line ?? 0);
    }
  }
}

const GATE_ORDER = { types: 0, lint: 1, knip: 2 };
const files = [...queue.entries()]
  .map(([file, items]) => ({ file, count: items.length, gate: Math.min(...items.map((item) => GATE_ORDER[item.gate])), items }))
  .sort((left, right) => left.gate - right.gate || right.count - left.count || left.file.localeCompare(right.file));
const total = files.reduce((sum, entry) => sum + entry.count, 0);

if (args.includes('--json')) {
  console.log(JSON.stringify({ total, files }, null, 2));
} else if (total === 0) {
  console.log(onlyFile ? `${onlyFile}: clean` : 'queue empty — types, lint and knip are clean');
} else {
  const byGate = (gate) => files.reduce((sum, entry) => sum + entry.items.filter((item) => item.gate === gate).length, 0);
  console.log(`${total} findings in ${files.length} files — types ${byGate('types')} · lint ${byGate('lint')} · knip ${byGate('knip')}`);
  for (const entry of files) {
    const rules = new Map();
    for (const item of entry.items) rules.set(item.rule, [...(rules.get(item.rule) ?? []), item.line]);
    const summary = [...rules.entries()].map(([rule, lines]) => `${rule} ×${lines.length} (${lines.filter(Boolean).slice(0, 4).join(',') || '—'})`).join(' · ');
    console.log(`  ${entry.file}  ${summary}`);
  }
}
process.exit(total === 0 ? 0 : 1);
