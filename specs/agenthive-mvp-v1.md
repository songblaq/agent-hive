# AgentHive MVP v1 — Final Specification

> **Status**: CONFIRMED — Ready for implementation  
> **Date**: 2026-03-09  
> **Participants**: Claude, Grok, ChatGPT
> **Decision rule**: Majority (2 of 3 agents) = consensus  
> **Internal language**: English  
> **User-facing language**: User's configured language

---

## 1. Project Identity

| Item | Decision |
|------|----------|
| **Product name** | AgentHive |
| **Protocol name** | Agent Collaboration Protocol |
| **Open-source repo name** | `agent-hive` (kebab-case) |
| **CLI command** | `agenthive` |
| **Data directory** | `~/.agenthive/` |
| **Pointer file** | `.agenthive.pointer.yaml` |
| **Tagline** | File-based multi-agent collaboration for heterogeneous AI tools |

---

## 2. Architecture

### 2.1 Three-Layer Separation

```
Layer 1: Open-source project (public repo)
  → Templates, CLI source, docs, specs, init scripts
  → Anyone can clone and use
  → Location: user's workspace, e.g. ~/dev/agent-hive/

Layer 2: Personal data hub (private, local)
  → Actual project data, tasks, logs, decisions
  → Created by `agenthive init`
  → Location: ~/.agenthive/

Layer 3: Project repos (existing codebases)
  → Contain only thin pointer files
  → AGENTS.md, CLAUDE.md, .cursor/rules/, .agenthive.pointer.yaml
  → Optional: symlink to hub via `agenthive link`
```

### 2.2 Central Hub Model

All collaboration data lives in `~/.agenthive/`. No `.agenthive/` directory inside project repos by default.

Rationale:
- Single source of truth
- No duplication across repos
- Hub can be backed up as a private Git repo
- All tools reference one fixed path

### 2.3 Project Identification

**Format**: `projects/{parent_path_slug}/{project_name}/`

**Path normalization rules**:
1. Take the parent directory of the project (not the project dir itself)
2. Remove leading `/`
3. Replace each `/` with `--`
4. Preserve all other characters as-is (including `_`)
5. Remove trailing `/` if any

**Examples**:
```
Project path                        → Parent slug              / Project name
/home/alice/dev/my-project          → home--alice--dev        / my-project
/home/alice/dev/other-app           → home--alice--dev        / other-app
/home/alice/work/client/dashboard → home--alice--work--client / dashboard
```

**Why `--` as separator**: Some users use `_` as an actual directory name. Using `_` as the slug separator would create ambiguity. `--` is unambiguous because `--` never appears in real directory names.

**Collision handling**: If the same project name exists under the same parent slug (extremely rare), append `_<hash6>` to the project name. Hash source: `sha256(full_absolute_path)[:6]`.

**Why no hash by default**: The parent path is already unique. Adding a hash to every project adds complexity without solving a real problem in normal usage.

### 2.4 Hub Directory Structure

```
~/.agenthive/
├── config.yaml                           # Global settings
├── PROTOCOL.md                           # Agent entry point (English)
├── registry.yaml                         # Slug ↔ real path mapping
│
├── agents/                               # Agent profiles (global)
│   ├── claude-code.yaml
│   ├── codex.yaml
│   ├── cursor.yaml
│   ├── copilot.yaml
│   └── chatgpt.yaml
│
└── projects/
    ├── home--alice--dev/               # Parent path group
    │   ├── my-project/                     # Project
    │   │   ├── project.yaml             # Project metadata
    │   │   ├── context/                 # Shared knowledge
    │   │   │   ├── product.md
    │   │   │   ├── architecture.md
    │   │   │   ├── stack.md
    │   │   │   └── conventions.md
    │   │   ├── tasks/                   # Kanban cards
    │   │   │   ├── BACKLOG.md           # Quick-read task index
    │   │   │   ├── TASK-001-comfyui-integration/
    │   │   │   │   ├── task.yaml        # Card metadata
    │   │   │   │   ├── plan.md          # REQUIRED before work
    │   │   │   │   ├── summary.md       # Current state snapshot
    │   │   │   │   ├── messages/        # Structured messages (append-only)
    │   │   │   │   │   ├── 001-plan.md
    │   │   │   │   │   ├── 002-claim.md
    │   │   │   │   │   └── 003-progress.md
    │   │   │   │   ├── reviews/         # Review records (append-only)
    │   │   │   │   ├── artifacts/       # Work products (diffs, test results)
    │   │   │   │   └── lock.yaml        # Ownership lock
    │   │   │   └── TASK-002-version-bump/
    │   │   ├── decisions/               # Architecture Decision Records
    │   │   │   └── DECISION-001.yaml
    │   │   ├── threads/                 # Non-task discussions (minimal use)
    │   │   └── log/                     # Activity log (append-only)
    │   │       └── 2026-03-09.md
    │   ├── other-app/
    │   └── mystic-record/
    │
    └── home--alice--work--client/
        └── my-project/                     # Same name, different parent = safe
```

---

## 3. Core Principles

### Principle 1: Programmable → Program It
Prefer programmatic, scriptable, and reusable solutions over repeated manual LLM reasoning whenever feasible. If a task is done more than twice, write a script.

### Principle 2: Language Policy
Internal agent communication: English.
User-facing communication: user's configured language.
Display language is set during installation via TUI, never hardcoded.

### Principle 3: One Task, One Owner, One Scope
A task has exactly one owner at a time. Each task explicitly defines which files it will modify. No two active tasks should have overlapping file scopes without explicit acknowledgment in both plan.md files.

### Principle 4: Plan Before Modify, Review After Modify
Every task requires an approved plan.md before implementation begins. Every implementation requires a review by a different agent than the builder.

### Principle 5: Append-Only Where Possible
Messages, reviews, and logs are append-only — create new files, never edit existing ones. Never edit another agent's messages. summary.md is updated only by the current task owner.

### Principle 6: Consensus by Math
When agents disagree, use weighted scoring. Each agent scores each option 1–10. Scores are summed. If margin ≥ 20%, winner is adopted. If margin < 20%, Arbiter (usually human) decides. All scoring is recorded in decisions/ for traceability.

---

## 4. Operational Model

### 4.1 Three Workflow Modes

| Mode | Purpose | Pattern |
|------|---------|---------|
| **Conference** | Design, research, brainstorming | Same question → multiple agents → compare → consensus |
| **Pipeline** | Implementation, reviews, fixes | Planner → Builder → Reviewer → Arbiter (sequential) |
| **Kanban** | Parallel work distribution | Board with cards, agents claim and execute independently |

**In practice, combine all three:**
1. Conference to make design decisions
2. Kanban to distribute implementation cards
3. Pipeline to implement + review each card

Each task specifies its mode in `task.yaml` via `workflow_mode`.

### 4.2 Roles

| Role | Responsibility | Key Rule |
|------|---------------|----------|
| **Planner** | Decompose requirements, create tasks, define acceptance criteria | Does not modify code |
| **Builder** | Implement code, write tests. Works on separate branch only. | Must hold lock. Must have approved plan.md. |
| **Reviewer** | Review diffs, verify tests, check quality | Must be a different agent than the builder |
| **Arbiter** | Final decisions, merge approval, dispute resolution | Usually human. Can be a designated agent. |

**Role ≠ Tool.** Claude Code can be a Planner on one task and a Builder on another.

### 4.3 Task Lifecycle

```
1. Planner creates task folder + task.yaml + plan.md
2. Plan is reviewed by other agents for scope conflicts
3. Builder claims task (creates lock.yaml)
4. Builder creates branch: agent/{agent-id}/{task-id}
5. Builder implements, writes progress messages
6. Builder updates summary.md
7. Builder writes handoff message → reviewer
8. Reviewer reviews (max 2 rounds of revision)
9. If approved → Arbiter merges. If 2 rounds exhausted → Arbiter decides.
10. Lock released. Task status → done.
```

### 4.4 Kanban Board (BACKLOG.md)

BACKLOG.md is a quick-read index. Detailed info lives in task folders.

```markdown
# Task Index

## Backlog
- TASK-005 | monitoring dashboard | medium | unassigned

## Ready
- TASK-003 | comfyui integration | high | unassigned

## Doing
- TASK-001 | initial setup | @claude-code

## Review
- TASK-002 | db schema | @codex → @cursor reviewing

## Done
- TASK-000 | project scaffolding | @cursor ✅
```

### 4.5 plan.md — Required Before Work

```markdown
---
task: TASK-001
planner: claude-code
reviewed_by: [cursor, codex]
approved: true
---

# Execution Plan

## Files to modify
- src/integrations/comfyui/adapter.ts (new)
- src/integrations/comfyui/types.ts (new)
- src/core/scheduler.ts (modify: add comfyui route)
- tests/integrations/comfyui/ (new)

## Files NOT to touch
- src/core/agent-manager.ts (TASK-004 scope)
- src/api/ (TASK-006 scope)

## Approach
1. Create adapter interface
2. Implement ComfyUI API client
3. Add scheduler routing
4. Write tests

## Risks
- scheduler.ts is shared with TASK-004. Only touching the routing switch, not the core loop.
```

---

## 5. File Formats

### config.yaml
```yaml
version: "1.0"
display_language: "ko"
hub_path: "~/.agenthive"
internal_language: "en"
```

### registry.yaml
```yaml
version: "1.0"
projects:
  - slug: "home--alice--dev/my-project"
    name: "My Project"
    path: "/home/alice/dev/my-project"
    alt_paths:
      - "/Users/alice/dev/my-project"
    git_remote: "git@github.com:alice/my-project.git"
    active: true
    created_at: "2026-03-09T00:00:00Z"
```

### project.yaml
```yaml
id: my-project
name: "My Project"
description: "Example project using AgentHive collaboration"
slug: "home--alice--dev/my-project"
paths:
  - /home/alice/dev/my-project
git:
  remote: "git@github.com:alice/my-project.git"
  default_branch: "main"
branching:
  pattern: "agent/{agent-id}/{task-id}"
  base: "main"
review:
  max_rounds: 2
  require_test_pass: true
active_agents:
  - agent_id: claude-code
    default_role: builder
  - agent_id: codex
    default_role: reviewer
  - agent_id: cursor
    default_role: builder
created_at: "2026-03-09T00:00:00Z"
```

### task.yaml
```yaml
id: TASK-001
title: "ComfyUI workflow integration"
category: "comfyui-integration"
tags: [comfyui, ai-video, gpu]
workflow_mode: pipeline
status: ready
priority: high
owner: null
role: null
created_by: human
created_at: "2026-03-09T13:00:00Z"
scope:
  path: "src/integrations/comfyui"
  files:
    - "src/integrations/comfyui/**"
    - "tests/integrations/comfyui/**"
  not_touch:
    - "src/core/agent-manager.ts"
acceptance:
  - "ComfyUI API calls work correctly"
  - "Graceful fallback on error"
  - "All tests pass"
branch: null
handoff:
  next_role: reviewer
  next_agent: null
```

### lock.yaml
```yaml
task: TASK-001
agent: claude-code
role: builder
claimed_at: "2026-03-09T14:00:00Z"
lease_until: "2026-03-09T20:00:00Z"
```

### decision-vote.yaml (Consensus by Math)
```yaml
id: DECISION-001
topic: "Project identification format"
status: resolved
decided_at: "2026-03-09T18:00:00Z"
criteria:
  readability: 0.30
  uniqueness: 0.25
  simplicity: 0.25
  extensibility: 0.20
options:
  A:
    name: "parent_slug/project_name"
    description: "No hash, path-based grouping"
  B:
    name: "display_slug__hash8"
    description: "Short name + hash suffix"
  C:
    name: "pure_hash"
    description: "Hash only"
votes:
  claude:
    scores: { A: 9, B: 6, C: 2 }
    reasoning: "A is most readable, hash unnecessary for MVP"
  grok:
    scores: { A: 8, B: 7, C: 3 }
    reasoning: "A with collision-only hash is practical"
  chatgpt:
    scores: { A: 6, B: 9, C: 5 }
    reasoning: "B prevents path exposure"
totals: { A: 23, B: 22, C: 10 }
winner: A
margin: "4%"
decided_by: majority_vote
```

### Agent profile (e.g., agents/claude-code.yaml)
```yaml
agent_id: claude-code
tool: "Claude Code (Anthropic)"
type: terminal
capabilities:
  - code-generation
  - code-review
  - refactoring
  - testing
  - file-management
  - terminal-commands
  - git-operations
limitations:
  - "No web browsing"
  - "No GUI interaction"
  - "No memory across sessions (compensated by files)"
preferred_roles: [builder, planner]
config_files:
  instructions: "CLAUDE.md"
  skills_dir: ".claude/skills/"
```

### Message file (e.g., messages/003-progress.md)
```markdown
---
id: MSG-003
task: TASK-001
from: claude-code
to: "*"
type: progress
at: "2026-03-09T15:00:00Z"
branch: agent/claude-code/TASK-001
---

## Completed
1. Created src/integrations/comfyui/adapter.ts
2. Added Redis-based distributed lock
3. Wrote 7 tests, all passing

## Changed files
- src/integrations/comfyui/adapter.ts (new)
- src/integrations/comfyui/types.ts (new)
- src/core/scheduler.ts (modified: routing switch)
- tests/integrations/comfyui/ (new, 7 files)

## Concerns
Redis connection failure has no fallback. Suggest separate task.

## Next
Requesting review. summary.md updated.
```

### Daily log (e.g., log/2026-03-09.md)
```markdown
---
date: 2026-03-09
---

# Activity Log: 2026-03-09

---

### 14:00 UTC — @claude-code
**Task**: TASK-001 (ComfyUI integration)
**Action**: Claimed task, created branch agent/claude-code/TASK-001
**Result**: 🔄 In progress

---

### 15:30 UTC — @claude-code
**Task**: TASK-001
**Action**: Implementation complete, 7 tests passing
**Changed**: src/integrations/comfyui/*, src/core/scheduler.ts
**Result**: 📋 Awaiting review

---
```

---

## 6. Pointer Files (placed in project repos)

### AGENTS.md
```markdown
# AGENTS.md

This project uses the AgentHive collaboration protocol.

## Hub
- Protocol: ~/.agenthive/PROTOCOL.md
- Project data: ~/.agenthive/projects/home--alice--dev/my-project/
- Task index: ~/.agenthive/projects/home--alice--dev/my-project/tasks/BACKLOG.md

## Quick Start
1. Read ~/.agenthive/PROTOCOL.md
2. Read context at ~/.agenthive/projects/home--alice--dev/my-project/context/
3. Check BACKLOG.md for available tasks

## Project Overview
An example project using AgentHive multi-agent collaboration.

## Rules
- Do not modify main/develop branch directly
- Do not write secrets, API keys, or passwords to any .agenthive file
- Do not modify tasks locked by another agent
```

### CLAUDE.md
```markdown
# CLAUDE.md

This project uses AgentHive multi-agent collaboration.
Your agent-id: `claude-code`

## Required Reading
1. ~/.agenthive/PROTOCOL.md
2. ~/.agenthive/projects/home--alice--dev/my-project/project.yaml
3. ~/.agenthive/projects/home--alice--dev/my-project/context/

## Your Rules
- Claim lock before working (lock.yaml)
- Work on branch: agent/claude-code/{task-id}
- Write plan.md before implementation
- Update summary.md after work
- Messages and logs are append-only
- Refer to AGENTS.md for project rules
```

### .agenthive.pointer.yaml
```yaml
hub: "~/.agenthive"
project_slug: "home--alice--dev/my-project"
project_path: "~/.agenthive/projects/home--alice--dev/my-project"
```

### .cursor/rules/00-agenthive.mdc
```markdown
---
description: "AgentHive multi-agent collaboration protocol"
globs: ["**/*"]
alwaysApply: true
---

This project uses AgentHive collaboration.
Your agent-id: `cursor`

Required reading:
- ~/.agenthive/PROTOCOL.md
- ~/.agenthive/projects/home--alice--dev/my-project/project.yaml
- ~/.agenthive/projects/home--alice--dev/my-project/tasks/BACKLOG.md

Follow AGENTS.md rules. Update summary.md after work.
```

### .github/copilot-instructions.md
```markdown
This project uses the AgentHive collaboration protocol.
Your agent-id: `copilot`

Read ~/.agenthive/PROTOCOL.md and follow AGENTS.md rules.
Project data: ~/.agenthive/projects/home--alice--dev/my-project/
Check BACKLOG.md before starting work.
```

---

## 7. Symphony Integration Plan

Symphony is not a replacement. It operates at a different layer.

| | AgentHive | Symphony |
|---|---|---|
| **Focus** | Multi-tool collaboration protocol | Automated execution orchestration |
| **Agents** | Any tool (Claude, Cursor, Codex, Copilot, ChatGPT...) | Codex-centric |
| **Communication** | File-based (zero install) | Elixir + PostgreSQL + Linear |
| **Conference mode** | ✅ | ❌ |
| **Auto-execution** | Phase 3+ | ✅ Core feature |

**Roadmap**: AgentHive decides WHAT to do → Symphony (Phase 3) executes HOW.

---

## 8. Installation

`agenthive init` runs a TUI installer:

1. **Select display language** (English, 한국어, 日本語, 中文, Español, Deutsch, or type custom)
2. **Confirm hub path** (`~/.agenthive/` default, customizable)
3. **Optionally register first project** (auto-detects current directory)
4. **Creates**: config.yaml, registry.yaml, PROTOCOL.md, agents/ directory

Internal documents (PROTOCOL.md, agent profiles, task files) are always in English. Only TUI prompts and user-facing reports use the selected language.

---

## 9. Phased Roadmap

### Phase 1: Protocol + Manual Operation ← CURRENT
- [ ] Create ~/.agenthive/ (manual or init script)
- [ ] Register first project
- [ ] Write context/ files (product, architecture, stack, conventions)
- [ ] Deploy pointer files to project repo (AGENTS.md, CLAUDE.md, etc.)
- [ ] Create first task (TASK-001) with plan.md
- [ ] Test full lifecycle with 2 agents

### Phase 2: CLI Tool (Open Source)
- `agenthive init` — TUI hub initialization
- `agenthive project add <path>` — Register project (auto slug generation)
- `agenthive project list` — List registered projects
- `agenthive task create` — Create task card with template
- `agenthive task claim <id>` — Claim task + create lock
- `agenthive task complete <id>` — Mark done + release lock
- `agenthive status [project]` — Kanban board view in terminal
- `agenthive link` — Create symlink in current repo (opt-in)
- `agenthive setup <tool>` — Generate tool-specific pointer files
- `agenthive vote <decision-id>` — Submit scores for Consensus by Math

### Phase 3: Symphony Absorption
- Absorb Symphony's WORKFLOW.md pattern
- Add automated execution triggers (file watcher or issue tracker polling)
- Support Linear/GitHub Issues as task input source
- AgentHive as coordination layer, Symphony-style execution underneath

### Phase 4: Automation + Community
- File watcher daemon (new task → auto-assign)
- Dead lock auto-release (lease expiration)
- Daily summary auto-generation
- Web dashboard for kanban visualization
- Public release on GitHub
- Community feedback integration

---

## Appendix A: Message Types

| Type | Purpose | When |
|------|---------|------|
| `plan` | Execution plan for a task | Before work starts |
| `claim` | Agent claims ownership | When taking a task |
| `progress` | Work-in-progress update | During implementation |
| `question` | Asking for input (needs response) | Anytime |
| `answer` | Response to a question | After question |
| `review` | Review verdict (approve/request-changes) | After implementation |
| `decision` | Final ruling | After review or dispute |
| `blocked` | Cannot proceed, needs help | When stuck |
| `complete` | Task finished | After approval |
| `handoff` | Passing to next role | Between pipeline stages |

---

## Appendix B: Status Values

### Task status
`backlog` → `ready` → `doing` → `review` → `done`
(Also: `blocked` from any active state)

### Decision status
`proposed` → `voting` → `resolved`
(Also: `superseded`, `deprecated`)

---

## Appendix C: Naming Conventions

| Item | Format | Example |
|------|--------|---------|
| Task ID | `TASK-NNN` | `TASK-001` |
| Task folder | `TASK-NNN-description` | `TASK-001-comfyui-integration` |
| Decision ID | `DECISION-NNN` | `DECISION-001` |
| Thread ID | `THREAD-NNN` | `THREAD-001` |
| Message file | `NNN-{type}.md` | `003-progress.md` |
| Agent ID | tool-name kebab-case | `claude-code`, `cursor`, `codex` |
| Branch | `agent/{agent-id}/{task-id}` | `agent/claude-code/TASK-001` |
| Lock file | `lock.yaml` (inside task folder) | — |
| Log file | `YYYY-MM-DD.md` | `2026-03-09.md` |
| Timestamps | ISO 8601 UTC | `2026-03-09T14:00:00Z` |
| Path slug separator | `--` | `home--alice--dev` |