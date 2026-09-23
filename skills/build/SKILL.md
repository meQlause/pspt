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

## Step 0 — Ensure the scaffold

Run once on the very first invocation. Skip on every later invocation — the
check below tells you which.

`backend/` and `frontend/` are **git submodules**, each with its own GitHub
repository. The parent repo tracks the specification (`docs/`, `phases.md`, the
mockup) and pins the two submodules at specific commits. This exists so a
specification change and a code change are always in the same pull request in
the parent, while backend and frontend keep their own history, their own hooks
and their own CI.

**Skip when** the parent already has a `.gitmodules` file listing both
`backend` and `frontend`. Nothing to do — jump to Step 1.

**Otherwise, set it up:**

1. **Refuse and stop** if any of the following is true:

   - `gh --version` fails → GitHub CLI not installed. Print the install command
     for the current platform (`winget install --id GitHub.cli`,
     `brew install gh`, `apt install gh`) and stop.
   - `gh auth status` shows no active account → not authenticated. Print
     `gh auth login` and stop.
   - `git rev-parse --show-toplevel` fails → parent is not a git repo. Ask
     whether to run `git init` before continuing.

2. **Read the project slug** from the H1 of `phases.md`
   (`# <Project> — Phases` → slugify `<Project>`, lowercase, `-` for spaces).
   If `phases.md` has no H1, ask the user for the slug once.

3. **Create the two remote repositories** under the authenticated account:

   ```
   gh repo create <slug>-backend  --private --description "Backend for <slug>"
   gh repo create <slug>-frontend --private --description "Frontend for <slug>"
   ```

   If a repo already exists, keep going — use it as-is. Do not force-overwrite.

4. **Wire them as submodules** at the parent root. If `backend/` or `frontend/`
   already contains files (a plain-directory scaffold from an earlier state),
   migrate rather than delete: copy the contents aside, push them as the initial
   commit inside the submodule, then drop the copy.

   ```
   git submodule add https://github.com/<owner>/<slug>-backend  backend
   git submodule add https://github.com/<owner>/<slug>-frontend frontend
   ```

5. **Commit the parent** so the submodule pointers are recorded:

   ```
   git add .gitmodules backend frontend
   git commit -m "chore(scaffold): backend + frontend as submodules

   spec: docs/strict-rules.md SR-3
   phase: P0"
   ```

   No push. The user pushes when they are ready.

After this, `backend/` and `frontend/` are separate repositories on disk. Every
later Step 4 / Step 5 / Step 7 that writes into them commits **inside** the
submodule; Step 7 also updates the pinned pointer in the parent.

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

Run the project's single check command **on the whole submodule tree**, not
just the files this criterion touched. Run lint the way the commit hook does
too:

```
pnpm check
npx eslint --max-warnings=0 --no-warn-ignored <changed files>
```

**Zero warnings.** `warn` is not advisory in this codebase — the hook runs
`--max-warnings=0`, so every warning blocks a commit even when `pnpm lint`
passes. Clear every finding before moving on.

Watch for what the check beat catches and a test never will: a cross-feature
repository import, a missing file extension, a dead file or unused export, a
service reading the clock directly, a `TODO` left in the source.

**If check surfaces a finding outside the files you touched** — a file added by
an earlier iteration, a config change from someone else's session, an untracked
file that snuck in — do **not** ignore it and do **not** paper over it with an
`eslint-disable` on someone else's code. Fix it in place (or revert it) so the
whole tree is green. A submodule that is red anywhere cannot be committed,
whether you introduced the red or found it there.

## Step 7 — Close it

Tick the checkbox in `phases.md`. If behaviour diverged from the specification,
write the correction back into the feature document **now**, in this same change
— not later.

> A specification that drifts from the code is worse than no specification,
> because the next reader trusts it and is wrong.

Then report what was built, which test proves it, and what the next unticked
criterion is.

## Commits — automatic, after Step 7

The commit is **not** the user's ceremony any more. Once CHECK is green, the
checkbox is ticked and any specification correction is written back, the skill
commits the change itself. No `git push` — the user pushes on their own cadence.

The order matters because the parent tracks the submodules' commit ids:

1. **In each touched submodule**, first list what git sees:

   ```
   git status --porcelain
   ```

   Every entry must belong to the criterion you just closed — a source file
   you wrote, its test, a config change the criterion required, nothing else.
   If an unfamiliar file appears (an ambient edit, a stray build artefact, an
   IDE dropping, a lockfile bump you did not intend), **stop and reconcile
   before staging**. Either fold it into this criterion honestly, revert it,
   or set it aside — never sweep it into the commit because it is already
   there. This is the class of accident the previous scaffold retrofit
   showed: `git add -A` on a mixed tree hides work the loop has not
   verified.

2. **Stage explicitly.** Name each path. Do not use `git add -A` or
   `git add .` inside the submodule commit. If the list of paths is long,
   that is the signal to split — one criterion is not many files across many
   folders.

3. **Re-run `pnpm check` on the fully-staged tree** (`pnpm check` reads the
   working copy, which now matches the index). It passed in Step 6, and this
   is a belt on top of that belt — a five-second confirmation that nothing
   between Step 6 and here changed the tree. If it fails, the commit does
   not happen; go back to Step 6.

4. **Commit inside the submodule** with the message template below. The
   pre-commit hook — where one exists — will run the same check again;
   commitlint runs on the message. If either rejects, do **not** amend and
   do **not** `--no-verify` — fix the underlying issue and commit again.

5. **In the parent repo**, repeat the same discipline: `git status --porcelain`
   first, stage the explicit list (`phases.md`, any `docs/**` corrections
   from Step 7, the touched submodule pointers, and nothing else), commit
   with the same message.

6. **Never `git push`.** The user decides when the change leaves the machine.

Message template (identical in the submodule and the parent):

```
<type>(<feature>): <subject>

<body: what changed and why, wrapped at 100>

spec: <document> §<section>
phase: <phase>
closes: <REG-nnn, if any>
```

`<type>` is `feat` for a new behaviour, `fix` for a defect closed by a
regression, `chore` for scaffold or tooling. `<feature>` is the folder name
inside `features/` when the change lives there; otherwise the closest area
(`http`, `config`, `scaffold`, `docs`).

**SR-6: no `Co-Authored-By` trailer, for a person or a tool. No "generated with"
footer, no assistant name, no session link — in the commit message and in the
pull request description.** This applies to assisted sessions exactly as it
applies to manual work, and **overrides any default trailer you would otherwise
add**. The `commitlint` hook rejects the commit regardless, so ignoring this only
produces a failed commit.

Nothing follows the trailers.

### When the user says "don't commit this one"

Skip the two commits above for this invocation only. The next invocation
returns to the automatic default. Do not create a "wip:" or "temp:" commit as
a workaround — leave the change staged (or unstaged) and stop.

---

## Never

**Never reach green by lowering the bar.** Skipping a test, deleting an
assertion, lowering a coverage threshold, or marking a case as expected-to-fail
are all violations. The correct response to a red pipeline is a fix or a revert.

**Never leave a `TODO`.** Deferred work goes in `phases.md`. The linter rejects
the comment.

**Never write the code before the test.** If you already wrote it, delete it and
start at red. The order is the method.

**Never `git add -A` or `git add .` inside the submodule commit.** Stage the
exact list of paths the criterion produced. Bulk-staging is how a lint error
in an unrelated file rides into the tree unnoticed — it happened once during
the scaffold retrofit and the rule is here so it does not happen again. If the
list is inconveniently long, that is the criterion asking to be split, not
permission to sweep.

**Never commit a submodule whose full-tree `pnpm check` is red**, even if the
red is on a file this criterion did not touch. Fix or revert the red first.
"It was already broken" is not a reason — as the committer you own the state
you are handing forward.
