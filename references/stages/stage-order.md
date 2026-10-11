# Specification stage order and existing state

State version 2 uses this order:

| Stage | Artifact |
|---|---|
| S6 | Mockup fidelity: `FE/fidelity.md` and the measured baseline |
| S7 | Frontend validation: `FE/ui-gaps.md`, approved drawn states and regenerated baseline |
| S8 | Development plan: `phases.md`, including Mockup parity and Fidelity definition of done |

For a version-1 (or unversioned) `docs/.pspt.json`, interpret completed stage
keys by their former meaning, preserving timestamps and null values:
`new.s6 = old.s7`, `new.s7 = old.s8`, `new.s8 = old.s6`.
Use a snapshot of all three original values; never remap in place sequentially.
Keep S2–S5, stack answers and unrelated state fields unchanged. Version 2 keys
already use the new order and must never be remapped again.

Status normalizes this mapping in memory only; it remains read-only. A writing
spec invocation persists version 2 with the normalized keys in its stage commit.
When no state file exists, infer completion from the artifact and its exit
criteria, not a timestamp or the presence of a legacy stage number.

Stage timestamps do not bypass the gates: S8 requires completed S6 and S7,
resolved frontend gaps, Gate 2 and the final fidelity matrix/baseline. Existing
`phases.md` is retained; do not delete plans, reset checked criteria or regenerate
an in-progress build merely to adopt the new numbering. If frontend validation
is incomplete, report that work first and defer any phase-plan regeneration.
