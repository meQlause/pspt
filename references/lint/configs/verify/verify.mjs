// Re-proves a canonical config against its fixtures.
//   cd references/lint/configs/verify/<backend|frontend>
//   npm i -D <devDependencies from ../../<stack>/package.lint.json>
//   cp ../../<stack>/eslint.config.mjs . && node ../verify.mjs <stack>
// Exit 1 when any fixture's rule set differs from expected.json.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const stack = process.argv[2];
const expected = JSON.parse(readFileSync(new URL('./expected.json', import.meta.url), 'utf8'))[stack];
let raw;
try {
  raw = execFileSync('npx', ['eslint', 'src', 'tests', '-f', 'json'], { encoding: 'utf8' });
} catch (failure) {
  raw = failure.stdout;
}
const actual = Object.fromEntries(JSON.parse(raw).map((file) => [
  file.filePath.replace(`${process.cwd()}/`, ''),
  [...new Set(file.messages.map((msg) => msg.ruleId))].sort(),
]));
let failed = false;
for (const [file, rules] of Object.entries(expected)) {
  const got = actual[file] ?? [];
  const missing = rules.filter((rule) => !got.includes(rule));
  const extra = got.filter((rule) => !rules.includes(rule));
  const status = missing.length + extra.length === 0 ? 'ok  ' : 'FAIL';
  failed ||= status === 'FAIL';
  console.log(`${status} ${file}${missing.length ? `  missing: ${missing}` : ''}${extra.length ? `  extra: ${extra}` : ''}`);
}
process.exit(failed ? 1 : 0);
