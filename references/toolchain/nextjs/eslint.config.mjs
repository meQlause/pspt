// pspt canonical ESLint config — nextjs.
// Source of truth: references/lint/nextjs.md. Copied VERBATIM into the project by
// /pspt:build; never edited there. A change is a change to pspt, not to the project.
// /pspt:build and /pspt:status compare this file's sha256 against
// references/toolchain/manifest.json — any difference is drift and fails CHECK.

import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

const SOURCE = ['**/*.{ts,tsx}'];

export default [
  { ignores: ['.next/**', 'out/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts', 'src/generated/**'] },
  ...nextVitals, // registers react, react-hooks, jsx-a11y, import, @next/next
  ...nextTs, // registers @typescript-eslint
  sonarjs.configs.recommended,
  {
    files: SOURCE,
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // jsx-a11y/recommended in full — its .rules can be spread here only because
      // eslint-config-next already registered the plugin (react.md §8 trap)
      ...jsxA11y.flatConfigs.recommended.rules,

      // §1 Size
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', 15],
      'max-params': ['warn', 4],
      'react/jsx-max-depth': ['warn', { max: 5 }],

      // §2 Branching
      complexity: ['error', 8],
      'sonarjs/cognitive-complexity': ['error', 10],
      'max-depth': ['error', 2],

      // §3 Conditional shape — no-negated-condition deliberately not enabled
      'sonarjs/no-nested-conditional': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-redundant-boolean': 'error',

      // §4 React-specific
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'off', // App Router — no pages/ dir
      'jsx-a11y/anchor-is-valid': 'off', // conflicts with next/link

      // §5 Duplication and dead logic — all error, none downgraded
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-invariant-returns': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-redundant-assignments': 'error',
      'sonarjs/no-unused-collection': 'error',

      // §6 Switch and other shape rules
      'sonarjs/no-small-switch': 'error',
      'sonarjs/max-switch-cases': ['error', 30],
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-parameter-reassignment': 'error',
      'sonarjs/no-selector-parameter': 'error',
      'sonarjs/array-callback-without-return': 'error',
      'sonarjs/no-commented-code': 'error',
      'sonarjs/todo-tag': 'error',

      // §7 Unused code
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all', varsIgnorePattern: '^_',
        args: 'after-used', argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Identifier length
      'id-length': ['error', { min: 3, properties: 'never', exceptions: ['id', 'db', 'to', 'up', 'fn'] }],

      // Magic values
      'no-magic-numbers': ['error', {
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreClassFieldInitialValues: true,
        enforceConst: true,
        detectObjects: false,
      }],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    },
  },

  // Magic-value exemptions — test tables and Zod schemas keep their literals
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'no-magic-numbers': 'off', 'sonarjs/no-duplicate-string': 'off' },
  },
  {
    files: ['**/*.schema.ts'],
    rules: { 'no-magic-numbers': 'off' },
  },

  prettier, // turns off formatting rules the presets enabled

  // eslint-config-prettier also turns off `curly`; §3 requires it, so it is
  // re-enabled after prettier. With 'all' it never conflicts with formatting.
  { files: SOURCE, rules: { curly: ['error', 'all'] } },
];
