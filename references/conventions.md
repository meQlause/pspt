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

Four suites, one shape, mirroring the source tree exactly.

```
tests/
  unit/          mirrors src/, no external process
  integration/   mirrors src/features/, real database, real router
  e2e/           user journeys, Chromium
  regression/    one file per closed defect, REG-001 upward, never deleted
  fixtures/      builders, not JSON blobs
  helpers/       container factory, database lifecycle, sign in
```

Naming: `<source>.test.ts` for unit and integration, `<journey>.spec.ts` for end
to end. A test is found by transforming a path, not by searching.
