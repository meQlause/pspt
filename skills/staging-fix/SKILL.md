---
name: staging-fix
description: Make a service ready for staging — add the three health endpoints (/api/v1/healthz, /api/v1/liveness, /api/v1/readiness), move every endpoint under /api/v1, and split application environment from secrets (.env vs .env.secret, two validated config schemas, ConfigMap vs Secret). Audits an Express, NestJS, Next.js or React + Vite package first and says "nothing to fix" when it already holds; otherwise fixes it test-first, repoints Dockerfile, compose and Kubernetes probes, verifies against the running app, and never prints, copies or commits a secret. Use for "/pspt:staging-fix", "make it staging ready", "add health endpoints", "healthz liveness readiness", "put everything under /api/v1", "separate the secrets from the env".
---

# Make it ready for staging

`references/staging.md` is the contract — three rules:

1. **Three health endpoints**: `/api/v1/healthz`, `/api/v1/liveness`,
   `/api/v1/readiness`.
2. **Every endpoint under `/api/v1`**, the health ones included.
3. **Application environment and secrets are two things**: two files, two
   schemas, two places in the cluster.

`/pspt:staging-fix` finds where a service breaks them, fixes it test-first, and
proves it against the running app. The mechanics are
`references/staging/audit.mjs`:

```
node <plugin>/references/staging/audit.mjs <package-dir>            # static audit
node <plugin>/references/staging/audit.mjs --probe http://localhost:3000   # a running app
```

Exit `0` = nothing to fix, `1` = findings, `3` = unsupported stack. It never
prints a secret — findings carry file, line and key **names**.

---

## Before anything — prerequisites

Run [`references/prerequisites.md`](../../references/prerequisites.md): the tools
every pspt skill needs (jcodemunch and ponytail) must be present. Missing → ask once, then
install and register them yourself for the project (`.mcp.json`,
`.claude/settings.json`, `CLAUDE.md`, `AGENTS.md`, `.agents/rules/`); declined → this skill does
not start. Read code through jcodemunch from here on.

## Step 1 — Find the packages

Same discovery as `/pspt:fix-flow` Step 1: the `backend` and `frontend`
submodules of a pspt project, `backend/` and `frontend/` folders that each hold
a `package.json` (two plain clones in one folder), the directory named in the
argument (`/pspt:staging-fix backend`), each workspace package with a framework
dependency, or the root. Print the list.

| Stack | Rules that apply |
|---|---|
| Express · NestJS | all three |
| Next.js | all three (route handlers under `app/api/v1/`) |
| React + Vite | rule 2 on the client side (one API base constant, the dev proxy) and rule 3 as application environment only — **a frontend holds no secret** |
| Anything else | say so, and do nothing for that package |

## Step 2 — Audit

Run the audit for each package and print it grouped by rule:

```
staging audit · backend · express
‼ E1   .env  an env file is committed
✗ P1   src/app.ts:5  route GET /health is registered outside /api/v1
✗ H-readiness  no /api/v1/readiness endpoint
✗ E7   .env.example:2  DATABASE_PASSWORD looks like a secret in the application env
…
3 critical · 17 errors · 3 warnings
```

**Nothing to fix** → print `✓ nothing to fix` for that package and go to Step 6
(probe) if the app is running; otherwise stop.

**Critical findings come first, and are only ever named.** A committed `.env`, a
hardcoded secret, a plaintext secret in a manifest: say the file and the key,
never the value, and tell the user once to **rotate it** — taking it out of the
latest commit does not take it out of history. Never rewrite history.

## Step 3 — Ask, once

One `AskUserQuestion`, only the questions that apply:

1. **Classify the environment keys.** Print every key found (from `.env*` files,
   `process.env` reads and manifests) as `application` or `secret` by the rule in
   `staging.md` §3, and ask only about the ambiguous ones — a `*_URL` that may
   carry a password, a key whose name says nothing.
2. **Old paths.** Only when the audit found paths outside `/api/v1`: *remove them*
   (recommended — staging has no clients to protect) or *keep deprecated aliases*
   (`Deprecation: true` and a `Link` to the successor) until something outside
   the repository is updated.
3. **Apply?** The plan in one block: files changed, tests added, keys moved.

A secret that is **already committed**: ask whether to untrack it
(`git rm --cached`); never delete the user's local copy.

## Step 4 — Fix, test first

In a pspt project (`docs/.pspt.json` exists) the prefix and the health endpoints
are a **change to the specification** — do not edit `docs/` here. Step 7 prints
the `/pspt:enhance` request that carries it.

For each package, in this order. Red first, for the right reason, then green:

1. **Tests.**
   - Health: each endpoint's status and body shape; readiness `503` with a fake
     dependency that fails, and while shutting down; liveness `200` with the same
     failing dependency.
   - Prefix: an unknown path answers `404` with a JSON body; each old path
     answers `404` (or the alias, if kept); the health endpoints answer under
     `/api/v1`.
   - Config: a missing secret throws an error that names the **key** and contains
     no value; the secrets object is not in any log line or error.
2. **Prefix and health** per stack, as `staging.md` §1–§2 describes: one prefix
   constant; Express — one router mounted once and a JSON `404` after it; NestJS —
   `setGlobalPrefix('api/v1')` and a `HealthController`; Next.js — handlers under
   `app/api/v1/`. Readiness checks each required dependency with a 2 s timeout
   and reports `ok`/`fail` only. `SIGTERM` flips readiness to `503`, in-flight
   requests drain, then the process exits.
3. **Environment.**
   - `.env.example` (application keys, example values) and `.env.secret.example`
     (secret keys, **empty values**); `.gitignore` and `.dockerignore` as in
     `staging.md` §3.
   - `src/config/app.config.ts` and `src/config/secrets.config.ts`, two Zod
     schemas validated at startup that list missing or invalid key **names**.
   - Local scripts (`dev`) pass both files (`node --env-file=.env
     --env-file-if-exists=.env.secret`, Node ≥ 22.9; otherwise two `--env-file`);
     the container's start command passes none — the platform provides the
     environment.
   - If the user has a local `.env` holding both kinds, **move the secret keys
     into `.env.secret` by key name, with a script that never echoes a line**,
     then show only the key names that moved.
4. **Callers.** Frontend API client and dev proxy → one `/api/v1` constant; the
   tests; the smoke plan's health URL; OpenAPI `servers`.
5. **Deploy files that already exist.** `Dockerfile` `HEALTHCHECK` →
   `/api/v1/liveness`; compose `healthcheck` → `/api/v1/liveness`; Kubernetes
   `livenessProbe` → `/api/v1/liveness`, `readinessProbe` →
   `/api/v1/readiness`, `startupProbe` → `/api/v1/healthz`; `env` entries that
   hold a secret value → `secretKeyRef`, and `envFrom` a `ConfigMap` and a
   `Secret` separately. Remove `COPY .env…` and secret `ARG`s. **Never write a
   secret value into a manifest**, and never create a plain `Secret` — leave a
   `SealedSecret`/`ExternalSecret` reference if the project has one, and say what
   the user still has to create.

## Step 5 — Verify

1. Re-run the audit. It must be clean, or list only what the user accepted.
2. The package's `check` and its tests, green.
3. **Start the app** with the dev script (the user approved this by running the
   skill — local only), wait for it, and run
   `audit.mjs --probe http://localhost:<port>`. Liveness `200`, healthz `200`,
   readiness `200` when the database is reachable and `503` when it is not —
   both are a pass for the probe, and the report says which it was.
4. Stop what you started.

Offer `/pspt:smoke` as the next step — it opens the pages in a real browser.

## Step 6 — Commit

Per `references/conventions.md` §11 — in each package that is a git repository,
and nowhere else; `git status --porcelain` first, explicit paths, no push. One
commit per concern, so each reads on its own:

```
feat(health): add healthz, liveness and readiness under /api/v1
refactor(api): put every route under /api/v1
refactor(config): split application environment from secrets
chore(deploy): point probes and healthchecks at /api/v1
```

Each body names the files and findings cleared, never a value. **SR-6:** no
`Co-Authored-By` trailer, no tool attribution — the commit-msg hook rejects it.

## Step 7 — Report

```
staging-fix · backend (express)

  audit    3 critical · 17 errors · 3 warnings  →  0
  health   /api/v1/healthz · /liveness · /readiness      probe 13/13
  prefix   4 routes moved under /api/v1 · old paths removed
  env      DATABASE_PASSWORD, JWT_SECRET → .env.secret · 6 keys stay in .env
  deploy   Dockerfile HEALTHCHECK · k8s liveness + readiness probes repointed
  tests    9 added — red first, then green · check ✓ · 24 pass
  commits  backend@4f2d9e1 · @9ab31c0 · parent — none, not a git repository

  rotate   .env was committed: DATABASE_PASSWORD and JWT_SECRET are in the
           history — rotate both. Rewriting history is your decision.
  create   Secret "api-secrets" in the cluster (DATABASE_PASSWORD, JWT_SECRET) —
           nothing here wrote a value.
  spec     docs/ untouched. Run: /pspt:enhance every endpoint lives under /api/v1
           and the service exposes /api/v1/healthz, /liveness and /readiness
```

---

## Never

- **Never print, copy, log or commit a secret** — not into a document, a test, a
  commit message, a report or a prompt. Name the key and the file.
- **Never write a real value into any file.** Templates carry empty or example
  values; a manifest carries a reference.
- **Never rewrite git history**, and never delete the user's local `.env`.
- **Never touch a cluster or a registry** — no `kubectl`, no `docker push`, no
  deploy. The files change; the user applies them.
- **Never make liveness touch a dependency.**
- **Never put a secret in a frontend**, or a `NEXT_PUBLIC_*` / `VITE_*` that looks
  like one.
- **Never edit `docs/` in a pspt project** — the spec changes through
  `/pspt:enhance`.
- **Never commit outside a git repository, never `--no-verify`, never push.**
