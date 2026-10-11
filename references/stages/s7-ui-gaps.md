# S7 — UI gap analysis

**Produces:** `docs/FE/ui-gaps.md`; for every approved gap, a drawn state in
`mockup/`, a row in the S5 refactor map and screen document, a row in the S6
matrix, and — when it is new user-visible behaviour — an FR in `srs.md`

The frontend validation stage, and the one that asks the questions nobody drew an answer to.
A mockup shows the screens someone pictured: the happy path, perhaps an empty
list. The rest of the specification knows far more — every error code has a
presentation, every request can be slow or fail, every list can be empty, every
destructive action needs a second chance. Each of those is a piece of UI the app
**will** show, and if nobody designs it, the first person to design it is a
developer at 6 p.m. with no mockup to copy.

S7 finds every such gap **mechanically from the spec**, recommends how to fill
it **from what the mockup already has**, asks the user, and folds each approved
answer back into the mockup — so the mockup stays the one source of truth and
S6 holds the app to the new states like any other.

---

## Gate

S2–S6 complete. S7 reads every one of them; it does not run on a partial spec.
`phases.md` is not required and is not written here. S8 creates the plan only
after this stage closes and Gate 2 passes.

## Step 1 — Find the gaps, from the spec

Each row below is a rule the spec already states. A gap is a place where the
rule applies and the mockup draws nothing. Use the S6 analyser's summary and the
S5 refactor map — not a fresh read of every mockup file.

| Source in the spec | Requires on screen | Gap when the mockup has no… |
|---|---|---|
| `error-handling.md` §3 + §5 — every code a screen can receive, and its presentation class | That presentation, on that screen | field error, blocking banner, advisory banner, screen-level error or redirect for that code |
| Every endpoint a screen reads (`FE/features/*.md` data contract) | Initial loading, refreshing, failure | loading state · skeleton · retry |
| Every list or table | Empty, end of list, next-page loading | empty state · "no more" · page loader |
| Every mutation (POST / PUT / PATCH / DELETE) | Pending, success, failure | disabled + spinner on the trigger · success feedback · failure feedback |
| Every destructive or irreversible action | A second chance | confirmation dialog · undo |
| Every form field rule (schema) | The message for each rule | inline validation message per rule |
| `409` and concurrency rules | What the user sees when they lost the race | conflict state with a way forward |
| Access rules — `401`, `403`, another user's record → `404` | Session expiry, denial, not found | session-expired prompt · not-found screen |
| App-wide | Offline, timeout, unexpected `500`, unknown route | offline banner · timeout · generic failure · 404 page |
| Rendered values (S2 §1) | Long and missing values | truncation / wrapping of long names · fallback image · placeholder for null |
| Each S6 viewport | A layout at every width | a breakpoint with no drawn layout |
| Each control (S6 §4) | Keyboard and disabled states | focus-visible · disabled · loading |

Report the result in `ui-gaps.md` §1 as **patterns with counts**, never as one
line per screen:

```
gaps   47 across 5 screens → 9 patterns
  loading       14  (every read on every screen)
  mutation      11  (pending 5 · success 3 · failure 3)
  error-pres     8  (E-BOOKINGS-WINDOW on review, E-AUTH-EXPIRED app-wide, …)
  empty          4  (history, courts, search, notifications)
  confirm        3  (cancel booking, delete court, sign out)
  validation     4  (fields with rules but no drawn message)
  app-wide       4  (offline, timeout, 500, 404 route)
  long-content   2  (venue name, court name)
  focus          1  (no focus-visible style anywhere)
```

> Grouping by pattern is the point: fourteen screens needing a loading state is
> **one** decision about loading, applied fourteen times — not fourteen
> questions.

## Step 2 — Recommend, from what already exists

For each pattern, recommend **one** treatment that every instance uses. Build it
from the mockup's own material, in this order of preference:

| Preference | Recommendation | Example |
|---|---|---|
| 1. Reuse a component as-is | An existing S6 §4 component and variant | Error popup → the existing **Modal** with `Button/primary` "OK" |
| 2. A new variant of an existing component | Same anatomy, a token-only difference | Toast → **Banner/advisory** made floating; Skeleton → **Card** outline in `color.surface-muted` |
| 3. A new component | Only when nothing fits — composed of existing tokens only | A **Skeleton** line block, built from `space.*` and `radius.sm` |
| Never | New colours, fonts, spacing or radii | A token the design system does not have is a design decision, not a gap fill |

Each recommendation states:

| Field | Content |
|---|---|
| Pattern | `loading`, `toast`, `confirm`, … |
| Applies to | Count and where — "14 reads on 5 screens" |
| Treatment | Component + variant, tokens, placement, timing (e.g. skeleton after 300 ms, toast auto-dismiss 4 s) |
| Why this one | One line — what it reuses, and the trap it avoids (a spinner that flashes on a fast response; a toast that hides an error the user must act on) |
| Alternatives | One or two, each with its cost |
| Copy | Defined text where the spec has it (`error-handling.md` §4); otherwise lorem ipsum with a `COPY-nnn` recommendation (conventions §9, §9.1) |
| Draft | Path of the drawn proposal (Step 4) |

**Rules that shape a recommendation**

- An error the user must act on is never a toast — toasts vanish. Toasts are for
  success and for advisory messages only.
- A skeleton mirrors the shape it replaces; a spinner is for actions, not page
  content.
- Loading feedback waits a beat (default 300 ms) so a fast response shows nothing.
- Motion honours `prefers-reduced-motion` — no shimmer, no slide.
- A destructive action gets a confirmation dialog naming the thing destroyed; a
  reversible one gets undo instead of a dialog.
- Every new state has a real trigger the app can reach — the same rule as S6 §9.

## Step 3 — Ask, last, one pattern at a time

Ask with `AskUserQuestion`, up to four patterns per call, the recommendation
first and marked **(Recommended)**, each option with its trade-off. The user can
always answer something else.

```
Loading — 14 reads on 5 screens have no loading state.
  ● Skeleton after 300 ms, Card outline in color.surface-muted, no shimmer (Recommended)
      mirrors the layout, no flash on fast responses
  ○ Spinner centred in the content area
      simpler, but the layout jumps when content arrives
  ○ Keep the previous content, dim it, spinner on the trigger
      best for refreshes, wrong for first load
```

| Answer | Do |
|---|---|
| Recommended or another option | Record it in §2; draw it (Step 4) |
| "Skip" / out of scope | Record it in §3 *not designed* with the user's reason — the app will still need **something**, so name the fallback (e.g. the generic failure screen) |
| Something else | Record the user's words verbatim; draw that |

Never fill a gap the user has not answered. Never ask a pattern the spec does
not require.

## Step 4 — Draw the approved states into the mockup

The mockup is the source of truth, so an approved gap becomes a **mockup state**,
not a paragraph:

1. Draw each approved state as a new `?state=` of the existing mockup file
   (`booking-review.html?state=loading`), or — for app-wide patterns — one file
   under `mockup/system/` (`toast.html`, `offline.html`, `not-found.html`).
2. Use **only** existing classes and tokens; a new component from Step 2 gets
   the smallest CSS that composes existing tokens, and nothing else.
3. Show the drafts to the user before they land — a screenshot per state —
   and apply their changes.

Then fold them into the spec in the same pass:

| Update | Where |
|---|---|
| New refactor-map rows, one per new state | `FE/design-system.md` §4 |
| New state rows (trigger + presentation) | `FE/features/<screen>.md` States |
| New component or variant | `FE/design-system.md` UI kit, and S6 §4 catalog |
| New FR for new user-visible behaviour — additive only, per `/pspt:enhance` §3 rules | `srs.md` |
| New matrix rows, re-run `pnpm fidelity:analyse` | `FE/fidelity.md` §1, `tests/fidelity/baseline/` — allowed because the mockup changed |
| Placeholder copy | `docs/FE/copy-recommendations.md` (`COPY-nnn`) |

Gate 2 (requirements ⇄ mockup) must still pass afterwards: every new state is
covered by an FR or an existing error-code rule.

## `ui-gaps.md` — required sections

| # | Section | Content |
|---|---|---|
| 1 | Found | The Step 1 summary — patterns with counts, and the spec rule each came from |
| 2 | Decided | One row per pattern: treatment, applies-to, the user's answer, drawn state(s) |
| 3 | Not designed | Patterns the user skipped, the reason, and the fallback the app shows instead |
| 4 | Folded in | The mockup files, refactor-map rows, FRs and fidelity rows this stage added |

## Exit criteria

- [ ] Every rule in the Step 1 table was checked against every screen it applies to
- [ ] Gaps are reported and asked **per pattern**, not per screen
- [ ] Every recommendation reuses existing components and tokens, or says why it cannot
- [ ] No error the user must act on is shown as a toast
- [ ] Every pattern is decided by the user — drawn (§2) or skipped with a fallback (§3)
- [ ] Every drawn state is in the mockup, the refactor map, its screen document and the S6 matrix, and the baseline was regenerated
- [ ] New user-visible behaviour has an FR; Gate 2 still passes
