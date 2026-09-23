# pspt

A Claude Code plugin for spec-driven development.

You write the requirements and draw the screens. `pspt` derives the engineering
specification set from them — data model, architecture, endpoint contracts, error
registry, testing strategy, phased plan — then drives the build loop against it.

```
brd.md · prd.md · srs.md · mockup/*.html      →      the whole engineering doc set
```

---

## Why

Hand an assistant a vague request and it invents a data model. Hand it the whole
repository and the answer is accurate, expensive, and drifts toward describing
the past instead of the target.

Hand it **one screen plus one specification file** and the answer is specific,
bounded, and directly reviewable against the screen.

That is the whole argument. A screen is the only honest statement of what data a
product actually needs — reading a summary card tells you a transaction carries a
unit price, a duration, a subtotal, a tax amount and a total. That one card
produces five columns, a constraint and a rounding rule. Starting from an
imagined ERD produces tables nobody renders.

## Install

```
/plugin marketplace add meQlause/pspt
/plugin install pspt@pspt
```

## Use

```
/pspt:status      where the project stands, what runs next
/pspt:spec        derive the next stage of the specification set
/pspt:build       take one phase exit criterion through red → green → clean → check
/pspt:trace       walk requirement → screen → column → endpoint → test
/pspt:code        add an error code everywhere it must appear, at once
/pspt:reg         reserve a numbered regression and wire its id into the specs
```

## What it requires

Four inputs, and it refuses without them:

| | |
|---|---|
| `brd.md` | why this is being built — objectives, stakeholders, success metrics |
| `prd.md` | what the product does — users, features, flows, scope |
| `srs.md` | what must be true — numbered requirements, functional and non-functional |
| `mockup/` | static HTML, CSS and vanilla JS, with **every state drawn** |

Found by content, not by filename, so your naming is your own.

It also blocks if the requirements and the mockup disagree — a functional
requirement no screen realises, or a screen state no requirement covers. Each gap
is a missing screen, an out-of-scope requirement, or an undocumented feature, and
all three are cheap to fix now and expensive to fix after six tables and ten
endpoints exist.

So it either produces a complete, traceable document set, or it produces a list
of what disagrees. Never a half-spec.

## What it produces

```
docs/
  strict-rules.md   data-spec.md   error-handling.md   phases.md      shared
  BE/  be-architecture.md  be-stack.md  testing.md  features/*.md
  FE/  fe-architecture.md  fe-stack.md  design-system.md  features/*.md
```

One stage per invocation, stopping at each checkpoint. Nothing moves right until
the artifact on the left has been read.

| Stage | Produces |
|---|---|
| S2 | Extraction table, ERD, relationships with delete **and** update rules, the constraints that carry a guarantee |
| S3 | Strict rules, error registry, architecture and stack per side |
| S4 | Endpoint contracts, server-owned fields, error tables, testing strategy, reserved regressions |
| S5 | Design tokens, refactor map, screen specs with acceptance criteria |
| S6 | Two tracks, dependencies, sizes, checkbox exit criteria |

## Fixed, never asked

TypeScript. Feature-based architecture. vitest, Playwright with Chromium, eslint,
prettier, knip, husky, commitlint. And a **pure decision layer** — `*.rules.ts`
files the linter forbids from importing an ORM or a framework, or from touching
`Date`, `fetch` or `Math.random`.

That last one is what makes "every service testable with fakes, no container, no
database, no clock drift" mechanical instead of aspirational. The service
resolves the clock and passes the instant *in*; the rule is a pure function of
its arguments, so every branch is reachable from a test with no fixtures at all.

## Asked per project

Database · backend framework · ORM · DI container · frontend framework · routing
· server state · validation.

Asked in dependency order, and an answer deletes later questions — pick NestJS
and you are not asked about a DI container; pick Next.js and you are not asked
about routing. Each presented as candidates with the trade-off and the trap,
never as an open question.

If the database is not PostgreSQL it says so rather than emitting
`EXCLUDE USING gist` that will not run, and proposes the real alternative.

## Lint rules

`references/lint/` holds one file per stack — Express, NestJS, Next.js, React.
The plugin **selects** the governing file and copies it into your repo. It never
authors lint rules, so there is one source and nothing to drift.

Three of those rules change what a generated document may say:

- `complexity: 8` means field rules are specified as **schema**, never as service branching
- `no-nested-conditional` means code-to-behaviour mappings are specified as a **`const` lookup table**
- `todo-tag` means deferred work lives in `phases.md` — never as a comment

And `warn` is not advisory: the commit hook runs `--max-warnings=0`.

## Credit

Implements the *Rapid Development with SDD + TDD* method. The worked example the
templates are shaped from is a court-booking system in Jakarta: two screens,
roughly 600 lines of static HTML, which produced six tables, one exclusion
constraint, twelve error codes, ten endpoints and eleven phases.

## Licence

MIT
