---
name: ticket
description: Plan one change conversationally before any code — ask what the user wants, dig one or two questions at a time while reading the code to check each idea is possible, until every question is settled and the user says "ready". Then write tickets/<slug>/request.md (summary, scope, checkable acceptance criteria), plan.md (current state, affected and at-risk files, test cases written before code, traceability check) and phase.md (additive → wire-in → docs), stop for approval, implement phase by phase, record every test result and close out. Use for "/pspt:ticket <name> <request>", "ticket this", "plan this change before touching code", or to resume an existing ticket with "/pspt:ticket <name>".
---

# The ticket

`/pspt:spec` writes what must be true. `/pspt:enhance` grows it. `/pspt:build`
takes one exit criterion from red to green. `/pspt:ticket` is the unit a person
actually asks for — "rename the booking reference", "add an offline banner",
"make cancellation idempotent" — talked through against the real code, written
down, planned with its tests **before** any code, approved, and then built in
small verifiable phases.

The shape is a conversation first, like `/pspt:enhance`, and documents second.
Ask, look at the code, ask again, until nothing is open. Then write — request,
then plan, then phase, in that order.

```
conversation  →  request.md  →  plan.md  →  phase.md  →  approval  →  build  →  close
 (questions      what is asked,  what the      the order     ← stop      phase by
  + code)        scope, ACs      code needs    it lands in               phase
```

Three files, one folder:

```
tickets/<slug>/
  request.md   what is asked, why, scope, acceptance criteria, decisions made
  plan.md      what the code looks like now, what changes, what proves it
  phase.md     the order the change lands in, and when each step is done
```

Read `references/conventions.md` and `references/house-style.md` before writing
any of the three. Tickets live in the working directory's `tickets/`, beside
`docs/`, never inside the `backend/` or `frontend/` submodules — one place to
grep, same rule as the specification.

---

## Step 0 — Resolve the ticket

`/pspt:ticket <name> <request>` — `<name>` is the first token, everything after
it is the request, and the request is the conversation's anchor.

**Slug:** lowercase `<name>`, spaces and underscores to `-`, strip anything
outside `[a-z0-9-]`, collapse repeated `-`. `Booking Ref v2` → `booking-ref-v2`.

| `tickets/<slug>/` | Request given | Do |
|---|---|---|
| Absent | Yes | Step 1, with the request as the anchor |
| Absent | No | Step 1, and open by asking for it |
| Present | Yes | **Refuse.** Print the existing ticket's status line and ask for another name, or `/pspt:ticket <name>` to resume it |
| Present | No | Resume — read `request.md`'s `**Status:**` and continue from the matching step below |

> **Never overwrite an existing ticket.** Its files are the record of what was
> agreed and what was proven. A second request under the same name is a second
> ticket, not a rewrite of the first.

Nothing is written to disk during the conversation. The folder is created in
Step 4, when the user has said ready. A conversation abandoned before then
leaves nothing behind.

The status line, kept current in all three files:

| Status | Means | Resumes at |
|---|---|---|
| `planned` | Request, plan and phases written, waiting for approval | Step 6 |
| `approved` | User approved; no phase started | Step 7 |
| `in progress · P<n>` | Phase `<n>` is the current phase | Step 7, phase `<n>` |
| `blocked · <reason>` | Stopped on an unplanned file or a red test | Step 7, after the user answers |
| `done` | Closed out, every AC ticked | Nothing to do — print the report |

## Step 1 — Open the conversation

If the request came with the command, restate it in one sentence and ask the
first thing it leaves open. If it did not, start with one line and wait:

> **What would you like to ticket?**

Do not open with a numbered survey — the user has one thing in mind and a list
buries it. Every question after the first is a follow-up on that anchor. If the
anchor is vague ("clean up bookings", "make it faster"), ask what specifically
they mean, in one plain sentence, before reading anything.

## Step 2 — Dig, and read the code while you do

Keep it conversational — one or two questions per turn, in the user's own
words, the way `/pspt:enhance` §2 does. The difference is that **every turn is
also a look at the code.** Before you ask, read what the answer depends on, so
the question you put to the user is one the code cannot answer for you.

Per turn:

1. **Look first.** Find the route, component, rule, schema or test the current
   topic touches. Read it whole, not a grep excerpt. Note `path:line`.
2. **Settle what the code settles.** If the code already answers the question —
   the field exists, the reference is already 8 characters, the endpoint is
   already owner-only — do not ask it. Say what you found, with `path:line`,
   and move on.
3. **Say what is possible.** If the idea fits the code as it is, say so in one
   line. If it does not — the column is referenced by three tables, the rule
   reads the clock directly, the component is shared by two screens — say
   exactly what is in the way and offer the real options, each with its cost.
   Use `AskUserQuestion` when there are two or more candidates: the trade-off
   and the trap, never an open "what do you want?".
4. **Ask what only the user knows** — intent, priority, the number that matters
   and why, what is deliberately out of scope.
5. **Restate the current shape** in one short paragraph, so a misread is
   caught now, not in `plan.md`.

Before you ask "ready?", you need all of these, each backed either by the
user's answer or by code you read:

| Settled | Backed by |
|---|---|
| What changes, for whom, and why | The user |
| Where it lives — the files and features involved | Code, `path:line` |
| That it is possible as the code stands, or what must move first | Code |
| Edge cases — the boundary, the empty input, the concurrent call, the other user's record | Code and the user |
| What is out of scope | The user |
| Who else depends on what changes — importers, shared components, mirrored tests | Code, found by searching importers (conventions §8 for test paths) |
| The observable outcome of each acceptance criterion | The user, sharpened until a test can be written against it |
| Whether the specification itself must change | `docs/`, and `/pspt:trace` in impact mode when it exists — use its output, do not re-derive it |

**Route spec changes first.** If the conversation shows the specification itself
must change — a new FR, a new column, a new error code, a tighter guarantee —
the ticket is not the place to decide it. Say which skill owns it and pause:

| The ticket needs | Run first |
|---|---|
| A new or changed requirement, column, contract or screen state | `/pspt:enhance` |
| A new error code | `/pspt:code` |
| A numbered regression for a defect this ticket closes | `/pspt:reg` |

Then resume with the resulting id. The ticket implements the spec; it never
quietly becomes it.

**Run the existing suites once** during the conversation and say what is already
red. A red test you inherit is raised now, as a question, not discovered in
Phase 2 and blamed on the ticket.

> The conversation is where every question gets answered, so the documents
> contain none. A question left open until planning is a guess in `plan.md`.

## Step 3 — Ready?

When every row above is settled, ask once:

> **Ready to write the ticket?**

Yes / done / go → Step 4. Another detail or a new anchor → keep digging. It is a
check-in, not a gate that forces the user to answer now.

## Step 4 — `request.md`

Create `tickets/<slug>/` (re-check it does not exist — refuse if it now does)
and write the request from the conversation. Everything in it was said or
confirmed in Steps 1–3; nothing new is introduced here.

```markdown
# <Name> — Request

**Ticket:** `<slug>` · **Status:** planned · **Opened:** <ISO date>

## 1. Summary

<one paragraph, the request in plain words — what changes for whom>

## 2. Why

<the problem this solves, and what happens if it is not done. Name the FR-nnn,
NFR-nnn, REG-nnn or E-code it touches when a pspt spec exists>

## 3. Scope

| In scope | Out of scope |
|---|---|
| <each thing this ticket changes> | <each adjacent thing it deliberately does not, with the reason> |

> Out of scope is written down so it stops coming back as "while you're in there".

## 4. Acceptance criteria

- [ ] **AC1** — <observable, checkable statement: an input, an action, an outcome>
- [ ] **AC2** — …

## 5. Decisions

What the conversation settled, and what settled it.

| # | Question | Answer | Settled by |
|---|---|---|---|
| D1 | Is the reference shown anywhere but the confirmation screen? | Also on the e-mail receipt | user |
| D2 | Does anything parse the reference's format? | No — only compared for equality | code, `backend/src/features/bookings/bookings.repository.ts:41` |
```

**Acceptance criteria follow the `phases.md` bar** in
`references/stages/s6-phases.md` §Writing exit criteria: each names an input and
an observable outcome, and a test can be written against it. "Works
correctly", "is fast", "looks right" are goals — they should have been sharpened
in Step 2; if one slipped through, go back and ask.

| Good | Bad |
|---|---|
| **AC1** — `GET /bookings/:id` for another user's booking returns `404` with no reference in the body | Authorisation is enforced |
| **AC2** — A reference is 8 characters from `A-Z2-9`, and two bookings created in the same millisecond get different references | References are unique |
| **AC3** — With the network off, the review screen shows the offline banner within 1 s and disables **Confirm** | Handles offline |

Every edge case settled in the conversation is its own AC, not a footnote.
**§5 has no unanswered row** — an open question means Step 3 was premature.

## Step 5 — `plan.md`, then `phase.md`

Written straight after `request.md`, from what the conversation read. The code
was already looked at in Step 2; this step completes that reading — every file
the change touches, every importer of those files, every mirrored test — and
writes it down with `path:line`. If completing it raises a question the
conversation did not settle, **do not write the question into the plan**: go
back to Step 2, ask it, record the answer in `request.md` §5, then continue.

### `plan.md`

```markdown
# <Name> — Plan

**Ticket:** `<slug>` · **Status:** planned · Request: [`request.md`](./request.md)

## 1. Current state

<what the code does today, each statement with its evidence>

- Reference generation: `backend/src/features/bookings/bookings.service.ts:88` calls `randomUUID().slice(0, 8)`
- …

## 2. Affected files

| # | File | Change | Exact edit | AC |
|---|---|---|---|---|
| F1 | `backend/src/features/bookings/reference.rules.ts` | new | `makeReference(bytes: Uint8Array): string` — pure, alphabet `A-Z2-9` | AC2 |
| F2 | `backend/src/features/bookings/bookings.service.ts` | modify | line 88: replace `randomUUID().slice(0, 8)` with `makeReference(this.random.bytes(8))` | AC2 |
| F3 | `backend/src/legacy/ref.ts` | delete | unused after F2; `knip` flags it | AC2 |

## 3. At-risk files

Not edited, but they depend on a file that is.

| # | File | Depends on | Why it could break |
|---|---|---|---|
| A1 | `backend/src/features/bookings/bookings.mapper.ts` | F2 | reads `booking.reference`; length assumption in the DTO |

## 4. Approach

<how the change is made and why this way, including the alternative it beat>

## 5. Risks and rollback

| Risk | Likelihood | Mitigation | Rollback |
|---|---|---|---|

## 6. Test cases

Written before any code. `Result` is empty until the test runs.

| ID | Kind | Covers | Case | Command | Expected | Result |
|---|---|---|---|---|---|---|
| T1 | new | AC2 | 8 bytes → 8 chars, all in `A-Z2-9` | `pnpm vitest run tests/unit/features/bookings/reference.rules.test.ts` | pass | |
| T2 | new | AC2 edge | byte `0xff` maps inside the alphabet, no modulo bias past index 31 | same file | pass | |
| R1 | regression | A1 | mapper returns `reference` unchanged for an 8-char value | `pnpm vitest run tests/unit/features/bookings/bookings.mapper.test.ts` | pass (green before and after) | |
| S1 | static | all | lint, zero warnings | `pnpm exec eslint --max-warnings=0 <changed files>` | exit 0 | |
| S2 | static | all | format | `pnpm exec prettier --check <changed files>` | exit 0 | |
| S3 | static | all | whole-tree check | `pnpm check` | exit 0 | |

## 7. Traceability check

- [ ] Every AC has at least one T
- [ ] Every T covers an AC
- [ ] Every affected file (F) serves at least one AC
- [ ] Every at-risk file (A) has at least one R
- [ ] Every AC's edge cases from `request.md` §5 have their own T
- [ ] Every command runs from the directory it names, today, before any code
```

Rules for the tables:

**`Exact edit` is exact.** A function signature, a line and what replaces it, a
column and its type. "Update the service" is not an edit; a reviewer must be
able to hold the row against the diff and see they agree.

**`delete` needs its dependants empty.** A file is deleted only when §3 shows
nothing still imports it, or every importer is itself an F row.

**T — new behaviour.** At least one per AC, plus one per edge case the answers
in `request.md` §5 revealed — the boundary, the empty input, the concurrent
call, the other user's record. The level follows `/pspt:build` Step 3's table;
the path mirrors the source (conventions §8).

**R — regression.** At least one per at-risk file. Prefer an existing test at
the mirrored path; if none exists, the R row is a new characterisation test of
the file's **current** behaviour, written and green in Phase 1 before any edit
to what it depends on. These are this ticket's safety net, not the numbered
register — a defect this ticket closes gets a `REG-nnn` from `/pspt:reg` and its
own T row naming the id.

**S — static.** Lint with `--max-warnings=0` the way the commit hook runs it,
format check, and the whole-tree check command. Always the last three rows.

> The test table is written before the code for the same reason `/pspt:build`
> writes the test first: a test designed after the code tests the code, not the
> request.

### `phase.md`

```markdown
# <Name> — Phases

**Ticket:** `<slug>` · **Status:** planned · Plan: [`plan.md`](./plan.md)

## P1 — Additive

Nothing existing calls the new code yet. The tree behaves exactly as before.

**Files:** F1, tests for T1–T2, R1 (characterisation, if new)

- [ ] Write T1, T2 — watch them fail for the right reason
- [ ] Write R1 against current behaviour — green
- [ ] Implement F1 — T1, T2 green

**Verified by:** T1, T2, R1, S1–S3
**Done when:** every listed test is green and `pnpm check` is clean, with no existing file edited

## P2 — Wire-in

The smallest edit to existing code that connects P1.

**Files:** F2, F3

- [ ] F2: line 88 swap
- [ ] F3: delete

**Verified by:** T1, T2, R1, S1–S3
**Done when:** …

## P3 — Docs and full re-run

**Files:** spec corrections, README, code docs

- [ ] Write back any behaviour that diverged from `docs/` (as `/pspt:build` Step 7)
- [ ] Re-run every T, R and S row in `plan.md` §6

**Verified by:** all
**Done when:** every `Result` in `plan.md` §6 reads pass on this commit
```

Ordering rules:

| Rule | Reason |
|---|---|
| **Additive first** — new files, new functions, new tests, characterisation tests | Everything new is proven in isolation while the tree still behaves exactly as before; a failure here cannot be a regression |
| **Minimal wire-in second** — only the edits to existing files that connect the new code | The phase that can break something is also the smallest, so a red R test points at a handful of lines |
| **Docs last** — spec write-back, README, code docs | Documentation describes what was built, not what was planned |
| **The last phase re-runs every test** in `plan.md` §6 | A test that passed in P1 and was never run again proves nothing about the tree that ships |
| Split a phase that lists more than one feature folder | One phase, one area, one reviewable diff |

Every phase lists its files (by F id), its tasks as checkboxes, the test ids that
verify it, and a done-when a reviewer can check without asking.

## Step 6 — Stop for approval

All three files carry status `planned`. Commit them (see Commits), and print:

```
Ticket booking-ref-v2 planned.  3 ACs · 3 files (1 new, 1 modify, 1 delete) · 1 at risk · 6 tests · 3 phases.  Committed: 7c1e0a2.

Read tickets/booking-ref-v2/plan.md and phase.md. Say "approve" to start P1, or tell me what to change.
```

Then **stop.** No code, no test file, no branch, no scaffold before the user
approves. An answer that changes the plan is written into the three files and
re-committed, then the gate is asked again. On approval, status → `approved`.

> The plan is the cheapest place the change will ever be wrong. Every line of
> code written before approval is a line the user did not agree to.

## Step 7 — Implement, phase by phase

Before P1, run every R row once and record the baseline in `Result`
(`pass · baseline`). An R that is red before any edit is not this ticket's to
fix silently — stop and report it.

For each phase, in order:

1. Status → `in progress · P<n>`.
2. Do the tasks in order. Any T test goes **red first, for the right reason**,
   then green — `/pspt:build` Steps 3–6 are the method, applied per test; the
   architecture rules there (`*.rules.ts` purity, domain errors, schema-owned
   field rules) apply unchanged.
3. Run every test the phase lists under **Verified by**, plus every R row.
   Write each outcome into `plan.md` §6 `Result` — `pass · P<n> · <short sha>`
   or `fail · P<n> · <one-line reason>`.
4. Tick the phase's tasks in `phase.md` when its done-when holds.
5. Commit (see Commits) and print one line:

   ```
   ✓ P2 wire-in — T1 T2 R1 S1–S3 green; committed backend@4f2d9e1, parent@9ab31c0. Next: P3 docs.
   ```

### Unplanned file

The moment a file not in `plan.md` §2 needs to change — or a file not in §3
turns out to depend on an edited one — **stop before editing it**:

1. Add it to `plan.md` §2 (or §3) with the next F (or A) id, the exact edit, the
   AC it serves, and `added in P<n>` in the Change column.
2. Add a test for it to §6 — a T if it serves an AC, an R if it is at risk.
3. Add it to the current phase in `phase.md`.
4. Status → `blocked · unplanned <path>`, tell the user what was found and why,
   and wait for "go" before continuing.

> An unplanned file is the plan being wrong in a way that matters. Recording it
> and asking costs one message; editing it silently makes `plan.md` a
> description of a different change.

### Red test

**Never proceed to the next task, the next phase or the commit while any listed
test is red.** Fix the code, or revert the task. If the test itself is wrong —
it disagrees with an AC, or with the spec — that is a plan change: say so,
propose the corrected row, and wait. Status → `blocked · <test id> red`.

## Step 8 — Close out

After the last phase:

1. Run **every** T, R and S row in `plan.md` §6 on the final tree. Write each
   `Result`. Every row must read `pass`.
2. Tick every AC in `request.md` §4 whose T rows all pass. An AC that cannot be
   ticked means the ticket is not done — go back to Step 7, do not close.
3. Tick every box in `plan.md` §7.
4. Status → `done` in all three files. Commit.
5. Report:

   ```
   Ticket booking-ref-v2 done.

     AC1 ✓  T1        AC2 ✓  T2 T3        AC3 ✓  T4
     files  3 planned, 1 added in P2 (bookings.mapper.ts)
     tests  4 T · 2 R · 3 S — all pass on parent@b81e44d
     spec   docs/BE/features/bookings.md §1 corrected (reference format)

   Next: /pspt:trace FR-014 to confirm the chain, then push when ready.
   ```

## Commits — automatic

Same discipline as `/pspt:build`'s Commits section: `git status --porcelain`
first, stage explicit paths (never `git add -A` or `git add .`), commit inside
each touched submodule first, then the parent so the pointer moves in the same
change. A submodule whose whole-tree check is red is never committed. No
`git push`.

Commits land at three moments:

| Moment | Where | Paths |
|---|---|---|
| Ticket written (Step 6), and each re-plan | parent | `tickets/<slug>/request.md`, `plan.md`, `phase.md` |
| Each phase done (Step 7) | submodule(s), then parent | the phase's F files and tests; then the ticket files, any `docs/` write-back, the submodule pointers |
| Close-out (Step 8) | parent | the three ticket files |

Message template:

```
<type>(<area>): <subject>

<body: what this commit changes and why, wrapped at 100>

ticket: <slug>
phase: P<n> | plan | close
spec: <document> §<section>, if any
closes: <REG-nnn, if any>
```

`<type>` is `docs` for the plan and close-out commits, `feat` for new behaviour,
`fix` for a defect, `refactor` for a phase with no behaviour change, `chore` for
tooling. `<area>` is the feature folder, or `ticket` for plan and close-out.

**SR-6: no `Co-Authored-By` trailer**, no tool attribution, no "generated with"
footer, in the commit message and in the pull request description. The
`commitlint` hook rejects it regardless.

### When the user says "don't commit this one"

Skip the commit for this step only. The next step commits automatically again.
Do not create a "wip:" or "temp:" commit as a workaround — leave the change
staged (or unstaged) and stop.

---

## Never

- **Never overwrite an existing ticket.** Refuse and ask for another name, or
  resume it.
- **Never write a ticket file before the user says ready.** The conversation
  leaves nothing on disk until Step 4.
- **Never ask the user what the code can answer.** Read it, say what it shows
  with `path:line`, and ask only what the code cannot know.
- **Never leave a question in a document.** `request.md` §5 holds decisions,
  not open items; a new question goes back to the conversation.
- **Never touch code before approval.** Not a test file, not a scaffold, not a
  "quick look" edit.
- **Never plan from memory.** Every §1 statement has a `path:line`; every
  at-risk file was found by searching for importers, not assumed.
- **Never edit an unplanned file silently.** Stop, record it with a test, tell
  the user.
- **Never proceed on a red test, and never weaken one to reach green** — no
  skip, no deleted assertion, no loosened expected value, no `--no-verify`.
  SR-5 applies to a ticket exactly as to a phase.
- **Never change the specification from a ticket.** A new requirement, column,
  contract or error code goes through `/pspt:enhance`, `/pspt:code` or
  `/pspt:reg` first; the ticket cites the id. Correcting `docs/` to match what
  was built is `/pspt:build` Step 7's write-back, and nothing more.
- **Never write to `docs/phases.md`.** That file is S6's plan and
  `/pspt:build`'s checklist; a ticket keeps its own phases in its own folder.
- **Never close with an unticked AC** or an empty `Result`.
