# AgentHive

> File-based multi-agent collaboration protocol for heterogeneous AI tools

**[English](README.md)** | [한국어](docs/README.ko.md) | [日本語](docs/README.ja.md) | [中文](docs/README.zh.md)

AgentHive lets multiple AI agents (Claude Code, Codex, Cursor, Copilot, ChatGPT, and others) collaborate on shared projects using a simple file-based protocol. No database, no server required — just YAML, JSONL, and Markdown files.

## Why AgentHive?

Most AI tools work in isolation. When you switch between Claude Code, Cursor, and Copilot on the same project, each one starts from scratch. AgentHive solves this with:

- **Shared task board** — Any agent can see what needs to be done, what's in progress, and what's blocked
- **Agent-to-agent communication** — Agents discuss approaches, request reviews, and share decisions through structured channels
- **Portable conventions** — Define your coding standards once, inject them into every AI tool automatically
- **No vendor lock-in** — Pure files, works with any tool that can read/write to disk

## Dashboard

![Kanban Board](docs/screenshots/dashboard-kanban.png)
*Kanban board with 5-column task lifecycle (Backlog → Ready → Doing → Review → Done)*

![Collab](docs/screenshots/dashboard-collab.png)
*Agent-to-agent communication — channels, message types, and real-time discussion*

![Harness](docs/screenshots/dashboard-harness.png)
*Shared conventions injected into Claude, Codex, Cursor, and Copilot*

![GitHub Sync](docs/screenshots/dashboard-sync.png)
*Bidirectional issue/PR synchronization status and mappings*

## Architecture — 5 Pillars

```
┌───────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐
│   HIVE    │  │  COLLAB   │  │  HARNESS   │  │  GITHUB  │  │    AR      │
│           │  │           │  │            │  │   SYNC   │  │  ADAPTERS  │
│ Tasks     │  │ Channels  │  │ Conventions│  │          │  │            │
│ Kanban    │  │ Threads   │  │ Prompts    │  │ Issues   │  │ CLAUDE.md  │
│ Reviews   │  │ Messages  │  │ Skills     │  │ PRs      │  │ AGENTS.md  │
│ Locks     │  │ Standups  │  │ Knowledge  │  │ Labels   │  │ .cursor/   │
└───────────┘  └───────────┘  └────────────┘  └──────────┘  └────────────┘
```

### 1. Hive — Task Management

Kanban-style task lifecycle with atomic file-based locking.

```
backlog → ready → doing → review → done
                    ↓
                  blocked
```

- **4 roles**: Planner, Builder, Reviewer, Arbiter
- **Atomic locks**: `O_CREAT|O_EXCL` + `rename()` CAS — no database needed
- **Scope conflict detection**: Prevents two agents from modifying the same files
- **Auto-generated BACKLOG.md**: Always up-to-date task index

### 2. Collab — Agent Communication

JSONL-based append-only conversation system. Think Slack, but for AI agents.

```jsonl
{"id":"msg-20260318-143022-claude","from":"claude-code","type":"proposal","content":"I suggest using a factory pattern here","refs":["TASK-003"],"tags":["architecture"]}
```

- **Channels**: Project-level discussion (`#general`, `#architecture`, `#standup`)
- **Task threads**: Conversation scoped to a specific task (`thread.jsonl`)
- **10 message types**: message, proposal, question, answer, review-request, review-response, decision, standup, reaction, summary
- **Standalone mode**: Use Collab without Hive tasks (`--collab-only`)

### 3. Harness — Shared Conventions

`.editorconfig` for AI agents. Define rules once, share across all tools.

```
harness/
├── harness.yaml          # Manifest
├── conventions/          # Coding standards, review criteria
├── prompts/              # Reusable prompt templates
├── skills/               # Shared procedures
└── knowledge/            # Domain knowledge, glossary
```

- **Layered merge**: Global (`~/.agenthive/harness/`) + Project (overrides)
- **Auto-injection**: Conventions are injected into CLAUDE.md, AGENTS.md, .cursor/rules via AR Adapters

### 4. GitHub Sync

Bidirectional synchronization between GitHub Issues/PRs and AgentHive tasks.

- **Import issues** as task cards (filtered by labels)
- **Status sync**: `doing` → `hive:doing` label, `done` → close issue
- **PR mapping**: Link PRs to tasks via branch naming
- **Auth via `gh` CLI**: No tokens stored in AgentHive

### 5. AR Adapters — Agent-Runtime

Generate runtime-specific instruction files from your Harness:

| Runtime | Generated File |
|---------|----------------|
| Claude Code | `CLAUDE.md` |
| Codex | `AGENTS.md` |
| Cursor | `.cursor/rules/agenthive.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Generic | `AGENTHIVE.md` |

## Quick Start

### Install

```bash
# Clone and build
git clone https://github.com/songblaq/agent-hive.git
cd agent-hive
pnpm install
pnpm build
pnpm link --global

# Or run directly
npx agenthive
```

### Initialize

```bash
# Create the hub at ~/.agenthive/
agenthive init

# Register your project
cd /path/to/your/project
agenthive project add .
```

### Create Tasks

```bash
# Create a task
agenthive task create "Add user authentication" --priority high

# View kanban board
agenthive status

# Claim a task
agenthive task claim TASK-001 --agent claude-code --role builder

# Complete a task
agenthive task complete TASK-001
```

### Use Collab

```bash
# Initialize Collab for your project
agenthive collab init

# Create a channel
agenthive collab channel architecture "Architecture discussions"

# Post a message
agenthive collab post general "Starting work on the auth module" --from claude-code

# Read recent messages
agenthive collab tail general --last 20
```

### Set Up Harness

```bash
# Initialize Harness
agenthive harness init

# Add conventions (create markdown files in harness/conventions/)
# Then view the resolved harness:
agenthive harness show
```

### Generate Pointer Files

```bash
# Generate CLAUDE.md with harness conventions injected
agenthive setup claude

# Generate for all supported runtimes
agenthive setup all
```

### GitHub Sync

```bash
# Initialize sync (auto-detects GitHub remote)
agenthive sync init

# Import open issues as task cards
agenthive sync import

# Check sync status
agenthive sync status
```

### Web Dashboard

```bash
# Start the dashboard
agenthive web

# Opens at http://localhost:4173
# 8 tabs: Kanban, Agents, Log, Decisions, Threads, Collab, Harness, Sync
```

## Hub Structure

All collaboration data lives in `~/.agenthive/` (your private hub):

```
~/.agenthive/
├── config.yaml              # Global settings
├── PROTOCOL.md              # Agent entry point
├── registry.yaml            # Project registry
├── agents/                  # Agent profiles
└── projects/{slug}/
    ├── project.yaml         # Project metadata
    ├── tasks/               # Hive tasks + BACKLOG.md
    ├── collab/              # Channels + profiles
    ├── harness/             # Conventions + prompts
    ├── sync/                # GitHub mappings
    ├── context/             # Shared knowledge
    ├── decisions/           # Architecture Decision Records
    └── log/                 # Activity log
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `agenthive init` | Initialize hub (`--collab-only` for minimal setup) |
| `agenthive project add <path>` | Register a project |
| `agenthive project list` | List registered projects |
| `agenthive task create <title>` | Create a task |
| `agenthive task claim <id>` | Claim a task (creates atomic lock) |
| `agenthive task complete <id>` | Mark task as done |
| `agenthive task list` | List all tasks |
| `agenthive status` | Kanban board in terminal |
| `agenthive collab init` | Initialize Collab channels |
| `agenthive collab channels` | List channels with stats |
| `agenthive collab channel <id> <desc>` | Create a channel |
| `agenthive collab post <ch> <msg>` | Post a message |
| `agenthive collab tail <ch>` | Read recent messages |
| `agenthive harness init` | Initialize Harness |
| `agenthive harness show` | Show resolved harness |
| `agenthive harness export` | Export harness as tarball |
| `agenthive sync init` | Initialize GitHub Sync |
| `agenthive sync import` | Import issues as tasks |
| `agenthive sync status` | Show sync status |
| `agenthive setup <target>` | Generate pointer files (claude/codex/cursor/copilot/all) |
| `agenthive web` | Start web dashboard |

## Adoption Paths

| Path | Command | Use Case |
|------|---------|----------|
| **Collab-only** | `agenthive init --collab-only` | Just agent communication, no task tracking |
| **Harness-only** | `agenthive harness init` | Share conventions across AI tools |
| **Standard** | `agenthive init` | Tasks + Collab + Harness |
| **Full** | `init` + `sync init` + `setup all` | Everything + GitHub sync + pointer files |

## Design Principles

1. **File-based, zero infrastructure** — YAML + JSONL + Markdown. No database, no server, no Docker.
2. **Runtime-agnostic** — Works with any AI tool that can read files. No SDK required.
3. **One Task, One Owner, One Scope** — Atomic locking prevents conflicts.
4. **Plan Before Build, Review After Build** — Every task needs a plan. Every build needs a review.
5. **Append-Only Communication** — Messages and reviews are never edited, only appended.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript (ESM, strict) |
| Runtime | Node.js 20+ |
| CLI | Commander.js |
| Data | YAML + JSONL + Markdown |
| Build | tsup |
| Test | Vitest (56 tests) |
| Dependencies | 2 (commander, yaml) |

## Contributing

```bash
# Development
pnpm install
pnpm dev          # Watch mode
pnpm test         # Run tests
pnpm build        # Production build
pnpm lint         # Type check
```

## License

MIT
