# Test cadence — test what you touch, the whole suite at the boundaries

A full suite run proves the tree; a targeted run proves the change. Running the
whole suite after every criterion or ticket phase buys no new signal for the
time it costs, and on an ordinary laptop it is what runs the machine out of
memory: one database container per integration file, a jsdom worker per core,
a browser left open between steps. The skills follow three tiers.

| When | What runs |
|---|---|
| **While building** — each criterion (`/pspt:build`), each ticket task | The test(s) of the code in hand only: the mirrored file of the source you changed (`vitest run <path>`), unit or integration, red first then green. Plus `pnpm check` (static: format, lint, types, knip — no tests) and the hook's lint on the changed files |
| **Each ticket phase** (P1, P2 …) | That phase's own **Verified by** rows: its T rows and the R rows whose at-risk file depends on a file the phase edited. Not every R of the ticket |
| **At a boundary** — the last criterion of a `phases.md` phase, a ticket's close-out, and right before any `git push` | The whole suite once: every unit and integration file, the e2e/fidelity suites the project has, and `pnpm check` |

A test that the change could plausibly break but that is not in the mirrored
file — a shared helper's other caller, a mapper the edited service feeds — is
run too. Targeted means *the tests this change can affect*, not *only the new
test*.

A boundary run that turns red stops the phase or the push exactly like a red
test mid-phase: fix it, or report it and wait. Never push past it.

## Resource discipline

The suite must finish on the machine the user has, with their other
applications open. Before the first boundary run in a project, check the
config holds to this; propose the change if it does not.

- **One database container per run, not per file.** A Vitest `globalSetup`
  starts the container once, applies every migration into a template
  database and `provide()`s the connection; each test file creates its own
  database from it (`CREATE DATABASE <unique> TEMPLATE <template>`) and drops
  it in teardown. Files stay isolated without paying a container and a full
  migration each. A test that must migrate in steps (rows written between two
  migrations) keeps a container of its own — cluster-wide objects such as
  roles cannot be created twice on one server.
- **Unit and integration are separate projects.** A unit-only run never
  starts Docker (`--project unit`).
- **Cap the workers.** `maxWorkers` in the Vitest config (4 is a good default
  on a laptop); one worker on a constrained Docker engine.
- **Browsers and servers live for one step.** A Playwright browser is closed
  when the script that opened it ends; a `vite preview` or dev server is
  stopped when its check is done. Nothing is left running in the background
  between steps. Screenshots at device scale 1 unless the check is about
  high-density rendering (a WebGL scene at 2× is several times the memory).
- **Clean up containers** per [docker-testing.md](docker-testing.md).

## What to report

Every report names the tier that ran: `T3 green (targeted)`,
`P2: T1 T2 R1 green`, or `full suite: 412 unit · 96 integration · e2e green`.
A report never implies a full run that did not happen.
