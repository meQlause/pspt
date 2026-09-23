---
name: status
description: Report where a project stands in the spec-driven pipeline — which requirement documents and mockup exist, whether the consistency gates pass, which specification stages are complete, and what runs next. Read-only, generates nothing. Use for "where am I", "what's next", "pspt status", or to check a project before running /pspt:spec.
---

# Pipeline status

Read-only. Inspect and report; **write nothing**, ask nothing.

---

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
| S7 | `phases.md` has at least one ticked exit criterion |

**Build progress.** If `phases.md` exists, count ticked versus total exit
criteria per phase.

**Drift.** If `docs/.pspt.json` records two repository paths, compare the four
shared files (`strict-rules.md`, `data-spec.md`, `error-handling.md`,
`phases.md`) between them and report any that differ. A shared contract with two
versions is a defect, not a formatting difference.

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
S7  ·  3/64 exit criteria

next   /pspt:build           P0 — "GET /health returns 503 when the database is down"
```

Use `·` for not started, `✓` for complete, `!` for a problem. If a gate fails,
show the blocking count and say that `/pspt:spec` will refuse until it is fixed.

If no inputs are found at all, say the directory is not a pspt project and name
the four documents it would need. Do not offer to create them.
