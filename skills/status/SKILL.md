---
name: status
description: Report where a project stands in the spec-driven pipeline — which requirement documents and mockup exist, whether the consistency gates pass, which specification stages are complete, and what runs next. Read-only, generates nothing. Use for "where am I", "what's next", "pspt status", or to check a project before running /pspt:spec.
---

# Pipeline status

Read-only. Inspect and report; **write nothing**, ask nothing.

---

## Before anything — prerequisites

Check the tools in [`references/prerequisites.md`](../../references/prerequisites.md)
§1 and report each one: `✓ jcodemunch` or `✗ jcodemunch — missing; the next
writing skill will offer to install it`. Read-only: never ask, never install.

## What to check

**Inputs.** Glob for markdown and the mockup, classify by content the same way
`/pspt:spec` does — BRD, PRD, SRS, mockup. Note which are missing.

**Gates.** If all four inputs exist, run the two-way consistency check from
`/pspt:spec` step 3 and count the gaps. Do not print every gap unless asked; the
count plus the first few is enough at this level.

**Stages.** Read `docs/.pspt.json` if present, otherwise infer from the files in
`docs/`:

| Stage | Complete when |
|---|---|
| S2 | `data-spec.md` |
| S3 | `strict-rules.md`, `error-handling.md`, both architecture and both stack files |
| S4 | `BE/features/README.md`, ≥1 `BE/features/*.md`, `BE/testing.md` |
| S5 | `FE/design-system.md`, ≥1 `FE/features/*.md` |
| S6 | `phases.md` |
| S7 | `FE/fidelity.md`, and a Mockup parity phase in `phases.md` |
| S8 | `FE/ui-gaps.md` |
| Build | `phases.md` has at least one ticked exit criterion |

**Build progress.** If `phases.md` exists, count ticked versus total exit
criteria per phase.

**Drift.** Spec docs live only in the working directory's `docs/`, so
there is nothing to compare across repos. Two cross-checks remain:

- **Toolchain.** For each submodule that exists, run the Step 0b checks from
  `/pspt:build` against `references/toolchain/manifest.json` — every file's
  sha256 (ESLint, knip, Prettier, commitlint, husky hooks), no second config,
  pinned dependencies, scripts, hooks active, TypeScript strict with no `.js`
  under `src/` / `tests/`. Read-only: report, never repair — name
  `/pspt:fix-flow` as the next step when anything differs. A `toolchainDrift`
  entry in `docs/.pspt.json` is a drift the user chose to keep — show it with
  its reason.
- **`noLinter`.** If it names an unsupported framework, surface that so the
  reader knows the commit-hook zero-warnings guarantee is off for that side.

## Output

One compact block. No preamble, no advice the user did not ask for.

```
lapangin

inputs    ✓ brd.md   ✓ prd.md   ✓ srs.md (42 FR, 8 NFR)   ✓ mockup/ (2 screens, 7 states)
gates     ✓ complete   ✓ consistent

S2  ✓  data-spec.md          6 tables, 1 exclusion constraint
S3  ✓  6 files               express · prisma · postgres · react+vite
S4  ✓  2 features            10 endpoints, 5 regressions reserved
S5  ✓  2 screens             8 refactor rows
S6  ✓  phases.md             7 backend, 4 frontend
S7  ✓  fidelity.md           9 text roles, 11 components, 19 variants, 6 one-offs
S8  ✓  ui-gaps.md            47 gaps → 9 patterns, 8 drawn, 1 skipped
tools  ✓  backend express      ! frontend react — knip.json missing, eslint.config.mjs differs (3 rules)
build  3/70 exit criteria

next   /pspt:build           P0 — "GET /health returns 503 when the database is down"
```

Use `·` for not started, `✓` for complete, `!` for a problem. If a gate fails,
show the blocking count and say that `/pspt:spec` will refuse until it is fixed.

If no inputs are found at all, say the directory is not a pspt project and name
the four documents it would need. Do not offer to create them.
