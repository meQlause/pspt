---
name: landing-build
description: Implement the landing page that /pspt:landing-spec specified — docs/landing/rules.md, story.md and every sections/NN-*.md — as a full-screen, scroll-told React + TypeScript page using GSAP's whole plugin set, SVG and Framer Motion. Plans the build once, then takes one phase per run (the motion foundation, then each section in page order joined to the one above it, then hardening), writes the tests first, proves every seam with a screenshot audit and an e2e seam test, ticks the phase and commits. Use for "/pspt:landing-build", "build the landing page", "implement the landing docs", "build the next landing section", or after /pspt:landing-spec reports L3 complete.
---

# Build the landing page

`docs/landing/` says what the page is. This skill makes it real, **one phase per
run**, in page order, each section joined to the one above it before the next one
starts. It implements the documents; it does not redesign them.

Read these before any code, every run:

- [`references/landing/architecture.md`](../../references/landing/architecture.md) —
  stack, folders, the motion layer contracts, the tests that stay with the page.
- [`references/landing/seams.md`](../../references/landing/seams.md) — the seam contract.
- [`references/landing/craft.md`](../../references/landing/craft.md) — full-screen
  scenes, the capability palette, the live reference search.
- `references/conventions.md`, `references/frontend-copy.md`.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): jcodemunch and
ponytail must be present. Ponytail decides how little code a change needs; it never
trims a beat, a seam rule, a test or an accessibility state the documents ask for.

## Step 0 — The specification must be complete

Read `docs/.pspt.json` → `landing`. Required: `l1`, `l2` and `l3` set, and
`docs/landing/rules.md`, `story.md` and one `sections/NN-*.md` per spine row present.
Run the seam gate from [`sections.md`](../../references/landing/sections.md) §Gate
once more — the documents may have been edited by hand.

Anything missing or a gate mismatch → **stop**:

```
Not ready to build — docs/landing/sections/06-quiet.md is missing; seam 03 → 04 disagrees on thread colour.
Run /pspt:landing-spec to finish L3.
```

## Step 1 — Companion skills

Read [`references/landing/skills.md`](../../references/landing/skills.md). Check which
are installed (as `/pspt:landing-spec` Step 1 does) and read the `SKILL.md` of every
installed row whose **Read at** includes **B** — `gsap-core`, `gsap-timeline`,
`gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-performance`,
`svg-character-animation`, `svg-iterative-visualization`, `frontend-design`,
`motion-framer`. Missing ones are offered once with their install command, never
required, installed only after a yes. Their craft never overrides the documents.

## Step 2 — Scaffold (first run only)

**Skip when** `.gitmodules` lists a landing submodule and it contains `package.json`.

Otherwise, the same way `/pspt:build` Step 0 creates `backend/` and `frontend/`:

1. Refuse and stop if `gh` is missing or not authenticated, or the parent is not a
   git repository (ask before `git init`).
2. `gh repo create <slug>-landing --private`, then
   `git submodule add https://github.com/<owner>/<slug>-landing landing`. An existing
   repo or folder is reused, never overwritten.
3. Inside it: Vite + React + TypeScript with the static prerender, the folders in
   `architecture.md` §2, and `gsap`, `react`, `react-dom` (plus `motion` and
   `matter-js` only when a section document needs them) at **exact** current stable
   versions.
4. Commit inside the submodule, then the parent's `.gitmodules` and pointer.

## Step 2b — Toolchain (every run)

Run `/pspt:build` Step 0b for the `react` stack against the landing submodule: the
toolchain files are copied from `references/toolchain/`, compared by hash, never
written by hand. A rule that blocks the code is satisfied by changing the code.

## Step 3 — The build plan (first run only)

Write `docs/landing/build.md` from `story.md`. One phase per row, in this order:

| Phase | Builds | Exit checks |
|---|---|---|
| **P0 Foundation** | `tokens.css` generated from every family in `rules.md` (each shade a custom property named after it); `base.css` with the section, anchor, thread, carried and hand-off rules; the motion layer (`gsap.ts` with the named verbs and CustomEases, `types.ts`, `page.ts`, `thread.ts` with `stitch` and `SEAM`, `carried.ts`, `handoff.ts`); the prerender; `tokens.test.ts`; the e2e harness (`flow`, `scenes`, `seams`, `hardening` specs, empty-safe); the seam audit script | `check`, unit, build, e2e green; `tokens.test.ts` proves no flat colour exists |
| **P1 … Pn** | One section each, in page order (Step 5) | Step 6, for this section and every seam built so far |
| **Pn+1 Hardening** | No-JS reading, reduced motion, phone at 375px, the entry bundle and CLS budgets from `rules.md` §11, lazy plugins | `hardening.spec.ts` complete and green; budgets measured and recorded |
| **Pn+2 Whole-page review** | The seam audit across every seam, desktop and phone; the coverage rules in `craft.md` §4 counted on the real page | Every seam frame joined; coverage met; nothing left unticked |

Each phase lists its exit checks as `- [ ]` boxes. Commit the plan in the parent
(`docs(landing): build plan`), then continue with P0 in the same run.

## Step 4 — Pick the phase

The first phase in `docs/landing/build.md` with an unticked box. **One phase per run.**
If an entry under "Blocked" names this phase, read it first.

## Step 5 — Build a section phase

1. **Read** the section document, its row in `story.md` (scene type, techniques,
   object, thread, pin), both seam rows that touch it, and the Entry/Exit of the
   neighbouring section documents.
2. **Look up the technique live.** For the signature technique and any capability you
   have not built on this page yet, run the real-time reference search in `craft.md`
   §5 (L3 row): open what you cite, take the technique, never the look or the code
   wholesale.
3. **Tests first (red).** `tests/unit/<name>.test.ts` asserts every copy line of the
   document, in order, in the prerendered HTML. `tests/e2e/<name>.spec.ts` asserts it
   loads with no page errors and gets `data-motion` when scrolled to. Run them; they
   fail for the right reason.
4. **Markup and still state (green).** `<Name>.tsx` with the document's copy, the
   thread anchors, `data-scene="<type>"` on the root and one `[data-stage]`; `<name>.css` composing the `100svh` scene without motion, colours
   only as `var(--<shade>)`.
5. **The scene.** `<name>.motion.ts` builds the Motion table beat by beat with the
   capabilities it names, every number in `<name>.tuning.ts`, SVG data in
   `<name>.shapes.ts`, phone re-composed under `gsap.matchMedia`, early return under
   `reduce`. Register it in `sections/index.ts` and `motions.ts`.
6. **Join it.** Entry and Exit exactly as the document says: `stitch` at the named
   stitch point, the hand-off at the named position, the stacking rule, drawing
   scrubbed to `SEAM`. Never leave a seam for "later".

## Step 6 — Check

All of these, in the landing submodule:

1. `npm run format`, then `npm run check` — zero warnings.
2. `npm test` and `npm run build` (prints the prerender line).
3. `npm run test:e2e` — the section spec, `flow`, `scenes` (every section built so
   far is full screen, its stage does not overflow, only pinned and track scenes are
   taller), `seams` (every seam built so far) and `hardening`, on desktop and phone.
4. **Seam audit.** Run the screenshot script for the seam above this section and the
   one below it (if built), at 85%, 55% and 25%, desktop and phone, and **look at
   every frame**. A gap, a kink, a detour, a cropped object, a line drawn ahead of the
   one before it, or a flat colour is a failure even when the tests pass. Fix and
   re-run.
5. Compare the scene with its document: scene type, signature technique, pin length,
   every beat. A beat the document names and the page does not show is unfinished.

Three honest attempts at the same failure → **stop**. Add an entry under "Blocked" in
`docs/landing/build.md`: phase, check, exact command, exact error, what was tried.
Never weaken, skip or delete a test to get green.

## Step 7 — Tick, commit, stop

Tick the phase's boxes in `docs/landing/build.md`. Commit inside the landing submodule,
staging paths explicitly (never `git add -A`):

```
feat(landing): NN <name> — <one line: the scene and its signature moment>

<what was built, the seams joined, any decision worth remembering, wrapped at 100>

phase: P<n>
docs: docs/landing/sections/NN-<name>.md
```

Then commit the parent: `docs/landing/build.md` and the submodule pointer. **No push.**
**SR-6:** no `Co-Authored-By` trailer, no tool attribution.

Report in three lines and stop:

```
P4 complete.  04 how-it-works — pinned horizontal track, MorphSVG order → notification, seams 03→04 and 04→05 joined.  Committed: 9c1e2aa.

Seam frames: shots/p4/ (12). Read them; anything that feels off is cheaper to fix now.
Next: /pspt:landing-build  → P5, 05 for-each-person
```

---

## Never

- **Never build a section in isolation.** `?solo=NN` is for debugging; every check
  runs on the whole page, and a section is done only when it joins the one above it.
- **Never redesign.** If a document is wrong or cannot be built, stop and say which,
  and that `/pspt:landing-spec <id>` regenerates it. The documents change first.
- **Never invent copy**, a claim, a figure or an asset. Missing asset → the document's
  fallback, or stop.
- **Never a flat colour.** Only tokens from `rules.md`; `tokens.test.ts` enforces it.
- **Never two engines on one element** — GSAP and Framer Motion, or two scroll
  engines.
- **Never edit a toolchain file** to make a check pass.
- **Never push.** The user pushes.
