---
name: enhance
description: Conversationally extend an existing pspt specification — a new behaviour, a stricter guarantee, an additional field, a cross-cutting concern like idempotency or rate-limiting — without breaking any existing requirement, decision or ticked exit criterion. Ask what to enhance, dig until the user says "ready", then write the change into the right spec files with traceability preserved. Use for "add idempotency to bookings", "the review screen also needs an offline banner", "make cancellation notify the venue", "enhance the spec", or any request that grows the spec rather than starting a new one.
---

# The enhance conversation

`/pspt:spec` builds the specification set from scratch. `/pspt:build`
implements one exit criterion. `/pspt:enhance` sits between them: the spec
already exists, the user has an idea that grows it, and the job is to
capture that idea faithfully — as an addition to the spec, never as a
silent overwrite.

The shape is a conversation, not a form. Ask, listen, ask again, until
the user says they are ready. Then, and only then, write.

---

## 1. Open the conversation

Start with one line, then wait:

> **What would you like to enhance?**

Do not ask a numbered list of sub-questions on the first turn — the user
has one thing in mind and the survey buries it. The user's first answer
is the anchor; every question after it is a follow-up on that specific
anchor.

Typical anchors people bring:

- A **cross-cutting concern** — idempotency, rate-limiting, audit
  logging, retries, back-pressure, offline handling
- A **new behaviour on an existing feature** — "the review screen should
  also warn when the venue closes in 30 minutes"
- A **new field** on an existing table or endpoint
- A **new error code** or a stricter policy on an existing one
- A **new state on an existing screen** — a banner, a badge, a mode
- A **stricter guarantee** — narrower window, tighter budget, more axe
  rules
- A **new integration** — a webhook out, an OAuth provider in

If the anchor is unclear ("make it better", "clean it up"), do not guess.
Ask what specifically they mean — one sentence, plain.

## 2. Dig until you have enough to write

Keep the tone conversational — one or two questions per turn, in the
user's own vocabulary, not a checklist. The goal is not to collect a
form; it is to leave the conversation with enough to write the
enhancement so the next reader sees the same thing the user pictured.

For every anchor, the answers you need before you can write are:

- **Which feature or screen does it live in?** (or: is this shared, in
  which case where does it belong — a new middleware, a shared rule, a
  cross-cutting note in `strict-rules.md`)
- **Trigger and shape.** What starts the new behaviour? What is the
  observable outcome? What does a request/response, a click, a value
  change actually look like?
- **Failure modes.** What happens when the new behaviour cannot run —
  network drop, missing input, race with the existing path? Which error
  code (existing, or new)?
- **Bounds.** Any number the user cares about — timeout, TTL, window,
  budget, threshold. Each with the reason it is that number, not another.
- **Impact on the existing spec.** Does this add a column, change a
  status, add a state, tighten an invariant, or touch a ticked criterion?
  (See §3.)
- **Test that would prove it works.** One line, in plain English. If the
  answer is "I would open the app and see", the acceptance criterion is
  not yet sharp enough — ask again.

You do not need every answer on the first turn. Ask for one thing at a
time when a topic is fresh; batch when the user is clearly ahead of you
and giving details you had not asked for yet. Read the room.

Between turns, restate what you understand so far in one paragraph —
short. Not a summary of the whole conversation; the current shape as you
would write it. This is how the user catches misreads before they land
in the spec.

## 3. What you cannot break

An enhancement is **additive by default**. Adding a new FR, a new NFR,
a new column, a new error code, a new screen state, a new exit criterion
in a not-yet-started phase — all fine, no permission needed beyond the
conversation itself.

An enhancement is **not additive** when it touches any of these:

| Do not silently change | Where it lives |
|---|---|
| An existing FR or NFR's text | `srs.md` |
| A settled decision in `phases.md` §0 | `phases.md` |
| A regression's assertion (`REG-nnn`) | test file + `docs/BE/testing.md` §4 |
| An error code that other features raise | `docs/error-handling.md` §3, §4 |
| A schema column that other tables reference | `docs/data-spec.md` §5, §6 |
| An endpoint contract for a shipped endpoint | `docs/BE/features/<name>.md` §1 |
| **Any exit criterion already ticked** in `phases.md` | `phases.md` |

If the enhancement genuinely requires one of these to change, **stop and
surface it as a decision the user has to make**, not something you
handle by rewriting quietly. Frame it plainly:

> "Making bookings idempotent means the POST `/bookings` contract adds
> an `Idempotency-Key` header requirement and a new 409 response shape.
> That is a change to an already-shipped endpoint contract, so I want
> you to say yes to that before I edit `docs/BE/features/bookings.md`
> §1. Alternatively, we can add idempotency only on new endpoints going
> forward and leave the existing contract alone. Which of those?"

Then wait for the user's answer, and only then write.

## 4. Ready?

When the anchor, the shape, the failure modes, the bounds, the impact
and the acceptance criterion are all present, ask once:

> **Ready to enhance?**

If the user says yes / done / let's do it / go — proceed to §5. If the
user asks for another detail, or adds a new anchor, keep digging; do
not treat the "ready?" as a closing gate that forces the user to
answer now. It is a check-in, not a bar.

## 5. Update the spec

**Enhance changes the *specification*, not the *work list*.** The phase
plan in `phases.md` — the tickets — is written *after* enhance closes,
by whoever plans the next slice of work (or by re-running `/pspt:spec`
at stage S6). Enhance never opens, closes, or adds an exit criterion.
It records what must be true, not what to do next.

One enhancement, many files. Every file that has to reflect the change
is edited in the same pass, so the spec is never half-updated.

| The enhancement touches | Edit this file |
|---|---|
| A new user-visible behaviour | `srs.md` (new FR-nnn), matching feature doc under `docs/BE/features/` or `docs/FE/features/` |
| A new guarantee (concurrency, latency, a11y, security, idempotency) | `srs.md` (new NFR-nnn), the architecture doc that owns it |
| A new column or table | `docs/data-spec.md` §2 (ERD), §5 (columns), §6 (constraints if any) |
| A new error code | `docs/error-handling.md` §3 (registry), §4 (copy), plus the feature docs that raise it |
| A new endpoint or a new field on one | `docs/BE/features/<name>.md` §1 (contract), `docs/BE/features/README.md` §7 (server-owned fields if any) |
| A new screen state or a new element | `docs/FE/features/<name>.md` §6 (composition), §7 (acceptance criteria) |
| A cross-cutting rule with no obvious owner | `docs/strict-rules.md` if it is truly universal, or the closest architecture doc — never a new orphaned file |

Traceability is not a footnote. If the enhancement is FR-042 in
`srs.md`, the feature doc's acceptance criterion for it names FR-042 in
parentheses; the endpoint contract that satisfies it names FR-042. The
chain is the whole point of the spec being spec.

After writing, print a short summary — files touched, new ids assigned
(FR-042, NFR-014, E-BOOKINGS-DUPLICATE, etc.) — and hand the user two
plain next steps to pick from:

- Run `/pspt:trace <new-id>` to see the chain the enhancement creates.
- When they are ready to *build* what was enhanced, run `/pspt:ticket`
  (the dedicated skill for turning spec items into phase exit criteria)
  and then `/pspt:build` on each. Enhance does not do either step —
  spec, ticket and build are three separate skills so each stays honest
  about what it changes.

## 6. Commits

Prepare the message, commit only if the user asked. Same shape as
`/pspt:build` §Commits: no `Co-Authored-By` trailer, no tool
attribution, no "generated with" footer.

```
feat(spec): <one-line what changed>

<body: why this enhancement, and what it does not change; wrapped at 100>

spec: <files touched>
ids: <new FR-nnn, NFR-nnn, E-..., REG-nnn, etc.>
```

No `git push`. The user pushes when they are ready.

---

## Never

- **Never rewrite an existing FR or NFR under the guise of "enhancing"
  it.** If the user actually wants the requirement to say something
  different, that is a requirements change — call it what it is and get
  explicit consent before editing.
- **Never delete or renumber an existing id** (FR-, NFR-, E-, REG-,
  D-). Ids are the traceability chain; renaming one breaks every
  reference in every doc that pointed at it. Deprecate in place if
  something must go: mark it `**superseded by <new-id>**` and leave
  the old row.
- **Never write to `phases.md` at all.** Neither adding nor ticking.
  Adding an exit criterion is `/pspt:ticket`'s job (turning spec into
  work list); ticking one is `/pspt:build`'s job (marking work as
  actually done). Enhance changes the *spec*; the ticket and the build
  are separate skills, invoked in that order, after enhance closes.
- **Never write to a file the enhancement did not require.** If the
  scope is one endpoint, do not touch the design system just because
  the endpoint's payload has a colour name. Discipline earns the next
  reader's trust.
- **Never guess a decision.** When the enhancement conflicts with a
  settled `phases.md` §0 row, or with a shipped contract, the user
  decides — not you. Ask, wait, then write.
