# Frontend copy — recommendation for AI assistants

**Applies to:** every frontend file an assistant writes · **Rule:** [`conventions.md` §9](./conventions.md#9-frontend-copy--never-invent-text) · **Used by:** `/pspt:spec` S5, `/pspt:build`, `/pspt:ticket`, `/pspt:ticket-build`

This is the recommendation behind conventions §9, shown on one screen. It
explains **why** an assistant must never write frontend text it was not given,
and what to write instead. The rule itself lives in conventions §9; this file
does not restate it differently, it shows it.

![The same booking review screen built twice: on the left with invented text, on the right with lorem ipsum in the undefined spots](./images/frontend-copy-compare.png)

---

## 1. The situation

**See:** the whole image above — both panels start from the same inputs.

The mockup defined the heading **Review your booking**, the row labels and the
**Confirm booking** button. The API supplies the court, the date and every
amount. Four lines on the screen were **never defined** anywhere — not in the
mockup, not in the spec, not in the PRD/SRS, not by the user.

What the assistant writes into those four lines is the whole difference between
the two panels.

| Kind of text on this screen | Where it came from | Both panels |
|---|---|---|
| Heading, labels, button | The mockup | Written as-is |
| Court, date, rate, tax, total | The API | Real values — never lorem |
| Four other lines | **Nowhere** | ← the difference |

## 2. Assumed — the assistant fills the gaps itself

**See:** the left panel, markers ① to ④.

![Left panel: the assistant invented a discount, a refund policy, a marketing claim and a guarantee](./images/frontend-copy-assumed.png)

The page looks finished — and that is the problem. Nobody reviewing it can tell
which lines were approved and which were made up, so the made-up ones ship.

| # | Invented text | Why it misleads |
|---|---|---|
| ① | "Book today and get 20% off your next game!" | A discount that does not exist. Customers will ask for it at checkout |
| ② | "Free cancellation up to 24 hours… full refund" | A refund policy nobody decided. The real window may be 6 hours with a fee — now it is a written promise |
| ③ | "Trusted by 10,000+ players across Jakarta" | A number made up for marketing — false advertising under the company's name |
| ④ | "Your court is guaranteed — we never double-book" | A guarantee nobody approved. It sounds right, so it passes review |

> Invented copy is the most dangerous kind of placeholder, because it does not
> look like one. Each line above is a business decision taken by an assistant.

**Recommendation:** never do this. Not for a demo, not "just for now", not
because the sentence seems obvious.

## 3. The pspt rule — defined text as-is, lorem ipsum in the gaps

**See:** the right panel, markers ① to ④.

![Right panel: the same four spots filled with lorem ipsum sized to fit, everything defined written as-is](./images/frontend-copy-lorem.png)

The same four spots hold lorem ipsum, each sized to the length the layout
expects. The page is obviously unfinished, so nothing false can reach a
customer.

| # | Spot | Placeholder | What happens next |
|---|---|---|---|
| ① | Promo banner · one line | `Lorem ipsum dolor sit amet, consectetur adipiscing.` | Listed in `plan.md` §5a. Marketing writes it, or the banner is dropped |
| ② | Cancellation note · two sentences | `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.` | Waits for the real policy |
| ③ | Trust line · short | `Lorem ipsum dolor sit amet` | No claim until someone can back it |
| ④ | Guarantee note · one sentence | `Lorem ipsum dolor sit amet, consectetur.` | Replaced by the approved sentence, or removed |

**Recommendation:**

1. **Look for the text first.** Mockup markup, then the spec
   (`error-handling.md` §4, the screen document), then the PRD/SRS, then an
   existing copy constant in the codebase, then the user. If any of them has it,
   write it verbatim and do not ask again.
2. **Only if none has it, write lorem ipsum** — sized to the expected length,
   nothing half-invented, no `TBD`, no `Text here`.
3. **Keep it in the feature's copy constant**, never inline, so
   `grep -rn "Lorem ipsum"` finds every one.
4. **Record it** — a row in the screen document, or in the ticket's `plan.md`
   §5a — so replacing them is a list.
5. **Never assert it in a test.** Find the element by role or test id.

## 4. Reading the image

**See:** the key under the two panels.

![Key: blue is defined text written as-is, red dashed is invented and misleading, green dashed is lorem ipsum recorded and replaced before release](./images/frontend-copy-key.png)

| Marking | Means | Allowed? |
|---|---|---|
| Blue outline | Defined in the mockup or spec, written as-is | Yes — on both sides |
| Red dashed | Invented by the assistant | **Never** |
| Green dashed | Lorem ipsum for text nothing defines, recorded | Yes — replaced before release |
| No marking (prices, dates, court) | Real data from the API | Yes — never lorem, on both sides |

## 5. What this does not cover

**See:** the court, date and amount rows — identical in both panels.

Data is not copy. Names, prices, dates and references come from the API, and
fixtures and examples use realistic values per
[`house-style.md`](./house-style.md). `Rp 399.600` is never lorem ipsum. The
rule is only about **written** text a person is supposed to author.

---

All four images are rendered from one source,
[`images/frontend-copy-compare.html`](./images/frontend-copy-compare.html) — the
full page, then the `#left`, `#right` and `#key` elements, at 1600 px wide and
2× scale — so the panels always match. If the rule in conventions §9 changes,
edit that file, re-render the images and update this document in the same
commit.
