# Disposable Docker test storage

For integration, end-to-end, fidelity and smoke tests, avoid persistent storage
unless the test specifically verifies persistence across container replacement.
Prefer a bounded tmpfs at the image's actual database/data path on Linux Docker
(including Docker Desktop's Linux engine). Inspect the image's declared VOLUME
paths: omitting `-v` alone can still create an anonymous volume. Verify the
started container's mounts rather than assuming it has no volume.

For PostgreSQL 15/16/17 test images, the usual data path is
`/var/lib/postgresql/data`; confirm the chosen image (newer majors may differ).
Example test mount: `--tmpfs /var/lib/postgresql/data:rw,size=256m`.
Size tmpfs and test concurrency to available memory; use a single worker on a
constrained local Docker engine. Do not disable fsync or durability settings
merely to speed tests, especially when testing persistence guarantees.

Use `--rm` and label disposable containers with a project and test-run owner.
Keep an inventory of created container ids and any required named volumes.
Teardown runs on success, failed setup, failed tests and cancellation; pool,
server or browser cleanup must not prevent container cleanup (use finally).
For owned disposable containers, `docker rm -f -v <id>` removes their anonymous
volumes. If a test needs a named volume, give it a unique run name, label it,
then remove that exact volume after removing its containers. Named volumes are
not removed by `docker rm -v`.

For Compose, use an isolated test project. `docker compose -p <test-project>
down --volumes --remove-orphans` is allowed only when every affected resource
was created for this disposable test run. Preserve external volumes, reused
local databases and existing application data. With a reused project stack,
use the existing data-cleanup procedure and `down` without volume deletion.
Never use host-wide volume/system pruning as routine test teardown.

Before a run, record Docker volumes and owned containers; afterwards verify
that no new test-owned container or volume remains. If a hard interruption
prevents teardown, reconcile the exact recorded or labelled resources before
re-running; report any leak that could not be removed. An unreferenced volume
is not proof of test ownership. Historical unlabeled or other-project data
needs an explicit deletion decision, not a guessed owner.

Apply these rules to current-session tests immediately. Report test-storage
cleanup with validation results; no remaining test volume is the normal outcome.
