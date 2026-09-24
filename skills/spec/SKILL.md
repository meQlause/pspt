---
name: spec
description: Derive the engineering specification set — data spec and ERD, architecture, stack, endpoint contracts, error registry, testing strategy, phased plan — from requirement documents plus a static HTML mockup. Runs one stage per invocation with a checkpoint between each. Use when the user has a BRD/PRD/SRS and a mockup and wants the SDD document set generated, or says "generate the spec", "write the data spec", "spec this out".
---

# Generate the specification set

Requirements plus a mockup go in; the engineering document set comes out. You do
**not** invent requirements and you do **not** invent screens. Everything you
write traces to something the user already wrote.

Read `references/conventions.md` and `references/house-style.md` before writing
any document. They are fixed and not negotiable per project.

If the user passed an argument (`data`, `decisions`, `be`, `fe`, `phases`), skip
to that stage and regenerate it. Otherwise run the gates, then the first
incomplete stage.

---

## Step 1 — Discover and classify

Glob the working directory for markdown and for the mockup. **Classify by
content, not by filename** — the user's naming is their own.

| Role | Recognised by |
|---|---|
| BRD | Business objectives, stakeholders, success metrics, commercial scope |
| PRD | Users or personas, features, user flows, priorities, product scope |
| SRS | Numbered requirements, functional and non-functional, acceptance criteria |
| Mockup | `.html` files with real markup, plus their CSS and JS |

Ignore this plugin's own reference files, `README.md`, and anything under
`node_modules/` or `docs/` that you generated on a previous run.

Print what you found and what role you assigned it, so a misclassification is
visible immediately.

## Step 2 — Gate 1, completeness

All four must be present. If any is missing, **stop**. Name exactly what is
missing and what it needs to contain. Do not offer to generate it, do not
proceed with a warning, do not generate a partial document set.

> A data specification written without a screen is imagined rather than derived,
> which is the single failure this whole method exists to prevent.

## Step 3 — Gate 2, two-way consistency

Build the mapping in both directions before writing anything.

**Forward** — every *functional* requirement must be realised by something in the
mockup: a rendered value, a control, a state, or a screen.

**Backward** — every rendered value, interactive control and designed state in
the mockup must be covered by a requirement.

Non-functional requirements are **exempt from the forward check** — a latency
budget or a security rule has no screen and never will. Carry them forward
instead: budgets into the frontend stack document, operational constraints into
the phase plan and the definition of done.

Decorative markup is exempt from the backward check. Values, controls and states
are not.

If anything is unmatched in either direction, **stop and print the gap list**:

```
BLOCKED — 3 gaps between requirements and mockup

  FR-031  "user pays by QRIS"            no screen renders it
  FR-044  "admin exports monthly CSV"    no screen renders it
  booking-review.html?state=window       no requirement covers this state
```

Say plainly that each gap is one of three things — a missing screen, an
out-of-scope requirement, or an undocumented feature — and that all three are
resolved in the source documents, not here. Generate nothing.

## Step 4 — Detect the stage

Read `docs/.pspt.json` if it exists. Otherwise infer from what is in `docs/`.

| Stage | Complete when these exist |
|---|---|
| S2 | `data-spec.md` |
| S3 | `strict-rules.md`, `error-handling.md`, `BE/be-architecture.md`, `BE/be-stack.md`, `FE/fe-architecture.md`, `FE/fe-stack.md` |
| S4 | `BE/features/README.md`, at least one `BE/features/*.md`, `BE/testing.md` |
| S5 | `FE/design-system.md`, at least one `FE/features/*.md` |
| S6 | `phases.md` |

Run **the first incomplete stage only**.

## Step 5 — Run one stage

Read the matching guide and follow it:

| Stage | Guide |
|---|---|
| S2 | `references/stages/s2-data-spec.md` |
| S3 | `references/stages/s3-decisions.md` |
| S4 | `references/stages/s4-backend.md` |
| S5 | `references/stages/s5-frontend.md` |
| S6 | `references/stages/s6-phases.md` |

Each guide lists the required sections, the decisions to ask, and the exit
criteria. Ask every decision the guide names with `AskUserQuestion`, presenting
two or more real candidates with the trade-off and the trap. **Ask for
trade-offs, not for an answer** — never an open "what do you want?".

Carry the user's requirement ids through. An SRS `FR-nnn` appears in the
extraction table row, in the feature document field table, and in the phase exit
criterion. That chain is what makes `/pspt:trace` work later.

### Where documents are written

Default: `./docs/`, using this layout.

```
docs/
  strict-rules.md  data-spec.md  error-handling.md  phases.md     ← shared
  BE/  be-architecture.md  be-stack.md  testing.md  features/*.md
  FE/  fe-architecture.md  fe-stack.md  design-system.md  features/*.md
```

At S3, ask for the backend and frontend repository paths. If given, write each
side's documents into `<repo>/docs/` and the four shared files into **both**, and
record the paths in `docs/.pspt.json`. If the user leaves them blank, keep
everything in `./docs/`.

Also at S3, copy the governing lint file from `references/lint/` into the
matching repo so it travels with the project.

### State file

After each stage, write `docs/.pspt.json`:

```json
{
  "version": 1,
  "stages": { "s2": "<ISO date>", "s3": null, "s4": null, "s5": null, "s6": null },
  "stack": { "database": "...", "backend": "...", "orm": "...", "di": "...",
             "frontend": "...", "routing": "...", "serverState": "...", "validation": "..." },
  "repos": { "backend": null, "frontend": null },
  "noLinter": { "backend": null, "frontend": null }
}
```

It records **answers**, never content. The documents remain the authority
for everything they contain.

`noLinter.backend` / `noLinter.frontend` are `null` when the framework is
supported (Express, NestJS, React + Vite, Next.js — each has a governing
lint file in `references/lint/`). When the user opts into an unsupported
framework after the warning in S3, record the framework name here so
`/pspt:build` and `/pspt:enhance` can surface a reminder each time they
run that the commit-hook zero-warnings guarantee is off for that side.

## Step 6 — Stop

After one stage, stop. Report in three lines:

```
S2 complete.  docs/data-spec.md  — 6 tables, 1 exclusion constraint, 17 extraction rows

Read it and change anything you disagree with; it is the input to every stage after this.
Next: /pspt:spec  → S3, shared decisions (framework, ORM, error registry)
```

Do not continue into the next stage, even if it seems obvious. The checkpoint is
the point: nothing moves right until the artifact on the left has been read.

---

## Rules

**Never invent to fill a gap.** If the inputs do not say, ask. If asking is not
possible, stop. A guessed column is indistinguishable from a real one three
weeks later.

**Realistic values everywhere.** Response examples use real locale, real
currency, real long names, and figures that match the mockup exactly. A reviewer
must be able to hold the document next to the screen and see that they agree.

**Every computed figure is checked against the mockup.** If the specification and
the screen disagree on a number, say so and stop — that disagreement is a defect
in one of them, and this is the cheapest moment it will ever be found.

**Re-run gates every invocation.** They are fast, and they catch a mockup edited
after S2.
