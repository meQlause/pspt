// pspt canonical ESLint config — express-js (JavaScript variant of express: the TypeScript-only
// presets and @typescript-eslint rules are dropped; every other rule is identical).
// Source of truth: references/lint/express.md. Copied VERBATIM into the project by
// /pspt:build; never edited there. A change is a change to pspt, not to the project.
// /pspt:build and /pspt:status compare this file's sha256 against
// references/toolchain/manifest.json — any difference is drift and fails CHECK.

import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

const SOURCE = ['**/*.{js,mjs,cjs}'];

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'src/generated/**',
      // pspt's own toolchain files — verified by sha256, not project code
      'eslint.config.mjs',
      'commitlint.config.mjs',
    ],
  },
  js.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: SOURCE,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // §1 Size
      'max-lines-per-function': ['error', { max: 70, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', 15],
      'max-params': ['warn', 4],
      'max-classes-per-file': ['error', 1],
      'max-nested-callbacks': ['error', 3],

      // §2 Branching
      complexity: ['error', 8],
      'sonarjs/cognitive-complexity': ['error', 10],
      'max-depth': ['error', 2],

      // §3 Conditional shape
      'sonarjs/no-nested-conditional': 'error',
      curly: ['error', 'all'],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'no-negated-condition': 'warn',
      'sonarjs/prefer-single-boolean-return': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-redundant-boolean': 'error',

      // §4 Duplication and dead logic — two downgraded to warn
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-invariant-returns': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-redundant-assignments': 'error',
      'sonarjs/no-unused-collection': 'warn',

      // §5 Switch
      'sonarjs/no-small-switch': 'error',
      'sonarjs/max-switch-cases': ['error', 30],
      'sonarjs/no-case-label-in-switch': 'error',

      // §6 Other shape rules
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-parameter-reassignment': 'error',
      'sonarjs/no-nested-assignment': 'error',
      'sonarjs/no-selector-parameter': 'error',
      'sonarjs/no-ignored-return': 'error',
      'sonarjs/array-callback-without-return': 'error',
      'sonarjs/no-commented-code': 'error',
      'sonarjs/todo-tag': 'error',

      // §8 Unused code
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // §9 Identifier length
      'id-length': [
        'error',
        { min: 3, properties: 'never', exceptions: ['id', 'db', 'tx', 'to', 'up'] },
      ],

      // §10 Magic values
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    },
  },

  // §7 Purity boundary — *.rules.js
  {
    files: ['**/*.rules.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@prisma/*',
                '.prisma/*',
                '**/prisma*',
                'express',
                'express-*',
                '@types/express',
                'axios',
                'node-fetch',
                'undici',
                'node:fs',
                'node:fs/*',
                'fs',
                'fs/*',
                'node:child_process',
                'child_process',
              ],
              message:
                'A *.rules.js file must stay pure — no I/O, no framework. Move this to the sibling *.service.js.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Pass the instant in as an argument so the rule is deterministic under test.',
        },
        {
          name: 'fetch',
          message: 'A *.rules.js file must stay pure. Move the call to the sibling *.service.js.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Non-deterministic — inject the value so the rule is testable.',
        },
      ],
    },
  },

  // §10 exemptions — test tables and Zod schemas keep their literals
  {
    files: ['tests/**/*.{js,mjs}'],
    // JavaScript has no type checker to switch off no-undef: declare the test-runner globals
    languageOptions: { globals: { ...globals.jest, ...globals.vitest } },
    rules: { 'no-magic-numbers': 'off', 'sonarjs/no-duplicate-string': 'off' },
  },
  {
    files: ['**/*.schema.js'],
    rules: { 'no-magic-numbers': 'off' },
  },

  prettier, // turns off formatting rules the presets enabled

  // eslint-config-prettier also turns off `curly`; §3 requires it, so it is
  // re-enabled after prettier. With 'all' it never conflicts with formatting.
  { files: SOURCE, rules: { curly: ['error', 'all'] } },
];
