---
name: fix-flow-proceed
description: After /pspt:fix-flow has installed pspt's toolchain, loop over the code until everything is green — format, tests, typecheck, lint, knip — one file per iteration, never changing behaviour and never lowering the bar. Stops when the whole check and the test suite pass, when the user says stop, or when a fix needs a decision. Use for "/pspt:fix-flow-proceed", "fix all the lint errors", "make check green", "clear the lint debt", or when /pspt:fix-flow reports findings left.
---

# Fix the code until everything is green

`/pspt:fix-flow` makes the **toolchain** right. Existing code usually breaks
some of the rules it brings — one-letter names, magic numbers, nested
ternaries, dead files. `/pspt:fix-flow-proceed` works through that code, one
file at a time, until the package's `check` script and its tests both pass.

It is to `/pspt:fix-flow` what `/pspt:build-long` is to `/pspt:build`: a loop,
with the same discipline — small verified steps, behaviour unchanged, the bar
never lowered.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): the tools
every pspt skill needs (jcodemunch and ponytail) must be present. Missing → ask once, then
install and register them yourself for the project (`.mcp.json`,
`.claude/settings.json`, `CLAUDE.md`, `AGENTS.md`, `.agents/rules/`); declined → this skill does
not start. Read code through jcodemunch from here on.

## Step 0 — The toolchain must already match

Run `node <plugin>/references/toolchain/fix-flow.mjs <package-dir>` for each
package. Anything but `✓ matches … nothing to fix` → run `/pspt:fix-flow`
first. Fixing code against a toolchain that is itself wrong fixes the wrong
thing.

Then create the progress log, `.git/pspt/fix-flow-progress.md` — inside `.git/`,
so it is never committed, linted or formatted. It records each finished batch
and lets a stopped loop resume exactly where it left off.

## Step 1 — Baseline

1. **Format**: `prettier --write .` — formatting is never a decision.
2. **Tests**: run the package's `test` script (Vitest or Jest) and record
   which tests fail. **The tests are the safety net for everything after this
   step**, so a red test is fixed **first** (Step 3), before any lint finding.
3. **Queue**: `node <plugin>/references/toolchain/findings.mjs <package-dir>`
   — types, lint and knip, grouped by file, worst gate first. Read this
   summary, not raw tool output.

```
fix-flow-proceed · backend/ (express-js)
  tests   41 pass · 2 fail (booking.test.js: "rejects overlap", "rounds tax")
  queue   118 findings in 23 files — types 0 · lint 104 · knip 14
```

## Step 2 — The loop

Work in this order. Each iteration takes **one file** — every finding the
queue lists for it — never a rule across many files, so each change stays
reviewable and every test run points at one place.

| Order | Gate | Done when |
|---|---|---|
| 1 | Failing tests | the test script passes |
| 2 | Types (`TS…`) | `tsc --noEmit` is clean — TypeScript packages only |
| 3 | Lint | `eslint --max-warnings=0 .` is clean |
| 4 | knip | `knip` is clean |
| 5 | Final | `check` passes and the full test suite passes, once more, from scratch |

Each iteration:

1. Print the line: `▶ 14/23 · src/features/bookings/pricing.rules.js · id-length ×2 · no-magic-numbers ×2 · no-nested-conditional ×1`
2. Read the file — through jcodemunch when it is installed — and fix every
   finding listed for it (rules below).
3. Re-run that file alone: `findings.mjs <package-dir> --file <path>`. It must
   be clean.
4. Re-run the tests that cover the file — the whole suite when unsure. Still
   green, or the change is reverted and redone.
5. **Re-index** the file — and any file the fix renamed, moved or deleted —
   with jcodemunch `index_folder`, incremental, with those `paths`
   (`references/prerequisites.md` §5), so the next file's reads and
   `find_importers` see this change.
6. Append the batch to the progress log, then print:
   `✓ 14/23 · pricing.rules.js — 5 fixed · tests green · ↻ re-indexed · 104 → 99 left`
   and one line per disable added in this batch:
   `⚑ disabled no-magic-numbers at pricing.rules.js:14 — the vendor API encodes "settled" as 7`

## When a finding cannot be fixed — disable it, with a reason

Some findings are right in general and wrong for one line: a status code a
vendor protocol defines, a third-party type that lies. Then — and only after a
real fix was tried — disable that one rule on that one line, with the reason,
per `references/conventions.md` §10:

```js
// eslint-disable-next-line no-magic-numbers -- the vendor API encodes "settled" as status 7
if (status === 7) {
```

**This never stops the loop** — no question, no pause. It is **always
reported**: the `⚑` line above, the final report, and the commit body. The
toolchain rejects a disable that names no rule, gives no reason, or suppresses
nothing, so a lazy disable fails `check` like any other finding.

`findings.mjs` lists every disable in the package on every run — added by this
loop or already there — so none can hide.

Re-read the queue every few iterations: fixing one file can clear or create a
finding in another (an export that becomes unused, a renamed import).

## How each kind of finding is fixed

**Behaviour never changes.** Every fix below is a refactor; the tests prove it.

| Finding | Fix |
|---|---|
| Failing test | Find out which side is wrong. A code defect is fixed in the code. A test asserting outdated behaviour is a **question for the user**, never an edit to make it pass |
| Type error | Type it correctly. Never `any`, `as unknown as` or `@ts-ignore`; `@ts-expect-error -- <reason>` only as a disable (below) |
| `id-length` | Rename to what the value is (`hours`, not `h`; `court`, not `c`), everywhere it is used |
| `no-magic-numbers` | Extract a named `const` whose name says what the number means (`HOURLY_RATE_IDR`, `MAX_PAGE_SIZE`). If the meaning cannot be read from the code, **ask** — a wrong name is worse than a number |
| `sonarjs/no-duplicate-string` | One named `const` per repeated literal, in that file |
| `sonarjs/no-nested-conditional` | Early returns, or a `const` lookup table (conventions §4) |
| `complexity`, `cognitive-complexity`, `max-depth`, `max-lines-per-function`, `max-statements` | Extract well-named functions; guard clauses. **If the function has no test, write a characterisation test of its current behaviour first** |
| `curly`, `no-else-return`, `no-lonely-if`, other shape rules | Rewrite the shape as the rule describes |
| `*.rules` purity (`Date`, `fetch`, `Math.random`, I/O imports) | Pass the value in as a parameter; move I/O to the sibling service |
| `sonarjs/todo-tag` | Do the work if it is small and clear; otherwise **ask** — deferred work belongs in `phases.md` or a ticket, never in a comment |
| `sonarjs/no-commented-code` | Delete it — git keeps the history |
| knip unused export | Remove `export` (or the code, if nothing uses it at all) |
| knip unused file | Delete it — after searching for dynamic references (`import(`, `require(`, string paths, config files). Any hit → **ask** |
| knip unused dependency | Remove it from `package.json` and reinstall |
| knip unlisted dependency | The code imports a package `package.json` does not declare (`@jest/globals` in a test). **List it** — at the version already installed, in `devDependencies` when only tests or tooling use it. Never remove the import |
| knip configuration hint | Advice, not a finding — `check` still passes. Leave it: `knip.json` is a toolchain file, and a hint never justifies editing it |

## Step 3 — When to stop

The loop ends — and returns control — when any of these is true:

- **Everything is green**: `check` passes and the full test suite passes. Go
  to Step 4.
- The user says **stop**. The work so far stays in the working tree, and the
  progress log lets `/pspt:fix-flow-proceed` resume from the next file.
- **A fix needs a decision**: what a number means, whether a failing test or
  the code is right, deleting a file something might load dynamically, an API
  shape other packages depend on. Ask with `AskUserQuestion`, then continue.
- **The same file fails twice in a row.** One retry is fine; a second failure
  means the approach is wrong. Stop and report.
- **The tools cannot run** — a missing dependency, a broken install. Report it.

## Step 4 — Commit, once green

The pre-commit hook runs `check` on the **whole** tree, so nothing can be
committed while any finding remains — and it is never bypassed
(`--no-verify` is forbidden). Commits are therefore made once, when the tree
is green, as reviewable units, in this order — `git status --porcelain` first,
explicit paths, never `git add -A`, no push:

| Commit | Contents |
|---|---|
| `chore(toolchain): align <key> toolchain with pspt` | the toolchain files and `package.json`, if `/pspt:fix-flow` left them uncommitted |
| `style: apply pspt toolchain autofixes` | Prettier and `eslint --fix` output |
| `fix(<area>): <what>` | one per failing test fixed **in the code** — a behaviour change, so it gets its own commit |
| `test(<area>): <what>` | one per test the user confirmed was wrong — the body names who confirmed it |
| `refactor(<area>): satisfy pspt lint rules` | the lint and type fixes, one commit per feature folder |
| `chore(deps): remove unused code and dependencies` | the knip fixes, including newly listed dependencies |

Each body lists the files and the rules cleared, and ends with one
`disables:` trailer per directive the loop added —
`disables: src/payments/status.js:14 no-magic-numbers — vendor status code`. Every hook run sees the green
working tree, so each commit passes; the final one is the state that was proven
green from scratch in Step 2's last gate. Then delete the progress log.

**SR-6:** no `Co-Authored-By` trailer, no tool attribution — the commit-msg
hook rejects them.

## Report

```
fix-flow-proceed · backend/ (express-js)

  tests   43 pass (2 fixed: "rejects overlap", "rounds tax")
  types   —
  lint    104 → 0   id-length 52 · no-magic-numbers 31 · no-duplicate-string 14 · …
  knip    14 → 0    3 files deleted · 9 exports removed · 2 dependencies removed
  asked   2 — HOURLY_RATE_IDR meaning (user) · legacy/export.js deleted (user)
  ⚑ disabled 1 — payments/status.js:14 no-magic-numbers — the vendor API encodes "settled" as 7
            (project total: 3 disables, all with reasons — see findings.mjs)
  check   ✓ green · tests ✓ green
  commits 6 — 4f2a9c1 … e81d07b
```

---

## Never

- **Never lower the bar** — no skipped, deleted or weakened test, no `any`,
  no `@ts-ignore`, no edit to a toolchain file (`/pspt:fix-flow` owns those).
  A disable is not lowering the bar only when it follows conventions §10:
  one rule, one line or block, a reason — and reported.
- **Never disable silently.** Every disable the loop adds appears in its `⚑`
  line, the report and the commit body.
- **Never change behaviour** while fixing a finding. A behaviour change is a
  failing test fixed on purpose, with its own commit — or a ticket.
- **Never batch many files into one iteration**, and never one rule across the
  whole codebase in one pass.
- **Never guess a meaning** — a constant's name, whether a test or the code is
  right, whether a file is truly dead. Ask.
- **Never commit a red tree, never `--no-verify`, never push.**
