---
name: code
description: Add, change or audit an error code across every place it must appear — the registry, the user-facing copy, the frontend behaviour mapping, the feature documents that raise it, and both repositories. Use for "add an error code", "new error for X", "why does this return 409", or to check the registry for drift.
---

# Error code registry

One code, one meaning, one status, forever. A registry with two homes eventually
has two truths — so every change here touches **every** place at once, in one
change, or it is not done.

---

## Adding a code

Ask for what you cannot infer: the condition that raises it, the HTTP status, the
user-facing sentence, and what the screen does with it. Then write all five
places.

| # | Place | What goes there |
|---|---|---|
| 1 | `error-handling.md` §3 registry | Status · code · raised when · frontend behaviour |
| 2 | `error-handling.md` §4 copy | The user-facing sentence, in the product's language |
| 3 | `error-handling.md` §5 frontend mapping | Which presentation class: field level, blocking banner, advisory banner, screen level, navigation |
| 4 | The feature document's error table | Every endpoint that can raise it |
| 5 | Both repositories | If `docs/.pspt.json` records two repo paths, the shared file is updated in both |

Miss any one and the code is half-real: the backend can raise something the
frontend renders as a generic failure.

## Rules

**One status per code.** Two conditions that need different screen behaviour are
**two codes**, even when they share a status. Reusing one code for a second
condition is how a frontend ends up guessing from the message text.

**Never reuse a code for a new meaning.** A new condition gets a new code. A code
already in production is part of the contract.

**Never return a bare 500 for a condition the product understands.** If the
product knows what happened, it has a code.

**Interpolate the numbers.** A sentence mentioning a window, a limit or a horizon
takes it from configuration, never typed into the string. The copy carries a
placeholder and the source it reads from.

**Define the screen behaviour before the frontend consumes it.** A frontend
cannot show a useful message for a code it first learns about in production.

**Not found beats forbidden.** Another user's record returns the not-found code,
so existence is not leaked. A forbidden response confirms the identifier exists,
which is enough to enumerate.

## Auditing

Run without a specific code to check the registry for drift:

- A code in the registry that no feature document raises — dead, or an
  undocumented endpoint
- A code a feature document raises that is not in the registry — the frontend
  will render it generically
- A code with no §4 sentence, or no §5 behaviour
- A code appearing with two different statuses in two places
- The shared `error-handling.md` differing between the two repositories

Report findings as a list with the file and line. Fix only what the user asks
you to fix.

## Driver error translation

Database and ORM errors are translated at the boundary, never leaked. Record the
mapping in `error-handling.md` §2 — a uniqueness violation, a foreign key
violation, a missing row, an exclusion-constraint violation. The raw driver
message never reaches a response or any log line a client can see.

## Commit — automatic when a code was added or changed

An add or a change touches all five places at once, so it lands as one
commit that captures the whole change. Same discipline as `/pspt:build`'s
Commits section: `git status --porcelain` first, stage explicit paths
(registry, copy, mapping, feature doc, and — if `docs/.pspt.json` records
two repo paths — the same shared file in the second repo), then commit.
No `git push`.

Message template:

```
feat(errors): <one-line what the code is for>

<body: the condition that raises it, the status, the sentence, the
screen behaviour. Wrapped at 100.>

code: E-<AREA>-<NAME>
places: error-handling.md, <feature docs>, both repos if applicable
```

For a change (renaming a code, updating copy, moving between presentation
classes), use `fix(errors):` instead and note what the change replaces.
**Never `refactor(errors):`** for a semantic change — a shipped code is
part of the contract; a rename is a new code, not a rewrite of the old
one (see §Rules).

If the docs live in submodules, commit inside each affected repo and
move the parent submodule pointer last, per `/pspt:build` §Commits.

**Audit mode never commits.** `/pspt:code` invoked without a specific code
runs the audit checks in §Auditing and reports findings only. Fixing a
drift finding is a subsequent invocation with the specific code named,
which then commits as an add or change.

**SR-6: no `Co-Authored-By` trailer**, no tool attribution.

### When the user says "don't commit this one"

Skip the commit for this invocation only. Next add or change commits
automatically again.
