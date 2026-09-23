---
name: trace
description: Walk the traceability chain in either direction — requirement to screen element to database column to endpoint to test, or back from a test to the business objective it protects. Use for "what does FR-014 turn into", "why does this column exist", "what proves this", "what breaks if I change this", or to answer an audit question about coverage.
---

# Traceability

One row per user-visible guarantee, read left to right:

```
BRD objective → PRD feature → SRS FR-nnn → screen element → column → endpoint → test
```

Something was agreed, it was drawn on a screen, it became a column, the column
got an endpoint, and the endpoint got a test with a name that survives the person
who wrote it.

---

## Which direction

Infer it from what the user names.

| They name | Direction | Answers |
|---|---|---|
| A requirement id, a feature, an objective | **Down** | What did this turn into, and is it proven? |
| A column, a table, an endpoint, a test, a regression id | **Up** | Why does this exist, and who asked for it? |
| A change they are about to make | **Both** | What breaks, and what proves it still works? |

## Where each link lives

| Link | Found in |
|---|---|
| Objective → feature | `brd.md` → `prd.md` |
| Feature → requirement | `prd.md` → `srs.md` |
| Requirement → screen element | `data-spec.md` §1 extraction table, `Source` column |
| Screen element → column | `data-spec.md` §1, implied field |
| Column → endpoint | `BE/features/*.md` request and response tables |
| Endpoint → test | `BE/testing.md` §4 register, and `tests/` by path transform |
| Code → screen behaviour | `error-handling.md` §3 and §5 |
| Mockup file → component | `FE/design-system.md` §4 refactor map |

## Output

The chain, one line per link, with the file each was found in. Then the verdict.

```
FR-014  "the total shown must be the total charged"

  prd.md §3          Feature: transparent pricing
  data-spec.md §1    Review, total → Rp 399.600 → bookings.total_amount
  data-spec.md §5.4  total_amount NUMERIC(14,2), CHECK total = subtotal + tax
  bookings.md §1     POST /bookings — server computed, body carries no amount
  testing.md §4      REG-001 — a body with totalAmount returns 422
  tests/regression/REG-001.client-cannot-set-price.test.ts

  ✓ complete and proven
```

## Verdicts

| Verdict | Means |
|---|---|
| **complete and proven** | Every link present, and a test asserts the end of the chain |
| **complete, unproven** | The chain holds but nothing tests it. Name the level the test belongs at |
| **broken at `<link>`** | The chain stops. Name the missing document and section |
| **orphan** | It exists in code or schema with nothing upstream asking for it |

An orphan is not automatically wrong — but it should be justified in a "not
modelled" or "deliberately fixed" section somewhere, and if it is not, it is
either dead or undocumented.

## Impact mode

When the user is about to change something, walk **up** to find who asked for it,
then **down** from there to find everything else that answer touches. Report:

- Which documents must change in the same pull request
- Which tests will fail, and which *should* fail
- Whether a regression protects the current behaviour — if one does, changing it
  needs a decision, not an edit

> A specification change and the code it describes travel together, in the same
> pull request.
