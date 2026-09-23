# S3 — Shared decisions

**Produces:** `docs/strict-rules.md` and `docs/error-handling.md` (both repos),
`docs/BE/be-architecture.md`, `docs/BE/be-stack.md`, `docs/FE/fe-architecture.md`,
`docs/FE/fe-stack.md`

`strict-rules.md` is S0 and conceptually precedes everything, but it cannot be
written until the container is known — so it is filled from
`../strict-rules.md` here, at the moment the stack questions are answered.

Four decisions made once per side, before any feature is specified. They are what
make two engineers — or an engineer and an assistant — produce code that looks
like it came from the same hand.

Error handling is written **once and shared**, because a code registry with two
homes eventually has two truths.

---

## The stack questions, in dependency order

Ask in this order. An answer deletes later questions; do not ask a question whose
answer is already settled.

| # | Question | Options | Deletes |
|---|---|---|---|
| 1 | Database | PostgreSQL · MySQL · SQLite | — |
| 2 | Backend framework | Express · NestJS | Q4 if NestJS |
| 3 | ORM / query layer | Prisma · Drizzle · Kysely · TypeORM | — |
| 4 | DI container | Awilix · tsyringe · manual factories | — |
| 5 | Frontend framework | Next.js · React + Vite | Q6 if Next.js |
| 6 | Frontend routing | react-router · TanStack Router | — |
| 7 | Server state | TanStack Query · SWR · RTK Query | — |
| 8 | Validation | Zod · Valibot · TypeBox | — |

**Not asked:** language (TypeScript), architecture (feature-based with the
`*.rules.ts` layer), and the test toolchain. Those are fixed — see
`../conventions.md`.

Present each with two candidates, the trade-off in one line each, and the
configuration trap that fails at runtime. Ask for trade-offs, not for an answer.

### Consequences to state, not discover

| If | Then |
|---|---|
| NestJS | DI is Nest's own container; question 4 is not asked. SR-1 is satisfied by constructor injection. `max-classes-per-file: 1` matches its one-class-per-file shape |
| Express | No built-in DI, so the `*.rules.ts` purity boundary is worth **more** here — without it nothing stops a handler's decision logic reaching straight for the database |
| Not PostgreSQL | `EXCLUDE USING gist` is unavailable. Do not emit it. Name the real alternative and its write cost in `data-spec.md` §6 |
| Next.js | Routing is the file router; question 6 is not asked. `jsx-a11y/anchor-is-valid` stays off because it conflicts with `next/link` |
| React + Vite | Plugins must be registered by hand in flat config; `anchor-is-valid` is re-enabled. Set `server.proxy` for `/api` in dev or cookies are dropped cross-origin |

## Linter — select, never generate

The project's lint rules are already written, one file per stack, in
`references/lint/`. **Do not author new rules.** `be-stack.md` §2 and
`fe-stack.md` §2 state which file governs and summarise only what a spec author
needs to know:

| Stack answer | Governing file |
|---|---|
| Express | `references/lint/express.md` |
| NestJS | `references/lint/nestjs.md` |
| Next.js | `references/lint/nextjs.md` |
| React + Vite | `references/lint/react.md` |

Copy that file into the target repo's docs so it travels with the project, and
link to it rather than restating its tables.

The three consequences that must reach the specification are in
`../conventions.md` §4: schema-not-branching, `const` map not ternary chain, and
no `TODO` in source.

## `error-handling.md` — required sections

| # | Section | Content |
|---|---|---|
| 1 | Envelope | The single response shape, with a field-by-field rule table |
| 2 | Production rules | Where errors are produced, where they become responses, status mapping, leakage, correlation, driver-error translation |
| 3 | Registry | Status · code · raised when · frontend behaviour. One row per code |
| 4 | Copy | The user-facing sentence per code, written once, in the product's language |
| 5 | Frontend mapping | Codes grouped into presentation classes — field level, blocking banner, advisory banner, screen level, navigation |
| 6 | Rules for adding a code | The process, so the registry does not fork |

Every code a screen can receive must exist here before the screen is built. A
frontend cannot show a useful message for a code it learns about in production.

Numbers inside a copy sentence are interpolated from configuration, never typed
into the string.

## `be-architecture.md` — required sections

Principle · tree · feature anatomy (**including `*.rules.ts`**) · import rules ·
container wiring · router assembly and middleware order · how to add a feature.

State the middleware order explicitly and name what breaks if it is wrong.

## `fe-architecture.md` — required sections

Principle (**the app is a refactor of the approved mockup, not a rewrite**) ·
tree · component rules · state ownership · data fetching · routing · the states
every screen implements.

## Exit criteria

- [ ] Every stack choice records its alternative and the reason it lost *for this project*
- [ ] Every stack choice records its trap, or states that none is known
- [ ] The governing lint file is named and copied into the repo
- [ ] Import boundaries are stated as rules a linter can enforce, not as advice
- [ ] Every error code has exactly one status and one defined screen behaviour
- [ ] The single check command is defined and runs format, lint, types and dead code
