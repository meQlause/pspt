---
name: build-long
description: Run the /pspt:build loop repeatedly until the user says stop. Each iteration takes ONE exit criterion through red → green → clean → check → commit, then picks the next unticked criterion of the earliest incomplete phase and does it again. Use for "keep building", "build until done", "build until I stop you", or when you want an unattended sweep of the outstanding phase work.
---

# The long build loop

`/pspt:build` moves one exit criterion. `/pspt:build-long` moves as many in a
row as it can, stopping only when the user says so, when there is nothing left,
or when the loop cannot make progress.

The unit of work is still **one exit criterion per iteration.** The loop wraps
the iterations; it never merges two criteria into one.

---

## What one iteration does

Each iteration is the whole `/pspt:build` skill — every step, in order, no
short-cuts:

1. **Step 0** — ensure the scaffold. On the very first iteration this creates
   the two submodules if they are missing; on every later iteration it is a
   fast no-op (the `.gitmodules` check returns immediately).
2. **Step 1** — pick the first unticked exit criterion of the earliest
   incomplete phase. Print it verbatim.
3. **Steps 2–6** — anchor, RED, GREEN, CLEAN, CHECK. Same rules as
   `/pspt:build`. **Never lower the bar** (no skipped tests, no weakened
   assertions, no `--no-verify`).
4. **Step 7** — tick the checkbox in `phases.md`, write any specification
   correction back, and commit — inside the touched submodule first, then in
   the parent so the pointer moves in the same change. No push.

## Between iterations

Print a one-line status: how many criteria are done in the current phase,
how many remain, and what the next criterion is. Then start the next
iteration.

If the criterion that just completed was the **last** one in its phase, print
a phase-completion line (`P<n> complete: <k>/<k> criteria ticked`) and roll
into the first criterion of the next phase.

## When to stop the loop

The loop ends — and the skill returns control to the user — when any of the
following is true:

- The user says **stop**, or interrupts (Ctrl+C, `TaskStop`, a new message
  that isn't "continue"). The last completed iteration stays committed; the
  in-flight one is discarded (unstaged if it hadn't reached Step 7).
- **All phases are ticked.** Print a final summary and stop.
- The next criterion **cannot be started**: it depends on an open decision in
  `phases.md` §0, it depends on an earlier phase that is not complete, or its
  anchor points nowhere. Do not guess — stop and tell the user what needs to
  be sharpened before the loop can continue.
- An iteration **cannot reach green**: a test genuinely disagrees with the
  specification, the environment is missing something (a database, a browser,
  a service), or the check command is red for a reason the loop cannot fix
  without a decision. Do not push through by lowering the bar. Report which
  criterion blocked and why, and stop.
- The **same criterion fails twice in a row**. One retry after a fix is fine;
  a second failure of the same criterion is a signal the fix is off, not that
  a third attempt will land. Stop and report.

The loop **does not stop** on a lint warning, a formatting nit, or a flaky
network — those are for the current iteration to fix inside Step 6, not for
the loop to give up on.

## Progress the user can see

Before each iteration starts, print one line naming the phase, the criterion
number within the phase, and the criterion text (trimmed). Example:

```
▶ P1 · 3/11 · "pricing.rules.ts quote(180000.00, 2, 11.00) returns …"
```

After each iteration finishes, print one line naming the outcome:

```
✓ P1 · 3/11 done — tests/unit/features/bookings/pricing/pricing.rules.test.ts green; committed backend@a1b2c3d
```

That is the whole between-iteration output. The detail of the iteration
itself is whatever the underlying `/pspt:build` steps produced.

## Never

- **Never batch two criteria into one iteration** to "save a commit". One
  criterion, one commit inside its submodule, one pointer move in the parent.
- **Never skip Step 0's check** on the assumption that the scaffold is
  already there. The check is cheap; a wrong assumption is expensive.
- **Never push.** Same as `/pspt:build`. The user pushes on their own cadence
  after the loop stops.
- **Never keep going after a blocking failure.** A criterion that cannot land
  green without a decision is the loop's stop condition, not something to
  work around.
- **Never bulk-stage between iterations.** Each iteration commits its own
  explicit path list per the `/pspt:build` Commits section; the loop must not
  batch several iterations into one `git add -A`. If a previous iteration
  left something uncommitted, stop and reconcile before the next iteration
  starts — do not fold it silently into the next criterion's commit.
- **Never commit a submodule whose full-tree `pnpm check` is red.** Same rule
  as `/pspt:build`. Applies at every iteration, no exceptions for "we'll fix
  it in the next criterion".
- **Never assume "stop" means "revert".** When the user stops the loop, the
  work committed by earlier iterations stays. Only the unfinished iteration
  is discarded.
