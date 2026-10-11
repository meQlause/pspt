# S3 — Architecture, security and reliability

**Produces:** `docs/architecture.md`, `docs/security.md`, `docs/operations.md`
and `docs/architecture-decisions.md`, in the parent workspace.

Run after S2 and before S4 technology selection. Turn requirements and actual
trust boundaries into explicit design decisions. This stage chooses guarantees
and system boundaries; S4 chooses compatible libraries and toolchain details.
Reuse settled choices from the source documents and existing implementation.

## Inputs and scope

Read the BRD, PRD, SRS, S2 data specification and known integrations. For an
existing project, inspect its runtime and deployment through jcodemunch. Identify
actors, sensitive data, entry points, external dependencies, background work,
failure costs and operational constraints. Carry requirement ids throughout.
Non-functional and backend-only requirements need no mockup element.

For every concern below, record one disposition: **required**, **not required**
with a project-specific reason, or **deferred** with a concrete revisit trigger.
A required decision can remain open only with its blocked downstream work named;
S3 is incomplete until decisions needed by S4 or feature contracts are settled.
Do not add a service, security control or resilience pattern just because it
appears in this guide. Do not invent throughput, availability, recovery targets,
legal obligations or provider capabilities.

## Review areas

| Area | Decisions when applicable |
|---|---|
| Boundaries and deployment | Processes and responsibilities, synchronous vs asynchronous paths, shared state, tenancy, trust boundaries and data flows |
| Background work | Whether a queue or scheduler is needed; durable vs best-effort jobs; workers, delays and recurring schedules; database-backed queue vs separate broker vs cron; transaction/outbox boundary and additional services |
| External failures | Per-call timeout and cancellation, bounded retry/backoff and jitter, retryable errors, retry amplification, circuit breaker need/scope/open and recovery conditions, fallback and degraded behavior |
| Concurrency and integrity | Transactions, locks, uniqueness, idempotency keys and scope, deduplication, ordering, race conditions and external side effects that cannot share a transaction |
| Identity and permissions | Authentication, session/token lifecycle, endpoint and object authorization, tenant isolation, service identities and least privilege |
| Request authenticity and abuse | Webhook signatures or shared secrets supported by the provider, exact bytes verified before parsing when required, timestamp/replay checks, key rotation, rate limits; CSRF and CORS where relevant |
| Data protection | Sensitive data classification, encryption and secret storage, log/audit redaction, retention and erasure, safe uploads and outbound destinations where present |
| Operations and recovery | Health/readiness, graceful shutdown, connection/resource limits, metrics/logs/traces, actionable alerts, backups and restore proof, migration and recovery procedures |
| Capacity and cost | Requirement-backed budgets, backpressure, overload behavior, resource ownership and cleanup, limits and the measured trigger for scaling |

Queue libraries, broker storage and recurring scheduling are distinct choices.
Compare viable options against the project's guarantees and existing services;
check current official documentation when a capability or version affects the
choice. A scheduled trigger does not by itself provide durable job processing.
A database write and an external broker publish do not share a local transaction:
state the outbox or other recovery mechanism if consistency requires one.

Retries must account for idempotency and side effects. A circuit breaker needs a
named dependency and failure-containment reason; define observable opening and
recovery behavior rather than merely naming the pattern. For signatures, use the
provider's documented protocol; never invent an algorithm or replay guarantee.

## Decision process

For each consequential choice, follow:
**requirement → failure or threat → viable options → chosen approach → proof**.

Present two or three real options with project-specific tradeoffs and operational
cost, including no additional component when viable. Ask only unsettled decisions,
one or two related questions at a time. Respect earlier answers; explain when
evidence makes an earlier choice incompatible instead of silently changing it.
Record assumptions and missing facts explicitly, with what they block.

## Required outputs

| Document | Required content |
|---|---|
| `architecture.md` | System/context and data-flow diagrams, process responsibilities, trust boundaries, synchronous/asynchronous paths, data ownership and consistency boundaries, deployed-service inventory with purpose and lifecycle |
| `security.md` | Assets and actors, realistic threat scenarios per entry point/boundary, authentication/authorization, applicable request verification, secrets and sensitive-data handling, control disposition and residual risk |
| `operations.md` | Failure/degraded behavior, jobs and schedules, retry/timeout/breaker policies, resource limits, observability, shutdown, backup/recovery and cleanup responsibilities; unknown targets remain open |
| `architecture-decisions.md` | One stable `ADR-nnn` per consequential decision: requirement/source, context, failure/threat, options, disposition, choice/reason, costs/traps, proof, status and revisit trigger |

Keep each decision authoritative in the register; the other documents link to it.
For every required guarantee, name its owning component and an observable test
scenario or operational verification. “Secure”, “resilient” and “scalable” are
not acceptance criteria.

## Handoff

S4 records compatible concrete technologies and their version-specific traps,
linking ADR ids instead of reopening settled choices. If a technology cannot meet
an S3 guarantee, revise that ADR explicitly before continuing.
S5 specifies endpoint/job contracts and tests for the chosen behavior.
S6 carries applicable user-visible failure states into frontend contracts.
S9 maps required guarantees and deferred triggers to the phase plan; prove costly
consistency and isolation assumptions early.

## Exit criteria

- [ ] Every review area has a reasoned disposition tied to this project's sources
- [ ] Processes, services, trust boundaries and data/consistency paths are explicit
- [ ] Applicable external requests have an authenticity and replay decision based on provider capabilities
- [ ] Background work, timeout/retry, circuit breaker and fallback choices are explicit where relevant
- [ ] Tenant/object permissions, secrets, sensitive data and retention have named controls or justified omissions
- [ ] Each required guarantee names an owner and an observable proof
- [ ] Required decisions blocking technology or contract selection are settled; later decisions name their blocked phase
- [ ] No service or pattern was added without a requirement, failure or threat that justifies it
