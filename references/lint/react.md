# Lint rules — React (Vite / CRA / standalone)

Same contract as [`nextjs.md`](nextjs.md) with the Next-only rules removed.
Every threshold and every conditional-shape rule transfers unchanged; §9 lists
exactly what does not.

Companions: [`nestjs.md`](nestjs.md), [`express.md`](express.md).

---

## 1. Size

| Rule | Limit | Severity |
|---|---|---|
| `max-lines-per-function` | **100** | error |
| `max-lines` (per file) | **500** | error |
| `max-statements` | 15 | warn |
| `max-params` | 4 | warn |
| `react/jsx-max-depth` | 5 | warn |

Both line counts use `skipBlankLines: true, skipComments: true`.

**A comment-only line is free. A line with code plus a trailing comment is
not.** Documentation never pushes a component over the cap — only real
statements do.

```js
'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
'max-lines':              ['error', { max: 500, skipBlankLines: true, skipComments: true }],
```

**The caps are higher than the backend's (70 / 450) on purpose** — JSX is
line-hungry in a way that business logic is not. A component past 100 is
usually two components.

**`max-statements: 15` is the one that bites components.** Eight `useState`
calls plus a couple of handlers and you are there. Collapse related state into
one custom hook rather than deleting a line to squeak under:

```tsx
// ✗ 16 statements
const [title, setTitle] = useState('');
const [body, setBody]   = useState('');
// …six more

// ✓ one
const draft = useDraft();
```

---

## 2. Branching

| Rule | Limit | Severity |
|---|---|---|
| `complexity` | **8** | error |
| `sonarjs/cognitive-complexity` | **10** | error |
| `max-depth` | **2** | error |
| `react/jsx-max-depth` | **5** | warn |

**`max-depth: 2`** applies to statement blocks, not JSX. **`jsx-max-depth: 5`**
is the JSX equivalent — nesting past five elements means the inner block wants
to be its own component.

```tsx
// ✗ depth 3
if (a) { if (b) { if (c) { … } } }

// ✓ early returns
if (!a) return null;
if (!b) return null;
if (c) { … }
```

**`complexity: 8`** counts branch points per function — each `if`, `&&`, `||`,
`?:`, `case`, `catch`, loop. Note that `&&` in JSX counts:
`{a && b && c && <X />}` is three.

---

## 3. Conditional shape

| Rule | Bans |
|---|---|
| `sonarjs/no-nested-conditional` | **nested ternaries, outright** — no option, no threshold |
| `curly: ['error','all']` | brace-less `if` / `else` / `for` / `while` |
| `no-else-return` (`allowElseIf: false`) | `else` **and `else if`** after a `return` |
| `no-lonely-if` | `else { if (…) }` — use `else if` |
| `sonarjs/no-collapsible-if` | `if (a) { if (b) }` — use `if (a && b)` |
| `sonarjs/prefer-single-boolean-return` | `if (x) return true; return false` |
| `sonarjs/no-inverted-boolean-check` | `!(a === b)` — use `a !== b` |
| `sonarjs/no-redundant-boolean` | `x === true` |

**`no-nested-conditional` is the rule most likely to surprise a React
codebase**, because the chained ternary is idiomatic JSX:

```tsx
// ✗ banned
{loading ? <Spinner /> : error ? <Error /> : <List />}

// ✓ early returns in the component
if (loading) return <Spinner />;
if (error) return <Error />;
return <List />;

// ✓ or a sub-component holding the decision
<Body state={state} />
```

A single ternary is fine — `{open ? <A /> : <B />}` — it is nesting that is
banned.

`no-negated-condition` is **not** enabled here (the backend has it as a warn).
`if (!x) A else B` is legal.

---

## 4. React-specific

| Rule | Severity | What |
|---|---|---|
| `react-hooks/rules-of-hooks` | **error** | a hook only inside a component or another hook |
| `react-hooks/exhaustive-deps` | warn | effect dependency arrays must be complete |
| `react/prop-types` | **off** | TypeScript covers it |
| `react/react-in-jsx-scope` | **off** | the modern JSX transform |

**`rules-of-hooks` shapes the architecture, not just the code.** A helper whose
name starts lowercase is not a component, so it cannot call a hook. That forces
one of two shapes:

```tsx
// ✗ a hook in a helper
function statusCell(row: Row) {
  const t = useTranslation();        // rules-of-hooks error
  return <span>{t('active')}</span>;
}

// ✓ take what it needs as a parameter
function statusCell(row: Row, t: (key: string) => string) { … }

// ✓ or promote it to a component
function StatusCell({ row }: { row: Row }) {
  const t = useTranslation();
  return <span>{t('active')}</span>;
}
```

The same applies to a module-level `const COLUMNS = […]` table: module scope
has no hook, so it becomes `buildColumns(t)` called from the component.

**Threading is transitive.** A helper that gains a parameter forces it on its
callers, all the way out to the component. Let `tsc` find every step rather
than guessing.

Plus `eslint-plugin-react`'s `recommended` and `jsx-runtime` configs, and
`jsx-a11y`'s `recommended`, as shipped.

---

## 5. Duplication and dead logic

All error-level, from `sonarjs/recommended`:

| Rule | Catches |
|---|---|
| `no-identical-conditions` | the same condition twice in one `if/else if` chain |
| `no-identical-expressions` | `a === a`, `x && x` |
| `no-duplicated-branches` | two branches with identical bodies |
| `no-all-duplicated-branches` | every branch identical |
| `no-identical-functions` | two functions with the same body (min 3 lines) |
| `no-invariant-returns` | a function that always returns the same value |
| `no-redundant-jump` | a `return` / `continue` that changes nothing |
| `no-redundant-assignments` | a value assigned then immediately overwritten |
| `no-unused-collection` | a collection written to and never read |

---

## 6. Switch and other shape rules

| Rule | Limit / bans |
|---|---|
| `sonarjs/no-small-switch` | a `switch` with fewer than 3 cases — use `if` |
| `sonarjs/max-switch-cases` | 30 (plugin default) |
| `sonarjs/no-nested-functions` | function nesting past the plugin's threshold |
| `sonarjs/no-nested-template-literals` | a template literal inside a template literal |
| `sonarjs/no-parameter-reassignment` | writing to a parameter — including props |
| `sonarjs/no-selector-parameter` | a boolean prop that picks between two behaviours |
| `sonarjs/array-callback-without-return` | a `map`/`filter` callback with no `return` |
| `sonarjs/no-commented-code` | commented-out code |
| `sonarjs/todo-tag` | a `TODO` left in the source |

**`no-selector-parameter` reads as a design rule for props**: `<Button primary>`
and `<Button secondary>` beat `<Button isPrimary={bool}>`.

---

## 7. Unused code

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
**variables** are a warning — which still blocks a commit.

---

## 8. Registering the plugins yourself

The Next.js version gets react, react-hooks, jsx-a11y, import and
`@typescript-eslint` registered for it by `eslint-config-next`. Standalone
React must register them itself, using the **flat** config entries — verified
export shapes:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';            // 7.37.x
import reactHooks from 'eslint-plugin-react-hooks'; // 7.1.x
import jsxA11y from 'eslint-plugin-jsx-a11y';       // 6.10.x
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,        // NOT .configs.recommended (legacy)
  react.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  sonarjs.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  { settings: { react: { version: 'detect' } }, /* rules from §1–§7 */ },
  prettier,                              // always last
];
```

Two traps:

- **`react.configs.recommended` is the legacy shape** and will not load under
  flat config. Use `react.configs.flat.recommended`.
- **Never spread a plugin's `.rules` without its `.plugins`.** The Next config
  can spread `jsxA11y.flatConfigs.recommended.rules` only because Next already
  registered the plugin; doing that standalone is a hard *"Definition for rule
  not found"* crash. Use the whole config entry.

`prettier` (i.e. `eslint-config-prettier`) must be the last entry, or it cannot
switch off the formatting rules the earlier presets turned on.

---

## 9. What differs from Next.js

Removed — nothing to replace them with:

| Dropped | Why |
|---|---|
| `@next/next/no-img-element` | Next-only; use your own image rule or none |
| `@next/next/no-html-link-for-pages` | was already `off` (App Router) |
| `jsx-a11y/anchor-is-valid: off` | that override existed to unblock `next/link`; **re-enable the rule** — plain React has no such conflict |

Added, because Next used to supply them implicitly:

| Added | Why |
|---|---|
| `react/prop-types: off` | TypeScript covers it |
| `react/react-in-jsx-scope: off` | modern JSX transform |
| `settings.react.version: 'detect'` | Next set this for you |

Every threshold, every conditional-shape rule, every duplication rule and
`rules-of-hooks` transfer unchanged.

---

## 10. `warn` is not advisory

`max-params`, `max-statements`, `jsx-max-depth`, `exhaustive-deps`,
`no-explicit-any` and `unused-imports/no-unused-vars` are all `warn`.

The commit hook runs ESLint with **`--max-warnings=0`**, so every one blocks a
commit even though `npm run lint` passes. Check it the way the hook does:

```sh
npx eslint --max-warnings=0 --no-warn-ignored <files>
```
