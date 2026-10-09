# Staging readiness — the contract `/pspt:staging-fix` holds a service to

Three rules. Each is checked by `references/staging/audit.mjs`, fixed by
`/pspt:staging-fix`, and written here once.

1. Three health endpoints.
2. Every endpoint lives under `/api/v1`.
3. Application environment and secrets are two separate things.

---

## 1. Health endpoints

Three endpoints, three different questions. All are `GET`, unauthenticated,
outside rate limits, answer with JSON and `Cache-Control: no-store`, and never
put a secret, a connection string, a stack trace or a dependency version in a
body.

| Endpoint | Question | Touches dependencies? | Answers |
|---|---|---|---|
| `GET /api/v1/healthz` | Is this build up, and which one? | No | `200 { "status": "ok", "version": "<APP_VERSION>", "uptime": <seconds> }` |
| `GET /api/v1/liveness` | Is the process responsive — should the platform restart it? | **Never** | `200 { "status": "alive" }` |
| `GET /api/v1/readiness` | Can it take traffic right now? | Yes — each one, with a timeout | `200 { "status": "ready", "checks": { "database": "ok" } }` · `503 { "status": "not_ready", "checks": { "database": "fail" } }` |

**Liveness never checks a dependency.** A database outage must not restart every
pod; that makes the outage worse. Liveness answers `200` as long as the event
loop turns.

**Readiness checks every dependency the service cannot serve without** — the
database always, a cache or queue only if requests fail without it. Each check
has a timeout (2 s) and reports `ok` or `fail`, never the error text. It also
answers `503` **before startup has finished** (migrations applied, config
loaded) and **after shutdown has begun**. Shutdown is three steps, in this order:
`SIGTERM` flips a flag and readiness goes `503`; the process then **keeps
listening for a grace period** (`SHUTDOWN_GRACE_MS`, default 5000 — an
application env key) so the platform's probe actually sees the `503` and stops
routing to it; only then does it close the listener, drain in-flight requests and
exit, with a hard stop (30 s) if something hangs. Closing the listener at once
makes the probe fail to connect instead of reading `503`, and requests already
routed to the pod are dropped.

**Probes use them.** `Dockerfile` `HEALTHCHECK`, compose `healthcheck`,
Kubernetes `livenessProbe` → `/api/v1/liveness`, `readinessProbe` →
`/api/v1/readiness`, `startupProbe` → `/api/v1/healthz`. Old paths (`/health`,
`/ready`, `/live`, `/ping`) are replaced everywhere they appear.

**Tests, written first:** each endpoint's status and body shape; readiness `503`
with a fake dependency that fails; readiness `503` during the shutdown grace
period **while the listener still answers**; liveness `200` with the same
failing dependency.

---

## 2. Everything under `/api/v1`

Every HTTP route the service registers starts with `/api/v1` — health endpoints,
the API docs (`/api/v1/docs`), webhooks, everything. A request to any other path
answers `404` with a JSON body, not an HTML page.

| Stack | Where the prefix lives |
|---|---|
| Express | one `const api = express.Router()` mounted once, `app.use('/api/v1', api)`; no route is registered on `app` directly |
| NestJS | `app.setGlobalPrefix('api/v1')` in `main.ts`, with **no** `exclude` list; controllers do not repeat it |
| Next.js | route handlers live under `app/api/v1/**/route.ts` (or `pages/api/v1/**`) |
| React + Vite | the API client's base path is one constant, `/api/v1`; the dev proxy forwards `/api/v1` |

The prefix is one constant in one place. A literal `/api/v1` in a second file is
a finding.

**What changes with it** — everything that names a path: the frontend's API
client and dev proxy, the tests, `docs/BE/features/*.md` contracts and
`error-handling.md` examples when a spec exists, the smoke plan's health URL,
OpenAPI `servers`, the ingress rule that routes to the backend, every probe in
§1.

**Old paths.** Staging has no clients to protect, so the default is to **remove**
them. If something outside the repository still calls them, keep each one as a
thin alias that answers the same body plus `Deprecation: true` and
`Link: </api/v1/…>; rel="successor-version"`, and list them in the report with
the date they go.

---

## 3. Application environment and secrets — two sources, two schemas

If leaking a value lets someone act as the app or reach its data, it is a
**secret**. Everything else the process needs is **application environment**.

| | Application environment | Secrets (credentials) |
|---|---|---|
| Examples | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `APP_VERSION`, `SHUTDOWN_GRACE_MS`, `APP_BASE_URL`, `CORS_ORIGINS`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, feature flags | `DATABASE_PASSWORD`, `JWT_SECRET`, `SESSION_SECRET`, `SMTP_PASSWORD`, `*_API_KEY`, `*_TOKEN`, `OAUTH_CLIENT_SECRET`, signing and encryption keys, a connection string that contains a password |
| Local file | `.env` (not committed) | `.env.secret` (not committed) |
| Committed template | `.env.example` — every key, example values | `.env.secret.example` — every key, **empty values** |
| Docker / compose | `env_file: .env` | `env_file: .env.secret` (separate entry) |
| Kubernetes | a `ConfigMap` | a `Secret` (a `SealedSecret` / `ExternalSecret` in git, never plain base64 of a real value) |
| CI / GitOps | repository variables | the secret store |

**One more split:** a connection string with a password in it is a secret. Prefer
host, port, name and user in the application environment and only the password
in the secrets, and let the code build the URL.

**In code, two schemas, never mixed:**

- `src/config/app.config.ts` validates the application environment;
- `src/config/secrets.config.ts` validates the secrets.

Both run at startup and **fail fast**, listing the **names** of missing or
invalid keys — never a value, never a partial value. The loaded secrets object
is not logged, not serialised into an error, not returned by any endpoint, and
not passed around as a whole — a module receives the one secret it needs.

| Stack | Loading |
|---|---|
| Express | `node --env-file=.env --env-file=.env.secret` (Node 20+), two Zod schemas; no `dotenv` |
| NestJS | `ConfigModule.forRoot({ envFilePath: ['.env', '.env.secret'] })` with two `registerAs` namespaces, `app` and `secrets`, each validated |
| Next.js | `src/config/secrets.ts` starts with `import 'server-only'`; only `NEXT_PUBLIC_*` reaches the browser, and no secret is ever named `NEXT_PUBLIC_*` |
| React + Vite | application environment only, as `VITE_*` — **a frontend holds no secret**; any `VITE_*` that looks like one is a critical finding |

**Files.** `.gitignore` lists `.env`, `.env.*` and `.env.secret`, with
`!.env.example` and `!.env.secret.example`. `.dockerignore` lists the same
without the exceptions. A `Dockerfile` never `COPY`s an env file and never takes
a secret as an `ARG` (it ends up in the image history).

**What the skill never does with a secret:** print it, copy it into a document,
a commit message, a test, a log line or a report, or commit it. It moves a key
between files by **name**, with a script that does not echo the line. If a real
secret is already committed, the report names the file and the key — never the
value — and says to **rotate it**: removing it from the latest commit does not
remove it from history, and rewriting history is the user's decision.
