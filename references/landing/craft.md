# Landing — craft: full-screen scenes, every capability, used with meaning

The ambition is a page that looks like the best GSAP sites: **every section a
full-screen scene**, choreographed to scroll, drawn in SVG, with the libraries used
to their full range. Every GSAP plugin now ships free in the public `gsap` npm package,
so nothing is off the table for licence reasons.

"Max it" has one condition: **every capability used must carry the story.** A
technique with no beat behind it is noise, and the bans in `rules.md` still apply.

---

## 1. Full-screen scenes

Each section is a **scene**: composed for the viewport, not a document that flows.

| Rule | Why |
|---|---|
| A scene's stage is `100svh` (`100dvh` only where the address bar must be covered); content is composed inside it, centred on a grid, with safe-area insets on phones | `vh` jumps when the mobile address bar moves; a scene that overflows its stage is a document again |
| A beat with steps is a **pinned stage** with a scrubbed timeline; its pin length in screens comes from the spine | The visitor drives the scene with the wheel, at their pace |
| Phones get the same scenes **re-composed**, not shrunk: one column, the thread on a rail, the signature moment kept | A desktop scene scaled to 375px is unreadable and loses the beat |
| No two consecutive scenes use the same scene type | Three pinned stages in a row feel like one long stall |
| Content longer than one screen becomes a **pinned stage** whose steps play in place, or is **split into more scenes** — never a long block that scrolls past normally | A section that scrolls like a document breaks the full-screen rhythm and hides its seam below the fold |
| A section may be taller than one screen **only** as a pinned stage or a horizontal track, and its extra length counts toward the pin budget in `rules.md` §7 | Unbudgeted height is a pin in disguise; the page grows long without anyone deciding it should |
| Every section root carries `data-scene="<type>"` and wraps its composition in one `[data-stage]` element; the stage is `100svh` and nothing overflows it | The scene test (`architecture.md` §5) reads these to prove every section is full screen |
| The rule applies with motion on, on desktop and phone. With reduced motion or no JavaScript, the still composition may flow as a normal page | Without pins, a stepped scene shows all its steps at once, and that is the readable fallback |
| Copy and controls stay outside pins' blind spots: nothing important under the sticky header, nothing that needs a tap while scrubbing | Scrubbed scenes punish precise interaction |

### Scene types

| Type | Built with | Good for |
|---|---|---|
| Pinned stage | ScrollTrigger `pin` + scrubbed timeline with labels | A process in steps; the product doing its job |
| Horizontal track | Pin + `x` tween, `containerAnimation` for triggers inside it | A journey through stations; a timeline of work |
| Layered panels | Each panel pinned, the next one slides over (`pinSpacing: false`) | Chapters; people or plans stacked |
| Zoom-through | Scale into an element until it fills the screen, cut to the scene inside it | Entering the product; going from overview to detail |
| Mask reveal | `clip-path` circle/inset grows from the carried object to full screen | A transition into a new world or colour field |
| Sticky media, scrolling copy | Media pinned on one side, copy beats scroll past and drive it | Explaining a screen or diagram step by step |
| Full-bleed type | SplitText lines masked, scrubbed in at display size | A manifesto line; the turn of the story |
| Physics field | Physics2D / Matter, objects fall and settle | Chaos, overload, the problem made visible |
| Close / sign-off | Everything carried so far converges on one mark | The ask; the knot tied |

## 2. Transition devices between full-screen scenes

The seam contract ([`seams.md`](./seams.md)) still governs every one of these; the
device is *how* the eye is carried, the contract is *that* it is.

| Device | Built with |
|---|---|
| The thread draws through the seam | DrawSVG or `pathLength` dash, scrubbed to the seam line |
| The carried object morphs into the next scene's form | Flip (`Flip.fit` / `Flip.from`) or MorphSVG on its outline |
| The object grows into the next background | `clip-path` / mask scaled from the object's box to the viewport |
| Colour field shift | Background interpolated between two shades of a family, scrubbed |
| Camera push | SVG `viewBox` or a wrapper scaled and translated, scrubbed |
| Type hand-off | The last line of one scene becomes the first of the next (Flip on the SplitText line) |

## 3. The capability palette

`rules.md` §7 picks from this list; `story.md` assigns techniques to scenes; each
section document names the ones it uses.

### GSAP

| Capability | Gives | Use it for | Guardrail |
|---|---|---|---|
| ScrollSmoother | Smoothed scroll, `data-speed` parallax, `data-lag` | Depth on full-screen scenes | The only scroll engine; parallax never on body text |
| ScrollTrigger | Pin, scrub, snap, batch, `containerAnimation` | Every scroll-driven beat and seam | Pin budget from `rules.md`; refresh after layout changes |
| Timelines + labels | Sequenced beats addressable by name | A scene's steps; snapping to labels | One timeline per scene |
| SplitText | Chars, words, lines, with masks, `autoSplit` | Headline reveals, line-by-line manifesto | Keep the unsplit text for screen readers (`aria-label`) |
| ScrambleText / TextPlugin | Decoding and typing text | Labels being "understood", counters | Short strings only |
| DrawSVG | Draw strokes on and off | The thread, icons drawing themselves | `pathLength="1"` on authored paths |
| MorphSVG | Shape-to-shape morphs | The carried object changing form, marks assembling | Similar point counts, or `shapeIndex` tuned |
| MotionPath (+ `align`, `autoRotate`) | Objects travelling on paths | The carried object riding the thread | Path and object in the same coordinate space |
| Flip | Animate between two layouts or two elements | Form changes across a seam, grid to detail | Record state before the DOM change |
| Observer | Wheel, touch and pointer intent without scroll position | Step-by-step full-screen scenes, swipe on phones | Never alongside scroll for the same scene |
| Draggable + Inertia | Drag with momentum | Interactive beats (untie, pull, sort) | Keyboard equivalent for every drag |
| Physics2D / PhysicsProps | Gravity, velocity, friction | Falling, scattering, settling | Seeded, so the scene is the same each visit |
| CustomEase / CustomWiggle / CustomBounce | Signature eases | The page's own motion voice in `rules.md` | Named once in `rules.md`, reused |
| `quickTo` / `quickSetter` | Fast per-frame setters | Cursor follow, pointer-reactive scenes | Pointer: fine devices only |
| `gsap.matchMedia` | Breakpoint and reduced-motion contexts | Desktop scenes, phone scenes, reduced motion | Every scene registers through it |
| ScrollTo | Animated anchor scrolling | "See how it works" links | Respects ScrollSmoother |
| GSDevTools | Timeline scrubber | Building and reviewing scenes | Development builds only |

### SVG

| Capability | Use it for |
|---|---|
| `pathLength="1"` + dash offset | Any line drawn on: the thread, strokes of icons and marks |
| `clipPath` / `mask` | Reveals, windows into the next scene, wipes |
| Filters (`feTurbulence` + `feDisplacementMap`, `feGaussianBlur`) | Hand-drawn wobble, ink bleed, soft glow — sparingly, they cost frames |
| Gradients with animated stops | Light moving across a surface, colour fields |
| `viewBox` animation | A camera inside an illustration |
| `vector-effect: non-scaling-stroke` | Lines that stay one width while their shape scales |
| `<symbol>` / `<use>` | One drawn person or object reused across scenes |
| Hand-authored paths with a stroke family | Every icon and illustration, so the page has one hand |

SMIL animation is not used: GSAP drives every SVG, so scrubbing and reduced motion
work the same way everywhere.

### Framer Motion (`motion-framer`)

Only where React owns a piece of UI and scroll does not:

| Capability | Use it for |
|---|---|
| `layout` / `layoutId` | Shared-element transitions inside a form, a tab, a dialog |
| `AnimatePresence` | Mounting and unmounting the film dialog, form states, toasts |
| `whileHover` / `whileTap` springs | Buttons, cards, the pilot form |
| `useScroll` / `useTransform` | Never on elements GSAP drives; only inside isolated widgets |

> Never animate the same element with GSAP and Framer Motion. Two engines writing the
> same `transform` produce a jitter nobody can debug.

### CSS

`clip-path`, `mix-blend-mode`, `backdrop-filter` (sparingly), container queries, and
native scroll-driven animations for trivial reveals that need no timeline.

## 4. Coverage — how "max it" is measured

| Level | Rule |
|---|---|
| Page | Uses at least six of the scene types and at least ten distinct capabilities from §3, each named in `story.md` |
| Scene | Names a **signature technique** no other scene uses, and at least three capabilities |
| Seam | Names its transition device from §2 |
| Every use | Carries a beat. A capability listed without a beat it serves is removed |

## 5. Reference style board — searched live, every run

References are **searched on the internet in real time** whenever a stage runs, never
taken only from a fixed list: the best GSAP work changes every month, and the brief's
type and tone decide what is relevant. The table below is where to start, not where to
stop.

**When to search.**

| Stage | Search for | Example queries |
|---|---|---|
| L1 | Sites of the same type and tone as the brief | "awwwards {type} site gsap {year}", "{industry} landing page scroll storytelling", "best {type} portfolio full screen gsap" |
| L2 | Scene types and transitions the story needs | "gsap {scene type} scrolltrigger example", "full screen mask reveal scroll transition", "pinned horizontal scroll section gsap" |
| L3 | The technique of each section's signature moment | "gsap morphsvg {object} transition codepen", "splittext line mask scrub example", "flip plugin shared element scroll" |

**How.**

1. Run `WebSearch` (standard mode first; extended when results are thin or old) with
   the year and the brief's type in the query. Prefer the last two years.
2. Open the strongest three to five results with `WebFetch`, or in Chrome when the
   page needs JavaScript to show its motion, and look at what the scene actually does.
3. Keep only sites that are live and that you have actually opened. Never cite a site
   from a search snippet alone.
4. Record each in the stage's document — `rules.md` §12 at L1, `story.md` per scene
   at L2, the section's **Scene** block at L3 — with its URL, the date it was viewed,
   and **what is taken**: a technique, a pacing, a composition. Never a copied look,
   copy, logo or asset.
5. List the sources at the end of the document as markdown links.

**Where to start.**

| Where | What to study |
|---|---|
| [GSAP showcase](https://gsap.com/showcase/) | Current GSAP craft; the yearly showreel for technique range |
| [Awwwards — GSAP sites](https://www.awwwards.com/websites/gsap/) | Award-level full-screen composition, type and transitions, filterable by year |
| [Awwwards inspiration — scroll elements](https://www.awwwards.com/inspiration/manifesto-page-scroll-wgb) | Single techniques in isolation: manifesto scroll, image scroll, scroll navigation |
| Apple product pages (e.g. AirPods Pro) | Pinned product scenes scrubbed frame by frame; pacing of a long scroll |
| [The Pudding](https://pudding.cool/) | Pinned stages with progress-linked diagrams; explaining with scroll |
| [Codrops](https://tympanus.net/codrops/) | Tutorials with source for individual effects |
| NYT "Snow Fall" (2012) | The origin of scrollytelling; chaptering and rest |

> A reference supplies a technique and a feeling, never a layout to trace. The page's
> look comes from `rules.md`, which comes from the product.

## 6. Performance budget for all of this

Transform and opacity only in scrubbed motion; `will-change` on during a scene, off
after. Heavy plugins and physics load lazily, near their scene. `gsap.matchMedia`
gives phones lighter scenes, not the desktop scene shrunk. Every scene has a
reduced-motion state that shows its final composition. The entry bundle budget in
`rules.md` §11 holds no matter how many capabilities are used.
