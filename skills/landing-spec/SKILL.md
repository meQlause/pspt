---
name: landing-spec
description: Specify a scroll-told landing page from the same BRD, PRD and HTML mockup as the app — or, when they are missing, from an interview that first asks what website to build (product, portfolio, agency, event…), defines the requirements that kind of site needs, and refuses to proceed while information is lacking. Then the creative general rules (colour as families of shades, never one flat colour; type, shape, SVG, motion grammar, anti-slop bans), then the story spine (one carried object, one thread, the seam map), then one document per section whose transitions are coherent and connected to the sections beside it. Runs one stage per invocation with a checkpoint between each, and reads companion craft skills (GSAP, scroll storytelling, SVG, impeccable, frontend-design, motion-framer) when a stage needs them. Use for "/pspt:landing-spec", "spec the landing page", "write the landing rules", "define each landing section", or before building a landing page with GSAP.
---

# Specify the landing page

The landing page tells the product's story in one scroll. This skill writes the
specification for it: **rules → story → sections**. It writes documents, never
code. Building comes after, section by section, against these documents.

You do **not** invent the product, its claims or its copy. Every promise on the
page traces to the BRD or PRD, every value and screen it shows traces to the
mockup. Creativity goes into *how* the story is told — colour, shape, motion,
transitions — never into *what* it claims.

Read `references/conventions.md`, `references/house-style.md` and
`references/frontend-copy.md` before writing any document. Then read
[`references/landing/seams.md`](../../references/landing/seams.md): the seam
contract is the reason this skill exists. Then read
[`references/landing/craft.md`](../../references/landing/craft.md): every section is a
**full-screen scene**, and the page uses GSAP's whole plugin set, SVG and Framer
Motion to their full range — each capability carrying a beat, never decoration.

If the user passed an argument (`rules`, `story`, `sections`, or a section id such
as `04`), skip to that stage and regenerate it, after checking its prerequisites.
Otherwise run the gates, then the first incomplete stage.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): jcodemunch
and ponytail must be present. Missing → ask once, then install and register them;
declined → this skill does not start.

## Step 1 — Companion craft skills

Read [`references/landing/skills.md`](../../references/landing/skills.md). It lists
every companion skill — GSAP, scroll storytelling, SVG, anti-slop and frontend
design, motion — with its source, its install command and **the stage that reads
it**.

Check which are installed: `~/.claude/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`
and `~/.claude/plugins/cache/**/skills/*/SKILL.md`, matched by skill name. Print one
line per group:

```
Companion skills
  ✓ frontend-design · ✓ motion-framer · ✓ diagram-design
  ✗ gsap-core, gsap-scrolltrigger … — /plugin marketplace add greensock/gsap-skills
  ✗ impeccable — npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code
```

They are **optional**. A missing one never blocks a stage; say once which stage
would have read it, offer the install command, and install only after an explicit
yes — they are third-party code. When a stage starts, read the `SKILL.md` of every
installed skill that the catalogue assigns to it, **before** writing.

**Precedence.** Companion skills supply craft. They never override this skill, the
seam contract, `frontend-copy.md` or the source documents. When one disagrees —
impeccable wants to interview for design context, a scroll skill wants Lenis — the
BRD, PRD and mockup are the design context, and this skill's rules win. Note the
disagreement in one line and move on.

## Step 2 — Discover and classify

Glob the working directory for markdown and the mockup. **Classify by content, not
by filename**, exactly as `/pspt:spec` Step 1 does.

| Role | Recognised by | Required |
|---|---|---|
| BRD | Business objectives, stakeholders, success metrics | yes |
| PRD | Personas, features, user flows, priorities | yes |
| Mockup | `.html` with real markup, plus its CSS and JS | yes |
| SRS | Numbered functional and non-functional requirements | no — read if present |
| Spec set | `docs/FE/design-system.md`, `docs/FE/fidelity.md` from `/pspt:spec` | no — read if present |

Print what you found and the role you assigned.

**If the BRD, PRD or mockup is missing, do not stop and do not imagine — run L0.**
[`references/landing/brief.md`](../../references/landing/brief.md) drives it:

1. Ask what they want to build (product landing, portfolio, agency, event, campaign,
   shop front, or other — then "what should a visitor do by the end?").
2. Analyse that kind of website and **define its requirements** first — must and
   should, each with a `BR-nn` id, derived from the user's goal — and show the list.
3. Interview one or two questions at a time until the list is covered. A portfolio
   gets as many rounds as its work pieces need. Record answers verbatim.
4. Gate: name every must that is still missing and ask once more. If it is still
   missing, or the answers are too thin to write a section without inventing,
   **stop and write nothing** — say what is missing; the skill resumes when it is
   supplied.
5. When sufficient, write `docs/landing/brief.md`. It stands in for the BRD and PRD
   from then on.

If some sources exist (a BRD but no mockup), read them first and interview only for
what they lack. Whether information is lacking is decided against the requirement
list from step 2, never against a fixed checklist.

## Step 3 — Detect the stage

Read `docs/.pspt.json`; landing stages live under its `landing` key. Otherwise
infer from `docs/landing/`.

| Stage | Complete when | Guide |
|---|---|---|
| L0 Brief | only when sources are missing: `docs/landing/brief.md` passes its sufficiency gate | [`references/landing/brief.md`](../../references/landing/brief.md) |
| L1 Rules | `docs/landing/rules.md` meets every exit criterion in its guide | [`references/landing/rules.md`](../../references/landing/rules.md) |
| L2 Story | `docs/landing/story.md` — the spine and the seam map | [`references/landing/story.md`](../../references/landing/story.md) |
| L3 Sections | one `docs/landing/sections/NN-<name>.md` per row of the spine, and the seam gate passes | [`references/landing/sections.md`](../../references/landing/sections.md) |

Run **the first incomplete stage only**. L1 needs the sources or L0; L2 needs L1;
L3 needs L2.

## Step 4 — Run one stage

Read the stage's guide and the companion skills the catalogue assigns to it, then
write the document. Ask every decision the guide names with `AskUserQuestion`:
two or more real candidates, each with its trade-off and its trap. **Never** an
open "what do you want?".

Carry source ids through. A BRD objective or PRD feature id appears in `story.md`'s
spine row and again in the section document's **Source** field. That chain is what
lets `/pspt:trace` answer "why does this section exist".

### Where documents are written

Always the working directory's `./docs/landing/`:

```
docs/landing/
  brief.md              L0 — only when the BRD, PRD or mockup is missing
  rules.md              L1 — the creative general rules
  story.md              L2 — the spine: sections, carried object, thread, seam map
  sections/NN-<name>.md L3 — one per section, entry and exit seams included
```

### State file

After each stage, add or update the `landing` key in `docs/.pspt.json`, keeping
every other key untouched:

```json
{ "landing": { "type": "portfolio", "l0": "<ISO date>", "l1": null, "l2": null, "l3": null, "sections": [] } }
```

`type` is the website type; `l0` stays `null` when the BRD, PRD and mockup were
present. `sections` lists the ids written, in page order. Answers only, never content.

## Step 5 — The seam gate (L3 only)

After the section documents are written, compare every adjacent pair, field by
field: section N's **Exit** block against section N+1's **Entry** block, as
[`sections.md`](../../references/landing/sections.md) §Gate defines. Any mismatch
— object form, holder, stitch point, tangent, thread colour, seam timing, z-order —
is a defect. Print the list and fix the documents before committing:

```
SEAM GATE — 2 mismatches
  03 → 04  thread colour   03 exits sage, 04 enters green
  06 → 07  stitch (phone)  06 exits at centre, 07 enters on the rail
```

A page whose sections each look right but do not join is the failure this skill
exists to prevent.

## Step 6 — Commit the stage

Same rules as `/pspt:spec` Step 6: only inside a git repository, enumerate paths
with `git status --porcelain`, stage them explicitly (never `git add -A`), no push.

```
feat(landing): <stage> — <one-line what the stage produced>

<body: what was written and any decision worth remembering, wrapped at 100>

stage: L<n>
docs: <files written this stage>
```

**SR-6:** no `Co-Authored-By` trailer, no tool attribution. If the user says
"don't commit this stage", skip it for this invocation only.

## Step 7 — Stop

Report in three lines, then stop:

```
L1 complete.  docs/landing/rules.md — 5 colour families, 2 type families, 9 motion verbs, 14 bans.  Committed: 4b8246f.

Read it and change anything that does not feel like the product; every section inherits it.
Next: /pspt:landing-spec  → L2, the story spine and the seam map
```

After L3 the last line names the build — `Next: /pspt:landing-build → P0, the motion
foundation` — one phase per run, in page order, each section joined to the one above
it before the next starts.

---

## Rules

**Never invent a claim, a number or a line of copy.** Rules follow
`frontend-copy.md`: copy comes from the mockup or the brief's verbatim answers, or
is derived from a named BRD/PRD/brief passage and marked as such.

**Not confident, not proceeding.** If any stage would need content nobody supplied,
stop and name what is missing rather than writing around it.

**Never a flat colour.** Not yellow, but *yellows*; not black, but *blacks*. Every
colour in every document is a named shade from a family in `rules.md`.

**One story.** One carried object, one thread, one scroll. A section that cannot
say what it receives and what it hands on does not belong on the page.

**Full screen, full range.** Every section is a `100svh` scene; the page meets the
coverage rules in `craft.md` §4.

**References are searched live.** Every stage runs a real-time internet search for
references (`craft.md` §5) — sites of the brief's type at L1, scene types at L2, each
signature technique at L3 — opens what it cites, and records what it takes from each.

**Simple and direct.** A thread goes from where it is to where it is needed. No
detour, no zigzag, no loop that the story does not ask for.

**Re-run the gates every invocation.** The mockup changes; the seam gate is cheap.
