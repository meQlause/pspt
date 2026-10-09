---
name: staging-scan
description: Read-only scan of a project that gives the manual command-line commands to build each app's Docker image and push it to GHCR — one single-line `docker buildx build --platform linux/amd64 … --push -f <Dockerfile> <context>` per app (backend, frontend, any other), plus the registry login and submodule commands, and a brief explanation. Works from the project's real Dockerfiles, .dockerignore, package files, environment-variable usage, git remotes and Kubernetes manifests; passes only build arguments the Dockerfile accepts and the app uses; keeps backend runtime secrets in Kubernetes. Names the specific blocker and the smallest fix when an image cannot build. Creates, changes, builds, pushes and deploys nothing. Use for "/pspt:staging-scan", "how do I build and push the images to GHCR", "docker build commands for staging", "scan the project for its docker build".
---

# Scan the project for its image build

A scan, nothing more. It reads the project, works out how each app's image is
built and where it is pushed, and prints **copy-paste commands with a brief
explanation** in the chat.

It never creates or changes a file, never runs `docker`, `kubectl` or
`git push`, never builds or pushes anything, never writes a CI workflow, and never
deploys. The user runs the commands.

The mechanics are `references/staging/scan.mjs`. It is a static reader — it
parses, it does not build:

```
node <plugin>/references/staging/scan.mjs <folder>          # a readable report
node <plugin>/references/staging/scan.mjs <folder> --json   # the same, as data
```

Exit `0` = no blockers · `1` = at least one blocker · `2` = no Dockerfile found.

---

## Before anything — prerequisites (report only)

Check the tools in [`references/prerequisites.md`](../../references/prerequisites.md)
§1 and say in one line which are present. **Never ask, never install** — installing
would write files, and this skill writes none. If jcodemunch is present, read code
through it; if not, read the few files below directly.

## Step 1 — Run the scan on the folder you were started in

The folder is the project root: a PSPT project (`backend/` and `frontend/` as
submodules), or one folder holding the two clones side by side. The scan finds
every `Dockerfile`, so each deployable app gets its own result — backend and
frontend, and anything else that has one.

## Step 2 — Check it against the real files

The script is a reader, not an oracle. **Read the files yourself** and confirm
what it found; where it is wrong, say so and correct it:

| Read | Confirm |
|---|---|
| Each `Dockerfile`, whole | the stages, every `ARG` and where it sits, every `COPY` source (they decide the **build context**), the build step, `CMD`, any `--mount=type=secret` |
| The `.dockerignore` that applies | it does not hide something the Dockerfile copies (`dist`, the lockfile, `src`) |
| `package.json`, the lockfile, `.npmrc` (key names only) | the `build` script exists, the lockfile matches the install command, private registries or `git+ssh` dependencies |
| Where the app reads its environment (`import.meta.env.*`, `process.env.*`) | which variables are baked in at build time and which are read at run time |
| `.env.example` and other `*.example` files | the **names** and the non-secret example values |
| `docker-compose*.yml`, existing CI files | the build context, Dockerfile and `build-args` the project already uses |
| Kubernetes manifests, Helm `values.yaml`, Kustomize `images:` | the real image names and registry, the tag convention, and where each runtime variable comes from (ConfigMap, Secret, plain `env`) |
| `.gitmodules`, `git submodule status`, each app's `git remote get-url origin` and short commit | whether submodules are initialised, the GHCR **owner**, the **tag** |

**Never open a real secret file**: `.env`, `.env.secret`, `*.pem`, `*.key`,
kubeconfigs, `~/.docker/config.json`, and the *values* in `.npmrc`. Names only.

## Step 3 — Decide, per app

- **Dockerfile and build context** — the context is the smallest folder in which
  every `COPY` source exists: normally the app's own folder. A `COPY ../…` means
  the context has to be the parent, and the command changes with it. Prefer what
  docker-compose or CI already uses when the project has it.
- **Build arguments** — only an `ARG` that the Dockerfile **accepts** and the app
  **uses** (directly, or through an `ENV` the app reads). Typically a frontend's
  public settings (`VITE_*`, `NEXT_PUBLIC_*`, …). Take the value from CI, compose,
  `.env.example` or the `ARG` default, in that order; if none has it, write a
  clearly marked placeholder such as `<VITE_API_BASE>`. Never invent a value,
  and **never reuse a variable name from another project**.
- **Never as a build argument**: anything secret-looking (it stays in the image
  history), and any backend runtime variable. Backend runtime secrets live in
  Kubernetes — say where each one is provided.
- **Private dependencies** (`.npmrc` auth, `git+ssh` packages): a BuildKit
  `--secret`, not a build argument.
- **Image name** — from the manifest's image first, else
  `ghcr.io/<owner from the repo's origin>/<repo name>`, else `<OWNER>` /
  `<IMAGE>` placeholders. GHCR names are lowercase.
- **Tag** — the app's own commit: `$(git -C <app> rev-parse --short HEAD)`. Each
  app is its own repository, so the tags differ. A folder that is not a git
  repository gets `<TAG>`.

## Step 4 — Answer, in this order

Brief. Commands in code blocks, one line each. Everything is **scanned, not
built** — say so once.

1. **What I found**, one line per app: its Dockerfile, the context, and the image
   name and where it came from.
2. **Setup** (separate commands): `git submodule update --init --recursive` only
   when the project has submodules; and the registry login —

   ```
   echo "$GHCR_TOKEN" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin
   ```

   with a personal access token that has `write:packages`, supplied by the user.
3. **Build and push**, one command per app, exactly this shape:

   ```
   docker buildx build --platform linux/amd64 --build-arg NAME=value -t ghcr.io/OWNER/IMAGE:TAG --push -f DOCKERFILE CONTEXT
   ```

   with the real names, or placeholders marked `<LIKE_THIS>` where the project
   does not say. `--secret id=…,src=…` only where a private dependency needs it.
4. **Check it landed**: `docker buildx imagetools inspect <image>:<tag>`.
5. **What stays in Kubernetes** — the runtime variables, split by where the
   manifests provide them (ConfigMap / Secret); none of them goes into the build.
6. **Blockers** — for each image that cannot build correctly: the **specific
   blocker** with `file:line`, and the **smallest fix** shown as the exact lines to
   add or change. Shown, not applied. A blocked app still gets its command, marked
   "will not build until the fix above".
7. **Warnings**, one line each (a token in an image layer, a plain secret in a
   manifest, a manifest still pointing at another registry, `:latest`).
8. **What the project did not say** — every placeholder, and what to put there.

## Step 5 — Stop

Offer the next step, once: a Dockerfile fix is a `/pspt:ticket`; health endpoints,
the `/api/v1` prefix and the environment/secrets split are `/pspt:staging-fix`.
Do not start either.

---

## Never

- **Never create, change or delete a file** — not a Dockerfile, not a workflow,
  not a scratch file in the project. The answer is the chat.
- **Never run `docker`, `kubectl`, `helm` or `git push`**, never touch the network,
  never build or push.
- **Never deploy**, and never write a CI/CD workflow.
- **Never read a secret file or print a secret value**, token or password.
- **Never pass a secret or a backend runtime variable as a build argument.**
- **Never invent an image name, owner, variable or value**, and never carry names
  over from another project: it comes from this project's files, or it is a
  marked placeholder.
