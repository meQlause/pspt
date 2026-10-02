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

The mockup is the baseline, never the app. Every number in this stage is read
off the mockup **rendered in Chromium**, not off its CSS by eye and not off the
app after the fact.

---

## Gate

S5 and S6 must be complete: every screen and state has a refactor-map row and a
screen document, and `phases.md` exists. If the mockup changed since S5, stop and
re-run S5 first — a baseline taken from a mockup the spec does not describe
measures the wrong thing.

## Required sections

| # | Section | Content |
|---|---|---|
| 1 | Matrix | Every mockup file × every state × every viewport. One row per combination. This is what "the whole app" means |
| 2 | Render parity | The conditions both sides render under, so a difference is a defect and never noise |
| 3 | Element map | Mockup selector → app `data-testid`, for every element the comparison names |
| 4 | Typography | Per text role, the computed values read from the mockup |
| 5 | Box model | Per element, padding, margin, gap, size, border, radius, shadow read from the mockup |
| 6 | Assets | Every image, SVG, icon, font file and favicon, with its hash and dimensions |
| 7 | Behaviour | Every interaction the mockup demonstrates, and the real mechanism that replaces its dummy script |
| 8 | Comparison and tolerances | How each section is compared, and the tolerance for each |
| 9 | Allowed deviations | Every intended difference from the mockup, with its reason and the user's approval |
| 10 | Harness | The `tests/fidelity/` layout, the extraction script, the commands |

### §1 Matrix

| Mockup file | State | Viewports | App route | Fixture |
|---|---|---|---|---|
| `booking-review.html` | `?state=default` | 375 · 768 · 1280 | `/bookings/:id/review` | `reviewDraft()` |
| `booking-review.html` | `?state=window` | 375 · 768 · 1280 | `/bookings/:id/review` | `reviewDraft({ startsIn: '2h' })` |

Every row of the S5 refactor map appears here once per viewport. Viewports are
the mockup's own breakpoints, read from its `@media` rules — one width inside
each range. If the mockup has no media queries, ask (see Decisions).

> The matrix is the definition of done for fidelity. A state with no row is a
> state nobody will compare, which is exactly the state that ships broken.

### §2 Render parity

A screenshot difference must mean a defect. These make it so:

| Condition | Both sides |
|---|---|
| Browser | Chromium, the version Playwright pins (SR-4) |
| Viewport and scale | The §1 width, a fixed height, `deviceScaleFactor: 1` |
| Data | The app renders **the values the mockup shows** — a fixture builder per row reproduces the mockup's dummy data exactly (`Futsal A`, `Rp 399.600`), served through the real API |
| Clock and locale | Frozen to the instant and locale the mockup implies; timezone from the row, never the machine |
| Fonts | Loaded before capture (`document.fonts.ready`); no fallback font may render |
| Motion | Animations and transitions disabled for capture only; §7 tests them separately |
| Network | No third-party request; anything the mockup loads remotely is vendored as an asset (§6) |

### §3 Element map

The comparison names elements, so both sides must be addressable:

| Key | Mockup selector | App selector |
|---|---|---|
| `review.title` | `#review h1` | `[data-testid="review-title"]` |
| `review.total` | `.summary .total .amount` | `[data-testid="review-total"]` |
| `review.confirm` | `#confirm` | `[data-testid="review-confirm"]` |

Map every text role, every component the S5 UI kit extracted, every control, and
every asset. The mockup is **never edited** to add test ids — it is the signed-off
artifact; the mapping lives here.

### §4 Typography

Read with `getComputedStyle` from the rendered mockup, one row per text role.
Values are what the browser computed, in `px` — not the CSS as written.

| Key | font-family (first resolved face) | size | weight | style | line-height | letter-spacing | transform | color |
|---|---|---|---|---|---|---|---|---|
| `review.title` | `Inter` | 24px | 700 | normal | 32px | -0.48px | none | `rgb(29, 29, 27)` |
| `review.total` | `Inter` | 16px | 800 | normal | 24px | normal | none | `rgb(29, 29, 27)` |

Every value must also exist as a token in `design-system.md` §2. A computed value
with no token is a gap in S5 — add the token there first.

### §5 Box model

| Key | padding | margin | gap | width / height | border | radius | shadow |
|---|---|---|---|---|---|---|---|
| `review.card` | 16px 18px | 6px 0 0 | — | auto / auto | 1px solid `rgb(217, 214, 204)` | 12px | none |
| `review.confirm` | 12px 20px | 18px 0 0 | — | auto / 44px | none | 10px | none |

Also read per interactive state — `:hover`, `:focus-visible`, `:active`,
`:disabled` — for every control, by driving the state in the browser, not by
reading the stylesheet.

### §6 Assets

Inventory every file the mockup renders — `<img>`, `<picture>` sources, CSS
`background-image`, inline and external SVG, icon fonts, `@font-face` files,
favicon and touch icons.

| Asset | Used by | Intrinsic size | Rendered size | `alt` | sha256 |
|---|---|---|---|---|---|
| `img/court-futsal-a.jpg` | `review.hero` | 1600×900 | 640×360 | Futsal A court | `9f2c…e41a` |
| `fonts/Inter-Bold.woff2` | all 700 text | — | — | — | `51b0…7c03` |

The app ships **the same file** — equal hash — or a derivative listed in §9 with
identical intrinsic dimensions and the reason (e.g. AVIF conversion). Every face
and weight the mockup loads is loaded by the app; nothing renders in a fallback.
`alt` text is copy, and follows conventions §9.

### §7 Behaviour

The mockup demonstrates behaviour with dummy scripts and `?state=` switches. The
app must do the same things **for real**. One row per behaviour:

| Id | Behaviour in the mockup | Trigger | Outcome | Real mechanism in the app | Test |
|---|---|---|---|---|---|
| B-01 | Confirm submits and shows the success state | click `review.confirm` | success screen, reference shown | `POST /bookings` (bookings.md §1) | `tests/fidelity/booking-review.behaviour.spec.ts` |
| B-02 | Window banner appears near the cut-off | open within 2h of start | banner, confirm disabled | server `E-BOOKINGS-WINDOW` → advisory banner (error-handling §5) | same file |
| B-03 | Confirm shows hover and focus rings | hover / Tab | §5 hover and focus values | CSS | same file |

Read the mockup's inline scripts and every `?state=` value to build this table —
every handler, every toggled class, every state reachable by a control. Include
keyboard order, focus management, sticky and scroll behaviour, transitions
(duration and easing, read from the mockup), and form validation messages.

A behaviour that only works because the app reads `?state=` is **not**
implemented — each state is reached through its real trigger.

### §8 Comparison and tolerances

| What | Compared by | Tolerance |
|---|---|---|
| Whole screen | Screenshot of mockup vs app per §1 row, pixel diff | `maxDiffPixelRatio` from Decisions — default **0.001** |
| Typography (§4) | Computed style of each key, both sides | **Exact** |
| Box model (§5) | Computed style of each key, each interactive state | **Exact** |
| Assets (§6) | sha256, or §9 derivative with equal intrinsic size | **Exact** |
| Behaviour (§7) | End-to-end assertion per row | Pass / fail |

Masks are allowed only for a region §9 lists, never to make a run pass. The
pixel diff catches what the inventories missed; the inventories say *what* is
wrong when the pixel diff fails. Both are required — a pixel diff alone says
"12% different" and nothing else.

### §9 Allowed deviations

| Id | Element | Mockup | App | Reason | Approved by |
|---|---|---|---|---|---|
| FD-01 | `review.hero` | JPEG 412 KB | AVIF 96 KB, same 1600×900 | page weight budget (NFR) | user, `<date>` |

Empty by default. Every row is a decision the user made, asked with
`AskUserQuestion` — the assistant never grants itself a deviation. A difference
not listed here is a defect.

### §10 Harness

```
tests/fidelity/
  baseline/                       ← generated from the MOCKUP, committed
    <screen>.<state>.<vw>.png
    styles.json                   §4 + §5, per key, per interactive state
    assets.json                   §6 hashes and sizes
  extract.ts                      renders the mockup, writes baseline/
  <screen>.visual.spec.ts         §1 × §8 pixel comparison
  <screen>.style.spec.ts          §4 + §5 exact comparison
  <screen>.behaviour.spec.ts      §7 rows
  assets.spec.ts                  §6 hashes
```

| Command | Does |
|---|---|
| `pnpm fidelity:baseline` | Serves `mockup/` statically, renders every §1 row, writes `baseline/` |
| `pnpm test:fidelity` | Renders the app under §2, compares against `baseline/` |

The baseline is regenerated **only when the mockup changes**, in the same commit
as the mockup change and the S5 update. Regenerating it from the app, or to make
a failing run pass, is lowering the bar (SR-5).

## Appending to `phases.md`

Add one phase at the end of the frontend track, after the last screen phase:

```markdown
## Phase F<n> — Mockup parity

**Goal:** every screen, in every state, at every width, is indistinguishable from the signed-off mockup and does for real what the mockup demonstrates.

| Area | Files |
|------|-------|
| Harness | `tests/fidelity/extract.ts`, `tests/fidelity/baseline/` |
| Suites | `tests/fidelity/*.spec.ts` |

### Exit criteria

- [ ] `pnpm fidelity:baseline` regenerates `baseline/` from `mockup/` with no diff to the committed baseline
- [ ] `booking-review` — pixel diff ≤ 0.001 for all 5 states at 375 · 768 · 1280 (`booking-review.visual.spec.ts`)
- [ ] `booking-review` — §4 typography and §5 box model equal for every key and interactive state (`booking-review.style.spec.ts`)
- [ ] `booking-review` — behaviours B-01 … B-07 pass against the real API (`booking-review.behaviour.spec.ts`)
- [ ] Every §6 asset hash-equal or listed in §9 (`assets.spec.ts`)
- [ ] `docs/FE/fidelity.md` §9 lists every remaining difference, each approved

> Parity is proven once at the end because it needs every screen built — but it
> is **checked** on every frontend criterion before that (see Definition of done).
```

One exit criterion per screen per comparison kind, naming its spec file, so
`/pspt:build` can take them one at a time.

Add one row to `phases.md` §2 Definition of done:

| Area | Requirement |
|---|---|
| Fidelity | A criterion that touches a screen runs that screen's `tests/fidelity/` suites once they exist; a parity regression is a red test |

## Decisions to ask

| Decision | What to put in front of the user |
|---|---|
| Viewports | The widths read from the mockup's `@media` rules; if it has none, candidates (375 · 768 · 1280 vs 390 · 1440) with the trade-off: more widths, more baselines to maintain |
| Pixel tolerance | 0 (any pixel fails — brittle across font rasterisers) · **0.001** (recommended — catches a 1px padding change on a full screen) · 0.01 (lenient — misses small spacing drift) |
| Deviations | Every place the app *cannot* match — an asset the budget forbids, an animation the a11y NFR removes — each as its own question |
| Remote assets | Anything the mockup loads from a CDN: vendor it, or approve a §9 deviation |

## Exit criteria

- [ ] Every refactor-map row from S5 appears in §1 at every viewport
- [ ] §4 and §5 values were read from the rendered mockup, and each maps to a `design-system.md` token
- [ ] Every element named in §4–§7 has a §3 mapping on both sides
- [ ] Every asset the mockup renders is in §6 with its hash
- [ ] Every handler, toggled class and `?state=` value in the mockup has a §7 row with a real mechanism and a test
- [ ] Tolerances are decided, and §9 contains only user-approved deviations
- [ ] `phases.md` has the Mockup parity phase, one criterion per screen per comparison, and the Fidelity row in its definition of done
