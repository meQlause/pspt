# L2 — `docs/landing/story.md`, the spine and the seam map

**Reads first:** `docs/landing/rules.md`, the BRD and PRD (or `docs/landing/brief.md`), the mockup,
[`seams.md`](./seams.md), [`craft.md`](./craft.md), and the companion skills at **L2** in
[`skills.md`](./skills.md) (`gsap-scrolltrigger`, `scroll-experience`,
`scrollytelling`, `scroll-cinema`, `award-winning-website`, `motion-director`).

`story.md` is the page in one table. It decides the order of the sections, what each
one is for, and how each one joins the next, **before** any section is designed on
its own. Sections are written against it in L3; the seam gate checks them against it.

---

## Required sections

### 1. The arc

Three to five sentences: where the visitor starts (the pain, in the BRD's words),
what turns, and where they end (the ask). Each sentence names the BRD objective or
PRD feature id it serves.

### 2. The carried object

What it is in the product's own world (an order, a message, a request), and every
form it takes, in page order:

| Form | First section | Last section | Looks like | Morph into the next form |
|---|---|---|---|---|

### 3. The thread

What the line means in the story, its colours by state (each a named shade from
`rules.md`), its stroke family, and where it is a rail on phones.

### 4. The spine

One row per section, in page order. This table **is** the page:

| NN | Name | Beat — what the visitor understands | Source ids | Scene type | Techniques | Object in → out | Thread colour in → out | Pin (screens) | Signature moment |
|---|---|---|---|---|---|---|---|---|---|

- **Beat** is one sentence, from the visitor's side, never a feature list.
- **Source ids** trace to the BRD/PRD (and SRS if present). A row with no source id
  does not belong on the page.
- **Scene type** comes from `craft.md` §1; no two consecutive rows share one, and the
  page uses at least six.
- **Techniques** names at least three capabilities from `craft.md` §3, the first being
  the scene's signature technique, used by no other row.
- **Pin** sums to the budget in `rules.md` §7.
- **Signature moment** is the one thing this section does that no other section does.
  No two rows share one.

### 5. The seam map

One row per seam. Every value here is copied verbatim into the two section documents
it joins:

| Seam | Giver → receiver | Stitch S desktop | Stitch S phone | What crosses | Hand-off at | Thread colour | Transition device |
|---|---|---|---|---|---|---|---|
| 01→02 | hero → problem | (centre, boundary) | (centre, boundary) | pill + thread | receiver `top 35%` | sage | the pill drops through the seam and lands in the pile |

- **Transition device** names what carries the eye across, in one clause, in the
  visitor's terms, and the `craft.md` §2 device that builds it. "Fade" or "next section scrolls in" is not a device.
- Stitch points obey [`seams.md`](./seams.md) §1: vertical on both sides, moved off
  centre when the room demands, on the rail on phones when both neighbours use it.

### 6. Pacing

The page as a sequence of tempos — calm, dense, pinned, release — one word per
section, and where the visitor rests. No two pinned sections touch without a release
between them.

---

## Decisions to ask (L2)

1. **Section list and order** — candidates derived from the BRD's narrative and the
   PRD's features; trade-off: completeness vs length.
2. **The carried object** — what it is and its forms.
3. **The signature moment** of any section where two strong candidates exist.

## Exit criteria

- [ ] Every spine row has a beat, a source id, an object in/out, a thread colour
      in/out, a pin value and a signature moment.
- [ ] Pins sum to the budget in `rules.md`.
- [ ] Every seam has a row; each row names a transition device in the visitor's terms.
- [ ] Each seam's thread colour equals the giver's out and the receiver's in.
- [ ] Every stitch point satisfies `seams.md` §1 on desktop and phone.
- [ ] No two sections share a signature moment or a signature technique.
- [ ] Every row is a full-screen scene with a scene type; no two consecutive rows
      share one; at least six types on the page.
- [ ] The page uses at least ten distinct capabilities, each serving a named beat.
- [ ] Every colour named is a shade from `rules.md`.
