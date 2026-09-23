# House style for generated documents

Every document this plugin writes is a **handover unit**: it must be pasteable
whole into an assisted session without trimming, and without dragging an
unrelated decision along with it. That constraint drives everything below.

---

## Shape

Open with a one-line status header, then the content. No preamble.

```markdown
# <Project> — <Document>

**Stage:** S4 · **Owns:** `bookings` · Conventions: [`README.md`](./README.md)

<one paragraph: what this is for, and what it deliberately does not do>
```

## Rules

**Tables over prose.** A decision with more than two attributes is a table row,
not a sentence. Prose is for the argument; tables are for the content.

**Every table earns a note.** Under a table that encodes a real decision, add one
`>` blockquote naming the trap it prevents or the failure it was written after.
A rule without its reason gets re-litigated in six weeks.

> If `express.json()` is mounted before the auth handler, every sign in fails
> with an error that looks like bad credentials. This is the one order trap in
> this codebase.

**Record what was rejected.** Every library choice carries the alternative it
beat and *why it won for this project*, not in general. Every data model carries
a "not modelled" section. An omission that isn't written down comes back every
sprint as a fresh idea.

**Traps are the valuable column.** In any library or stack table, the trap column
is the one that saves an afternoon. Never omit it, never leave it empty; if there
is genuinely no trap, say "none known".

**Number what will be referenced.** Sections get numbers so another document can
point at `§5.4` instead of quoting it. Requirements keep their source IDs.

**Real values, never placeholders.** Response examples use realistic data —
correct locale, real currency, long names, actual computed figures. A JSON
example with `"string"` and `42` in it proves nothing against a screen.

**Cross-reference, never restate.** If a rule lives in another document, link to
it. A registry with two homes eventually has two truths.

## Length

Split a document when it stops being one handover unit: past roughly four hundred
lines, or when you find yourself pasting half of it and deleting the rest before
asking a question, or when two of its sections change on different schedules.

Merge two documents when they are always opened together and never edited apart.

## Tone

Plain, declarative, unhedged. State the rule and its reason. No "it is
recommended that", no "consider whether", no marketing. The reader is an engineer
or an assistant who needs to act on this in the next ten minutes.

Write "the client never sends an amount", not "amounts should generally be
computed server-side where possible".
