# S6 — Development phases

**Produces:** `docs/phases.md` (written into both repos)

One shared file holding a backend track and a frontend track. It converts the
specifications into an order of work, and it is the file a planning session
reads. The two tracks live together because their dependencies cross: the
frontend cannot start a screen whose endpoints are still in a later backend
phase.

---

## Required sections

| # | Section | Content |
|---|---|---|
| 0 | Decisions | Open product decisions, what they block, and their status. Nothing starts on an undecided dependency |
| 1 | Phase map | A diagram of phases and dependencies, plus a table of scope, relative size and prerequisites |
| — | Per phase | Goal, build list as a table of area and files, exit criteria as checkboxes |
| 2 | Definition of done | Rules applied to **every** phase, never deferred to the last one |
| 3 | Risks | The risk, the phase it threatens, the mitigation |
| 4 | First week | A sequence, not a schedule |

Also state the critical path and what runs in parallel, explicitly.

## Ordering rules

| Rule | Reason |
|---|---|
| Scaffold, error envelope and health check come first | Every later phase throws domain errors. Retrofitting the envelope means touching every service already written |
| **The hardest guarantee is proven in the earliest phase that can prove it** | If the constraint does not behave as specified, the design changes. Finding out four phases later means a rewrite instead of a migration |
| Read paths before write paths | Reading is cheaper to test and unblocks the frontend sooner |
| Anything waiting on a third party starts its onboarding in phase zero | Waiting time is not engineering time and should overlap with other work |
| A phase closes with its own tests | Deferred tests are never written under delivery pressure |
| The frontend shell starts on day one | Loading, empty and error states need no backend at all |

The second rule is the one that matters most. The phase that proves the load-
bearing constraint should sit immediately after the migration that creates it —
typically phase 1, long before the endpoint that depends on it.

## Phase template

```markdown
## Phase N — <name>

**Goal:** <one sentence a non-engineer can verify>

| Area | Files |
|------|-------|

### Exit criteria

- [ ] <observable, testable statement>
- [ ] <the test that proves the phase, named>

> <the trap this phase exists to avoid, and why it is cheaper here than later>
```

## Writing exit criteria

Exit criteria are the work list `/pspt:build` consumes, so each must be
**independently verifiable** and point at something nameable.

| Good | Bad |
|---|---|
| `POST /x` rejects a body containing `totalAmount` with `422` (REG-001) | Validation works |
| Two concurrent overlapping inserts produce one `201` and one `409` (REG-002) | No double booking |
| Removing `DATABASE_URL` fails at **boot**, not on first request | Config is validated |
| `npm run check` passes with zero warnings | Code is clean |

Each criterion should name either a regression id, a test file, or an observable
response. A criterion no test can be written against is a goal, not a criterion.

## Definition of done, applied per phase

| Area | Requirement |
|---|---|
| Lint | The single check command is clean, with zero warnings — the hook runs `--max-warnings=0` |
| Tests | Unit for services and rules, integration for endpoints, e2e for the journey, regression when a defect closes |
| Errors | Domain errors only. No status code set inside a feature |
| Boundaries | No cross-feature repository import. The boundary lint rule passes |
| Purity | No I/O, framework import, `Date`, `fetch` or `Math.random` inside a `*.rules.ts` |
| Validation | Schema validation at the route edge, strict on every body. Services trust their input |
| Deferred work | Recorded in this file. **No `TODO` in source** — the linter rejects it |
| Secrets | Nothing sensitive in a response or a log line |
| Specification | Any deviation is written back into the feature document **in the same pull request** |

> The last row matters most. A specification that drifts from the code is worse
> than no specification, because the next reader trusts it and is wrong.

## Decisions to ask

| Decision | What to put in front of the user |
|---|---|
| Open product decisions | Which are still open, what each blocks, and whether work can start without them |
| Phase sizing | The proposed split and relative sizes, with the critical path named |
| Parallelism | What the second person starts on day one |
| Deferred scope | What is explicitly out of this release, recorded so it stops coming back |

## Exit criteria

- [ ] Every phase has a goal a non-engineer can verify
- [ ] Every phase has a build list and checkbox exit criteria
- [ ] The hardest guarantee is proven in the earliest phase that can prove it
- [ ] Every exit criterion names a test, a regression id, or an observable response
- [ ] Cross-track dependencies are explicit, so no screen starts before its endpoints exist
- [ ] The definition of done is stated once and applies to every phase
- [ ] The first-week sequence names what to start on Monday
