# Landing — the scaffold

`/pspt:landing-spec` **L4** writes this scaffold from the templates in
[`scaffold/`](./scaffold/); `/pspt:landing-build` then writes code straight into one
section's folder at a time. Deliberately small: plain HTML, CSS and
JavaScript, one folder per section, no framework, no TypeScript, no tests, no lint
toolchain. Every piece of work happens inside one section's folder; a thin shared
layer keeps the sections joined.

---

## 1. Stack

| Part | Choice | Why |
|---|---|---|
| Files | Plain `.html`, `.css`, `.js` (ES modules) | A section is three files anyone can open and read |
| Dev server and build | Vite, vanilla template | Hot reload while working; one `npm run build` for a static `dist/` |
| Motion | `gsap` from npm (every plugin is in the public package); ScrollSmoother is the only scroll engine | One engine for scroll, SVG, text and physics |
| UI micro-motion (optional) | `motion` (the vanilla build of Framer Motion: `animate`, `inView`, springs) | Only on elements GSAP does not drive |
| Physics (optional) | `matter-js`, imported only by the section that needs it | Only when a scene needs bodies that collide |

`package.json` has three scripts — `dev`, `build`, `preview` — and nothing else.

## 2. Folders

```
landing/
  index.html             the shell: one <!-- section NN-name --> marker per section, in page order
  vite.config.js         inlines each marker with sections/NN-name/index.html (dev and build)
  main.js                imports shared/ and every section's style.css and script.js, starts the page
  shared/
    tokens.css           every colour family, type, space and shape token from rules.md
    base.css             .section, the 100svh [data-stage], thread anchors, hand-off z-order
    page.js              GSAP plugins, ScrollSmoother, matchMedia (desktop / phone / reduced),
                         runs each section's script in order, and exports stitch, SEAM, handoff
  sections/
    01-hero/
      index.html         the section's markup: its copy, data-section, data-scene, [data-stage],
                         data-thread-in / data-thread-out
      style.css          its look, still and in motion ([data-motion])
      script.js          export default function (root, page) { … return cleanup }
    02-problem/
      index.html
      style.css
      script.js
    …
```

> One section, three files. A section never reaches into another section's folder;
> anything two sections both need lives in `shared/`.

### The shell and the inliner

`index.html` holds one `<!-- section NN-name -->` marker per section, in page order.
`vite.config.js` replaces each marker with `sections/NN-name/index.html` in dev and in
the build — that is the whole build step. The markup is in the page before any script
runs, so the page reads without JavaScript and with reduced motion.

## 3. The shared layer — what keeps it coherent

`shared/page.js` exports what every section uses, and nothing else:

| Export | Contract |
|---|---|
| `gsap`, `ScrollTrigger` | Registered once, with the named eases and durations from `rules.md` §7 |
| `conditions` | `{ desktop, phone, reduce }` for the current `gsap.matchMedia` context |
| `stitch([x0,y0],[x1,y1])` | Returns `C x0,mid x1,mid x1,y1`: vertical tangents at both ends. Every thread segment touching a seam uses it |
| `SEAM` | `{ line: '75%', scrub }`: where an outgoing thread finishes and the incoming one starts |
| `handoff.exit(root, {x, y, angle})` / `handoff.incoming(root)` / `handoff.receive(root, taken)` | The giver writes where the carried object leaves; the receiver reads it in its own coordinates and marks the hand-off |

`main.js` imports each section's `script.js` in page order and calls
`script(root, page)` inside one `matchMedia` context per condition set; under
`reduce` it calls nothing, and the CSS still state is the page.

`shared/base.css` holds the cross-section rules: every `.section` is a `100svh`
scene with one `[data-stage]`; a giver section sits at `z-index: 2` until
`[data-handed-off]` drops it to `1`, so the carried object is never cropped at a seam.

## 4. Per section

1. `index.html`: the copy from the section document, `data-section="NN-name"`,
   `data-scene="<type>"`, one `[data-stage]`, the thread anchors.
2. `style.css`: the still composition first — the page without motion — then the
   `[data-motion]` styles. Colours only as `var(--<shade>)` from `tokens.css`.
3. `script.js`: the scene, beat by beat from the section document's Motion table;
   named numbers at the top of the file, not inline; phone handled under
   `page.conditions.phone`; returns a cleanup.
4. Entry and Exit exactly as the document says: `stitch` at the stitch point, the
   hand-off at the named position, drawing scrubbed to `SEAM`.

## 5. Checking — by eye, in the browser

No test files. A section is done when, with `npm run dev` open on desktop and phone
widths:

- it fills the screen as its scene type says, and its signature moment plays;
- its seam above (and below, once built) joins: open each seam with the seam at 85%,
  55% and 25% of the viewport and look for a gap, a kink, a detour, a cropped object,
  or a line drawn ahead of the one before it;
- reduced motion (`prefers-reduced-motion`) shows the still composition;
- the browser console shows no errors.

Use whatever browser the session has (Chrome tools, or a quick screenshot) to look.

## 6. L4 — writing the scaffold

Run by `/pspt:landing-spec` after L3's seam gate passes. Copy every file in
[`scaffold/`](./scaffold/) into `./landing/`, filling the placeholders:

| File | Fill |
|---|---|
| `index.html` | `{{lang}}` from the brief or PRD, `{{title}}` the product or person's name, `{{sections}}` one `<!-- section NN-name -->` line per spine row, in order |
| `package.json` | `{{slug}}` from the project name. Then `npm install --save-exact gsap` and `npm install --save-exact -D vite` (plus `motion` or `matter-js` only if a section document names them), so versions are the current stable ones |
| `main.js` | `{{imports}}`: for each section, `import './sections/NN-name/style.css';` and `import sNN from './sections/NN-name/script.js';`. `{{scenes}}`: one `'NN-name': sNN,` per section |
| `shared/tokens.css` | **Generated, no template.** One custom property per shade of every family in `rules.md` (`--pine-ink: #14261d;`), type, space and shape tokens, and the role aliases `base.css` uses: `--page` (background), `--ink` (text), `--thread`, `--danger` — each pointing at a shade (`--page: var(--ledger-cream);`) |
| `sections/NN-name/` | From `section/` once per spine row: `{{id}}` = `NN-name`, `{{scene}}` = the row's scene type, `{{giver}}` = ` data-giver` when the seam map says this section hands the carried object on and its object straddles the seam, else empty |

Then run `npm run dev` once and open it: every section is an empty full-screen stage in
page order, with no console errors. Nothing else is built at L4 — no copy, no motion.

