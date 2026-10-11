# Landing — the seam contract

A **seam** is the boundary between two sections. A landing page is one story, so at
every seam something carries the eye across: the **thread** (one continuous line),
and often the **carried object** (one thing that changes form as the story moves).
Each section can look perfect alone and the page still fails at its seams. These
rules exist because each of them was once broken.

---

## 1. One thread, stitched

| Rule | Why |
|---|---|
| Exactly one visible thread crosses each seam, at a named **stitch point** S = (x, boundary) | Two lines at a seam read as two stories |
| Both neighbours' lines pass through S with a **vertical tangent** | A line that arrives sideways and leaves downward shows a kink at the seam |
| Every segment touching S is a stitch curve: `C x0,mid x1,mid x1,y1` with `mid` the vertical midpoint — never a hand-tuned control pair | Hand-tuned controls drift; a 40px "drop" with 460px to travel is a cliff |
| When the vertical room is too short for the horizontal travel, **move the stitch point**, not the curve: drop straight down first, curve in the next section's room | The 04→05 kink came from forcing a centre stitch under a right-hand phone |
| On phones, a thread that runs a side rail **stays on the rail across the seam** when both neighbours use it | Rail → centre → rail is a zigzag nobody asked for |
| Simple and direct: a line goes from where it is to where it is needed, with no detour the story does not ask for | "Don't turn left first" — the visitor reads a detour as a mistake |
| No dead ends: every section's thread enters and leaves (the first only leaves, the last only enters) | A line that stops mid-page says the story stopped |
| A "lost" or broken stretch (a red slack) **fades away** once it is repaired; it never stays beside its repair | Two lines, one red one green, read as two states at once |
| The thread's colour at a section's exit equals its colour at the next one's entry | Colour jumps at a seam read as a cut |
| Stroke width matches at the seam, or changes only on a named beat | A 3.4px line meeting a 2px line reads as a break |

## 2. The carried object

| Rule | Why |
|---|---|
| One holder at a time. The **giver** paints above the receiver until it hands off; once handed off it drops back and the receiver paints above | The object straddles the seam; whichever section paints on top crops the other half |
| Stacking lives on the section (and its pin spacer, which copies z-index when the pin is created) — a child's z-index cannot escape its section | A `z-index: 6` card inside a `z-index: 1` section is still under a `z-index: 2` neighbour |
| No `overflow: hidden` on a section where an object straddles its edge; clip with `clip-path: inset(-room 0 0)` when a side must stay clipped | `overflow: hidden` cut the pill in half at the top of a pinned frame |
| The hand-off happens at one scroll position, named once, and both sides use it (`top 35%` on the receiver ≙ `bottom 35%` on the giver) | Two positions mean a moment with two objects, or none |
| The receiver starts exactly where the giver left the object: same point, same form or a named morph, same angle | A jump of 20px at hand-off is what the eye notices first |

## 3. Timing

| Rule | Why |
|---|---|
| At a seam, drawing is **scrubbed to scroll**, never timed | A 1.6s timed join was still drawing when the next section had already started |
| One shared **seam line** (a viewport fraction, e.g. 75%): the outgoing line finishes when the seam reaches it, the incoming line starts there | The head of the thread sits on one line of the screen; nothing runs ahead |
| The outgoing thread reaches the seam **before** the incoming one draws from it | An incoming line that appears first looks like it came from nowhere |
| Interactive beats (a join the visitor triggers) never own the seam stretch; the stretch to the seam is drawn by scroll | The visitor might not interact; the seam must still connect |

## 4. Proof — by eye

Every seam is looked at in the browser, on desktop and phone, with the seam at 85%,
55% and 25% of the viewport. Gaps, kinks, crops and runaway lines show at 85%;
settled joins at 25%. A seam that looks joined at all three, both widths, is done.
