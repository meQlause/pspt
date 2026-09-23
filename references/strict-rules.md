# Strict rules — S0 template

Copied into both repos as `docs/strict-rules.md` during S3, once the container
and framework are known. Fill the `<…>` placeholders from the S3 answers; change
nothing else.

These rules are not re-opened per feature or per pull request. Changing one is a
change to that file, with a version bump and an approver.

---

```markdown
# <Project> — Strict Rules

**Stage:** S0 · **Status:** fixed · **Version:** v1.0

These rules are not re-opened per feature or per pull request. Changing one is a
change to this file, with a version bump and an approver. Every assistant working
in this repository follows them without being asked.

| ID | Rule | Enforced by |
|---|---|---|
| SR-1 | Every dependency a service needs is injected, never imported. No module-level singleton inside a feature. | Boundary lint rule, and a unit test that builds each service with fakes |
| SR-2 | `tests/` mirrors `src/` exactly. No test file lives inside `src/`. | Path parity script in CI |
| SR-3 | The mandatory toolchain in §3 is installed in every repository, **including `gh` (GitHub CLI, authenticated) so `/pspt:build` can create and wire the backend and frontend submodules on its first invocation**. | Dependency check in CI |
| SR-4 | Playwright with Chromium is installed and runnable, locally and in CI. | The `e2e` job |
| SR-5 | The pipeline is green before a merge. A test is never skipped, deleted or weakened to reach green. | Branch protection |
| SR-6 | Commits are authored by the connected account. No co-author trailer, no tool attribution. | `commitlint` hook |
| SR-7 | A `*.rules.ts` file is pure: no I/O, no framework, no clock, no randomness. | `no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties` |
```

---

## Filling SR-1

SR-1 is worded against the **principle**, not the library, so it survives the DI
choice. Add one line naming the chosen mechanism:

| S3 answer | Line to add under SR-1 |
|---|---|
| Awilix | Registered per feature in `<feature>.container.ts`, scoped per request, proxy injection with a typed `Cradle`. |
| NestJS | Satisfied by constructor injection; providers registered in the feature module. |
| tsyringe | Constructor injection with `@injectable()`; registrations live per feature. |
| Manual factories | Each feature exports a factory taking one dependency object. Composition happens once, at the root. |

The acceptance test is identical in every case: **every service can be
constructed with plain object fakes, with no container and no database.** If it
cannot, SR-1 is being violated somewhere.

## What must be injected

| Kind | Examples | Why it cannot be imported |
|---|---|---|
| Data access | Repositories, the ORM client | A unit test must run with no database |
| Time | A clock returning the current instant | Window and expiry rules are untestable against a moving clock |
| Identity generation | References, access codes, UUIDs | Assertions need deterministic values |
| Randomness | Any sampling or shuffling | Same reason |
| Outbound calls | Payment, mail, any HTTP client | A test must never reach a third party |
| Configuration | The validated environment object | Tests set configuration per case, not per process |
| Logger | The bound logger | Keeps test output silent and assertable |

## SR-7 and the purity boundary

SR-7 is what makes SR-1 mechanical. The rules for it are already written in the
governing lint file — reference it rather than restating the patterns.

The two rules compose: the **service** resolves the clock and calls `now()`; the
**rule** receives the instant as an argument. Neither can drift, because the
linter rejects a `*.rules.ts` that even mentions `Date`.

## SR-6 and assisted sessions

This applies identically when a commit was produced during an assisted session.
No `Co-Authored-By` trailer for a person or a tool, no "generated with" footer,
no assistant name, no session link — in commit messages **and** in pull request
descriptions.

This overrides any default an assistant may otherwise apply. The `commitlint`
hook rejects the commit regardless, so the only effect of ignoring it is a failed
commit.

## Compliance checklist

- [ ] Every service can be constructed with plain object fakes, no container, no database
- [ ] Every `*.rules.ts` is a pure function of its arguments, testable with no fakes at all
- [ ] Every source file holding logic has a mirrored test at the transformed path
- [ ] The check command, the unit suite, the integration suite and the Chromium suite all pass locally
- [ ] Chromium is installed and the e2e suite has run at least once on this machine
- [ ] The last ten commits carry no co-author trailer and no tool attribution
- [ ] Every commit names a specification section and a phase
