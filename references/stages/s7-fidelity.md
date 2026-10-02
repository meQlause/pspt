# S7 — Mockup fidelity

**Produces:** `docs/FE/fidelity.md`, plus a **Mockup parity** phase appended to
the frontend track of `docs/phases.md`

The last stage. S5 decided *how* the mockup becomes an application; S7 decides
*how anyone will know it did*. "Looks like the mockup" is not a criterion — it is
an opinion, and opinions drift one pixel, one font weight, one forgotten hover
state at a time. This stage turns the mockup into a **measured baseline** and
specifies the suite that holds the finished app to it: the same fonts, the same
sizes and weights, the same padding and margins, the same assets, and every
behaviour the mockup demonstrates working for real.

Two principles shape everything below:

1. **The mockup is the baseline, never the app.** Every number is read off the
   mockup rendered in Chromium — not off its CSS by eye, not off the app after
   the fact.
2. **Analyse first, define once.** A mockup is mostly repetition: twenty
   buttons, six cards, one heading style used forty times. S7 finds the
   repetition **with a script**, defines each pattern **once**, and lets every
   instance inherit it. Nothing is specified per element unless it is genuinely
   one of a kind.

---

## Gate

S5 and S6 must be complete: every screen and state has a refactor-map row and a
screen document, and `phases.md` exists. If the mockup changed since S5, stop and
re-run S5 first — a baseline taken from a mockup the spec does not describe
measures the wrong thing.

## Token discipline

The cost of this stage is reading. Keep it bounded:

| Do | Never |
|---|---|
| Run the extractor (§10) and read its **summary** — classes, components, counts, outliers | Paste mockup HTML or CSS into context to read values by eye |
| Write **token names and component names** into `fidelity.md` | Copy computed values into the document — they live in `baseline/*.json`, generated |
| Define a component once, list where it is used by count | Write a row per instance |
| Read one representative instance when a summary is ambiguous | Read every screen to "check" the script |

> A value typed into a document is a second source of truth for a number the
> mockup already holds. The generated baseline is the only copy.

## Required sections

| # | Section | Content |
|---|---|---|
| 1 | Matrix | Every mockup file × state × viewport. This is what "the whole app" means |
| 2 | Render parity | The conditions both sides render under, so a difference is a defect, never noise |
| 3 | Pattern analysis | What the extractor found: style classes, components, variants, outliers — and the decisions they raised |
| 4 | Component catalog | Each component and variant **once**: anatomy, states, tokens, instance count |
| 5 | Text roles | Each typography class **once**, by token |
| 6 | Mapping convention | One rule that pairs mockup and app elements — no per-element map |
| 7 | One-offs | The few elements that match no pattern, each with its own row |
| 8 | Assets | Generated inventory — the document holds only the rules and the exceptions |
| 9 | Behaviour | Per component once, then per screen only the flows that are the screen's own |
| 10 | Comparison and harness | Tolerances, the `tests/fidelity/` layout, the extractor, the commands |
| 11 | Allowed deviations | Every intended difference from the mockup, user-approved |

### §1 Matrix

| Mockup file | States | Viewports | App route | Fixture |
|---|---|---|---|---|
| `booking-review.html` | default · window · conflict · error · success | 375 · 768 · 1280 | `/bookings/:id/review` | `reviewDraft()` |

One row per **screen**, its states listed — the matrix multiplies itself out in
the harness. Viewports are the mockup's own breakpoints, read from its `@media`
rules, one width inside each range; if it has none, ask (Decisions).

### §2 Render parity

| Condition | Both sides |
|---|---|
| Browser | Chromium, the version Playwright pins (SR-4) |
| Viewport and scale | The §1 width, a fixed height, `deviceScaleFactor: 1` |
| Data | The app renders **the values the mockup shows**, via one fixture builder per screen through the real API |
| Clock and locale | Frozen to what the mockup implies; timezone from the row, never the machine |
| Fonts | Loaded before capture (`document.fonts.ready`); no fallback face may render |
| Motion | Disabled for capture only; §9 tests it separately |
| Network | No third-party request; remote mockup assets are vendored (§8) |

### §3 Pattern analysis

Run `pnpm fidelity:analyse` (§10). It renders every §1 row of the mockup and
reports, without the assistant reading the markup:

| Finding | How the extractor finds it | What S7 does with it |
|---|---|---|
| **Style classes** | Groups text elements by their computed type signature (family, size, weight, line-height, letter-spacing, transform, colour) | Each class becomes one §5 text role |
| **Components** | Groups repeated subtrees by structure and class names — the same shape appearing two or more times | Each becomes one §4 component, matched against the S5 UI kit |
| **Variants** | Within a component, instances whose signatures differ in a consistent way (`.btn` vs `.btn.secondary`) | Each becomes one variant row under its component |
| **Near-duplicates** | Instances of one component that differ by a small amount (padding `16px` vs `18px`, colour off by one step) | **A question, never a silent choice** — see below |
| **One-offs** | Elements matching no group | §7, one row each |
| **Untokenised values** | A computed value with no token in `design-system.md` §2 | Add the token in S5 first, then continue |

Report the summary in `fidelity.md` §3 as counts, not values:

```
analysed   5 screens · 18 states · 3 viewports · 1,412 elements
classes    9 text roles cover 97% of text (41 one-off text nodes → 3 real one-offs, 38 are data)
components 11 components, 19 variants, 268 instances  (S5 UI kit: 11 ✓)
near-dup   2 — Card padding 16px (4 inst.) vs 18px (2 inst.); Button/secondary border 1px vs 1.5px
one-offs   6 elements
assets     14 files, 2 remote
```

**Near-duplicates are asked, one `AskUserQuestion` each:** *unify* (the minority
instances are a mockup slip; the app uses the majority value and the difference
is recorded in §11) or *keep as a variant* (the difference is intentional; a new
variant row is added). The assistant never decides which pixel was meant.

> This is where modularising pays twice: one definition instead of many, and a
> mockup inconsistency surfaced as a decision instead of faithfully copied into
> six components.

### §4 Component catalog

One section per component, written once. Instances are counted, not listed.

```markdown
#### Button  · S5 UI kit · 64 instances on 5 screens

| Variant | Tokens | States compared | Instances |
|---|---|---|---|
| primary   | `color.brand` bg · `text.button` · `space.3`/`space.5` padding · `radius.md` | default · hover · focus-visible · active · disabled · loading | 31 |
| secondary | `color.surface` bg · `border.subtle` · `text.button` · same padding · `radius.md` | default · hover · focus-visible · active · disabled | 27 |
| link      | no bg · `text.link` · no padding | default · hover · focus-visible | 6 |

Anatomy: label, optional leading icon (`icon.sm`), spinner in `loading`.
Behaviour: §9 Button.
```

Every value is a **token name**; the measured numbers for each variant × state
live in `baseline/components.json`, generated. One comparison per variant ×
state × viewport covers every instance — the harness checks each instance
against its variant's baseline, so a single drifted instance still fails, but
nobody wrote a row for it.

### §5 Text roles

| Role | Token | Used by | Instances |
|---|---|---|---|
| `title` | `text.title` | screen headings | 18 |
| `body` | `text.body` | paragraphs, table cells | 402 |
| `label` | `text.label` | field labels, row labels | 96 |
| `amount` | `text.amount` | money values | 54 |

Family, size, weight, style, line-height, letter-spacing, transform and colour
for each role are in `baseline/text-roles.json`, generated.

### §6 Mapping convention

One rule replaces the per-element map:

| Side | How an element identifies itself |
|---|---|
| App | Every component root renders `data-component="<Component>"` and, when it has one, `data-variant="<variant>"`; every text role renders `data-role="<role>"` |
| Mockup | The extractor's §3 grouping assigns the same component, variant and role to each mockup element — the mockup is **never edited** |

The harness pairs instances by screen + state + component + variant + document
order. Only §7 one-offs need an explicit selector. A component that renders
without its attributes is a failing test, not a missing row.

### §7 One-offs

| Key | Screen | Mockup selector | App selector | What makes it unique |
|---|---|---|---|---|
| `review.hero` | booking-review | `.hero` | `[data-testid="review-hero"]` | full-bleed image with gradient overlay, appears once |

Expect a handful. If this table grows past a dozen rows, the analysis missed a
pattern — re-run §3 with the grouping loosened before writing more rows.

### §8 Assets

The inventory — every `<img>`, `<picture>` source, CSS `background-image`, SVG,
icon font, `@font-face` file and favicon, with hash and dimensions — is generated
into `baseline/assets.json`. `fidelity.md` holds only the rules and exceptions:

| Rule | |
|---|---|
| The app ships the **same file**, sha256-equal | default |
| Or a derivative with identical intrinsic dimensions | only if listed in §11 |
| Every face and weight the mockup loads is loaded | no fallback renders |
| Remote assets are vendored | or a §11 deviation |
| `alt` text | is copy — conventions §9 |

Icons used through a component (Button's leading icon) are covered by that
component; they are not listed again.

### §9 Behaviour

Behaviour is modular too. Define it **once per component**, then per screen only
what belongs to that screen.

**Per component** — once, applies to every instance:

| Component | Behaviour | Test |
|---|---|---|
| Button | hover / focus-visible / active / disabled styles (§4); `loading` blocks a second click | `components/button.behaviour.spec.ts` |
| Modal | opens on trigger, traps focus, closes on Esc and backdrop, returns focus | `components/modal.behaviour.spec.ts` |
| Field | shows the mirrored validation message on blur; clears on fix | `components/field.behaviour.spec.ts` |

**Per screen** — only flows that are the screen's own:

| Id | Screen flow | Trigger | Outcome | Real mechanism | Test |
|---|---|---|---|---|---|
| B-01 | Confirm submits and shows success | click Confirm | success state, reference shown | `POST /bookings` (bookings.md §1) | `booking-review.flow.spec.ts` |
| B-02 | Window banner near the cut-off | open within 2h of start | banner, Confirm disabled | `E-BOOKINGS-WINDOW` → advisory banner | same file |

The extractor lists every inline handler, toggled class and `?state=` value in
the mockup; each must land in exactly one of the two tables. A state reachable
only through `?state=` is **not** implemented — every state has a real trigger.

### §10 Comparison and harness

| What | Compared by | Tolerance |
|---|---|---|
| Whole screen | Screenshot per §1 screen × state × viewport | `maxDiffPixelRatio` from Decisions — default **0.001** |
| Text roles (§5) | Every `data-role` instance vs its role's baseline | **Exact** |
| Components (§4) | Every `data-component` instance vs its variant × state baseline | **Exact** |
| One-offs (§7) | Each vs its own baseline | **Exact** |
| Assets (§8) | sha256, or §11 derivative | **Exact** |
| Behaviour (§9) | e2e assertion per row | Pass / fail |

```
tests/fidelity/
  analyse.ts                 renders the mockup, groups, writes baseline/ + the §3 summary
  baseline/                  generated from the MOCKUP, committed
    screens/<screen>.<state>.<vw>.png
    text-roles.json          per role
    components.json          per component × variant × state
    one-offs.json            per §7 key
    assets.json              hash, dimensions, used-by
  components/<component>.behaviour.spec.ts   §9 per component — written once
  <screen>.visual.spec.ts    pixel comparison
  <screen>.style.spec.ts     iterates data-component / data-role instances — no per-element code
  <screen>.flow.spec.ts      §9 per-screen rows
  assets.spec.ts
```

| Command | Does |
|---|---|
| `pnpm fidelity:analyse` | Serves `mockup/`, renders every §1 row, groups, writes `baseline/` and prints the §3 summary |
| `pnpm test:fidelity` | Renders the app under §2 and compares against `baseline/`; `-- <screen>` limits it to one screen |

The style specs are **generic**: one loop over every `data-component` and
`data-role` element on the page, looking up its baseline by name. Adding a
screen adds a §1 row and a fixture, not test code.

The baseline is regenerated **only when the mockup changes**, in the same commit
as the mockup change and the S5 update. Regenerating it from the app, or to make
a failing run pass, is lowering the bar (SR-5).

### §11 Allowed deviations

| Id | Applies to | Mockup | App | Reason | Approved by |
|---|---|---|---|---|---|
| FD-01 | Card (2 instances) | padding 18px | 16px, as the other 4 | near-duplicate unified (§3) | user, `<date>` |
| FD-02 | `review.hero` | JPEG 412 KB | AVIF 96 KB, same 1600×900 | page-weight budget (NFR) | user, `<date>` |

Empty until the user decides otherwise. A difference not listed here is a defect.

## Appending to `phases.md`

Add one phase at the end of the frontend track. Criteria follow the modules, so
the shared parts are proven once, before the screens that reuse them:

```markdown
## Phase F<n> — Mockup parity

**Goal:** every screen, in every state, at every width, is indistinguishable from the signed-off mockup and does for real what the mockup demonstrates.

| Area | Files |
|------|-------|
| Harness | `tests/fidelity/analyse.ts`, `tests/fidelity/baseline/` |
| Suites | `tests/fidelity/**/*.spec.ts` |

### Exit criteria

- [ ] `pnpm fidelity:analyse` regenerates `baseline/` from `mockup/` with no diff to the committed baseline
- [ ] Text roles — every `data-role` instance equals its role baseline (`*.style.spec.ts`)
- [ ] Button — every variant × state equals its baseline; behaviour spec green (`components/button.behaviour.spec.ts`)
- [ ] Modal — … (one criterion per §4 component)
- [ ] `booking-review` — pixel diff ≤ 0.001, all states × widths; flows B-01 … B-07 green (one criterion per screen)
- [ ] Every asset hash-equal or listed in §11 (`assets.spec.ts`)
```

Add one row to `phases.md` §2 Definition of done:

| Area | Requirement |
|---|---|
| Fidelity | A criterion that touches a component or screen runs its `tests/fidelity/` suites once they exist; a parity regression is a red test |

## Decisions to ask

| Decision | What to put in front of the user |
|---|---|
| Near-duplicates | Each one from §3: unify to the majority value, or keep as a variant |
| Viewports | Widths from the mockup's `@media` rules; if none, candidates (375 · 768 · 1280 vs 390 · 1440) — more widths, more baselines |
| Pixel tolerance | 0 (brittle across rasterisers) · **0.001** (recommended — catches a 1px padding change) · 0.01 (misses small drift) |
| Deviations | Each place the app cannot match — an asset the budget forbids, an animation an a11y NFR removes |
| Remote assets | Vendor them, or approve a §11 deviation |

## Exit criteria

- [ ] `pnpm fidelity:analyse` ran, and §3 holds its summary as counts
- [ ] Every §3 component is a §4 catalog entry, and matches the S5 UI kit — or S5 is updated
- [ ] Every near-duplicate was decided by the user: unified (§11) or a variant (§4)
- [ ] Text roles and components are defined once, by token name; no computed value is typed into `fidelity.md`
- [ ] §7 one-offs are few, each with a reason
- [ ] Every handler, toggled class and `?state=` value lands in exactly one §9 table, with a real mechanism and a test
- [ ] `phases.md` has the Mockup parity phase — components first, then screens — and the Fidelity row in its definition of done
