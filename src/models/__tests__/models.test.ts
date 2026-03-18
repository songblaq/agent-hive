import { describe, it, expect } from "vitest";
import { validateConfig } from "../config.js";
import { validateRegistry } from "../registry.js";
import { validateProject } from "../project.js";
import { validateTask, TASK_STATUSES } from "../task.js";
import { validateLock } from "../lock.js";
import { validateAgentProfile } from "../agent.js";

describe("validateConfig", () => {
  it("accepts valid config", () => {
    const result = validateConfig({
      version: "1.0",
      display_language: "ko",
      hub_path: "~/.agenthive",
      internal_language: "en",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing fields", () => {
    const result = validateConfig({ version: "1.0" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects non-object", () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
  });
});

describe("validateRegistry", () => {
  it("accepts valid registry", () => {
    const result = validateRegistry({
      version: "1.0",
      projects: [
        {
          slug: "Users--alice--projects/my-app",
          name: "AgentHive",
          path: "/Users/alice/projects/my-app",
          git_remote: null,
          active: true,
          created_at: "2026-03-09T21:35:00Z",
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts empty projects array", () => {
    const result = validateRegistry({ version: "1.0", projects: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid entry", () => {
    const result = validateRegistry({
      version: "1.0",
      projects: [{ slug: "test" }],
    });
    expect(result.valid).toBe(false);
  });
});

describe("validateProject", () => {
  it("accepts valid project", () => {
    const result = validateProject({
      id: "agent-hive",
      name: "AgentHive",
      description: "CLI tool",
      slug: "Users--alice--projects/my-app",
      paths: ["/Users/alice/projects/my-app"],
      git: { remote: null, default_branch: "main" },
      branching: { pattern: "agent/{agent-id}/{task-id}", base: "main" },
      review: { max_rounds: 2, require_test_pass: true },
      active_agents: [{ agent_id: "claude-code", default_role: "builder" }],
      created_at: "2026-03-09T21:35:00Z",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing id", () => {
    const result = validateProject({ name: "test" });
    expect(result.valid).toBe(false);
  });

  it("reports missing git.default_branch even with other errors", () => {
    const result = validateProject({
      id: "test",
      name: "test",
      slug: "test",
      paths: [],
      created_at: "2026-01-01T00:00:00Z",
      git: { remote: null },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "default_branch")).toBe(true);
  });
});

describe("validateTask", () => {
  const validTask = {
    id: "TASK-001",
    title: "Repository scaffold",
    category: "bootstrap",
    tags: ["scaffold"],
    workflow_mode: "pipeline",
    status: "doing",
    priority: "high",
    owner: "claude-code",
    role: "builder",
    created_by: "human",
    created_at: "2026-03-09T21:30:00Z",
    scope: { path: "/", files: ["package.json"], not_touch: [] },
    acceptance: ["pnpm build succeeds"],
    branch: null,
    handoff: { next_role: "reviewer", next_agent: null },
  };

  it("accepts valid task", () => {
    const result = validateTask(validTask);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = validateTask({ ...validTask, status: "invalid" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = validateTask({ ...validTask, priority: "urgent" });
    expect(result.valid).toBe(false);
  });

  it("validates all task statuses", () => {
    for (const status of TASK_STATUSES) {
      const result = validateTask({ ...validTask, status });
      expect(result.valid).toBe(true);
    }
  });
});

describe("validateLock", () => {
  it("accepts valid lock", () => {
    const result = validateLock({
      task: "TASK-001",
      agent: "claude-code",
      role: "builder",
      claimed_at: "2026-03-09T21:35:00Z",
      lease_until: "2026-03-10T03:35:00Z",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing agent", () => {
    const result = validateLock({ task: "TASK-001" });
    expect(result.valid).toBe(false);
  });
});

describe("validateAgentProfile", () => {
  it("accepts valid agent profile", () => {
    const result = validateAgentProfile({
      agent_id: "claude-code",
      tool: "Claude Code (Anthropic)",
      type: "terminal",
      capabilities: ["code-generation", "code-review"],
      limitations: ["No web browsing"],
      preferred_roles: ["builder", "planner"],
      config_files: { instructions: "CLAUDE.md" },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing agent_id", () => {
    const result = validateAgentProfile({ tool: "test" });
    expect(result.valid).toBe(false);
  });
});
