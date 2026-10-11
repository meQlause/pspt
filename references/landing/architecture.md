# Landing — build architecture

How `/pspt:landing-build` turns `docs/landing/` into a running page. Taken from a
landing page that shipped this way: nine full-screen sections, one thread, one carried
object, every seam stitched.

---

## 1. Stack

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript, strict | The motion layer is shared by every section; its contracts must be typed |
| UI | React + Vite, pspt `react` toolchain | Same toolchain, hooks and lint as the app |
| Rendering | Static prerender: `entry-server.tsx` renders to `dist/index.html`, the client hydrates | The page reads fully without JavaScript; motion is an enhancement |
| Motion | `gsap` (every plugin is in the public package), ScrollSmoother as the only scroll engine | One engine for scroll, SVG, text and physics |
| UI micro-motion | `motion` (Framer Motion) only for React-owned widgets (form, dialog) | Never on an element GSAP drives |
| Physics (optional) | `matter-js`, loaded lazily near its scene | Only when a scene needs bodies that collide |
| Tests | Vitest (unit, against the prerendered HTML) and Playwright (desktop + phone) | The seams are only provable in a real browser |

Motion code is loaded with a dynamic `import()` after hydration, so the entry bundle
stays inside the budget in `rules.md` §11.

## 2. Folders

```
<landing>/
  src/
    main.tsx              hydrate, then lazy-load the motion layer and start the page
    entry-server.tsx      prerender
    app/App.tsx           <div id="smooth-wrapper"><main id="smooth-content"> sections </main></div>
    styles/tokens.css     every colour family, type, space and shape token from rules.md
    styles/base.css       .section, [data-thread-in]/[data-thread-out], .thread-layer, .carried,
                          [data-handed-off] rules
    motion/
      gsap.ts             plugin registration, conditions, named eases and durations (rules §7)
      types.ts            Shared, SectionMotion, Conditions
      page.ts             startPage: matchMedia, ScrollSmoother, the solo stub, init every section
      thread.ts           stitch(), SEAM, the global thread layer
      carried.ts          the carried object and its forms
      handoff.ts          incoming(root) and receive(root, taken)
      dom.ts              one(), all(), segment(), SVG_NS
    sections/
      index.ts            the sections in page order
      motions.ts          the SectionMotion list in page order
      NN-<name>/
        <Name>.tsx        markup: copy, data-section, data-thread-in/out, no motion
        <Name>.parts.tsx  sub-components when the markup is long
        <name>.css        layout and still state; [data-motion] styles for the animated state
        <name>.motion.ts  init(root, shared) → cleanup
        <name>.tuning.ts  every number the motion uses, named
        <name>.shapes.ts  SVG path data, when the section draws
  scripts/prerender.ts
  tests/unit/*.test.ts
  tests/e2e/*.spec.ts
```

> Numbers live in `*.tuning.ts`, never inline: the lint bans magic numbers, and a seam
> is tuned by changing a named value on each side, not by hunting through a timeline.

## 3. The motion layer contracts

```ts
interface Shared {
  gsap; ScrollTrigger; smoother: ScrollSmoother | null;
  thread: Thread;        // the global thread layer and its colour
  carried: Carried;      // the carried object, setForm(form)
  handoff: Handoff;      // incoming(root) → {x, y, angle} | null; receive(root, taken)
  ease; duration;        // the named verbs from rules.md §7
  conditions: { desktop: boolean; phone: boolean; reduce: boolean };
}

interface SectionMotion {
  id: string;                                           // "04-how-it-works"
  receives: { form: CarriedForm; thread: ThreadColor } | null;   // for ?solo=
  init: (root: HTMLElement, shared: Shared) => (() => void) | undefined;
}
```

| Piece | Contract |
|---|---|
| `startPage(page, motions)` | Registers every section inside one `gsap.matchMedia()` context per condition set; creates ScrollSmoother unless `reduce`; refreshes ScrollTrigger after `document.fonts.ready`; returns a cleanup |
| `?solo=NN` | Hides every other section and hands the solo section a stub object and thread colour from its `receives`. For debugging only — every exit check runs on the whole page |
| `stitch([x0,y0],[x1,y1])` | Returns `C x0,mid x1,mid x1,y1`: vertical tangents at both ends. Every segment touching a seam uses it |
| `SEAM` | `{ line: '75%', scrub }`: the viewport line where outgoing threads finish and incoming threads start |
| `handoff` | The giver writes `data-exit-x/y/angle` on its `[data-handoff-object]`; the receiver reads `incoming(root)` in its own coordinates and calls `receive(root, taken)` at the one hand-off position |
| Stacking | `.hero`-style givers carry `z-index: 2`; `.section[data-handed-off] { z-index: 1 }` drops them after hand-off; the receiver wins by DOM order. Pinned sections keep `z-index: 1` (the pin spacer copies it once) |
| Reduced motion | Every `init` returns early when `conditions.reduce`; the CSS still state is the final composition |

## 4. Per section

1. Markup first, with every copy line from the section document and its source, and
   `data-thread-in` / `data-thread-out` anchors.
2. Still CSS: the composition without motion, which is also the no-JS and the
   reduced-motion page.
3. `[data-motion]` CSS and `init`: the scene, pinned or not, its timeline by beats
   from the section document's Motion table, every number in `tuning.ts`.
4. Entry and Exit exactly as the section document says: the stitch point, the hand-off
   position, the stacking. The section joins the one above it **in the same phase**.

## 5. Tests that stay with the page

| File | Proves |
|---|---|
| `tests/unit/<name>.test.ts` | Every copy line of the section document is in the prerendered HTML, in order |
| `tests/unit/tokens.test.ts` | Every colour in `src/**/*.css` is a `var(--…)` from `tokens.css`, and `tokens.css` holds no `#000`, `#fff` or pure primary |
| `tests/e2e/<name>.spec.ts` | The section loads with no page errors and gets its motion once scrolled to |
| `tests/e2e/flow.spec.ts` | The whole page scrolls top to bottom and back with no errors, one thread layer, and pins within the budget |
| `tests/e2e/seams.spec.ts` | Every seam is stitched and nothing carried is painted over ([`seams.md`](./seams.md) §4) |
| `tests/e2e/hardening.spec.ts` | No-JS copy, reduced motion with no pin spacers, phone width with no horizontal scroll |

Plus the **seam audit**: a scratch Playwright script that screenshots every seam at
85%, 55% and 25% of the viewport on desktop and phone. The builder reads the frames
before closing a phase.
