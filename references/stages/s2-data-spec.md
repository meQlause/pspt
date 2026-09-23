# S2 — Data specification

**Produces:** `docs/data-spec.md` (written into both repos)

Turn the mockup into a database design that can be migrated, seeded and queried.
Every table must trace to a screen or to a rule stated out loud in the SRS.

---

## Order of work

Build §1 **first and completely**, before proposing a single table. The extraction
table is the artifact that makes the schema derived rather than imagined, and
every later section is checked against it.

## Required sections

| # | Section | Content |
|---|---|---|
| 1 | Extraction table | One row per rendered value, read off the mockup markup |
| 2 | Entity map | Text diagram of entities and relationships, plus a one-line summary table per entity |
| 3 | Relationships | Child → parent, cardinality, `ON DELETE`, `ON UPDATE`, and the reason for each |
| 4 | Enum types | Every enumerated type, with the reason any candidate was rejected |
| 5 | Tables | Column, type, nullability, default, key — per table, then indexes and checks |
| 6 | Constraints that carry a guarantee | Exclusion constraints, partial unique indexes, generated columns, as SQL |
| 7 | Written rules that produced columns | The business rules that created a column no screen shows |
| 8 | Data types | The project-wide rule per data kind |
| 9 | Not modelled | What was considered and deliberately left out, with the reason |

### §1 extraction table columns

| Screen element | Rendered value | Implied field | Implied rule | Source |
|---|---|---|---|---|

`Source` carries the SRS requirement id (`FR-014`) when one covers this element.
Read the **markup**, not a screenshot — element ids and data attributes carry the
field names, which is what makes the mapping mechanical.

Finish with an explicit sentence stating that nothing on any screen renders a
value no field can supply. If that is not true, the run should have blocked at
gate 2.

### §5 per-table detail

Every table gets the full column grid, then:

- **Indexes** — named, typed (btree / gist / gin), partial `WHERE` where useful,
  and each tied to the query or screen that needs it. An index with no named
  reader is a write cost with no reader.
- **Checks** — every invariant expressible as a `CHECK`, written as SQL.

## Decisions to ask

Ask each with two candidates and the cost of each, never as an open question.

| Decision | What to put in front of the user |
|---|---|
| Normalisation | Where a repeated label becomes its own table, and what a rename costs in each option |
| Delete behaviour | `CASCADE` vs `RESTRICT` per relationship, with the data-loss scenario spelled out. Financial history never cascades |
| Update behaviour | `ON UPDATE` per foreign key, and whether the parent key is mutable at all |
| Enum representation | Native enum vs lookup table per enumerated field, and what adding a value costs in each |
| Index set | Which to build now, which to defer, each named with its reading query |
| Constraint expression | Which guarantees are worth their write cost |
| Type rules | Exact decimal vs float, timestamp with or without zone, id strategy — decided once for the project |

## Exit criteria

- [ ] Every column traces to a §1 row or to a §7 written rule
- [ ] Every relationship has a delete rule **and** an update rule, each with a stated reason
- [ ] Every guarantee is expressed as SQL, not as prose
- [ ] A seed dataset is described that can populate every screen and every state in the mockup
- [ ] Money, time of day, timezone and currency rules are stated once in §8 and used everywhere
- [ ] Nothing in §9 is there by accident — each omission has a reason

## Traps

**Do not invent tables the mockup cannot justify.** If the SRS demands data no
screen renders, that disagreement should have blocked at gate 2. It is not
resolved by quietly adding a table.

**A rename question is a table.** When a label repeats across records and
renaming it must reach all of them, it is a table with a foreign key, not a
string array on each row. This is usually discovered from a tag or chip on a
card, not from thinking about the domain.

**Snapshot anything a later change must not move.** A price on a transaction is
copied onto the row at creation, never read live from the catalogue. State it in
§7 and enforce it with a regression test.

**Half-open intervals.** Any range type uses `'[)'` bounds so that an interval
ending at 12:00 leaves 12:00 free. Write the boundary case into the spec
explicitly — it is the one everyone gets wrong once.
