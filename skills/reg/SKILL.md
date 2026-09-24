---
name: reg
description: Reserve a numbered regression test for a defect and wire its identifier into the register, the feature document beside the behaviour it protects, and the phase exit criteria. Use for "add a regression", "this bug must never come back", "reserve REG-nnn", or when closing a defect found in review, staging or production.
---

# Regression register

Every defect found in review, in staging or in production closes with a numbered
test. The identifier is written into the specification beside the behaviour it
protects, so the next reader knows the rule was once broken.

A regression test is **never deleted**.

---

## Reserving one

Take the next free number in sequence. Ask for anything you cannot infer: what
went wrong, and what the test must assert to prove it cannot recur.

Write it in four places:

| # | Place | What goes there |
|---|---|---|
| 1 | `BE/testing.md` §4 register | Id · the defect it prevents · level · what it asserts |
| 2 | The test file | `tests/regression/REG-nnn.<short-slug>.test.ts` |
| 3 | The feature document | The id, beside the behaviour it protects |
| 4 | `phases.md` | The exit criterion that phase must satisfy, naming the id |

## Writing the assertion

The register entry states **exactly** what is asserted, in terms an engineer can
implement without asking a follow-up question.

| Good | Bad |
|---|---|
| A body containing `totalAmount` returns `422`, and the stored total is the computed one | Client cannot set the price |
| Two overlapping inserts in parallel produce exactly one `201` and one `409` | No double booking |
| Exactly at the window edge passes; one minute later returns `409`, evaluated in the row's own timezone | Cancellation window works |
| After a price update, the existing row's `unitPrice` and `totalAmount` are unchanged | Price changes are safe |
| Another user's record returns `404`, and the body contains no reference or name | Authorisation works |

Name the boundary. "Near the edge" is not a test; "exactly at the edge passes,
one minute later fails" is.

## Picking the level

| The defect lived in | Level |
|---|---|
| A pure decision — arithmetic, a boundary, interval logic | Unit, against the `*.rules.ts` |
| A service rule that needed a fake | Unit, built with fakes |
| An endpoint contract, a guard, a database constraint, concurrency | Integration |
| A journey across screens | End to end |

A concurrency defect is **always** integration or lower-level — it cannot be
proven with a fake, because the thing being tested is what happens when two real
requests race.

## Reserving before any code exists

Reserve one regression per failure mode the team has already seen in a previous
system, before writing code. That is not speculation — it is a list of defects
that have already happened once, and each becomes a phase exit criterion.

These usually cluster around: a client setting a value the server owns,
concurrency on the load-bearing constraint, a boundary evaluated in the wrong
timezone, a snapshot that moved when its source changed, and an authorisation
check that leaks existence.

## Closing one

When the test goes green, tick its exit criterion in `phases.md` and confirm the
identifier appears in all four places. A regression whose id is only in the
register is invisible to the next person reading the feature document — which is
exactly the reader who needs to know.

## Commit — automatic

Once the id is written into all four places (§Reserving one), commit.
Same discipline as `/pspt:build`'s Commits section: `git status --porcelain`
first, stage the explicit paths (register file, test file, feature doc,
`phases.md`, and — if `docs/.pspt.json` records two repo paths — the
same shared file in the second repo), then commit. No `git push`.

Reservation and closing land as separate commits, because they happen at
different times:

- **Reserving** — before the test can pass:

  ```
  test(regression): reserve REG-<nnn> for <one-line defect summary>

  <body: what the defect looked like, what the assertion will prove.
  Wrapped at 100.>

  id: REG-<nnn>
  places: BE/testing.md, <test file path>, <feature doc>, phases.md
  ```

- **Closing** — when the test goes green and the checkbox is ticked:

  ```
  test(regression): REG-<nnn> green — <what it now protects>

  closes: REG-<nnn>
  ```

If the docs live in submodules, commit inside each affected repo and
move the parent submodule pointer last, per `/pspt:build` §Commits.

**SR-6: no `Co-Authored-By` trailer**, no tool attribution.

### When the user says "don't commit this one"

Skip the commit for this invocation only. Next reservation or closing
commits automatically again.
