# pspt toolchain

The fixed toolchain — ESLint, Prettier, knip, husky, commitlint and the one
`check` command — as **files**, not as advice. `/pspt:build` Step 0b copies
them into each submodule byte for byte and checks them on every invocation
against [`manifest.json`](manifest.json). A project never writes or edits one;
a change is a change to pspt, re-verified here.

## What a project carries

| In the submodule | Source | What it does |
|---|---|---|
| `eslint.config.mjs` | `<stack>/eslint.config.mjs` | every rule from `references/lint/<stack>.md` |
| `knip.json` | `<stack>/knip.json` | dead files, unused exports, unused dependencies |
| `.prettierrc.json`, `.prettierignore` | `shared/` | formatting |
| `commitlint.config.mjs` | `shared/` | conventional commits, plus **SR-6** as a rule: no `Co-Authored-By`, session link or "generated with" footer |
| `.husky/pre-commit` | `shared/husky/pre-commit` | runs `npm run check` — a red check blocks the commit |
| `.husky/commit-msg` | `shared/husky/commit-msg` | runs commitlint on the message |
| `package.json` `devDependencies` + `scripts` | `<stack>/package.toolchain.json` | exact versions, and the scripts below |

| Script | Runs |
|---|---|
| `check` | `prettier --check .` → `eslint --max-warnings=0 .` → `tsc --noEmit` → `knip` (JavaScript sets skip `tsc`). **This is the "single check command" every skill refers to** |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` |
| `lint` | `eslint --max-warnings=0 .` |
| `typecheck` | `tsc --noEmit` — TypeScript sets only |
| `knip` | `knip` |
| `prepare` | `husky` — installs the hooks on install, with any package manager |

## Conventions the files assume

| Stack | knip entry | Notes |
|---|---|---|
| Express | `src/server.ts` | the file that calls `listen`; the app itself lives in `src/app.ts` |
| NestJS | `src/main.ts` | Nest's own bootstrap file |
| React + Vite | `src/main.tsx` | the file `index.html` loads |
| Next.js | — | knip's Next plugin finds `app/` routes itself |

Test files are entries through knip's Vitest and Playwright plugins, so a
helper only a test uses is not reported. Scripts and hooks call the tools
directly or through `npm run` / `npx`, so they work under pnpm, npm or yarn.

## Stacks

| Key | Language | Notes |
|---|---|---|
| `express`, `nestjs`, `react`, `nextjs` | TypeScript | what a pspt project uses — S3 fixes TypeScript |
| `express-js`, `react-js`, `nextjs-js` | JavaScript | for existing JavaScript projects: the same rules, minus the TypeScript-only presets and `@typescript-eslint/*` rules; `globals` supplies Node or browser globals; no `typecheck` |

NestJS ships in TypeScript only. JavaScript entries: Express `src/server.js`,
React `src/main.jsx`. `/pspt:fix-flow` picks the key from the package's
dependencies and whether it has `tsconfig.json` and TypeScript sources.

Prettier: single quotes and trailing commas match how every pspt example is
written; `printWidth: 100` matches the commit-body wrap.

## Not shipped, checked instead

`tsconfig.json`, `vitest.config.ts` and `playwright.config.ts` belong to each
framework's generator and differ by stack. Step 0b does not copy them; it
checks what pspt requires of them: `"strict": true`, no `.js` / `.jsx` under
`src/` or `tests/`, and Playwright configured for Chromium (SR-4).

## Verified

`verify/` holds lint fixtures with the expected rule set per stack —
`backend/` and `frontend/` for TypeScript, `backend-js/` and `frontend-js/`
for JavaScript:

```sh
cd references/toolchain/verify/<backend|frontend|backend-js|frontend-js>
npm i -D <devDependencies from ../../<stack>/package.toolchain.json>
cp ../../<stack>/eslint.config.mjs . && node ../verify.mjs <stack>
```

The whole chain was also run end to end on an Express project: `pnpm check`
clean; knip failing it on an orphan file and an unused export; the pre-commit
hook blocking a commit with a magic number; commitlint rejecting a
`Co-Authored-By` trailer and a "Generated with" footer and accepting
`feat(spec): S2 — data spec with ERD`.

`fix-flow.mjs` — the script behind `/pspt:fix-flow` — was run on a JavaScript
Express project carrying a hand-written config with Jest, `n`, `promise` and
`security` plugins: it detected `express-js` with evidence, replaced the config,
dropped only the lint plugins (Jest itself stayed), pinned versions, installed
the hooks; after autofix only the deliberate violations remained; once those
were fixed the commit passed the new hooks and a second run reported "nothing
to fix". The TypeScript path ends the same way, and Fastify and NestJS in
JavaScript are refused with the reason.

Every shipped file is Prettier-formatted with `shared/.prettierrc.json`, so
`prettier --write .` in a project never changes it — otherwise the first
format would read as drift. The ESLint configs ignore `eslint.config.mjs` and
`commitlint.config.mjs`: pspt's own files are verified by hash, not linted as
project code. JavaScript sets declare Jest and Vitest globals for `tests/`.

`findings.mjs` is the work queue behind `/pspt:fix-flow-proceed`: it runs
`tsc`, ESLint and knip and prints what is left grouped by file, worst gate
first — `--file <path>` re-checks one file. The loop reads that summary, never
raw tool output.

After changing any file here: format it with `shared/.prettierrc.json`,
re-run `verify/`, then regenerate `manifest.json`.
