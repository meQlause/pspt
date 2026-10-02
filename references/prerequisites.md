# Prerequisites — the tools every pspt skill needs

Every pspt skill runs this before its own Step 0 or Step 1. It checks that the
required tools are present, and when one is missing it **asks once** and then
**installs and registers it itself** — for the project, so the next session and
every teammate gets it too. A skill never starts without them.

| Tool | What it is for | Licence |
|---|---|---|
| [jCodeMunch](https://pypi.org/project/jcodemunch-mcp/) (`jcodemunch-mcp`) | An MCP server that indexes the repository and answers with symbols, importers and blast radius instead of whole files — every code read goes through it, which is what keeps the skills cheap and exact | Free for non-commercial use; commercial use needs a paid jCodeMunch licence |

---

## 1. Check

A tool is **present** when either holds:

- the session already has its tools — for jcodemunch, a `jcodemunch_guide` tool
  or tools under an `mcp__jcodemunch__` prefix;
- it is registered for this project — a `jcodemunch` entry in `.mcp.json` —
  or for the user — `claude mcp list` shows it.

Present and its instruction line already in `CLAUDE.md` → nothing to do; go to
§4. Present but the line is missing → add it (§3 step 4), commit, say so in one
line, and continue.

## 2. Ask — once, for everything missing

One `AskUserQuestion`, covering every missing tool and everything installing it
involves, so the answer is one decision:

> **jcodemunch is required by pspt and isn't installed. Install it now?**
> I'll install `uv` if it is missing, run `uv tool install jcodemunch-mcp`,
> register it for this project in `.mcp.json` and `.claude/settings.json`, and
> add one instruction line to `CLAUDE.md` and `AGENTS.md`.
> Licence: free for non-commercial use; commercial use needs a paid licence.

| Answer | Do |
|---|---|
| **Yes** | §3 — install everything yourself, then continue the skill |
| **No** | **Stop.** The skill does not start. Say which tool is missing and that the skill can be run again once it is installed |

`/pspt:status` is read-only: it reports a missing tool and names the skill that
will offer to install it, and never asks or installs itself.

## 3. Install — yourself, on yes

1. **uv** — `uv --version`. If missing, install it:
   `curl -LsSf https://astral.sh/uv/install.sh | sh`
   (Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`),
   then confirm `uv --version`. Never fall back to a bare `pip install` into
   system Python.
2. **The tool** — `uv tool install jcodemunch-mcp`, then confirm
   `jcodemunch-mcp --version`.
3. **Register it for the project** — merge, never overwrite what is there.
   Prefer the CLI, which merges into an existing `.mcp.json` for you:

   ```
   claude mcp add -s project jcodemunch -- uvx jcodemunch-mcp
   ```

   Without the CLI, write the same entry `.mcp.json` gets from it:

   ```json
   {
     "mcpServers": {
       "jcodemunch": { "type": "stdio", "command": "uvx", "args": ["jcodemunch-mcp"], "env": {} }
     }
   }
   ```

   `uvx` runs it from uv's cache, so a teammate with `uv` needs no separate
   install step.

   Then `.claude/settings.json` — add `"jcodemunch"` to
   `enabledMcpjsonServers` ("approved MCP servers from .mcp.json"), so the
   project's server loads without an approval prompt:

   ```json
   { "enabledMcpjsonServers": ["jcodemunch"] }
   ```

4. **Tell every agent to use it** — add this line once, under a `## Tools`
   heading, to `CLAUDE.md` (Claude Code) and to `AGENTS.md` (other coding
   agents), creating either file if absent. Never duplicate the line, never
   touch anything else in the file:

   ```markdown
   Call the jcodemunch_guide tool and strictly follow its instructions.
   ```

5. **Commit** those files alone — `git status --porcelain` first, explicit
   paths, no push, SR-6 (no co-author trailer):

   ```
   chore(tooling): require jcodemunch for this project

   pspt reads code through the jcodemunch MCP server. Registered for the
   project in .mcp.json and approved in .claude/settings.json; CLAUDE.md and
   AGENTS.md tell every agent to follow jcodemunch_guide.
   ```

6. **Reload.** An MCP server registered mid-session is loaded by the **next**
   session. If its tools are not visible yet, say so: ask the user to restart
   Claude Code (or run `/mcp` to reconnect) and to run the same skill again,
   then stop. Nothing the skill would have written exists yet, so nothing is
   lost.

## 4. Use it

Call `jcodemunch_guide` and follow it; index the working directory
(`index_folder`) before the skill's first code read. In a pspt project the
`backend/` and `frontend/` submodules are inside the working directory, so one
index covers both. Read code through its tools — `search_symbols`,
`get_symbol_source`, `find_importers`, `get_blast_radius`, `check_edit_safe` —
and read a whole file only when jcodemunch returns nothing for it, saying so.
