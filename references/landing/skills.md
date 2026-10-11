# Landing — companion craft skills

`/pspt:landing-spec` reads these when a stage needs them. They are **optional**:
a missing one never blocks a stage. They are third-party code, so install one
only after the user says yes, and read its `SKILL.md` before trusting it.

**Precedence.** These supply craft. They never override the source documents,
[`seams.md`](./seams.md), `references/frontend-copy.md` or the landing-spec rules.
Where one disagrees, follow pspt and note the disagreement in one line.

Stage keys: **L1** rules · **L2** story · **L3** sections · **B** the build that follows.

---

## GSAP — the motion engine

| Skill | Source | Install | Read at | For |
|---|---|---|---|---|
| `gsap-core` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) (official, GreenSock) | `/plugin marketplace add greensock/gsap-skills` or `npx skills add https://github.com/greensock/gsap-skills` | L1, L3, B | Tweens, eases, `gsap.set`, defaults — the vocabulary of the motion grammar |
| `gsap-timeline` | same | same | L3, B | Sequencing a section's beats, labels, position parameter |
| `gsap-scrolltrigger` | same | same | L2, L3, B | Pins, scrub, start/end, pin budget, refresh — every scroll-driven beat and every seam |
| `gsap-plugins` | same | same | L3, B | SplitText, MotionPath, ScrambleText, DrawSVG, ScrollSmoother, Flip |
| `gsap-utils` | same | same | B | `mapRange`, `interpolate`, `clamp`, `snap` |
| `gsap-react` | same | same | — | Only if the page is ever moved into React; the scaffold is plain JavaScript |
| `gsap-frameworks` | same | same | — | Only if the page is ever moved into a framework |
| `gsap-performance` | same | same | L1, B | Transform-only animation, `will-change`, avoiding layout thrash — the performance budget |

> The scroll-driven seams in [`seams.md`](./seams.md) are ScrollTrigger work. Without
> `gsap-scrolltrigger` the section documents still get written, but pin lengths
> and seam timing are specified from this repo's rules alone.

## Scroll storytelling — the creative direction

| Skill | Source | Install | Read at | For |
|---|---|---|---|---|
| `scroll-experience` | [davila7/claude-code-templates](https://claudemarketplaces.com/skills/davila7/claude-code-templates/scroll-experience) | per its listing | L2, L3 | Pins, parallax, sticky sections; its warnings against scroll hijacking and desktop-only design |
| `scrollytelling` | [doodledood/claude-code-plugins](https://claudemarketplaces.com/skills/doodledood/claude-code-plugins/scrollytelling) | per its listing | L2 | Scroll-driven reveals and chaptering |
| `scroll-cinema` | [claudskills.com](https://claudskills.com/skills/scroll-cinema/) | per its listing | L2, L3 | Chapter reveals with colour transitions; take its staging, not its Lenis or Three.js |
| `award-winning-website` | [claudskills.com](https://claudskills.com/skills/award-winning-website/) | per its listing | L1, L2 | Signature moments, pacing, ambition |
| `ui-2026-cinematic` | [claudskills.com](https://claudskills.com/skills/ui-2026-cinematic/) | per its listing | L1 | Cinematic marketing composition |

> This page has one smooth scroll, ScrollSmoother. Any skill that brings Lenis or
> Locomotive is read for its **storytelling**, never for its scroll engine — two
> scroll engines fight over the same pixels.

## SVG — lines, marks, illustrations

| Skill | Source | Install | Read at | For |
|---|---|---|---|---|
| `svg-character-animation` | calesthio/openmontage ([listing](https://claudeskills.info/zh-hant/skills/calesthio/openmontage/svg-character-animation/)) | per its listing | L3, B | SVG rigs moved with GSAP |
| `svg-art` | [kv0906/cc-skills](https://vibeindex.ai/skills/kv0906/cc-skills/svg-art) | per its listing | L1, L3 | Hand-authored SVG for web illustration |
| `svg-illustration` | [narumiruna/agent-skills](https://claudemarketplaces.com/skills/narumiruna/agent-skills/svg-illustration) | per its listing | L3 | Sizing, spacing and embedding of illustrative SVG |
| `svg-iterative-visualization` | [javi22020/claude-skills](https://tomevault.io/tome/javi22020/claude-skills) | per its listing | B | Refining an SVG over several passes before showing it |
| `diagram-design` | `diagram-design@diagram-design` plugin | `/plugin install diagram-design@diagram-design` | L3 | Diagrammatic sections (flows, layers, journeys) |

## Anti-slop and frontend design — taste

| Skill | Source | Install | Read at | For |
|---|---|---|---|---|
| `frontend-design` | `frontend-design@claude-plugins-official` (Anthropic) | `/plugin install frontend-design@claude-plugins-official` | L1, L3, B | Distinctive type, context-specific colour, intentional motion; its ban list |
| `impeccable` | [pbakaus/impeccable](https://claudemarketplaces.com/skills/pbakaus/impeccable/impeccable) | `npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code` | L1, L3 | Font selection that rejects overused faces; design-context discipline. Its context interview is answered by the BRD, PRD and mockup — never re-asked |
| `motion-director` (agent) | `q-motion@q-motion` plugin | `/plugin install q-motion@q-motion` | L2, L3 | Every transition carried by something on screen; strips motion clichés. Written for video — take the principle, not the frame plan |

## Motion — the second engine, for small UI

| Skill | Source | Install | Read at | For |
|---|---|---|---|---|
| `motion-framer` | `motion-framer@claude-design-skillstack` plugin | `/plugin install motion-framer@claude-design-skillstack` | L1, B | Motion (vanilla `motion`, formerly Framer Motion) for UI micro-interactions: hover, press, springs. Scroll storytelling and seams stay on GSAP; never drive the same element with both |

---

## How a stage uses this list

1. At the start of the stage, find every row whose **Read at** names the stage.
2. For each one installed, read its `SKILL.md` (and only the referenced files the
   stage needs).
3. For each one missing, say once which stage would have read it and offer its
   install command. Continue without it.
4. Cite what you took: a rule borrowed from a companion skill carries its name in
   the `>` note under it, so a reader can find the source.
