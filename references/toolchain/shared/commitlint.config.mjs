// pspt canonical commitlint config — shared by every stack.
// Copied VERBATIM into each repository by /pspt:build Step 0b; never edited there.
//
// SR-6: commits are authored by the connected account. No Co-Authored-By trailer,
// no session link, no "generated with" footer — for a person or a tool.
const ATTRIBUTION = [/^co-authored-by:/im, /^claude-session:/im, /generated (?:with|by) /i];

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'sr6-no-attribution': ({ raw }) => [
          !ATTRIBUTION.some((pattern) => pattern.test(raw ?? '')),
          'SR-6: no Co-Authored-By trailer, session link or "generated with" footer',
        ],
      },
    },
  ],
  rules: {
    'sr6-no-attribution': [2, 'always'],
    // pspt subjects may open with an id — "S2 — data spec", "REG-004 green"
    'subject-case': [0],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
  },
};
