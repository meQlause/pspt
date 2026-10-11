import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const expected = JSON.parse(await fs.readFile(root + '/verify/expected.json', 'utf8'));
for (const [stack, repo, fixtures] of [
  ['express', 'backend', 'backend'],
  ['react', 'frontend', 'frontend'],
]) {
  const cwd = path.join(projectRoot, repo);
  process.chdir(cwd);
  const require = createRequire(cwd + '/package.json');
  const { ESLint } = require('eslint');
  const prettier = require('prettier');
  const fixtureDir = await fs.mkdtemp(os.tmpdir() + '/pspt-format-');
  await fs.cp(root + '/verify/' + fixtures, fixtureDir, { recursive: true });
  await fs.copyFile(root + '/' + stack + '/eslint.config.mjs', fixtureDir + '/eslint.config.mjs');
  await fs.symlink(cwd + '/node_modules', fixtureDir + '/node_modules', 'junction');
  process.chdir(fixtureDir);
  const eslint = new ESLint({
    cwd: fixtureDir,
    overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: fixtureDir } } },
  });
  for (const [file, rules] of Object.entries(expected[stack])) {
    const source = await fs.readFile(root + '/verify/' + fixtures + '/' + file, 'utf8');
    const [result] = await eslint.lintText(source, { filePath: fixtureDir + '/' + file });
    const actual = [
      ...new Set(result.messages.map((msg) => msg.ruleId ?? 'unused-disable-directive')),
    ].sort();
    assert.deepEqual(actual, rules, stack + ' fixture ' + file);
  }
  process.chdir(cwd);
  const filePath = cwd + '/src/formatting-fixture.ts';
  const config = await new ESLint({ cwd }).calculateConfigForFile(filePath);
  const isolated = new ESLint({
    cwd,
    fix: true,
    overrideConfig: [
      {
        languageOptions: { parserOptions: { tsconfigRootDir: cwd } },
        rules: Object.fromEntries(Object.keys(config.rules).map((rule) => [rule, 'off'])),
      },
      {
        rules: {
          'padding-line-between-statements': config.rules['padding-line-between-statements'],
        },
      },
    ],
  });
  const input =
    "import first from 'first';\n\nimport second from 'second';\nexport function calculate(value: number) {\n  const initial = value;\n  if (initial < 0) {\n    return 0;\n  }\n  const result = value + 1;\n  const output = result;\n  console.log(output);\n  return result;\n}\nexport function identity(value: number) {\n  return value;\n}\n";
  const [fixed] = await isolated.lintText(input, { filePath });

  assert.ok(fixed.output.includes("from 'first';\nimport second"));
  assert.ok(fixed.output.includes("from 'second';\n\nexport function"));
  assert.ok(fixed.output.includes('const initial = value;\n\n  if (initial < 0)'));
  assert.ok(
    fixed.output.includes(
      'const result = value + 1;\n  const output = result;\n\n  console.log(output);\n\n  return result;',
    ),
  );
  assert.ok(fixed.output.includes('}\n\nexport function identity'));
  assert.ok(fixed.output.includes('if (initial < 0) {\n    return 0;'));
  const options = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(fixed.output, { ...options, parser: 'typescript' });
  const [again] = await isolated.lintText(formatted, { filePath });
  assert.equal(again.output, undefined);
  assert.equal(await prettier.format(formatted, { ...options, parser: 'typescript' }), formatted);
  await fs.unlink(path.join(fixtureDir, 'node_modules'));
  assert.equal(path.dirname(fixtureDir), path.resolve(os.tmpdir()));
  await fs.rm(fixtureDir, { recursive: true });
  console.log(
    stack +
      ': canonical fixtures pass; imports, functions, returns, guards and idempotence verified',
  );
}
