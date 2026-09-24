# S3 — Shared decisions

**Produces** (all in the working directory's `./docs/`, one place, never
mirrored into the submodules): `strict-rules.md`, `error-handling.md`,
`BE/be-architecture.md`, `BE/be-stack.md`, `BE/lint.md`,
`FE/fe-architecture.md`, `FE/fe-stack.md`, `FE/lint.md`

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

| # | Question | Options presented | Deletes |
|---|---|---|---|
| 1 | Database | PostgreSQL · MySQL · SQLite · **user may name another** | — |
| 2 | Backend framework | **Express · NestJS** — the only two with a governing lint file | Q4 if NestJS |
| 3 | ORM / query layer | Prisma · Drizzle · Kysely · TypeORM · **user may name another** | — |
| 4 | DI container | Awilix · tsyringe · manual factories · **user may name another** | — |
| 5 | Frontend framework | **React + Vite · Next.js** — the only two with a governing lint file | Q6 if Next.js |
| 6 | Frontend routing | react-router · TanStack Router · **user may name another** | — |
| 7 | Server state | TanStack Query · SWR · RTK Query · **user may name another** | — |
| 8 | Validation | Zod · Valibot · TypeBox · **user may name another** | — |

**Fixed, never asked:** language is **TypeScript**, runtime is **Node**,
architecture is feature-based with the `*.rules.ts` layer, and the test
toolchain is standard. See `../conventions.md`. If the user asks to use a
language other than TypeScript or a runtime other than Node, decline: this
plugin does not have the conventions, lint rules, or architecture patterns
to support them, and switching would silently ship a project without the
guarantees the rest of the pipeline assumes.

**Framework choices are strict.** Q2 (backend framework) and Q5 (frontend
framework) each accept only the two options listed above, because those are
the only stacks with a governing lint file in `references/lint/`. **If the
user names a different framework** (Fastify, Hono, Koa on the backend;
SvelteKit, Solid, Vue on the frontend), stop and ask plainly:

> This plugin does not ship a lint file, an architecture doc template, or
> a `*.rules.ts` boundary for `<framework>`. You will not get the
> commit-hook zero-warnings guarantee, the schema-not-branching complexity
> cap, or the purity boundary that makes every rule testable with no
> fixtures. Do you still want to develop with `<framework>`, unsupported —
> or would you rather stick with Express / NestJS (or React / Next.js) for
> the guarantees?

If they say yes to unsupported, proceed but record it under a `noLinter`
key in `docs/.pspt.json` (see §State file) so `/pspt:build` and
`/pspt:enhance` can warn each time they run. Do not attempt to invent lint
rules for the unsupported framework — the whole point of the four shipped
files is that they are hand-authored, not generated.

**All other library choices are open.** Q1, Q3, Q4, Q6, Q7 and Q8 present
two or three reasonable candidates with their trade-offs, but the user may
name any library they prefer. Record the answer and move on — no
unsupported-warning needed for these, because the linter cares about the
framework, not the ORM or the query cache.

Present each question with two candidates, the trade-off in one line each,
and the configuration trap that fails at runtime. Ask for trade-offs, not
for an answer.

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
`references/lint/`. **These four files are the whole supported set.** Do
not author new rules and do not attempt to adapt one file to a stack it
was not written for — every threshold in there was chosen for the
specific framework it names.

| Stack answer | Governing file |
|---|---|
| Express | `references/lint/express.md` |
| NestJS | `references/lint/nestjs.md` |
| Next.js | `references/lint/nextjs.md` |
| React + Vite | `references/lint/react.md` |

For a supported stack: copy the matching file into `./docs/BE/lint.md`
or `./docs/FE/lint.md` (whichever side owns it) so the parent's spec
carries it in one place, and link from `be-stack.md` §2 / `fe-stack.md`
§2 rather than restating its tables. The submodules read the lint from
here at build time — no mirroring, no drift.

For an unsupported stack (a framework the user opted into after the
warning above): write `<lint file skipped — no governing file ships for
<framework>. See docs/.pspt.json.noLinter.>` in place of the lint table.
Do not fabricate one, and do not silently omit the reference — the next
reader must see that this project ships without the lint guarantees the
plugin's other outputs assume.

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

- [ ] Language is TypeScript, runtime is Node — recorded, not asked
- [ ] Backend framework is Express or NestJS **or** an unsupported framework the user opted into after the no-lint warning, with the choice recorded under `docs/.pspt.json`
- [ ] Frontend framework is React + Vite or Next.js **or** an unsupported framework recorded the same way
- [ ] Every stack choice records its alternative and the reason it lost *for this project*
- [ ] Every stack choice records its trap, or states that none is known
- [ ] For a supported framework: the governing lint file is named and copied into `./docs/BE/lint.md` or `./docs/FE/lint.md` (the parent's docs, one place). For an unsupported framework: the `<lint file skipped …>` note is written in place of the lint table, with `noLinter` set in the state file
- [ ] Import boundaries are stated as rules a linter can enforce, not as advice
- [ ] Every error code has exactly one status and one defined screen behaviour
- [ ] The single check command is defined and runs format, lint, types and dead code (for an unsupported framework, the lint step is either omitted with a written note, or wired to whatever the user's ecosystem provides — never fabricated)
