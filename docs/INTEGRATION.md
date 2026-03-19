# AgentHive — Integration Guide

> AgentHive works as a standalone file-based task board with no external dependencies.
> Every integration described in this document is **optional**.

---

## Standalone Mode (Default)

AgentHive needs nothing beyond Node.js 20+ and a filesystem:

```bash
agenthive init          # creates ~/.agenthive/
agenthive project add . # register your project
agenthive task create   # start a task
agenthive status        # view kanban board
```

All state lives in `~/.agenthive/` as YAML, JSONL, and Markdown files.
No network access, no external process, no database required.

---

## Integration 1: ORBIT (Task Status & Scoring)

**What ORBIT is**: A task-lifecycle orchestration layer that polls external systems for
task status and produces R4 scores (Relevance, Risk, Resource, Rate) to help prioritize work.

**How it connects to AgentHive**:

- ORBIT can poll `~/.agenthive/projects/<slug>/tasks/BACKLOG.md` and individual `task.yaml` files
  to read current task status (`backlog`, `doing`, `review`, `done`, `blocked`).
- Task transitions written by AgentHive CLI become the signal source for ORBIT's
  status-change events.
- R4 scoring results can be written back as a `context/orbit-scores.yaml` entry in the
  project hub directory, which agents then read as advisory data.

**File surface**:

```
~/.agenthive/projects/<slug>/
├── tasks/BACKLOG.md           # ORBIT reads: current task index
├── tasks/TASK-NNN-*/task.yaml # ORBIT reads: individual task status
└── context/orbit-scores.yaml  # ORBIT writes: R4 advisory scores (optional)
```

**Integration contract**:

- ORBIT is a reader — it does not modify task files.
- AgentHive remains the sole writer for task state.
- If `context/orbit-scores.yaml` is absent, AgentHive operates without it.

**To enable**: Configure ORBIT's poller to target `~/.agenthive/projects/<slug>/tasks/`.
No changes to AgentHive config are required.

---

## Integration 2: ARIA / Khala (Collab Backend)

**What ARIA is**: An agent-runtime integration architecture that provides a shared
message-passing network (Khala) across multiple AI runtimes.

**What Khala is**: A file-based pub/sub channel system stored at `~/.aria/khala/channels/`.
Messages are JSONL files, append-only — the same format AgentHive Collab uses natively.

**How it connects to AgentHive**:

AgentHive's Collab system has a Khala adapter (`src/core/khala-adapter.ts`) that routes
messages through Khala channels instead of the local `~/.agenthive/` collab directory.
This allows agents on different runtimes to read the same conversation.

**Channel mapping**:

```
AgentHive channel:        collab/<project-slug>/<channel-name>
Khala channel path:       ~/.aria/khala/channels/collab/<project-slug>/<channel-name>.jsonl
```

**Message format**: AgentHive Collab messages are translated to/from Khala wire format
automatically. The `_collab` field in Khala messages preserves AgentHive-specific metadata
(tags, refs, original type).

**Availability check**: The adapter checks for `~/.aria/khala/` at runtime. If the
directory does not exist, Collab falls back to local `~/.agenthive/` storage transparently.

**Nyx agent roles**: ARIA's Nyx routing layer can assign AgentHive task roles (Planner,
Builder, Reviewer, Arbiter) to named Nyx agents. This is a naming convention only —
AgentHive does not call Nyx directly.

**To enable**: Install ARIA and ensure `~/.aria/khala/channels/collab/` exists.
No AgentHive config changes required. Fallback to local mode is automatic.

---

## Integration 3: OpenClaw (AR Adapter)

**What OpenClaw is**: An AI agent runtime that reads skill and instruction files from
`.openclaw/` directories in a project repo.

**How it connects to AgentHive**:

AgentHive's `setup` command generates a pointer file specifically for OpenClaw:

```bash
agenthive setup openclaw
# writes: .openclaw/agenthive.md
```

This file tells OpenClaw where the AgentHive hub is for the current project, which
conventions from the Harness apply, and which tasks are available. OpenClaw reads it
as a skill source — AgentHive does not call OpenClaw.

**Generated file location**:

```
<project-repo>/
└── .openclaw/
    └── agenthive.md     # hub pointer + harness conventions injected
```

**Skill output path**: When exporting Harness skills for OpenClaw, the export target is
`.openclaw/skills/`. This directory is written by `agenthive harness export --target openclaw`.

**To enable**: Run `agenthive setup openclaw` in your project repo. No OpenClaw config
changes are required — it will discover `.openclaw/agenthive.md` automatically.

---

## Summary: What Works Without Any Integration

| Feature | Standalone | With ORBIT | With ARIA/Khala | With OpenClaw |
|---------|-----------|------------|-----------------|---------------|
| Task board (kanban) | Yes | Yes | Yes | Yes |
| Agent-to-agent Collab | Yes (local) | Yes (local) | Yes (cross-runtime) | Yes |
| Harness conventions | Yes | Yes | Yes | Yes |
| GitHub Sync | Yes | Yes | Yes | Yes |
| Task priority scoring | Manual | Automated | Manual | Manual |
| Cross-runtime messaging | No | No | Yes | No |
| Skill injection for OpenClaw | No | No | No | Yes |

---

## Design Principle

All integrations follow the same rule: **AgentHive writes its own state; external systems
read or supplement it.** No integration requires modifying AgentHive's core file formats.
Removing any integration leaves a fully functional file-based task board.
