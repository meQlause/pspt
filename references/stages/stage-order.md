# Specification stage order and existing state

State version 3 uses this order:

| Stage | Artifact |
|---|---|
| S2 | Data specification: `data-spec.md` |
| S3 | System decisions: `architecture.md`, `security.md`, `operations.md`, `architecture-decisions.md` |
| S4 | Technology, conventions and toolchain: strict rules, error registry, BE/FE architecture and stack files |
| S5 | Backend feature contracts and testing |
| S6 | Frontend design system and screen contracts |
| S7 | Mockup fidelity: `FE/fidelity.md` and the measured baseline |
| S8 | Frontend validation: `FE/ui-gaps.md`, approved drawn states and regenerated baseline |
| S9 | Development plan: `phases.md`, Mockup parity and Fidelity definition of done |

## Normalize legacy state

Use snapshots of original values; never remap sequentially in place.

1. For version 1 or unversioned state, first normalize the former phase-first
   order into version 2: `v2.s6 = old.s7`, `v2.s7 = old.s8`,
   `v2.s8 = old.s6`. Keep S2–S5 unchanged.
2. For version 2, insert the new architecture review:
   `v3.s2 = v2.s2`, `v3.s3 = null`,
   `v3.s4 = v2.s3`, `v3.s5 = v2.s4`, `v3.s6 = v2.s5`,
   `v3.s7 = v2.s6`, `v3.s8 = v2.s7`, `v3.s9 = v2.s8`.
   Preserve timestamps and null values. Existing shared decisions do not prove
   the new S3 review is complete; verify its artifacts and exit criteria.
3. Version 3 keys already have this meaning; never shift them again. For a
   newer unknown version, report that it is unsupported rather than guessing.

Preserve stack answers and unrelated state fields. Status normalizes in memory
only and remains read-only. A writing spec invocation persists version 3 in its
stage commit. With no state file, infer completion from artifacts and exit
criteria, not legacy stage numbers.

## Existing builds and gates

Retain existing plans, checked exit criteria, requirement ids and decision ids.
Do not delete or regenerate an in-progress build to adopt the new numbering.
Report a missing S3 review and run it next; reuse and reference valid existing
decisions, documenting only the gaps. Numbering migration alone does not reset
completed implementation or create new product scope.

Stage timestamps never bypass exit criteria. New or regenerated S9 plans require
S2–S8 complete, including S3 decisions, S7 fidelity, S8 resolved frontend gaps,
Gate 2 and the final fidelity matrix/baseline. An explicit stage argument does
not bypass its prerequisites. If an existing build encounters a relevant open
architecture decision, block that dependent work, not unrelated completed work.
