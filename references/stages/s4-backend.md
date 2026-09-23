# S4 — Backend specification

**Produces:** `docs/BE/features/README.md`, `docs/BE/features/<feature>.md` (one
per feature), `docs/BE/testing.md`

The features folder is the contract. Each file is small, closed and readable on
its own, so it can be handed to a frontend engineer or an assistant without
dragging the whole specification along.

---

## Deciding the feature split

Propose the split, let the human confirm it. Derive it from table ownership and
screen grouping, not from endpoint count:

- A feature **owns** the tables it writes. Two features never write the same table.
- Read-mostly catalogue tables group together; the core transaction stands alone.
- If a feature file would pass ~400 lines, it is two features.

State the ownership on every feature file's header line.

## `features/README.md` — the inherited conventions

Written once, so no feature file restates them: base path, auth mechanism,
success and list response shapes, money rules, date and time formats,
pagination defaults and caps, validation policy, the server-owned field list,
access levels, and the feature file template.

The **server-owned field list** is the most load-bearing section. Name every
field a client may never send, on any endpoint, and state that sending one is a
rejection rather than a silent drop — so the client learns immediately.

## Feature document template

```markdown
# <Feature> API

**Owns:** <tables this feature writes>  ·  Conventions: [`README.md`](./README.md)

<one paragraph: what it is for, and what it deliberately does not do>

| # | Method | Path | Access |
|---|---|---|---|

---

## 1. `<METHOD> <path>`

<one line> **Access:** <level>.

### Request
```json
<realistic example>
```
| Field | Type | Required | Default | Rules | Source |

### Response `<status>`
```json
<realistic example, with real computed figures>
```

### Errors
| Status | Code | When |

> traps, and any deliberate change from the current system
```

`Source` carries the SRS requirement id the field satisfies.

## What every endpoint section must state

| Element | Requirement |
|---|---|
| Access | Stated per endpoint, never implied by the path |
| Request fields | Field, type, required, default, rules. Rules include length, trimming, uniqueness |
| Server-owned fields | Listed explicitly wherever the client might plausibly send one |
| Response | A real JSON example with realistic values, not a type listing |
| Errors | Status, code, condition. Every code exists in the registry |
| Pagination | Stated, or stated as deliberately absent with the reason the set is bounded |
| Side effects | Mail, webhooks, state written on other tables |
| Concurrency | Where a constraint does the work, say so, and say the service does **not** check-then-write |
| Notes | Traps, behaviour changes against the current system, and the reason for each |

A computed value is specified as its formula **and** as a worked example whose
figures match the mockup exactly. That is what lets a reviewer hold the spec next
to the screen and see that they agree.

## `testing.md` — required sections

| # | Section | Content |
|---|---|---|
| 1 | Suites | Unit, integration, e2e, regression — what each proves, what it runs against, its speed |
| 2 | Layout | The tests tree, mirroring src exactly |
| 3 | Unit testing shape | A worked example building a service with fakes only, and a pure `*.rules.ts` test with no fakes at all |
| 4 | Regression register | Id, defect, level, what it asserts |
| 5 | Coverage per level | What must be tested at which level, and what is deliberately not tested |
| 6 | Fixtures and isolation | Builders not blobs; transaction rollback or truncation |
| 7 | Thresholds | Floors, with the note that coverage is a floor and not a goal |

### The two unit-test shapes

Show both, because they are different:

```ts
// a *.rules.ts test — pure, no fakes at all
expect(quote('180000.00', 2, '11.00')).toEqual({ subtotal: '360000.00', tax: '39600.00', total: '399600.00' });

// a *.service.ts test — fakes only, no container, no database, no real clock
const service = bookingsService({ repository: { insert: vi.fn() }, clock: { now: () => FIXED }, ... });
```

A service that cannot be constructed this way is violating SR-1. A rule that
needs a fake is not pure and belongs in the service.

## Reserving regressions

Reserve one regression per failure mode the team has already seen, **before**
writing any code. Each gets an id, a level, and a precise assertion. The id is
then written into the feature document beside the behaviour it protects, so the
next reader of the spec knows the rule was once broken.

## Decisions to ask

| Decision | What to put in front of the user |
|---|---|
| Feature split | The proposed grouping and what each feature owns |
| Pagination caps | Default and maximum per list, with the reason a cap exists |
| Regressions to reserve | The failure modes worth a numbered test up front |
| Access per endpoint | Where staff or admin differs from owner-only, and whether staff may override a guarantee |

## Exit criteria

- [ ] Every endpoint the mockup needs exists in a feature document
- [ ] No document contains an endpoint no screen calls
- [ ] Every endpoint states access, request rules, response example and error table
- [ ] Every error code used appears in the registry with exactly one status
- [ ] Server-owned fields are listed, so no amount or status can be set by a client
- [ ] Every computed figure in a response example matches the mockup
- [ ] Every reserved regression has an id, a level and a precise assertion
