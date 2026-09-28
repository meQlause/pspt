---
name: ticket-build
description: Execute every approved ticket that has not been built yet, one ticket at a time — resume any ticket left in progress, then take approved tickets oldest first, re-check each plan against the current code, and run /pspt:ticket's implement and close-out steps on it until every box in its phase.md is ticked. Stops on a red test, an unplanned file, a stale plan, or when the user says stop. Use for "/pspt:ticket-build", "build the tickets", "run the approved tickets", "execute the queue", or "/pspt:ticket-build <name>" for one ticket.
---

# The ticket queue

`/pspt:ticket` talks a change through, plans it and gets it approved.
`/pspt:ticket-build` executes what was approved: every ticket in `tickets/`
that is approved but not yet done, **one ticket at a time**, each from its
first unticked box to close-out before the next one starts.

It is to `/pspt:ticket` what `/pspt:build-long` is to `/pspt:build` — a loop,
never a second method. How a phase is implemented, ticked, tested and committed
is `/pspt:ticket` Steps 7 and 8; this skill decides **which ticket runs next**
and **when to stop**.

---

## Before anything — jcodemunch

Same prerequisite as `/pspt:ticket` §Before anything: check for it, ask before
installing it, stop if declined. The plan re-check below and every phase use
its tools. Index the working directory once, before the first ticket.

## Step 1 — Build the queue

Read the `**Status:**` line of every `tickets/*/request.md`.

| Status | In the queue? |
|---|---|
| `in progress · P<n>` | **Yes, first.** A ticket left mid-phase is finished before a new one starts |
| `approved` | **Yes**, oldest `**Opened:**` date first, then slug |
| `blocked · <reason>` | **No — stop the whole run.** Print the ticket and its reason; the user answers it through `/pspt:ticket <name>` first |
| `planned` | No. Not approved; list it as waiting for approval |
| `done` | No |

If the user named a ticket (`/pspt:ticket-build <name>`), the queue is that one
ticket — refused, with the reason, if its status is not `approved` or
`in progress`.

Print the queue before starting, so the order is on screen:

```
Queue: 3 tickets
  1  booking-ref-v2      in progress · P2
  2  offline-banner      approved · opened 2026-09-21
  3  cancel-idempotent   approved · opened 2026-09-24
Waiting for approval: venue-hours (planned)
```

An empty queue is a one-line answer — "nothing approved to build" plus the
planned tickets waiting for approval — and the skill stops.

## Step 2 — Re-check the plan against today's code

A ticket was planned against the code as it was when it was approved. An
earlier ticket in this queue — or anyone's commit since — may have moved it.
Before the first unticked box of each ticket:

1. Every `path:line` in `plan.md` §1 still shows what §1 says.
2. Every `modify` and `delete` row in §2 still applies — `check_edit_safe` and
   `check_delete_safe` agree, and the exact edit still matches the text it
   replaces.
3. §3 is still complete — `find_importers` on every F file finds no importer
   the table does not list.
4. No F file of this ticket was changed by a ticket earlier in this run
   without this plan knowing it.

**All hold** → Step 3. **Any drifted** → status `blocked · plan stale`, list
each drifted row with what the code shows now, and **stop the run**. Re-planning
is a conversation — `/pspt:ticket <name>` — not something the loop guesses its
way through.

> A plan executed against code it was not written for is a guess with
> checkboxes.

## Step 3 — Execute one ticket

Run `/pspt:ticket` Step 7 from the ticket's first unticked box in `phase.md`,
then Step 8 — every rule unchanged:

- tests red first, then green; every R row run each phase
- each box ticked the moment its work is done, never in a batch
- every test outcome written into `plan.md` §6 `Result`
- unplanned file → stop, record it with a test, tell the user
- commits per phase and at close-out, per `/pspt:ticket` §Commits

Before each phase print one line; after it, the phase line `/pspt:ticket`
Step 7 already prints:

```
▶ offline-banner · P1 additive · 0/3 tasks
✓ offline-banner · P1 additive — T1 T2 R1 S1–S3 green; committed frontend@3e81a0c, parent@c02d7f4. Next: P2 wire-in.
```

## Step 4 — Between tickets

When a ticket closes out, print its `/pspt:ticket` Step 8 report, then one line:

```
✓ 1/3 booking-ref-v2 done · next: offline-banner
```

Then start the next ticket at Step 2 — its plan re-check runs against the code
the ticket just finished left behind.

When the queue is empty, print a summary and stop:

```
Ticket queue done.  3 built · 11 phases · 27 tests pass · 0 unplanned files.
Waiting for approval: venue-hours (planned)
```

## When to stop

The run ends — and the skill returns control to the user — when any of these
is true:

- The user says **stop** or interrupts. Committed phases stay committed; the
  in-flight phase's ticked boxes stay as the record of what finished, and its
  status stays `in progress · P<n>` so the next run resumes there.
- **The queue is empty.**
- A ticket's **plan is stale** (Step 2).
- A ticket hits **an unplanned file or a red test** — `/pspt:ticket` Step 7
  sets it `blocked`; the run stops rather than skipping to the next ticket.
- The **same phase fails twice in a row**. One retry after a fix is fine; a
  second failure means the fix is off. Stop and report.

> Skipping a blocked ticket to keep the queue moving is how a later ticket gets
> built on top of an unfinished one. The queue is ordered; it stops where it
> breaks.

## Commits

Every commit is `/pspt:ticket` §Commits — per phase (submodule first, then the
parent) and at close-out, explicit paths, no `git add -A`, no `git push`,
semantic messages, and **SR-6: no `Co-Authored-By` trailer**, no tool
attribution. The loop adds no commit of its own. A stale-plan or blocked status
change is committed alone:

```
docs(ticket): block <slug> — <plan stale | unplanned <path> | <test id> red>

<body: what was found, each drifted row or failing test, what the user must
decide. Wrapped at 100.>

ticket: <slug>
```

---

## Never

- **Never build a ticket that is not approved.** `planned` means the user has
  not agreed to it yet.
- **Never run two tickets at once**, or interleave their phases. One ticket,
  first unticked box to close-out, then the next.
- **Never skip a blocked ticket** to reach the next one. Stop the run.
- **Never execute a stale plan.** Re-check first; drift sends the ticket back to
  `/pspt:ticket`.
- **Never edit a ticket's `request.md`** beyond its status line and AC ticks.
  What was asked is fixed once approved.
- **Never push.** The user pushes when the run stops.
