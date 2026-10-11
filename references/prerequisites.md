# Prerequisites — the tools every pspt skill needs

Every pspt skill runs this before its own Step 0 or Step 1. It checks that the
required tools are present, and when one is missing it **asks once** and then
**installs and registers it itself** — for the project, so the next session and
every teammate gets it too. A skill never starts without them.

| Tool | What it is for | Licence |
|---|---|---|
| [jCodeMunch](https://pypi.org/project/jcodemunch-mcp/) (`jcodemunch-mcp`) | An MCP server that indexes the repository and answers with symbols, importers and blast radius instead of whole files — every code read goes through it, which keeps the skills cheap and exact | Free for non-commercial use; commercial use needs a paid jCodeMunch licence |
| [Ponytail](https://ponytail.dev/) ([source](https://github.com/DietrichGebert/ponytail), `ponytail@ponytail`) | A coding-agent plugin that makes every change the smallest one that works: skip it, reuse what exists, stdlib, native feature, installed dependency, one line — and never cuts validation, error handling, security or accessibility | MIT |

**Precedence.** Ponytail decides *how little code* a change needs; it never
decides *what* the change must do. Where the two meet, pspt's specification,
`references/conventions.md`, the lint rules and the tests win: a requirement,
an acceptance criterion, a guarantee or a test is never trimmed as "not needed".

---

## 1. Check

| Tool | Present when |
|---|---|
| jcodemunch | the session has its tools (`jcodemunch_guide`, or tools under `mcp__jcodemunch__`), or `.mcp.json` has a `jcodemunch` entry, or `claude mcp list` shows it |
| ponytail | `enabledPlugins` in `.claude/settings.json` has `"ponytail@ponytail": true`, or `claude plugin list` shows `ponytail@ponytail` enabled |

And the project tells every agent about them — the lines in §3.4 are in
`CLAUDE.md` and `AGENTS.md`, and `.agents/rules/ponytail.md` exists. A tool that
is present with a line or file missing → add just that (§3.4), commit it if the
working directory is a git repository (conventions §11), say so in one line, and
continue.

Everything present → go to §4.

## 2. Ask — once, for everything missing

One `AskUserQuestion` naming every missing tool and everything installing it
involves, so the answer is one decision:

> **pspt needs jcodemunch and ponytail, and they aren't installed. Install them now?**
> I'll install `uv` if needed and `jcodemunch-mcp`, add the ponytail plugin,
> register both **for this project** (`.mcp.json`, `.claude/settings.json`),
> and tell other agents too (`CLAUDE.md`, `AGENTS.md`, `.agents/rules/`).
> Licences: jcodemunch is free for non-commercial use (commercial needs a paid
> licence); ponytail is MIT.

Name only the tools actually missing.

| Answer | Do |
|---|---|
| **Yes** | §3 — install everything yourself, then continue the skill |
| **No** | **Stop.** The skill does not start. Say which tool is missing and that the skill can be run again once it is installed |

`/pspt:status` is read-only: it reports a missing tool and names the skill that
will offer to install it; it never asks or installs.

## 3. Install — yourself, on yes

Merge into every file — never overwrite what is there.

### 3.1 jcodemunch

1. **uv** — `uv --version`. If missing, install it:
   `curl -LsSf https://astral.sh/uv/install.sh | sh`
   (Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`),
   then confirm `uv --version`. Never fall back to a bare `pip install` into
   system Python.
2. `uv tool install jcodemunch-mcp`, then confirm `jcodemunch-mcp --version`.
3. Register it for the project — the CLI merges into `.mcp.json`:

   ```
   claude mcp add -s project jcodemunch -- uvx jcodemunch-mcp
   ```

   Without the CLI, write the same entry it writes:

   ```json
   { "mcpServers": { "jcodemunch": { "type": "stdio", "command": "uvx", "args": ["jcodemunch-mcp"], "env": {} } } }
   ```

   Then approve it in `.claude/settings.json`, so it loads without a prompt:

   ```json
   { "enabledMcpjsonServers": ["jcodemunch"] }
   ```

### 3.2 ponytail

1. `node --version` — ponytail's two lifecycle hooks need Node on the PATH. If
   it is missing, say so; the plugin still installs, its always-on activation
   just stays quiet until Node is there.
2. Add its marketplace and install it for the project:

   ```
   claude plugin marketplace add DietrichGebert/ponytail --scope project
   claude plugin install ponytail@ponytail --scope project
   ```

   That writes `.claude/settings.json`:

   ```json
   {
     "extraKnownMarketplaces": {
       "ponytail": { "source": { "source": "github", "repo": "DietrichGebert/ponytail" } }
     },
     "enabledPlugins": { "ponytail@ponytail": true }
   }
   ```

   Teammates who open the repository are offered the same plugin.

### 3.3 Other agents — `.agents/`

Copy ponytail's agent ruleset from the version the CLI just installed —
`~/.claude/plugins/cache/ponytail/ponytail/<version>/.agents/rules/ponytail.md`
— to `.agents/rules/ponytail.md`, unchanged, and add one line above it:

```markdown
<!-- ponytail <version> · MIT · https://github.com/DietrichGebert/ponytail — copied by pspt from the installed plugin; when the plugin updates, re-copy it -->
```

### 3.4 Tell every agent

Under a `## Tools` heading in `CLAUDE.md` (Claude Code) and `AGENTS.md` (other
coding agents) — create either file if absent, add each line once, never touch
anything else:

```markdown
Call the jcodemunch_guide tool and strictly follow its instructions.
Follow ponytail (.agents/rules/ponytail.md): the smallest change that works — but pspt's spec, conventions, lint rules and tests always win.
```

### 3.5 Commit and reload

**Only if the working directory is a git repository** (`git rev-parse
--show-toplevel`, conventions §11). Otherwise skip the commit, leave the files on
disk, never `git init`, never commit them into `backend/` or `frontend/`, and
say in one line that they are uncommitted.

Commit those files alone — `git status --porcelain` first, explicit paths, no
push, SR-6 (no co-author trailer):

```
chore(tooling): require jcodemunch and ponytail for this project

pspt reads code through the jcodemunch MCP server and writes the smallest
change that works with ponytail. Both are registered for the project in
.mcp.json and .claude/settings.json; CLAUDE.md, AGENTS.md and
.agents/rules/ponytail.md tell every agent to use them.
```

An MCP server or plugin installed mid-session loads in the **next** session.
If their tools or hooks are not active yet, say so — ask the user to restart
Claude Code (or `/mcp` and `/plugin` to reload) and run the same skill again —
and stop. Nothing the skill would have written exists yet, so nothing is lost.

## 4. Use them

- **jcodemunch** — call `jcodemunch_guide` and follow it; index the working
  directory (`index_folder`) before the skill's first code read. In a pspt
  project the `backend/` and `frontend/` submodules are inside the working
  directory, so one index covers both. Read code through `search_symbols`,
  `get_symbol_source`, `find_importers`, `get_blast_radius`, `check_edit_safe`;
  read a whole file only when jcodemunch returns nothing for it, and say so.
- **ponytail** — always on once installed: before writing code, stop at the
  first rung that holds. pspt's precedence rule above decides every conflict.

## 5. Keep the index current — re-index after every phase

jcodemunch answers from its index. Code a skill has just written is invisible
to it, or stale, until it is re-indexed — and the next read would then reason
about code that no longer exists. So **every time a unit of work finishes and
changes files, re-index before the next read**:

| Skill | Re-index after |
|---|---|
| `/pspt:build`, `/pspt:build-long` | each exit criterion's commit (Step 7) — before the next criterion |
| `/pspt:ticket` | each phase's commit (Step 7 · 5) — before the next phase |
| `/pspt:ticket-build` | each phase, and each ticket's close-out — before Step 2 re-checks the next ticket's plan |
| `/pspt:fix-flow` | the install and the autofixes (Step 4) — before reporting |
| `/pspt:staging-fix` | each package's code and config changes (Step 4) — before the verify step reads them |
| `/pspt:fix-flow-proceed` | each iteration's file — before the next file and before the queue is re-read |
| `/pspt:spec` S7 / S8, `/pspt:enhance`, `/pspt:code`, `/pspt:reg` | a mockup or source file written (docs alone need no re-index) |

How: `index_folder` on the working directory with `incremental: true` and
`paths` set to the files the unit changed (`git diff --name-only <before>..HEAD`,
plus deleted files) — only those are re-parsed. When the changed set is unclear
(a branch switch, a merge, a pull), run `index_folder` incrementally on the
whole working directory. Then print one line:

```
↻ jcodemunch re-indexed 6 files (P2 wire-in)
```

Never skip it because "the change was small": a renamed export missed by the
index is exactly how a later `find_importers` reports a file as safe to edit
when it is not.

