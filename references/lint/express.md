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

## 10. Identifier length

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
form: `id` (primary key, everywhere), `db` (database handle in a repository),
`tx` (transaction handle in `runInTransaction` callbacks), `to` / `up` (route
argument names in migration files). Add nothing else without a written
reason.

`_req`, `_next` and the other underscore-prefixed unused parameters from §8
are exempted by convention — the `unused-imports` plugin recognises them via
`argsIgnorePattern: '^_'`, and `id-length` sees the leading underscore as
part of the name (so `_req` is 4 characters, above the floor).

---

## 11. Magic values

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

**No unnamed number** except `-1`, `0`, `1`, `2`. Array indexes are fine
(`items[3]`), default parameter values are fine (`(count = 100) => …`), and
class-field initialisers are fine — everything else must be a `const` with a
name (`const MAX_PAGE_SIZE = 100`). `enforceConst: true` means declaring the
constant with `let` fails the rule too.

Why the four-value floor: `-1` is the failed-`indexOf` sentinel, `0` is the
empty-collection identity, `1` is the increment step, `2` is the divisor for
"half" and the base for binary; naming any of them would make the code less
readable, not more. Every other quantity has a name in the domain — a booking
lasts `MINIMUM_DURATION_MINUTES`, not `60`; a page holds `PAGE_SIZE` items,
not `25`.

**No string literal that appears three times or more in one file** — extract
it to a `const`. This bans the whole `'E-VALIDATION'`-typed-in-four-places
class of drift; the code and the copy each get one home. Two-time literals
stay legal because renaming a pair rarely earns its diff.

### Reasonable exemptions

Numbers in **test files** (`tests/**`) are the point of the test — a table
of `[input, expected]` pairs would be unreadable if every literal had to be a
named constant. Turn the rule off in the `tests/**` glob:

```js
{
  files: ['tests/**/*.ts'],
  rules: { 'no-magic-numbers': 'off', 'sonarjs/no-duplicate-string': 'off' },
}
```

Numbers **inside a Zod schema** are the schema's own constants (`z.string().min(1)`,
`z.number().int().min(1024)`) — they read naturally in place and are the
`const`. Applying the rule inside a schema is noise, so keep it in the
service-and-rules glob and leave `*.schema.ts` on the default.

---

## 12. `warn` is not advisory

`max-params`, `max-statements`, `no-negated-condition`,
`unused-imports/no-unused-vars`, `no-explicit-any` and the two downgraded
sonarjs rules are all `warn`.

The commit hook runs ESLint with **`--max-warnings=0`**, so every one blocks a
commit even though `npm run lint` passes:

```sh
npx eslint --max-warnings=0 --no-warn-ignored <files>
```
