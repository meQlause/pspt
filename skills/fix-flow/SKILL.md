---
name: fix-flow
description: Detect each package's stack (Express, NestJS, React + Vite, Next.js) and language (TypeScript or JavaScript), compare its toolchain — ESLint, knip, Prettier, commitlint, husky hooks, pinned devDependencies, scripts — with pspt's canonical toolchain, and say "nothing to fix" when it already matches. Otherwise install pspt's version automatically, apply the safe autofixes, re-run the check and report what is left. Use for "/pspt:fix-flow", "fix the lint setup", "set up knip", "our eslint config drifted", "install the pspt toolchain", or when /pspt:build Step 0b reports drift.
---

# Fix the toolchain

pspt ships the toolchain as files — `references/toolchain/`, one verified set
per stack and language, fingerprinted in `references/toolchain/manifest.json`.
`/pspt:fix-flow` makes a project carry exactly that set: it finds out what the
project is, checks what it has, and replaces whatever differs. It never writes
a tool config of its own.

`/pspt:build` Step 0b **detects** drift on every build; this skill **repairs**
it. When Step 0b asks "restore pspt's toolchain?" and the answer is yes, this
is what runs.

**The mechanics are a script, not judgement.** Steps 2–4's detection,
comparison and file changes are `references/toolchain/fix-flow.mjs`:

```
node <plugin>/references/toolchain/fix-flow.mjs <package-dir>           # Steps 2–3: detect, compare, report
node <plugin>/references/toolchain/fix-flow.mjs <package-dir> --apply   # Step 4.2–4.5: copy, remove, pin
```

Exit `0` = matches (or just applied), `1` = drifted, `3` = unsupported stack.
Run it rather than re-deriving any check by hand — it is cheaper, and it cannot
improvise. The tables below say what it does, so its output can be read.

---

## Step 1 — Find the packages

| The working directory has | Packages |
|---|---|
| `.gitmodules` listing `backend` and `frontend` (a pspt project) | each submodule |
| An argument — `/pspt:fix-flow frontend` | that directory |
| A `package.json` with `workspaces`, or a `pnpm-workspace.yaml` | each workspace package with a framework dependency |
| A `package.json` | the root |

Print the list before going on.

## Step 2 — Detect stack and language, with evidence

**Stack** — from the package's `dependencies` and `devDependencies`, first
match wins:

| Has | Stack |
|---|---|
| `next` | Next.js |
| `@nestjs/core` | NestJS |
| `react` | React (+ Vite) |
| `express` | Express |

The order matters: NestJS pulls in `express`, and Next.js pulls in `react`.

**Language:**

| Finding | Language |
|---|---|
| `tsconfig.json` exists **and** `src/` holds `.ts` / `.tsx` files | TypeScript |
| otherwise | JavaScript |

That gives the manifest key: `express`, `express-js`, `nestjs`, `react`,
`react-js`, `nextjs`, `nextjs-js`.

| Case | Do |
|---|---|
| No supported framework (Fastify, Koa, Vue, Svelte, …) | Say which framework was found and that pspt has no verified toolchain for it. **Do nothing** for that package — never improvise one. |
| NestJS in JavaScript | Same: pspt ships NestJS in TypeScript only |
| TypeScript with `.js` / `.jsx` files under `src/` or `tests/` | Use the TypeScript set; list the JavaScript files as a finding. Converting them is code work for a ticket, never part of this skill |
| JavaScript in a pspt project (`docs/.pspt.json` exists; S3 fixed TypeScript) | Install the JavaScript set so the rules hold **now**, and report that the spec requires TypeScript — the migration is a `/pspt:ticket` |

Print one line per package, with the evidence:

```
backend/   express · JavaScript   express in dependencies · no tsconfig.json · 23 .js files in src/
frontend/  react · TypeScript     react + vite in devDependencies · tsconfig.json · 41 .tsx files
```

## Step 3 — Compare with the manifest

For each package, against `manifest.json` → `stacks.<key>`:

| Check | Fails when |
|---|---|
| Every `files` entry — `eslint.config.mjs`, `knip.json`, `.prettierrc.json`, `.prettierignore`, `commitlint.config.mjs`, `.husky/pre-commit`, `.husky/commit-msg` | missing, or its sha256 differs |
| No second config | `.eslintrc*`, `eslint.config.{js,cjs,ts,mts,cts}`, `knip.{ts,js,jsonc}`, `.knip.json`, `prettier.config.*`, any other `.prettierrc*`, `commitlint.config.{js,cjs,ts}`, `.commitlintrc*` exists |
| `devDependencies` | an entry missing, or at a different version |
| `scripts` | an entry missing or different |
| Hooks active | `git config core.hooksPath` is not `.husky/_` |
| TypeScript sets only | `tsconfig.json` lacks `"strict": true` — reported, never edited |

**Everything passes → nothing to fix.** Print it and stop for that package:

```
frontend/  react · TypeScript   ✓ matches pspt react exactly — nothing to fix
```

If every package passes, the skill ends there: no change, no commit.

## Step 4 — Fix it, automatically

For each package that failed, in this order — 2 to 5 are one
`fix-flow.mjs <package-dir> --apply`:

1. **Show what will change**, in one block — files replaced and added, second
   configs removed, dependencies added, changed and removed, scripts set. Then
   carry on; no question is asked unless the user said to review first.
2. **Copy** every `files` entry from `references/toolchain/` byte for byte.
3. **Remove second configs.** They are in git history if anyone needs them.
4. **Dependencies.** Set every manifest `devDependencies` entry at its exact
   version. Remove only *toolchain* packages the canonical set no longer uses —
   names matching `eslint-plugin-*`, `eslint-config-*`, `@eslint/*`,
   `@typescript-eslint/*`, `typescript-eslint`, `prettier-plugin-*`,
   `@commitlint/*`, `lint-staged`, and `globals` when the set does not list it.
   Never remove anything else: `jest`, `vitest`, a framework or a library stays.
5. **Scripts.** Set every manifest `scripts` entry; every other script (`dev`,
   `build`, `test`, …) stays as it is.
6. **Install** with the package's own manager — `pnpm-lock.yaml` → pnpm,
   `yarn.lock` → yarn, otherwise npm. The `prepare` script activates the hooks;
   confirm `git config core.hooksPath` is `.husky/_` afterwards.
7. **Safe autofix** — `prettier --write .`, then `eslint --fix .`. These only
   apply fixes the tools mark as safe (formatting, braces, unused imports).
   Nothing else is edited.
8. **Run `check`** and collect what remains: lint findings grouped by rule with
   counts and the worst files, and knip's unused files, exports and
   dependencies.

## Step 5 — Commit, or hand the rest to a ticket

**Check is green →** commit, the same discipline as `/pspt:build` §Commits
(`git status --porcelain` first, explicit paths, no `git add -A`, no push).
Two commits, so the toolchain change stays reviewable apart from the code it
touched:

```
chore(toolchain): align <key> toolchain with pspt

<body: files replaced and added, configs removed, dependencies added /
changed / removed. Wrapped at 100.>

toolchain: references/toolchain/<key> @ <manifest sha256 of eslint.config.mjs, first 12>
```

```
style: apply pspt toolchain autofixes

<body: prettier — <n> files; eslint --fix — <n> findings, by rule.>
```

**Check is still red →** do **not** commit. The hooks this skill just installed
would reject it, and they are right to: a red tree is never committed, and
`--no-verify` is never used. Leave the changes in the working tree, print the
findings, and offer once:

> **Open a ticket for the remaining findings?** `/pspt:ticket toolchain-debt`
> with these findings as the request — the toolchain files land in its first
> phase, and the tree reaches green before anything is committed.

## Step 6 — Report

One block, every package:

```
fix-flow

backend/   express · JavaScript   ✗ drifted → fixed
  replaced  eslint.config.js → eslint.config.mjs (pspt express-js)
  added     knip.json · .prettierrc.json · .prettierignore · commitlint.config.mjs · .husky/pre-commit · .husky/commit-msg
  deps      +9 pinned · 3 changed · −6 removed (eslint-plugin-jest, -n, -promise, -security, -import, -sonarjs@3)
  autofix   prettier 41 files · eslint --fix 63 findings
  check     ✗ 118 left — id-length 52 · no-magic-numbers 31 · sonarjs/no-duplicate-string 14 · …
            knip: 3 unused files · 9 unused exports · 2 unused dependencies
  commit    not committed — tree is red · ticket offered
  note      pspt project: the spec requires TypeScript — migration belongs in a ticket

frontend/  react · TypeScript     ✓ matches pspt react exactly — nothing to fix
```

---

## Never

- **Never write a toolchain file** from the `.md` references, from memory or
  from a "good default". Only copy from `references/toolchain/`.
- **Never improvise a toolchain** for a framework or language pspt does not
  ship. Report it and leave that package alone.
- **Never change a project's language** — no JavaScript → TypeScript conversion,
  no `tsconfig.json` edits, no deleted source files. Those are tickets.
- **Never edit code beyond the safe autofixes**, never add `eslint-disable`,
  never loosen a config to make `check` pass.
- **Never remove a dependency that is not a lint, format or hook tool.**
- **Never commit a red tree, never `--no-verify`, never push.**
- **SR-6:** no `Co-Authored-By` trailer, no tool attribution — the commit-msg
  hook this skill installs rejects them anyway.
