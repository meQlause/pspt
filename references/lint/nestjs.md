# Lint rules — NestJS / TypeScript backend

The constraints only. Config plumbing, dependencies and the commit hook are
deliberately left out.

Companions: [`express.md`](express.md), [`nextjs.md`](nextjs.md),
[`react.md`](react.md).

---

## 1. Size

| Rule | Limit | Severity |
|---|---|---|
| `max-lines-per-function` | **70** | error |
| `max-lines` (per file) | **450** | error |
| `max-statements` | 15 | warn |
| `max-params` | 4 | warn |
| `max-classes-per-file` | 1 | error |
| `max-nested-callbacks` | 3 | error |

Both line counts use `skipBlankLines: true, skipComments: true`.

**A comment-only line is free. A line with code plus a trailing comment is
not.** Documentation never pushes a function over the cap — only real
statements do. You cannot comment your way under, and you cannot be punished
for explaining yourself.

```js
'max-lines-per-function': ['error', { max: 70, skipBlankLines: true, skipComments: true }],
'max-lines':              ['error', { max: 450, skipBlankLines: true, skipComments: true }],
```

**`max-classes-per-file: 1`** is the NestJS shape: one controller, one service,
one module per file.

---

## 2. Branching

| Rule | Limit | Severity |
|---|---|---|
| `complexity` | **8** | error |
| `sonarjs/cognitive-complexity` | **10** | error |
| `max-depth` | **2** | error |

**`max-depth: 2`** — at most two levels of nested blocks. A third `if` inside
two others is an error; extract it.

```ts
// ✗ depth 3
if (a) { if (b) { if (c) { … } } }

// ✓ guard clauses
if (!a) return;
if (!b) return;
if (c) { … }
```

**`complexity: 8`** counts branch points per function — each `if`, `&&`, `||`,
`?:`, `case`, `catch`, loop. **`cognitive-complexity: 10`** weights *nesting*
on top, so two shallow branches cost less than one deeply buried one.

---

## 3. Conditional shape

These decide what a conditional may look like, not how many you may have.

| Rule | Bans |
|---|---|
| `sonarjs/no-nested-conditional` | **nested ternaries, outright** — no option, no threshold |
| `curly: ['error','all']` | brace-less `if` / `else` / `for` / `while` |
| `no-else-return` (`allowElseIf: false`) | `else` **and `else if`** after a `return` |
| `no-lonely-if` | `else { if (…) }` — use `else if` |
| `sonarjs/no-collapsible-if` | `if (a) { if (b) }` — use `if (a && b)` |
| `no-negated-condition` | `if (!x) A else B` — flip it (warn) |
| `sonarjs/prefer-single-boolean-return` | `if (x) return true; return false` |
| `sonarjs/no-inverted-boolean-check` | `!(a === b)` — use `a !== b` |
| `sonarjs/no-redundant-boolean` | `x === true` |

```ts
// ✗ no-nested-conditional
const label = a ? 'x' : b ? 'y' : 'z';

// ✓ table, or early returns
const LABEL = { a: 'x', b: 'y' } as const;
```

```ts
// ✗ no-else-return, allowElseIf: false — the `else if` is also an error
if (a) { return 1; } else if (b) { return 2; }

// ✓
if (a) { return 1; }
if (b) { return 2; }
```

---

## 4. Duplication and dead logic

All error-level, from `sonarjs/recommended`:

| Rule | Catches |
|---|---|
| `no-identical-conditions` | the same condition twice in one `if/else if` chain |
| `no-identical-expressions` | `a === a`, `x && x` |
| `no-duplicated-branches` | two branches with identical bodies |
| `no-all-duplicated-branches` | every branch identical — the conditional does nothing |
| `no-identical-functions` | two functions with the same body (min 3 lines) — **`warn` here**, error elsewhere |
| `no-invariant-returns` | a function that always returns the same value |
| `no-redundant-jump` | a `return` / `continue` that changes nothing |
| `no-redundant-assignments` | a value assigned then immediately overwritten |
| `no-unused-collection` | a collection written to and never read — **`warn` here** |

---

## 5. Switch

| Rule | Limit |
|---|---|
| `sonarjs/no-small-switch` | a `switch` with fewer than 3 cases — use `if` |
| `sonarjs/max-switch-cases` | 30 (plugin default) |
| `sonarjs/no-case-label-in-switch` | a label inside a `case` |

---

## 6. Other shape rules

| Rule | Bans |
|---|---|
| `sonarjs/no-nested-functions` | function nesting past the plugin's threshold |
| `sonarjs/no-nested-template-literals` | a template literal inside a template literal |
| `sonarjs/no-parameter-reassignment` | writing to a parameter — take a local |
| `sonarjs/no-nested-assignment` | `a = b = c` |
| `sonarjs/no-selector-parameter` | a boolean parameter that picks between two behaviours — split the function |
| `sonarjs/no-ignored-return` | discarding the result of a pure call |
| `sonarjs/array-callback-without-return` | a `map`/`filter` callback with no `return` |
| `sonarjs/no-commented-code` | commented-out code |
| `sonarjs/todo-tag` | a `TODO` left in the source |

---

## 7. Purity boundary — `*.rules.ts`

A file named `*.rules.ts` holds pure decision logic and may not reach for I/O,
a framework or the clock. Three rules enforce it:

```js
'no-restricted-imports': ['error', { patterns: [{ group: [
  '@prisma/*', '.prisma/*', '**/prisma*',
  '@nestjs/*', 'axios', 'node-fetch', 'undici',
  'node:fs', 'node:fs/*', 'fs', 'fs/*',
  'node:child_process', 'child_process',
], message: 'A *.rules.ts file must stay pure — no I/O, no framework. Move this to the sibling *.service.ts.' }] }],

'no-restricted-globals': ['error',
  { name: 'Date',  message: 'Pass the instant in as an argument so the rule is deterministic under test.' },
  { name: 'fetch', message: 'A *.rules.ts file must stay pure. Move the call to the sibling *.service.ts.' },
],

'no-restricted-properties': ['error',
  { object: 'Math', property: 'random', message: 'Non-deterministic — inject the value so the rule is testable.' },
],
```

Every branch is then reachable from a unit test with no fixture, no container
and no clock. **Banning `Date` is the one people miss** — pass the instant in,
and the same input always gives the same output.

---

## 8. Unused code

```js
'no-unused-vars': 'off',
'@typescript-eslint/no-unused-vars': 'off',
'unused-imports/no-unused-imports': 'error',
'unused-imports/no-unused-vars': ['warn', {
  vars: 'all', varsIgnorePattern: '^_',
  args: 'after-used', argsIgnorePattern: '^_',
}],
```

`_`-prefixed names are exempt. Unused **imports** are an error; unused
**variables** are a warning — which still blocks a commit, see below.

---

## 9. Identifier length

```js
'id-length': ['error', {
  min: 3,
  properties: 'never',
  exceptions: ['id', 'db', 'tx', 'to', 'up'],
}],
```

**No variable, parameter, class or method name under 3 characters.** A
one-letter name in a map callback (`.map(i => …)`, `.filter(x => …)`) says
nothing about what the value is; spell it out (`.map(issue => …)`). Loop
counters spelled `i` / `j` / `k` fall under the same rule — reach for a
named iteration (`for (const row of rows)`) instead. Object property keys
(the `properties: 'never'` flag) are exempt because JSON payloads and
inherited API shapes are not ours to rename.

The five exceptions are load-bearing domain vocabulary that keeps its short
form: `id` (primary key, everywhere), `db` (database handle), `tx`
(transaction handle in `runInTransaction` callbacks), `to` / `up` (route
argument names in migration files). Add nothing else without a written
reason.

`_req`, `_next` and the other underscore-prefixed unused parameters from §8
are exempted by convention — `id-length` counts the leading underscore as
part of the name (so `_req` is 4 characters, above the floor).

---

## 10. Magic values

```js
'no-magic-numbers': ['error', {
  ignore: [-1, 0, 1, 2],
  ignoreArrayIndexes: true,
  ignoreDefaultValues: true,
  ignoreClassFieldInitialValues: true,
  enforceConst: true,
  detectObjects: false,
}],
'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
```

**No unnamed number** except `-1`, `0`, `1`, `2`; **no string literal
repeated 3+ times in one file** — extract to a named `const`. Full rationale
in [`express.md`](./express.md) §11; the shape and exemptions transfer
unchanged. Test files opt out via a `tests/**` override; Zod schemas keep
their literals inline.

---

## 11. `warn` is not advisory

`max-params`, `max-statements`, `no-negated-condition`,
`unused-imports/no-unused-vars`, `no-explicit-any` and the two downgraded
sonarjs rules are all `warn`.

The commit hook runs ESLint with **`--max-warnings=0`**, so every one of them
blocks a commit even though `npm run lint` passes. Check it the way the hook
does:

```sh
npx eslint --max-warnings=0 --no-warn-ignored <files>
```
