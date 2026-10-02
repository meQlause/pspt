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
| `.husky/pre-commit` | `shared/husky/pre-commit` | runs `pnpm check` — a red check blocks the commit |
| `.husky/commit-msg` | `shared/husky/commit-msg` | runs commitlint on the message |
| `package.json` `devDependencies` + `scripts` | `<stack>/package.toolchain.json` | exact versions, and the scripts below |

| Script | Runs |
|---|---|
| `check` | `format:check` → `lint` → `typecheck` → `knip`. **This is the "single check command" every skill refers to** |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` |
| `lint` | `eslint --max-warnings=0 .` |
| `typecheck` | `tsc --noEmit` |
| `knip` | `knip` |
| `prepare` | `husky` — installs the hooks on `pnpm install` |

## Conventions the files assume

| Stack | knip entry | Notes |
|---|---|---|
| Express | `src/server.ts` | the file that calls `listen`; the app itself lives in `src/app.ts` |
| NestJS | `src/main.ts` | Nest's own bootstrap file |
| React + Vite | `src/main.tsx` | the file `index.html` loads |
| Next.js | — | knip's Next plugin finds `app/` routes itself |

Test files are entries through knip's Vitest and Playwright plugins, so a
helper only a test uses is not reported. Package manager: pnpm.

Prettier: single quotes and trailing commas match how every pspt example is
written; `printWidth: 100` matches the commit-body wrap.

## Not shipped, checked instead

`tsconfig.json`, `vitest.config.ts` and `playwright.config.ts` belong to each
framework's generator and differ by stack. Step 0b does not copy them; it
checks what pspt requires of them: `"strict": true`, no `.js` / `.jsx` under
`src/` or `tests/`, and Playwright configured for Chromium (SR-4).

## Verified

`verify/` holds lint fixtures with the expected rule set per stack:

```sh
cd references/toolchain/verify/<backend|frontend>
npm i -D <devDependencies from ../../<stack>/package.toolchain.json>
cp ../../<stack>/eslint.config.mjs . && node ../verify.mjs <stack>
```

The whole chain was also run end to end on an Express project: `pnpm check`
clean; knip failing it on an orphan file and an unused export; the pre-commit
hook blocking a commit with a magic number; commitlint rejecting a
`Co-Authored-By` trailer and a "Generated with" footer and accepting
`feat(spec): S2 — data spec with ERD`.

After changing any file here: re-run `verify/`, then regenerate
`manifest.json`.
