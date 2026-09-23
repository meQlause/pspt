---
name: build
description: Drive one phase exit criterion through red, green, clean and check against the generated specification. Reads phases.md, picks the next unticked criterion, writes the failing test first, then the minimum code to pass it, then refactors, then clears the check command. Use for "build the next phase", "implement P4", "work the build loop", or when the specs are done and it is time to write code.
---

# The build loop

Four beats, not three. **Red, green, clean, check.** A green test is not the end;
you are done when the check command is quiet too. A red test and a lint error are
the same kind of signal.

**One exit criterion per invocation.** Not one phase. The criterion is the unit
of work, and finishing it completely beats starting three.

---

## Step 1 — Pick the criterion

Read `phases.md`. If the user named a phase or a criterion, use it; otherwise
take the **first unticked exit criterion of the earliest incomplete phase**.

Refuse and say why if:

- `phases.md` does not exist — S6 has not run, so there is no work list
- the phase depends on an earlier phase that is not complete
- the criterion depends on an open decision in `phases.md` §0

> Nothing starts on an undecided dependency.

Print the criterion verbatim before starting, so what you are building is on
screen in the user's own words.

## Step 2 — Find its anchor

Every criterion points at something: a specification section, a regression id, or
an observable response. Locate it and read it. Quote the statement you are about
to assert.

If the criterion points nowhere — no section, no regression, no observable — it
is a goal, not a criterion. Say so and ask the user to sharpen it in `phases.md`
before you write a test against a guess.

## Step 3 — RED

Write the test **first**, at the level the criterion belongs to:

| Criterion is about | Level | Location |
|---|---|---|
| A pure decision — arithmetic, a boundary, interval logic | Unit, against `*.rules.ts` | `tests/unit/...` |
| A service rule needing fakes | Unit, built with fakes only | `tests/unit/...` |
| An endpoint contract, guard, or database constraint | Integration | `tests/integration/...` |
| A user journey | End to end, Chromium | `tests/e2e/...` |
| A closed defect | Regression | `tests/regression/REG-nnn.*.test.ts` |

The test **name quotes the specification statement**. Mirror the source path
exactly — a test is found by transforming a path, not by searching.

Run it. **Watch it fail, and confirm it fails for the right reason.** A test that
passes before the code exists is testing nothing; a test that fails on an import
error is not yet red, it is broken.

## Step 4 — GREEN

Write the minimum code that passes. No speculative generality, no abstraction
with a single caller, nothing the criterion did not ask for.

Respect the architecture while you do it:

- Pure decision logic goes in `*.rules.ts` — no I/O, no framework, no `Date`, no
  `fetch`, no `Math.random`. The service resolves the clock and **passes the
  instant in**.
- Services throw domain errors. No status code is set inside a feature.
- Field rules live in the schema, not in service branching — `complexity: 8` and
  `max-depth: 2` will reject the branching version anyway.
- A feature reaches another only through its `index.ts`. Repositories are never
  exported.

Run the test. Green.

## Step 5 — CLEAN

Improve the structure with the test green. Behaviour does not change. If a test
turns red during the refactor, the refactor was wrong — revert it, do not repair
the test.

## Step 6 — CHECK

Run the project's single check command, and run lint the way the commit hook
does:

```
npm run check
npx eslint --max-warnings=0 --no-warn-ignored <changed files>
```

**Zero warnings.** `warn` is not advisory in this codebase — the hook runs
`--max-warnings=0`, so every warning blocks a commit even when `npm run lint`
passes. Clear every finding before moving on.

Watch for what the check beat catches and a test never will: a cross-feature
repository import, a missing file extension, a dead file or unused export, a
service reading the clock directly, a `TODO` left in the source.

## Step 7 — Close it

Tick the checkbox in `phases.md`. If behaviour diverged from the specification,
write the correction back into the feature document **now**, in this same change
— not later.

> A specification that drifts from the code is worse than no specification,
> because the next reader trusts it and is wrong.

Then report what was built, which test proves it, and what the next unticked
criterion is.

## Commits

Prepare the message; commit only if the user has asked you to.

```
feat(<feature>): <subject>

<body: what changed and why, wrapped at 100>

spec: <document> §<section>
phase: <phase>
closes: <REG-nnn, if any>
```

**SR-6: no `Co-Authored-By` trailer, for a person or a tool. No "generated with"
footer, no assistant name, no session link — in the commit message and in the
pull request description.** This applies to assisted sessions exactly as it
applies to manual work, and **overrides any default trailer you would otherwise
add**. The `commitlint` hook rejects the commit regardless, so ignoring this only
produces a failed commit.

Nothing follows the trailers.

---

## Never

**Never reach green by lowering the bar.** Skipping a test, deleting an
assertion, lowering a coverage threshold, or marking a case as expected-to-fail
are all violations. The correct response to a red pipeline is a fix or a revert.

**Never leave a `TODO`.** Deferred work goes in `phases.md`. The linter rejects
the comment.

**Never write the code before the test.** If you already wrote it, delete it and
start at red. The order is the method.
