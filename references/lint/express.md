# Lint rules — Express / TypeScript backend

Same contract as [`nestjs.md`](nestjs.md). **Every rule below is identical** —
nothing in the NestJS set was framework-specific except two items, both noted
in §7.

Companions: [`nextjs.md`](nextjs.md), [`react.md`](react.md).

---

## 1. Size

| Rule | Limit | Severity |
|---|---|---|
| `max-lines-per-function` | **70** | error |
| `max-lines` (per file) | **450** | error |
| `max-statements` | 15 | warn |
| `max-params` | 4 | warn |
| `max-nested-callbacks` | **3** | error |
| `max-classes-per-file` | 1 | error |

Both line counts use `skipBlankLines: true, skipComments: true`.

**A comment-only line is free. A line with code plus a trailing comment is
not.** Documentation never pushes a function over the cap — only real
statements do.

```js
'max-lines-per-function': ['error', { max: 70, skipBlankLines: true, skipComments: true }],
'max-lines':              ['error', { max: 450, skipBlankLines: true, skipComments: true }],
```

**`max-nested-callbacks: 3` bites harder in Express than in NestJS.** Middleware
chains, `router.get(path, (req, res) => …)` and callback-style database clients
stack up fast. Three is the ceiling; name the inner function and pass it by
reference instead.

---

## 2. Branching

| Rule | Limit | Severity |
|---|---|---|
| `complexity` | **8** | error |
| `sonarjs/cognitive-complexity` | **10** | error |
| `max-depth` | **2** | error |

**`max-depth: 2`** — at most two levels of nested blocks.

```ts
// ✗ depth 3
if (req.user) { if (req.user.roles) { if (isAdmin(req.user)) { … } } }

// ✓ guard clauses
if (!req.user) return next();
if (!req.user.roles) return next();
if (isAdmin(req.user)) { … }
```

**`complexity: 8`** counts branch points per function — each `if`, `&&`, `||`,
`?:`, `case`, `catch`, loop. A route handler that validates six fields inline
will breach it; validate in a schema, not in branches.

---

## 3. Conditional shape

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
const status = err ? 500 : found ? 200 : 404;

// ✓
if (err) return res.sendStatus(500);
return res.sendStatus(found ? 200 : 404);
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
| `no-identical-functions` | two functions with the same body (min 3 lines) — **`warn` here** |
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
| `sonarjs/no-parameter-reassignment` | writing to a parameter — **including `req` and `res`** |
| `sonarjs/no-nested-assignment` | `a = b = c` |
| `sonarjs/no-selector-parameter` | a boolean parameter that picks between two behaviours |
| `sonarjs/no-ignored-return` | discarding the result of a pure call |
| `sonarjs/array-callback-without-return` | a `map`/`filter` callback with no `return` |
| `sonarjs/no-commented-code` | commented-out code |
| `sonarjs/todo-tag` | a `TODO` left in the source |

**`no-parameter-reassignment` is the one Express habit this breaks.** Attaching
to the request (`req.user = …`) is reassigning a *property*, which is fine;
replacing the parameter itself is not.

---

## 7. Purity boundary — `*.rules.ts`

The only place the NestJS set needed editing. A `*.rules.ts` file holds pure
decision logic and may not reach for I/O, a framework or the clock:

```js
'no-restricted-imports': ['error', { patterns: [{ group: [
  '@prisma/*', '.prisma/*', '**/prisma*',
  'express', 'express-*', '@types/express',     // ← was '@nestjs/*'
  'axios', 'node-fetch', 'undici',
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

Every branch is then reachable from a unit test with no fixture, no server and
no clock. **Banning `Date` is the one people miss** — pass the instant in.

In Express this boundary is worth *more* than in NestJS: without DI there is
nothing else stopping a handler's decision logic from reaching straight for the
database.

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

`args: 'after-used'` plus `argsIgnorePattern: '^_'` is what makes Express's
four-argument error middleware legal:

```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { … });
```

Without the `^_` convention, every unused `next` would be a warning — and a
warning blocks the commit.

---

## 9. What differs from NestJS

Two items, both mechanical:

1. **`no-restricted-imports`** swaps `@nestjs/*` for `express`, `express-*`,
   `@types/express` (§7).
2. **`max-classes-per-file: 1`** was written for NestJS's one-class-per-file
   shape. Express code is mostly functions, so it rarely fires — keep it
   anyway; it still stops a file becoming a grab-bag.

Everything else — every threshold, every conditional-shape rule, every
duplication rule — transfers unchanged.

---

## 10. `warn` is not advisory

`max-params`, `max-statements`, `no-negated-condition`,
`unused-imports/no-unused-vars`, `no-explicit-any` and the two downgraded
sonarjs rules are all `warn`.

The commit hook runs ESLint with **`--max-warnings=0`**, so every one blocks a
commit even though `npm run lint` passes:

```sh
npx eslint --max-warnings=0 --no-warn-ignored <files>
```
