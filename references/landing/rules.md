# L1 — `docs/landing/rules.md`, the creative general rules

**Reads first:** the BRD and PRD (or `docs/landing/brief.md`), the mockup's CSS, `docs/FE/design-system.md` if it
exists, and the companion skills at **L1** in [`skills.md`](./skills.md)
(`frontend-design`, `impeccable`, `gsap-core`, `gsap-performance`, `award-winning-website`,
`ui-2026-cinematic`, `svg-art`, `motion-framer`).

`rules.md` is the page's character, written down. Every section document inherits it
and may not contradict it. It is creative, so it is written with taste: named things,
concrete images, a voice. It is also a contract, so every rule is checkable.

---

## The one rule behind all the others: families, never flats

**Not yellow, but yellows. Not black, but blacks.** No colour on this page is ever
one flat value. Every colour is a **family** of three to six named shades, and each
shade has a role. The same applies to type (a family with weights and roles), to
lines (a family of strokes), and to motion (a family of eases).

```markdown
### Blacks — the ink of the page
| Shade      | Value     | Role                                   | Never                    |
|------------|-----------|----------------------------------------|--------------------------|
| Pine ink   | `#14261d` | Headlines, the thread at its strongest | Body copy below 16px     |
| Night moss | `#1b3328` | Dark panels, the phone body            | Text on night moss       |
| Soot green | `#2a3b33` | Body text                              | Large fills              |
| Wet slate  | `#4a5a52` | Secondary text, captions               | Anything that must win   |

> There is no `#000` on this page. True black flattens every green beside it into
> grey; a tinted black keeps the palette one family.
```

Names come from the product's world, not from a colour wheel (*ledger cream*, *chat
mint*, *warehouse rust*), and every value comes from the mockup's CSS or is derived
from one. A new shade is allowed only to complete a family, and the document says
which mockup value it was derived from.

**Banned outright:** `#000`, `#fff`, pure primaries (`#ff0000`, `#ffff00`, `#0000ff`),
a framework's default palette (Tailwind `slate-500` and friends), purple-on-white
gradients, gradient text, and one colour used for both meaning and decoration.

---

## Required sections

| § | Section | Must contain |
|---|---|---|
| 1 | **Character** | One sentence of what the page is, three adjectives it must earn and three it must never earn, and the material metaphor that every visual borrows from (paper, thread and stitch; glass and light; ledger and ink). Traced to a BRD objective |
| 2 | **Colour families** | Every family as the table above: shade name, value, role, never. Contrast pairs that pass WCAG AA, with their ratio. Which family carries meaning (danger, done, the thread) and which only decorates |
| 3 | **Type families** | Display, text and mono roles, each with face, weights, size scale (`clamp()` per step), tracking and line height. Faces come from the mockup; if the mockup uses a face that `frontend-design` or `impeccable` bans (Inter, Roboto, Arial, system UI), stop and ask with candidates — never swap silently |
| 4 | **Space and rhythm** | The spacing scale, section gutters on desktop and phone (phone gutter ≥ 16px), the grid, and the vertical rhythm between sections |
| 5 | **Shape and line** | Corner radii by size, the stroke family (widths, caps, joins), shadow family (named like colours, tinted, never grey `rgba(0,0,0,…)`), and the border family |
| 6 | **SVG language** | Hand-authored SVG only: stroke-based or fill-based, icon grid, how illustrations are built (paths drawn with `pathLength="1"` so they can be drawn on), what is never an SVG (photos, text) |
| 7 | **Motion grammar** | Named verbs with their GSAP ease and duration (*arrive*: `power3.out` 0.6s; *settle*: `back.out(1.6)`; *drift*: `none`, scrubbed). When motion is scrubbed to scroll and when it is timed. The pin budget for the whole page, in screens. One smooth scroll (ScrollSmoother) and its settings. The reduced-motion equivalent of every verb. The **capability palette**: which of [`craft.md`](./craft.md) §3 the page uses (≥ 10), and any CustomEase it names |
| 8 | **The spine** | The carried object (what it is in the product's own words, and its forms), the thread (what it means, its colours by state) — one paragraph each; [`story.md`](./story.md) maps them, this section names them |
| 9 | **Copy voice** | Sentence length, person, what is never said, numerals vs words. Copy itself follows `references/frontend-copy.md`: from the mockup, or derived from a named BRD/PRD passage |
| 10 | **Bans — the anti-slop list** | At least twelve, each with its reason (see below) |
| 11 | **Budgets** | No-JS reading order (the page reads fully without motion), `prefers-reduced-motion`, phone width without horizontal scroll, entry bundle (gzip) budget, CLS, and frame budget for motion (transform and opacity only) |
| 12 | **References** | Three to five real sites, found by a live search and opened, per [`craft.md`](./craft.md) §5, each with its URL and what is taken from it — a technique, a pacing, a composition, never a copied look |

## The bans list

Start from these, then add what the product's own world makes cliché:

| Ban | Why |
|---|---|
| A hero gradient blob or orb | Says "AI startup", says nothing about the product |
| Emoji as icons | Unequal weight, no stroke family, reads as placeholder |
| Glass cards with blur on everything | Lowers contrast and costs frames on phones |
| A three-up feature grid of icon, title, line | The template every page has; tell it as a beat instead |
| "Trusted by" logos without permission or data | A claim the BRD does not make |
| Sparkles, shimmer on idle text, cursor trails | Motion without meaning |
| Lorem ipsum or invented figures | `frontend-copy.md` — never invented |
| Gradient text | Unreadable at small sizes, a template tell |
| Parallax on text | Text that drifts from its line is harder to read |
| Scroll-jacking that changes scroll speed | The visitor owns the wheel; ScrollSmoother smooths, it never re-maps |
| A second scroll engine (Lenis, Locomotive) | Two engines fight over the same pixels |
| Flat `#000` / `#fff`, a flat colour anywhere | The families rule |

> Each ban carries its reason in the document. A ban without a reason is argued with
> in week two and dropped in week three.

---

## Decisions to ask (L1)

Ask each with `AskUserQuestion`, two or more candidates with trade-off and trap:

1. **Material metaphor** — derived candidates from the BRD/PRD world.
2. **Thread colours by state** — which family the thread wears while lost, carried
   and delivered.
3. **Pin budget** — total screens of pinned scroll for the page (more story vs a
   page that feels long).

## Exit criteria

- [ ] Every colour value in the document belongs to a named family of ≥ 3 shades.
- [ ] No banned value appears anywhere (`#000`, `#fff`, pure primaries, framework palettes).
- [ ] Every family value traces to the mockup's CSS or names the value it was derived from.
- [ ] Contrast pairs listed with ratios; every text pair passes WCAG AA.
- [ ] Type faces come from the mockup, or the user chose them from asked candidates.
- [ ] Every motion verb names its GSAP ease, duration, and its reduced-motion equivalent.
- [ ] The pin budget is a number of screens.
- [ ] The capability palette names ≥ 10 capabilities from `craft.md` §3.
- [ ] Three to five references, each with what is taken from it.
- [ ] ≥ 12 bans, each with its reason.
- [ ] The character sentence traces to a BRD objective id.
