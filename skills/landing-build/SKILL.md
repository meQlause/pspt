---
name: landing-build
description: Code the landing page into the scaffold /pspt:landing-spec wrote — one section per run, straight into that section's own folder (landing/sections/NN-name/index.html, style.css, script.js), as a full-screen scroll-told scene with GSAP's whole plugin set, SVG and, where it fits, Motion. Each section is joined to the one above it through the small shared layer (stitch, SEAM, handoff), checked by eye in the browser on desktop and phone, recorded and committed. No framework, no tests, no toolchain. Use for "/pspt:landing-build", "build the landing page", "build the next landing section", "build 04", or after /pspt:landing-spec reports L4 complete.
---

# Build the landing page

`docs/landing/` says what the page is; `./landing/` is the scaffold `/pspt:landing-spec`
L4 wrote. This skill fills **one section's folder per run**, in page order, and joins
it to the section above before stopping. It implements the documents; it does not
redesign them.

Read before any code, every run:

- [`references/landing/architecture.md`](../../references/landing/architecture.md) —
  the scaffold, the shared layer, what a section's three files hold.
- [`references/landing/seams.md`](../../references/landing/seams.md) — the seam contract.
- [`references/landing/craft.md`](../../references/landing/craft.md) — full-screen
  scenes, the capability palette, the live reference search.
- `references/frontend-copy.md`.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): jcodemunch and
ponytail. Ponytail keeps the code small; it never trims a beat, a seam rule or an
accessibility state the documents ask for.

## Step 0 — Ready to build?

Read `docs/.pspt.json` → `landing`. Required: `l3` and `l4` set, `./landing/` present
with `shared/page.js` and one `sections/NN-name/` folder per id in `sections`.
Missing → stop:

```
Not ready to build — ./landing/ has no scaffold.
Run /pspt:landing-spec to finish L4.
```

## Step 1 — Pick the section

The argument when given (`04` → `04-<name>`); otherwise the first id in `sections`
that is not in `built`. **One section per run.** A section whose neighbour above is
not built yet is still built — its Entry is coded to the document, and joined for
real when that neighbour lands.

## Step 2 — Read it whole

1. `docs/landing/sections/NN-<name>.md` — every block: Entry, Scene, Layout, Copy,
   Visual, Motion, Exit, Without motion.
2. Its row in `story.md` and both seam rows that touch it; the Exit of the section
   above and the Entry of the section below.
3. `rules.md` — the families, the motion verbs, the bans.
4. Companion skills: read [`skills.md`](../../references/landing/skills.md) and the
   `SKILL.md` of every installed row whose **Read at** includes **B**. Missing ones are
   offered once, never required.
5. **Look the technique up live** for the signature moment and any capability not yet
   used on this page (`craft.md` §5): open what you cite, take the technique, never the
   look or the code wholesale.

## Step 3 — Code it, inside its folder

Write only in `landing/sections/NN-<name>/`:

| File | Holds |
|---|---|
| `index.html` | The document's copy, in order, inside the `[data-stage]`; the SVG it draws; the `data-carried` object if it holds one. Keep the root's `data-section`, `data-scene`, `data-giver` and thread anchors as the scaffold wrote them |
| `style.css` | The still composition first (the page without motion, which is also reduced motion and no JavaScript), then `[data-section='NN-name'][data-motion]` for the animated state. Colours only `var(--<shade>)`; the stage fills `100svh`; phone re-composed, not shrunk |
| `script.js` | `export default function scene(root, page)`: the Motion table beat by beat with the capabilities it names, named numbers at the top of the file, `page.conditions.phone` for the phone scene, returns a cleanup that kills what it made |

**Join it.** Entry and Exit exactly as the document says, through `page` only:
`page.stitch` at the stitch point for every thread segment touching a seam,
`page.handoff.exit / incoming / receive` at the named hand-off position, drawing
scrubbed to `page.SEAM`. Never leave a seam for later.

**`shared/` is not edited** in a section run. If the section truly needs something
shared (a new token, a carried form), add it in the smallest form, say so in the
report, and keep it out of every other section's folder.

## Step 4 — Look at it

With `npm run dev` running (start it in the background if it is not), open the page
with whatever browser tool the session has, desktop width and phone width:

- the section fills the screen as its scene type says; its signature moment plays;
- every beat in the Motion table happens, in order, scrubbed or timed as written;
- the seam above (and below, if built) joins with the seam at 85%, 55% and 25% of the
  viewport — no gap, kink, detour, cropped object, or line drawn ahead of the one
  before it;
- reduced motion shows the still composition; the console shows no errors.

Fix what is off and look again. Three honest attempts at the same problem → stop and
say exactly what is wrong and what was tried.

## Step 5 — Record, commit, stop

Add the id to `landing.built` in `docs/.pspt.json`. Commit, staging paths explicitly
(never `git add -A`), only inside a git repository:

```
feat(landing): NN <name> — <one line: the scene and its signature moment>

<what was built, the seams joined, anything added to shared/, wrapped at 100>
```

**SR-6:** no `Co-Authored-By` trailer, no tool attribution. **No push.**

Report in three lines and stop:

```
04 how-it-works built.  Pinned horizontal track, MorphSVG order → notification; seams 03→04 and 04→05 joined.  Committed: 9c1e2aa.

Open it at http://localhost:5173 and scroll it; anything that feels off is cheapest to fix now.
Next: /pspt:landing-build  → 05-for-each-person
```

When the last section is built, the next line offers one whole-page pass: every seam
looked at top to bottom and back, on desktop and phone.

---

## Never

- **Never touch another section's folder** in a section's run.
- **Never redesign.** If a document is wrong or cannot be built, stop and say which;
  `/pspt:landing-spec NN` regenerates it. The documents change first.
- **Never invent copy**, a claim, a figure or an asset.
- **Never a flat colour** — only the shades in `tokens.css`.
- **Never two engines on one element** — GSAP and Motion, or two scroll engines.
- **Never push.** The user pushes.
