# Conventions every generated document must reflect

Fixed across all projects. These are not asked at S3 — they are the shape the
specification is written into. Read this before generating any stage.

---

## 1. Feature anatomy

Group by feature, not by technical role. Everything one feature needs sits in one
folder. Adding a feature means adding a folder; deleting one means deleting a
folder.

```
src/features/<feature>/
  <feature>.routes.ts        paths, guards, validate() calls. No logic
  <feature>.controller.ts    request and response only
  <feature>.rules.ts         ← pure decision logic. No I/O, no clock, no random
  <feature>.service.ts       orchestration, transactions, calls rules
  <feature>.repository.ts    database queries only, accepts an optional tx
  <feature>.schema.ts        request and response schemas
  <feature>.mapper.ts        row to DTO. Decimal becomes string here
  <feature>.errors.ts        feature specific domain errors
  <feature>.container.ts     DI registrations for this feature
  index.ts                   public surface: router, service. Never the repository
```

Sub-features nest as their own folder (`bookings/pricing/`, `courts/availability/`)
and follow the same anatomy.

## 2. The `*.rules.ts` purity boundary

**This is the layer that makes SR-1 mechanical instead of aspirational.** A
`*.rules.ts` file holds pure decision logic and is forbidden by the linter from
importing an ORM, a framework, an HTTP client or `fs`, and from referencing
`Date`, `fetch` or `Math.random`.

| Lives in `*.rules.ts` | Lives in `*.service.ts` |
|---|---|
| Arithmetic — duration, subtotal, tax, total | Resolving the clock and calling `now()` |
| Window and boundary comparisons, given an instant | Opening the transaction |
| Interval merging, overlap detection | Calling the repository |
| Which error a set of facts implies | Translating a driver error into a domain error |
| Field-rule decisions the schema cannot express | Emitting side effects |

The service resolves the clock from DI, calls `clock.now()`, and **passes the
instant into the rule as an argument**. The rule is then a pure function of its
inputs, so every branch is reachable from a unit test with no container, no
database and no clock.

```ts
// pricing.rules.ts — pure
export const quote = (pricePerHour: Money, hours: Decimal, taxPercent: Decimal) => { ... }

// cancellation.rules.ts — pure, the instant is a parameter because Date is banned
export const isCancellable = (now: Date, startsAt: Date, windowHours: number) => ...
```

When generating `be-architecture.md` §3 and `testing.md` §3, this layer is named
explicitly and its test shape shown.

## 3. TypeScript idioms that replace a JavaScript workaround

| Concern | Do this | Not this |
|---|---|---|
| DI resolution typos | Declare a `Cradle` interface; a wrong dependency name is a compile error | A runtime parity test hunting for the typo |
| Request types | `type CreateInput = z.infer<typeof createSchema>` — the schema *is* the type | A hand-written interface that drifts from the schema |
| Money | A branded `Money = string & { readonly __money: unique symbol }` — arithmetic fails to compile | A lint regex matching `/Amount\|Price\|total/` |
| Server-owned fields | `Omit<Booking, ServerOwned>` on the input type | Only a runtime `.strict()` rejection |
| Prisma `Decimal` leaking | The mapper's return type forbids it | Hoping the mapper converted it |

**The one trap TypeScript adds:** under ESM with `moduleResolution: NodeNext`,
imports are written `./courts.routes.js` while the file on disk is
`courts.routes.ts`. Record it in the stack document; everyone hits it once.

## 4. What the lint rules force into the specification

The project's lint rules are in `references/lint/`. Three of them change what a
generated document may specify:

| Rule | Consequence for the spec |
|---|---|
| `complexity: 8`, `max-depth: 2` | Field rules are expressed as **schema**, never as service branching. A handler validating six fields inline breaches the cap |
| `sonarjs/no-nested-conditional` | Code-to-behaviour mappings are specified as a **`const` lookup table**, never as a conditional chain. The chained JSX ternary is banned outright |
| `sonarjs/todo-tag` | Deferred work has exactly one home: `phases.md`. A `TODO` in source fails the commit |

Also: `warn` is not advisory anywhere. The commit hook runs
`eslint --max-warnings=0`, so every warning blocks a commit even when
`npm run lint` passes. Say so in the definition of done.

## 5. Money, time and identifiers

| Kind | Rule |
|---|---|
| Money | Exact decimal in the database, **decimal string on the wire** (`"399600.00"`), never a float, never a number in JSON |
| Currency | ISO 4217, stored alongside every amount, snapshotted onto transactional rows |
| Rounding | Half up, two places, applied once, after tax |
| Computation | Server side only. **No endpoint accepts an amount from a client** |
| Date of record | `DATE`, venue/tenant local |
| Time of day | `TIME(0)`, local, `HH:mm` on the wire |
| Instant | `TIMESTAMPTZ`, ISO 8601 UTC on the wire |
| Timezone | IANA identifier stored as a **column**, never a server constant or fixed offset |
| Identifiers | UUID by default; auth identifiers follow whatever the auth library generates |

A local date plus a local time is converted to an instant using the **row's own
timezone**. The server's zone is never assumed.

## 6. Errors

One envelope, one exit point, one registry.

```json
{ "error": { "code": "...", "message": "...", "details": [...], "requestId": "..." } }
```

| Decision | Standard |
|---|---|
| Produced by | Services throw domain errors. No controller sets a status by hand |
| Become responses in | A single error-handling middleware, mounted last |
| Mapping | Each code maps to exactly one HTTP status |
| Not found vs forbidden | Another user's record returns `404`, so existence is not leaked |
| Leakage | No stack trace, driver message, SQL fragment or internal id reaches a response |
| Correlation | Every response carries a request id that also appears in the logs |
| Reuse | **Never reuse a code for a second condition.** A new condition gets a new code |

## 7. Guarantees live in the database

Any guarantee the product sells is expressed as a constraint, not only as a
service method. A check that runs in application code is only true until two
requests arrive in the same millisecond.

PostgreSQL expresses non-overlap directly:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE t ADD COLUMN period tsrange
  GENERATED ALWAYS AS (tsrange(d + start_time, d + end_time, '[)')) STORED;
ALTER TABLE t ADD CONSTRAINT t_no_overlap
  EXCLUDE USING gist (resource_id WITH =, period WITH &&)
  WHERE (status IN ('pending','confirmed'));
```

**`EXCLUDE USING gist` does not exist in MySQL or SQLite.** If the chosen
database is not PostgreSQL, do not emit SQL that will not run. State the
limitation and propose the real alternative — a unique index over a discretised
slot key, or an explicit lock — and record the write cost in the data spec.

## 8. Testing

Five suites, one shape, mirroring the source tree exactly.

```
tests/
  unit/          mirrors src/, no external process
  integration/   mirrors src/features/, real database, real router
  e2e/           user journeys, Chromium
  regression/    one file per closed defect, REG-001 upward, never deleted
  fidelity/      frontend only: the app against the mockup baseline — pixels, computed styles, assets, behaviour (S6)
  fixtures/      builders, not JSON blobs
  helpers/       container factory, database lifecycle, sign in
```

Naming: `<source>.test.ts` for unit and integration, `<journey>.spec.ts` for end
to end. A test is found by transforming a path, not by searching.

### Disposable Docker storage

All Docker-based tests follow [docker-testing.md](docker-testing.md): prefer
bounded tmpfs, clean exact test-owned resources even after failure, and verify
that no test volumes remain. Persistent project data is retained.

## 9. Frontend copy — never invent text

**If the text is already defined, write it.** If it is not, write lorem ipsum.
The one thing never allowed is text the assistant made up.

The recommendation, shown on one screen with the invented version beside the
correct one: [`frontend-copy.md`](./frontend-copy.md).

"Written copy" is every piece of text a screen shows that a person wrote — a
heading, a button label, a helper line, an empty-state sentence, a tooltip, a
confirmation dialog, `alt` text. It is defined when any of these already says
it:

| Defined in | Use it |
|---|---|
| The mockup markup | Verbatim — the approved copy, already paid for. Never reworded, shortened or "improved" |
| The specification | `error-handling.md` §4 for error sentences, the screen document for everything else |
| The requirement documents | Wording the PRD or SRS states for the screen — a label, a message, a legal line |
| The codebase | An existing copy constant or message file that already holds this text — reuse it, do not write a second copy |
| The user, in the conversation or the ticket | Verbatim, recorded in the screen document or the ticket |
| **None of these** | **Lorem ipsum.** Never a guess |

Defined text is written as-is, without asking again — it is not a placeholder
and is not recorded as one. Lorem ipsum is only for the gaps.

**Placeholder shape.** Match the expected length so the layout is honest: a
label or a button is `Lorem ipsum`; a heading is `Lorem ipsum dolor sit`; a
sentence is `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`; a
paragraph is the standard two-sentence passage. Nothing else — no half-invented
sentence with one lorem word, no `TBD`, no `Text here`.

**One home per feature.** Placeholder copy lives in the feature's copy constant
or message file, never inline in a component, so every placeholder is found by
one search: `grep -rn "Lorem ipsum"`. A `TODO` beside it is banned by the linter
(§4) and is not needed — the lorem text *is* the marker.

**Record every placeholder** in the screen document (or the ticket's `plan.md`)
as a row — screen, element, expected length, `COPY-nnn` — so replacing them is a
list, not an archaeology project.

### 9.1 Recommending the replacement

Lorem ipsum is what ships in the code; it is not the end of the job. For every
placeholder the assistant **also writes a recommendation** for the text that
should replace it — in a separate file, never in the code, and never used until
the user approves it.

| Piece | Where | Holds |
|---|---|---|
| The placeholder | The feature's copy constant | Lorem ipsum, plus one comment naming its section: `// COPY-003 · docs/FE/copy-recommendations.md#copy-003` |
| The recommendation | `docs/FE/copy-recommendations.md` | One section per `COPY-nnn`: where it is, what it must say, the proposed wording, what it is based on, what to confirm |
| The record | The screen document, or the ticket's `plan.md` §5a | The row for the placeholder, naming its `COPY-nnn` |

Every placeholder has exactly one section, and every section names exactly one
placeholder — the id is the link in both directions. Ids are the next free
number, never reused, never renumbered, the same as `REG-nnn`.

**Section template:**

```markdown
## COPY-003 — Review · cancellation note

**Status:** proposed · **AI recommendation — not approved** · **Placeholder:** `frontend/src/features/bookings/review.copy.ts` `CANCEL_NOTE` · **Length:** two sentences · **Raised by:** ticket `booking-review`

| Option | Text |
|---|---|
| **A — recommended** | You can cancel up to {cancellationWindowHours} hours before your slot starts. After that, the booking can no longer be changed. |
| B | Need to cancel? Do it at least {cancellationWindowHours} hours before your slot. |

**Why A:** matches the mockup's plain second-person tone ("Review your booking") and states only what FR-021 defines.
**Based on:** FR-021 (cancellation window), `error-handling.md` §4 `E-BOOKINGS-WINDOW` wording.
**Facts to confirm:** whether a refund is given, and how much — no source says, so no option claims one.
**Decision:** —
```

**Rules for the wording:**

| Rule | Why |
|---|---|
| **State no fact a source does not state.** No number, price, discount, deadline, policy, guarantee, legal claim or social proof that is not in the mockup, the spec, the PRD/SRS or the user's words | This is exactly how invented copy misleads. A recommendation that makes a promise is the left panel of [`frontend-copy.md`](./frontend-copy.md) with extra steps |
| A value the text needs comes from configuration as a named slot — `{cancellationWindowHours}` — never typed in | Same rule as error copy (`/pspt:code` §Rules): the number has one home |
| A fact the text needs that no source has goes under **Facts to confirm**, not into the wording | The user sees the missing decision instead of reading around it |
| Match the vocabulary and tone of the copy already defined on the same screen | Defined copy is the product's voice; the recommendation extends it, not replaces it |
| Fit the recorded length | The layout was built around the placeholder's size |
| One to three options, one marked recommended with a one-line reason | A choice, not an essay |

**Status and applying:**

| Status | Means | Next |
|---|---|---|
| `proposed` | Written by the assistant, not seen yet | The user approves an option, edits one, or rejects it |
| `approved · <option or edited>` | The user chose the text | Apply it |
| `applied · <sha>` | The approved text replaced the lorem ipsum in the copy constant, verbatim | Nothing — it is now defined text |
| `rejected · <reason>` | The user wants none of it | The user supplies the text, or the element is removed from the screen |

**Apply** means: copy the approved text into the copy constant **exactly as
approved**, keep the `COPY-nnn` comment as the trace, write the text into
**Decision**, set the status to `applied`, and commit —
`feat(copy): apply COPY-003 — review cancellation note`. A recommendation is
never applied because it "looks fine"; only the user's approval applies it.

> Lorem ipsum stops a guess from shipping. The recommendation stops the lorem
> ipsum from staying: the user reviews a written proposal with its sources and
> its open facts, instead of starting from a blank line.

**Tests never assert placeholder text.** Find the element by role, label
association or test id. A test that asserts `Lorem ipsum` locks the placeholder
in and fails on the day real copy arrives.

> Invented copy looks finished. It passes review, reaches production and is
> discovered by a customer. Lorem ipsum cannot be mistaken for approved text,
> so it is replaced before release instead of after.

This is about **written copy only**. Data values — names, prices, dates,
references — come from the API, and fixtures and examples use realistic values
per `house-style.md`. A price is `Rp 399.600`, never lorem ipsum; a heading
nobody wrote is lorem ipsum, never a guess.

## 10. Disable directives — allowed, never silent

A lint rule may be switched off for one line or one block, and so may a
TypeScript error. It never blocks work. It is never silent.

| Allowed | Never |
|---|---|
| `// eslint-disable-next-line <rule> -- <reason>` | a blanket disable that names no rule |
| `/* eslint-disable <rule> -- <reason> */ … /* eslint-enable <rule> */` | a disable with no reason |
| `// @ts-expect-error -- <reason>` (TypeScript) | a block disable never re-enabled, or a whole-file disable |
| | a disable that suppresses nothing — delete it |
| | `@ts-ignore` or `@ts-nocheck` |

The toolchain enforces every row (`references/lint/<stack>.md` §Disable
directives): a disable that breaks one of them is itself a lint error.

**When to use one.** Last resort, after a real fix was tried: the rule is
wrong for this exact line (a protocol constant a vendor defines, a third-party
type that lies), and the reason can say why in one sentence a reviewer can
check. "It was faster" is not a reason.

**Never blocking.** A skill that needs a disable — `/pspt:build`,
`/pspt:ticket`, `/pspt:fix-flow-proceed` — adds it with its reason and carries
on. It does not stop to ask.

**Always reported.** Every skill that adds or finds one tells the user:

| Where | What |
|---|---|
| The iteration's progress line | `⚑ disabled no-magic-numbers at pricing.rules.ts:14 — vendor status code` |
| The skill's final report | every disable it added, and the project total |
| The commit body | a `disables:` trailer per directive added — file, line, rule, reason |
| `references/toolchain/findings.mjs` | lists every directive in the package with its reason, on every run |

> A disable with a reason is a decision someone can review. A disable without
> one is a defect someone will copy.

## 11. Where commits happen — only inside a git repository

A commit is made in every git repository the work touched, and nowhere else.
Nothing here ever runs `git init`, and nothing is ever staged into a repository
that does not own it.

**Look before the first commit** — `git rev-parse --show-toplevel`, run in the
directory the files live in:

| Directory | Is a git repository | Not a git repository |
|---|---|---|
| Each package (`backend/`, `frontend/`) | commit its code there, as the skill says | no commit for it; the files stay on disk |
| The working directory (the parent) | commit its own files: `tickets/`, `docs/`, `.mcp.json`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.agents/` | **no parent commit at all** — those files stay on disk, uncommitted |

**The parent commits only the parent's files.** `backend/` and `frontend/` are
staged into the parent only when they are registered submodules (`.gitmodules`
lists them), where the commit moves the pointer. Two plain clones inside a
parent repository are left to their own repositories: never `git add backend`,
and never put the parent's files into either clone.

**Skipping is reported, once.** The skill's final report names what was not
committed and why, and every `Committed: <sha>` line says what it did:

```
commits  backend@4f2d9e1 · frontend@6f38a51 · parent — none, not a git repository
         left on disk: tickets/booking-cancel/ (3 files) · .mcp.json · CLAUDE.md · AGENTS.md · .agents/
```

A skipped commit is not a failure and never blocks a step. A box that asks for a
commit (`Committed — <sha>`) is ticked with `n/a — not a git repository` when no
repository owns that phase's files.

Where this does not apply: `/pspt:spec`, `/pspt:enhance`, `/pspt:build`,
`/pspt:build-long`, `/pspt:code` and `/pspt:reg` belong to a pspt project, whose
parent is a git repository with the two submodules by construction.

## Newline formatting

Express and React TypeScript builds use the canonical [newline formatting rules](toolchain/formatting.md). Run `npm run format` before CHECK; formatter and linter must agree.
