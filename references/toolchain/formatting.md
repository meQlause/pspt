## Newline formatting (Express and React TypeScript)

Use `npm run format` to apply Prettier first, then ESLint layout fixes.
`format:check` and `check` enforce the same rules; never manually compensate
for conflicting formatter and linter settings.

- Keep consecutive imports together; add one blank line after the import group.
- Separate function declarations, class declarations and exports from adjacent statements.
- Keep related variable declarations together; separate them from subsequent work.
- Separate control-flow statements from preceding work and add spacing after blocks.
- Add a blank line before a return when another statement precedes it in the same block.
  A return alone in a guard block needs no extra blank line.
- Prettier collapses repeated blank lines, removes padding at block edges, and wraps
  expressions and JSX using `printWidth: 100` (a wrapping target, not a hard limit).
- Use LF line endings and a final newline; `.gitattributes` preserves LF on checkout. Preserve two-space indentation,
  single quotes, semicolons and trailing commas.

The canonical ESLint rule is enabled after eslint-config-prettier so it remains
active. It uses the existing pinned ESLint 9 implementation; when upgrading to
ESLint 11, migrate padding-line-between-statements to its Stylistic equivalent.
Change the canonical files and manifest together, then copy through fix-flow.
Verify format is idempotent and run each package's check.

Retain the 100-column wrapping target and existing function/file size limits.

Run `node <pspt>/references/toolchain/verify/newlines.mjs <project-root>` to
verify both canonical fixture sets and newline autofix behavior using the
project's installed dependencies. It checks import groups, declarations, guards,
functions, returns and formatter/linter idempotence.
