# L3 — `docs/landing/sections/NN-<name>.md`, one per section

**Reads first:** `docs/landing/rules.md`, `docs/landing/story.md`,
[`seams.md`](./seams.md), [`craft.md`](./craft.md), the mockup, and the companion skills at **L3** in
[`skills.md`](./skills.md) (`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`,
`gsap-plugins`, `scroll-experience`, `scroll-cinema`, `svg-character-animation`,
`svg-art`, `svg-illustration`, `diagram-design`, `frontend-design`, `impeccable`,
`motion-director`).

One document per spine row. Each describes exactly how the section looks, reads and
moves, and how it **receives from the section above and hands on to the section
below**. A builder with no other context can build it from this document, and its
seams will meet its neighbours'.

---

## Template

```markdown
# NN — <Name>

**Stage:** L3 · **Beat:** <the spine's beat, verbatim> · **Source:** BRD-…, PRD-…

<one paragraph: the section's job in the story, and what it deliberately does not do>

## Entry — what arrives from NN-1
| Field | Value |
|---|---|
| Object | <form>, held by NN-1 until <hand-off position>, received at <point> |
| Thread | stitch S = <x desktop> / <x phone>, vertical, colour <shade> |
| Timing | incoming draws from the seam line (<fraction>) |
| Stacking | NN-1 above until hand-off; this section above after |

## Scene
Scene type (from `craft.md` §1), the `100svh` stage, and how the viewport is
composed on desktop and re-composed on phone — not shrunk. The signature technique
and every other capability used, each with the beat it serves.

## Layout
Desktop and phone, top to bottom. Grid, columns, what is pinned. Every colour a shade
from `rules.md`, every size a step of its scale.

## Copy
Every line, in order, each with its source: `mockup:<file>#<selector>` or
`derived:<BRD/PRD id>`. Nothing else.

## Visual
The SVG and illustration parts: what is drawn, how (stroke family, `pathLength="1"`),
what each part means. No stock imagery.

## Motion
The section's timeline as beats, in order:

| Beat | Trigger (scrub or timed) | What moves | Capability (craft §3) | Verb (from rules §7) | Reduced motion |
|---|---|---|---|---|---|

Pin length in screens (matches the spine). The signature moment, described frame by
frame in the visitor's terms.

## Exit — what leaves for NN+1
| Field | Value |
|---|---|
| Object | <form> at <point>, handed off at <position> |
| Thread | stitch S = <x desktop> / <x phone>, vertical, colour <shade> |
| Timing | outgoing reaches the seam by the seam line (<fraction>) |
| Stacking | this section above until hand-off |

## Without motion
No-JS and reduced motion: what the visitor sees instead, and that every line of copy
still reads in order.

## Checks
- [ ] The build's seam audit shows this section's entry and exit joined at 85/55/25%.
- [ ] The seam test passes for both of its seams.
- [ ] <section-specific checks: copy present, pin length, signature moment visible>
```

The first section has no **Entry**; the last has no **Exit**. Everything else has both.

---

## Gate — the seam check

After every section document is written, compare each adjacent pair. Section N's
**Exit** table and section N+1's **Entry** table must agree, field by field, and both
must equal the seam's row in `story.md` §5:

| Field | Must be equal |
|---|---|
| Object | form, holder, hand-off position, point |
| Thread | stitch x on desktop and on phone, vertical, colour shade |
| Timing | the same seam line fraction |
| Stacking | giver above until hand-off, receiver above after |

Print every mismatch as `NN → NN+1  <field>  <what each side says>`, fix the
documents, and run the gate again. L3 is complete only when the gate prints nothing.

## Decisions to ask (L3)

Only where the spine leaves a real choice open — for example, two ways to stage a
signature moment, or whether a diagrammatic section is drawn or illustrated. Never
re-ask what `rules.md` or `story.md` settled.

## Exit criteria

- [ ] One document per spine row, named `NN-<name>.md` in page order.
- [ ] Every copy line carries a source; nothing invented.
- [ ] Every colour is a named shade from `rules.md`; no flat values.
- [ ] Every motion beat names its verb and its reduced-motion equivalent.
- [ ] Pin lengths match the spine.
- [ ] Every section is a full-screen scene with its type, signature technique and
      phone re-composition written down.
- [ ] Every capability named serves a beat in the Motion table.
- [ ] The seam gate prints nothing.
