# S5 — Frontend specification

**Produces:** `docs/FE/design-system.md`, `docs/FE/features/<screen>.md` (one per
screen)

Turn the approved mockup into an application by **refactoring it, not rebuilding
it**. The mockup already carries the approved layout, the approved copy and the
approved states. Rewriting from scratch throws away a stakeholder decision that
was already paid for.

---

## `design-system.md` — required sections

| # | Section | Content |
|---|---|---|
| 1 | Where these come from | One line: values copied verbatim from the mockup CSS, not reinterpreted |
| 2 | Tokens | Colour, type, spacing, radius — lifted from the mockup stylesheet |
| 3 | Rules | No component introduces a value that is not a token; new tokens are added here first |
| 4 | Refactor map | One row per mockup file **and per state** |

### Token extraction

Read the mockup's stylesheet and copy the values exactly. A token whose value was
"tidied" during extraction is a visual regression against a screen someone signed
off. Status colours are for status only, never decoration.

List the components the mockup has already proven — the ones that appear more
than once with a consistent shape. That is the UI kit, derived rather than
invented.

### Refactor map

| Mockup file | Route | Components extracted | Endpoints consumed | Status |
|---|---|---|---|---|

**One row per state, not per screen.** `page.html?state=empty` is its own row.
This is the only place that says which parts of the mockup have become real,
which is what keeps a half-migrated frontend legible — and it is why loading,
empty and error rows usually finish first, since they need no backend at all.

Close with a table of what moves across unchanged versus what is replaced:
markup, class names, copy and CSS move; the dummy data file, the `?state=`
switch and inline scripts are replaced.

## Screen document template

| Section | Content |
|---|---|
| Header | Route, access guard, and the mockup file it derives from |
| Component tree | The components extracted, and which one owns which piece of state |
| Data contract | Endpoints consumed, when, and the **exact fields this screen reads** |
| States | Every state with its trigger and its presentation |
| Validation | Client rules, stated as a **mirror** of the server schema, never as a second source of truth |
| Error mapping | Backend code to screen behaviour, taken from the registry |
| Interactions | What each control does, including optimistic behaviour and rollback |
| Acceptance criteria | Given / when / then, implementable by the e2e suite without interpretation |

## Rules that shape the spec

**Mirror, never duplicate.** Client validation exists for speed of feedback only.
The server schema stays the single source of truth, and a rule that exists only
on the client is a defect waiting for its first direct API call.

**No arithmetic on amounts.** Amounts arrive computed as decimal strings and are
only formatted. Under a branded `Money` type this is a compile error; state it as
a rule anyway so the reason is recorded.

**Error mapping is a `const` lookup table.** The chained ternary is banned by
`sonarjs/no-nested-conditional`, so specify the mapping as a table the code can
mirror directly:

```ts
const BEHAVIOUR = { SLOT_TAKEN: 'banner', VALIDATION_FAILED: 'field' } as const;
```

**A state is a row.** A screen is not done when its happy path renders. Every
state in the mockup is a row in the refactor map and a row in the screen
document, and each one has defined copy.

**Nothing else on the response is read.** List the fields the screen consumes and
say plainly that other fields arriving is fine — the contract is not trimmed for
one screen.

## Acceptance criteria

Written so the browser suite implements them without interpretation. Each is a
single given / when / then naming real values:

> Given a draft for Futsal A on 27 September, 10:00 to 12:00, when the page
> loads, then the summary shows `Rp 180.000 × 2 jam`, tax at 11.00%, and a total
> of `Rp 399.600`.

Numbers in acceptance criteria come from the mockup and match the backend
specification's worked example. If they disagree, one of the two documents is
wrong and this is when it is cheap to find out.

## Decisions to ask

| Decision | What to put in front of the user |
|---|---|
| Component extraction | The proposed component tree per screen, and where each piece of state lives |
| Extraction threshold | Confirm: extract on the third repetition, not the first |
| Draft/flow state | What must survive a conflict response, and where it lives |
| Optimistic updates | Which mutations may render before the server confirms, and which must not |

## Exit criteria

- [ ] Every mockup file **and every state** has a row in the refactor map
- [ ] Every screen document lists the endpoints it consumes and the fields it reads
- [ ] Every error code a screen can receive has a defined behaviour
- [ ] Design tokens are extracted from the mockup CSS, so the refactor cannot drift visually
- [ ] Acceptance criteria are written in a form the browser suite can implement without interpretation
- [ ] Every figure in an acceptance criterion matches the backend specification
