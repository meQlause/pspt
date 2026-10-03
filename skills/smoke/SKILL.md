---
name: smoke
description: Smoke-test the running app in a real browser — ask what to test, get permission to run Docker and Chrome, bring the app up locally, log in with a throwaway test user when a page needs it, visit each page once, check it loads without errors, and save a full-page PNG of each so the user can see it. Not a test suite; it answers "does the app run". Use for "/pspt:smoke", "smoke test", "open the app and check it", "take screenshots of the pages", "does the frontend still load", or to preview a local HTML file such as an email template.
---

# Smoke test in a real browser

One visit per page, a few checks, a picture of each. The question is **does the
app run** — not whether every rule holds. That is what the tests are for.

The mechanics are a script, `references/smoke/smoke.mjs`. It finds Playwright,
launches Chrome, logs in, visits every target, and writes a PNG and a
`report.json`. This skill decides **what** to visit, gets the app running, and
reads the pictures.

```
node <plugin>/references/smoke/smoke.mjs .pspt-smoke/<run>/plan.json
```

Exit `0` = every target passed, `1` = at least one failed, `2` = no browser.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): the tools
every pspt skill needs (jcodemunch and ponytail) must be present. Missing → ask once, then
install and register them yourself for the project (`.mcp.json`,
`.claude/settings.json`, `CLAUDE.md`, `AGENTS.md`, `.agents/rules/`); declined → this skill does
not start. Read code through jcodemunch from here on.

## Step 1 — Ask what to test

First find the candidates, so the question offers real pages rather than an
open "what do you want?":

| Source | Gives |
|---|---|
| The frontend router — React Router route objects, Next.js `app/` or `pages/` | every route, and which ones sit behind an auth guard |
| `docs/FE/features/*.md` | the screens the spec names, with their primary action |
| HTML files outside the app — email templates, static previews | `file` targets, no server needed |

Then one `AskUserQuestion` (multi-select): the main pages grouped by feature,
"every top-level route once" as the first option, and local HTML files if any
exist. The user can name anything else in their own words — "the booking flow
up to the payment page", "the reminder email".

For each chosen page, settle in one line what "works" means, from the spec or
the code: the text or element that must be visible (`expect`), and at most one
primary action (`actions` — open the dialog, submit the search). A smoke test
never completes a payment, sends a message or deletes anything real.

## Step 2 — Ask permission to run Docker and Chrome

One `AskUserQuestion`, naming exactly what will run:

> **Run the smoke test?** I'll start `docker compose up -d --wait` from
> `docker-compose.yml` (db, backend, frontend), open headless Chrome through the
> frontend's `@playwright/test`, create one test user `smoke+<time>@example.test`
> through the API, and delete it and stop the containers afterwards.

| Answer | Do |
|---|---|
| **Yes** | Steps 3–8 |
| **The app is already running — don't start Docker** | Skip the compose step; use the running app. Never stop what this skill did not start |
| **No** | Stop. Nothing has been started or written |

Permission is for this run only. A later run asks again.

**Before saying it will run, check what the app does when touched.** If the
backend sends real email, SMS or push from the pages being visited (a reminder
job, a notification on login), say so in the question and propose the safe
setting the project already has — a mail catcher in the compose file, a
"notifications off" admin setting, a sandbox key. Never smoke-test against
something that reaches real people.

## Step 3 — Bring the app up

1. **Already running?** `GET` the frontend URL (`http://localhost:5173` for
   Vite, `:3000` for Next.js — from the stack in `docs/.pspt.json` or the
   project's config) and the backend health route. Both answer → use them,
   start nothing.
2. **Docker.** `docker compose version` must work. Use the project's compose
   file (`compose.yaml`, `docker-compose.yml`, at the root or in `backend/`):
   `docker compose up -d --wait`. Record that this skill started it.
3. **No compose file** → ask once whether to start the dev servers instead
   (`npm run dev` in each package, in the background) or let the user start the
   app. Never write a compose file or a Dockerfile from here — that is a
   `/pspt:ticket`.
4. **Wait** until the frontend answers `200` and the backend health route
   answers, at most two minutes. Still down → print the last 40 lines of
   `docker compose logs` for the failing service and go to Step 8.

Only `localhost` or the compose network. **Never** a production or staging URL,
never `prisma migrate deploy` (or any migration) against a database that is not
the local container, never a deploy.

## Step 4 — The browser

`smoke.mjs` decides, in this order, and prints what it used:

| Looks for | Then |
|---|---|
| `@playwright/test` or `playwright` in the frontend's `node_modules` | uses it — nothing to install |
| a global `playwright` | uses it |
| Google Chrome installed | launches it (`channel: 'chrome'`) |
| otherwise | Playwright's own Chromium |

Exit `2` means neither Playwright nor a browser was found. Then ask once
before installing anything: `npm i -D @playwright/test` in the frontend, or
`npx playwright install chromium` (about 150 MB). Declined → stop.

## Step 5 — A test user, only if a page needs login

1. Create it the way the app does: the register or invite endpoint first; a
   direct insert into the **local** database only when there is no endpoint
   (an admin role, an invite-only app). Email `smoke+<unix time>@example.test`,
   a random password, the smallest role that reaches the pages.
2. Record its id. Step 8 deletes it **whatever happened** — a failed run still
   cleans up.
3. Never use a real account, never print the password, never put it in the
   report.

## Step 6 — Run

Write the plan to `.pspt-smoke/<YYYY-MM-DD-HHmm>/plan.json` and add
`.pspt-smoke/` to `.git/info/exclude`, so a run is never committed or linted.

```json
{
  "projectDir": "frontend",
  "baseUrl": "http://localhost:5173",
  "apiUrl": "http://localhost:3000",
  "out": ".pspt-smoke/2026-10-03-1420",
  "viewport": { "width": 1440, "height": 900 },
  "login": {
    "path": "/login",
    "actions": [
      { "fill": "input[name=email]", "value": "smoke+1759501200@example.test" },
      { "fill": "input[name=password]", "value": "<generated>" },
      { "click": "button[type=submit]" },
      { "waitForUrl": "/dashboard" }
    ]
  },
  "targets": [
    { "name": "Courts", "path": "/courts", "expect": "text=Book a court" },
    { "name": "My bookings", "path": "/bookings", "auth": true, "expect": "h1", "notAt": "/login" },
    { "name": "Booking dialog", "path": "/courts/1", "auth": true, "actions": [{ "click": "text=Book" }, { "waitFor": "role=dialog" }] },
    { "name": "Reminder email", "file": "backend/src/emails/preview/booking-end-reminder.html" }
  ]
}
```

| Field | Meaning |
|---|---|
| `expect` | a Playwright selector that must be visible |
| `notAt` | fail if the page ended on this URL — a login redirect means the session did not hold |
| `actions` | `fill` + `value`, `click`, `press`, `waitFor`, `waitForUrl`, `wait` (ms) — one primary action, not a script |
| `auth` | visit with the logged-in session |
| `file` | a local HTML file, opened as `file://` |
| `allowConsoleErrors` | top level; `true` only when the user says known console noise should not fail the run |

Each target **fails** on: a page that does not open, an HTTP status ≥ 400, an
uncaught JavaScript error, a request to the app's own origin or API that fails
or returns `5xx`, a console error, an `expect` that is not visible, a `notAt`
redirect, or an action that cannot be done. A screenshot is taken either way.

## Step 7 — Look at every picture

The script cannot see a blank screen, an error boundary, a layout that fell
apart or a broken image. Read every PNG and judge it:

| Look for | Verdict |
|---|---|
| Blank page, spinner that never ended, "Something went wrong" | ✗ even if the checks passed |
| Overlapping or unstyled layout, missing images, text cut off | ! note it |
| Lorem ipsum where copy is not yet approved (conventions §9) | fine — expected |

## Step 8 — Clean up, always

In this order, even after a failure:

1. Delete the test user — through the API, or from the local database.
2. `docker compose down` — **only** if Step 3 started it. Never `-v`: the
   database volume is the user's.
3. Stop the dev servers this skill started.

## Step 9 — Report

```
smoke · Google Chrome 141 · 1440×900 · @playwright/test from frontend/
app    started with docker compose (db, backend, frontend) · stopped afterwards
user   smoke+1759501200@example.test created via POST /auth/register · deleted

✓ Courts            200   .pspt-smoke/2026-10-03-1420/01-courts.png
✓ My bookings       200   .pspt-smoke/2026-10-03-1420/02-my-bookings.png
✗ Booking dialog    200   .pspt-smoke/2026-10-03-1420/03-booking-dialog.png
    request: GET http://localhost:3000/courts/1/slots — 500
! Reminder email    file  .pspt-smoke/2026-10-03-1420/04-reminder-email.png
    looks right; logo image missing (src points to a CDN path)

3/4 passed.  Limits: desktop Chrome only — not Gmail or Outlook, no email-client
dark mode, no WebP handling of mail clients.
```

Then show the screenshots that matter (every failure and every `!`) so the user
can see them without opening the folder. A failure is reported, not fixed:
offer `/pspt:ticket <slug>` for it.

---

## Never

- **Never run without the Step 2 yes.** Docker and the browser start only after it.
- **Never touch production or staging** — no remote URL, no remote database, no
  migration outside the local container, no deploy, no push.
- **Never reach real people** — no real emails, SMS or payments from a smoke run.
- **Never leave a test user behind**, and never use a real account.
- **Never stop or remove what this skill did not start**, and never
  `docker compose down -v`.
- **Never edit application code, tests or config.** A smoke test reports; a fix
  is a ticket.
- **Never commit** anything from a run. `.pspt-smoke/` is excluded from git.
- **Never call it comprehensive.** One visit per page, the checks above, and the
  pictures — say so in the report.
