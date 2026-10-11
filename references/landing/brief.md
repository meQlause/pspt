# L0 — `docs/landing/brief.md`, when there are no requirement documents

Runs when the BRD, PRD or mockup is missing. It replaces them with a brief written
from the user's own answers, so every later stage still traces to something the user
said. It never fills a gap by guessing: it asks, and if the answers stay thin, it
stops.

---

## 1. Ask what they want to build

One `AskUserQuestion`, before anything else. Candidates:

| Type | It is for |
|---|---|
| Product / SaaS landing | Turning a visitor into a sign-up, a trial or a demo |
| Portfolio | Showing a person's or a studio's work so someone hires or contacts them |
| Agency / service | Selling a service and booking a call |
| Event / launch | Getting people to register, attend or join a waitlist |
| Campaign / nonprofit | Moving people to sign, donate or share |
| Product drop / shop front | Selling one product or a small collection |

"Other" gets one follow-up: what should a visitor **do** by the end of the page? The
answer to that question decides the closest type.

## 2. Analyse, then define the requirements

Before the interview, write down — for yourself, then show the user — what this
website must contain to work. Start from the type's checklist below, then adjust it
to what the user said in step 1: a portfolio for a motion designer needs moving
work; a portfolio for a backend engineer needs case studies and code, not a reel.

Each requirement gets an id (`BR-01`, `BR-02` …) and a level:

- **Must** — without it the page cannot do its job, or a section would have to be
  invented.
- **Should** — the page works without it, but is weaker; note what it costs.

Show the list in one message: "To build this I need: … (must) … (should)". This
list is the yardstick for step 4. It is **derived from the user's goal**, not copied
whole from the table.

### Checklists by type

**Every type — must:** the goal action (one verb: hire, book, buy, register), the
audience (who, and what they already believe), the name and one-line positioning in
the user's words, the tone (three adjectives it must earn), the contact or conversion
channel (where the goal action lands), and the languages of the page.

| Type | Must | Should |
|---|---|---|
| Product / SaaS | The problem in the customer's words; how the product solves it (the core flow, step by step); 3–5 capabilities that matter to the audience; what it does **not** do; the call to action and what happens after it | Real proof (numbers, quotes, logos with permission); pricing or "talk to us"; screenshots or a product mockup; FAQ from real objections |
| Portfolio | Who (name, role, location if relevant); what kind of work is wanted next; **at least three work pieces**, each with title, year, the user's role, the problem, what was made, the outcome, and the visuals available for it; skills or services; how to contact | Testimonials that exist; clients worked with; an about story; CV or resume link; process; awards or press |
| Agency / service | The service, scoped (what is in and out); who it is for; the process from first call to delivery; at least two case studies with outcomes; how to book | Team; pricing model; guarantees that are actually offered |
| Event / launch | What, when (date, time, timezone), where (place or link); who it is for; the agenda or what attendees get; how to register and any limit or price | Speakers; past editions; sponsors; venue details |
| Campaign / nonprofit | The cause; the specific ask; what one action achieves (only real figures); who is behind it and why to trust them | Stories from the people affected; progress so far |
| Product drop / shop | The product(s), price, availability, what makes them different, materials or specs, how to buy and ship | Reviews that exist; size or fit guides; returns |

**Assets** (ask for every type): logo, photography, illustrations, screenshots, video,
brand colours or fonts already in use. A missing asset is not invented: the rules
stage designs around it, and `brief.md` records it as missing.

## 3. Interview

Ask **one or two questions at a time**, in the order of the requirement list, with
`AskUserQuestion` where real candidates exist and plain questions where the answer
is the user's own content (their work, their words). For a portfolio ask as many
questions as the work pieces need: each piece is its own short round.

Rules:

- Record answers **verbatim**. The user's words become the page's copy sources.
- Never offer invented content as a candidate ("e.g. 'Increased revenue by 40%'").
  Offer shapes, not claims: "a number, a quote, or a before/after?".
- If the user pastes or points to material (a CV, an old site, a deck, a folder of
  work), read it and confirm what you took from it, instead of re-asking.
- Keep a running tally against the requirement list.

## 4. The sufficiency gate

After the interview, compare the answers with the requirement list:

```
BRIEF CHECK — portfolio, 14 requirements
  ✓ 11 answered
  ✗ BR-06 must   third work piece — no outcome given
  ✗ BR-09 must   contact channel — not chosen
  ~ BR-12 should testimonials — none exist; page will not show any
```

- **Any must missing** → say exactly what is missing and why the page needs it, and
  ask once more for just those.
- **Still missing after that, or answers too thin to write a section without
  inventing** → **stop**. Write nothing. Say what is missing and that the skill
  resumes when it is supplied. Proceeding on a guess is the failure this gate exists
  to prevent.
- **Should missing** → continue, and record in `brief.md` what the page will do
  without it.

Confidence test, before passing: for every section you would expect on this page,
can you name the brief answer it comes from? If any section would need content the
user never gave, the brief is not sufficient.

## 5. Write `docs/landing/brief.md`

```markdown
# <Name> — Landing brief

**Stage:** L0 · **Type:** portfolio · **Goal action:** contact for freelance work

<one paragraph: what the page must achieve, in the user's words>

## Requirements
| Id | Level | Requirement | Answer (verbatim) | Source |
|---|---|---|---|---|
| BR-01 | must | Goal action | "Get booked for motion design work" | interview 2026-10-11 |

## Assets
| Asset | Status | Where |
|---|---|---|

## Missing, and what the page does without it
| Id | Level | What the page does instead |
|---|---|---|
```

From here on `brief.md` stands in for the BRD and PRD: L1–L3 trace to `BR-nn` ids
exactly as they would to BRD/PRD ids, and copy comes from the verbatim answers. With
no mockup, `rules.md` defines the look from the brief's tone and assets, and
`frontend-copy.md`'s "from the mockup" means "from the brief".

## Exit criteria

- [ ] The website type and goal action are stated.
- [ ] The requirement list was derived from the goal and shown to the user.
- [ ] Every must requirement has a verbatim answer.
- [ ] Every should requirement is answered or listed under Missing with its fallback.
- [ ] Every expected section can name the `BR-nn` it comes from.
- [ ] Nothing in the brief is invented.
