import { mkdir, symlink, readlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { stringify } from "yaml";
import { homedir } from "node:os";

export interface PointerContext {
  projectName: string;
  projectDescription: string;
  hubPath: string;
  slug: string;
  hubProjectPath: string;
  repoPath: string;
}

export type AgentTarget = "claude" | "codex" | "cursor" | "copilot" | "antigravity" | "vscode" | "openclaw" | "all";

export const AGENT_TARGETS: AgentTarget[] = ["claude", "codex", "cursor", "copilot", "antigravity", "vscode", "openclaw"];

interface GeneratedFile {
  path: string;
  content: string;
}

function generateClaude(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, "CLAUDE.md"),
    content: `# CLAUDE.md — ${ctx.projectName}

## Project
${ctx.projectDescription}

## Architecture
- **Public repo**: This directory — source code, templates, docs, specs
- **Private hub**: ${ctx.hubPath}/ — project data, tasks, logs, decisions
- **Pointer files**: Thin files in project repos (AGENTS.md, .agenthive.pointer.yaml)

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Task index: ${ctx.hubProjectPath}/tasks/BACKLOG.md
- Context: ${ctx.hubProjectPath}/context/

## Quick Start
1. Read ${ctx.hubPath}/PROTOCOL.md
2. Read context at ${ctx.hubProjectPath}/context/
3. Check BACKLOG.md for available tasks
4. Claim a task before starting work (create lock.yaml)

## Rules
- Do not modify main/develop branch directly
- Do not write secrets or API keys to any .agenthive file
- Do not modify tasks locked by another agent
- Do not edit another agent's messages or reviews
- Always create plan.md before implementation
- Always update summary.md after completing work
- Messages and logs are append-only
`,
  };
}

function generateCodex(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, "AGENTS.md"),
    content: `# AGENTS.md

This project uses the AgentHive collaboration protocol.

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Task index: ${ctx.hubProjectPath}/tasks/BACKLOG.md

## Quick Start
1. Read ${ctx.hubPath}/PROTOCOL.md
2. Read context at ${ctx.hubProjectPath}/context/
3. Check BACKLOG.md for available tasks
4. Claim a task before starting work (create lock.yaml)

## Project Overview
${ctx.projectDescription}

## Rules
- Do not modify main/develop branch directly
- Do not write secrets, API keys, or passwords to any .agenthive file
- Do not modify tasks locked by another agent
- Do not edit another agent's messages or reviews
- Always create plan.md before implementation
- Always update summary.md after completing work
- Messages and logs are append-only
`,
  };
}

function generateCursor(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, ".cursor", "rules", "00-agenthive.mdc"),
    content: `---
description: AgentHive multi-agent collaboration protocol
globs: "**/*"
alwaysApply: true
---

# AgentHive Protocol

This project uses the AgentHive file-based collaboration protocol.

## Hub Location
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Tasks: ${ctx.hubProjectPath}/tasks/BACKLOG.md
- Context: ${ctx.hubProjectPath}/context/

## Rules
- Read the protocol before starting any task
- Claim tasks by creating lock.yaml before working
- Do not modify tasks locked by another agent
- Always create plan.md before implementation
- Update summary.md after completing work
- Messages and logs are append-only
- Do not write secrets to .agenthive files
`,
  };
}

function generateCopilot(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, ".github", "copilot-instructions.md"),
    content: `# Copilot Instructions — ${ctx.projectName}

This project uses the AgentHive multi-agent collaboration protocol.

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project: ${ctx.hubProjectPath}/
- Tasks: ${ctx.hubProjectPath}/tasks/BACKLOG.md

## Context
Read the shared context files at ${ctx.hubProjectPath}/context/ before making changes.

## Rules
- Check BACKLOG.md for available tasks before starting work
- Claim a task (create lock.yaml) before modifying files
- Do not modify tasks locked by another agent
- Create plan.md before implementation
- Update summary.md after completing work
- Do not write secrets to any .agenthive file
`,
  };
}

function generatePointerYaml(ctx: PointerContext): GeneratedFile {
  const data = {
    hub: ctx.hubPath,
    project_slug: ctx.slug,
    project_path: ctx.hubProjectPath,
  };
  return {
    path: join(ctx.repoPath, ".agenthive.pointer.yaml"),
    content: stringify(data, { lineWidth: 0 }),
  };
}

function generateAntiGravity(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, ".antigravity", "agenthive.md"),
    content: `# AgentHive Protocol — ${ctx.projectName}

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Tasks: ${ctx.hubProjectPath}/tasks/BACKLOG.md
- Context: ${ctx.hubProjectPath}/context/

## Quick Start
1. Read ${ctx.hubPath}/PROTOCOL.md
2. Read context at ${ctx.hubProjectPath}/context/
3. Check BACKLOG.md for available tasks
4. Claim a task before starting work (create lock.yaml)

## Rules
- Do not modify tasks locked by another agent
- Always create plan.md before implementation
- Update summary.md after completing work
- Messages and logs are append-only
- Do not write secrets to .agenthive files
`,
  };
}

function generateVSCode(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, ".vscode", "agenthive.md"),
    content: `# AgentHive Protocol — ${ctx.projectName}

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Tasks: ${ctx.hubProjectPath}/tasks/BACKLOG.md
- Context: ${ctx.hubProjectPath}/context/

## Quick Start
1. Read ${ctx.hubPath}/PROTOCOL.md
2. Read context at ${ctx.hubProjectPath}/context/
3. Check BACKLOG.md for available tasks
4. Claim a task before starting work (create lock.yaml)

## Rules
- Do not modify tasks locked by another agent
- Always create plan.md before implementation
- Update summary.md after completing work
- Messages and logs are append-only
- Do not write secrets to .agenthive files
`,
  };
}

function generateOpenClaw(ctx: PointerContext): GeneratedFile {
  return {
    path: join(ctx.repoPath, ".openclaw", "agenthive.md"),
    content: `# AgentHive Protocol — ${ctx.projectName}

## Hub
- Protocol: ${ctx.hubPath}/PROTOCOL.md
- Project data: ${ctx.hubProjectPath}/
- Tasks: ${ctx.hubProjectPath}/tasks/BACKLOG.md
- Context: ${ctx.hubProjectPath}/context/

## Quick Start
1. Read ${ctx.hubPath}/PROTOCOL.md
2. Read context at ${ctx.hubProjectPath}/context/
3. Check BACKLOG.md for available tasks
4. Claim a task before starting work (create lock.yaml)

## Rules
- Do not modify tasks locked by another agent
- Always create plan.md before implementation
- Update summary.md after completing work
- Messages and logs are append-only
- Do not write secrets to .agenthive files
`,
  };
}

const GENERATORS: Record<string, (ctx: PointerContext) => GeneratedFile> = {
  claude: generateClaude,
  codex: generateCodex,
  cursor: generateCursor,
  copilot: generateCopilot,
  antigravity: generateAntiGravity,
  vscode: generateVSCode,
  openclaw: generateOpenClaw,
};

// Skill symlink targets: tool → skills directory path relative to home
const SKILL_DIRS: Partial<Record<AgentTarget, string>> = {
  claude: ".claude/skills",
  openclaw: ".openclaw/skills",
  cursor: ".cursor/skills",
  vscode: ".vscode/skills",
  antigravity: ".antigravity/skills",
};

const SHARED_SKILLS_SOURCE = join(homedir(), ".agent", "skills", "agenthive");

async function installSkillSymlink(target: AgentTarget): Promise<string | null> {
  const relDir = SKILL_DIRS[target];
  if (!relDir) return null;

  const skillsDir = join(homedir(), relDir);
  const linkPath = join(skillsDir, "agenthive");

  // Check if source exists
  if (!existsSync(SHARED_SKILLS_SOURCE)) return null;

  // Check if already linked correctly
  if (existsSync(linkPath)) {
    try {
      const existing = await readlink(linkPath);
      if (existing === SHARED_SKILLS_SOURCE) return null; // Already correct
    } catch { /* not a symlink, skip */ }
    return null; // Something exists, don't overwrite
  }

  await mkdir(skillsDir, { recursive: true });
  await symlink(SHARED_SKILLS_SOURCE, linkPath);
  return linkPath;
}

export async function generatePointerFiles(
  ctx: PointerContext,
  target: AgentTarget,
): Promise<string[]> {
  const files: GeneratedFile[] = [];

  // Always generate pointer yaml
  files.push(generatePointerYaml(ctx));

  if (target === "all") {
    for (const gen of Object.values(GENERATORS)) {
      files.push(gen(ctx));
    }
  } else {
    const gen = GENERATORS[target];
    if (gen) files.push(gen(ctx));
  }

  const written: string[] = [];
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, "utf-8");
    written.push(file.path);
  }

  // Install skill symlinks
  if (target === "all") {
    for (const t of AGENT_TARGETS) {
      const linked = await installSkillSymlink(t);
      if (linked) written.push(linked);
    }
  } else {
    const linked = await installSkillSymlink(target);
    if (linked) written.push(linked);
  }

  return written;
}
