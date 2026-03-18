import type { ValidationResult, ValidationError } from "../core/yaml-utils.js";
import type { AgentRole } from "./task.js";
import { ok, fail, requireString, requireArray, optionalString } from "../core/yaml-utils.js";

export interface ProjectGit {
  remote: string | null;
  default_branch: string;
}

export interface ProjectBranching {
  pattern: string;
  base: string;
}

export interface ProjectReview {
  max_rounds: number;
  require_test_pass: boolean;
}

export interface ProjectAgent {
  agent_id: string;
  tool: string;
  default_role: AgentRole;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  slug: string;
  paths: string[];
  git: ProjectGit;
  branching: ProjectBranching;
  review: ProjectReview;
  active_agents: ProjectAgent[];
  created_at: string;
}

export function validateProject(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return fail([{ field: "root", message: "project must be an object" }]);
  }
  const obj = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  requireString(obj, "id", errors);
  requireString(obj, "name", errors);
  requireString(obj, "slug", errors);
  requireString(obj, "created_at", errors);
  optionalString(obj, "description", errors);
  requireArray(obj, "paths", errors);

  // git
  if (obj.git && typeof obj.git === "object") {
    const git = obj.git as Record<string, unknown>;
    requireString(git, "default_branch", errors);
    // remote can be null
  }

  // branching
  if (obj.branching && typeof obj.branching === "object") {
    const br = obj.branching as Record<string, unknown>;
    requireString(br, "pattern", errors);
    requireString(br, "base", errors);
  }

  // review
  if (obj.review && typeof obj.review === "object") {
    const rev = obj.review as Record<string, unknown>;
    if (typeof rev.max_rounds !== "number") {
      errors.push({ field: "review.max_rounds", message: "max_rounds must be a number" });
    }
    if (typeof rev.require_test_pass !== "boolean") {
      errors.push({ field: "review.require_test_pass", message: "require_test_pass must be a boolean" });
    }
  }

  // active_agents
  if (Array.isArray(obj.active_agents)) {
    for (let i = 0; i < obj.active_agents.length; i++) {
      const agent = obj.active_agents[i] as Record<string, unknown>;
      if (typeof agent?.agent_id !== "string") {
        errors.push({ field: `active_agents[${i}].agent_id`, message: "agent_id must be a string" });
      }
      if (agent && typeof agent.tool !== "undefined" && typeof agent.tool !== "string") {
        errors.push({ field: `active_agents[${i}].tool`, message: "tool must be a string" });
      }
    }
  }

  return errors.length ? fail(errors) : ok();
}

export const DEFAULT_PROJECT: Omit<Project, "id" | "name" | "slug" | "paths" | "created_at"> = {
  description: "",
  git: { remote: null, default_branch: "main" },
  branching: { pattern: "agent/{agent-id}/{task-id}", base: "main" },
  review: { max_rounds: 2, require_test_pass: true },
  active_agents: [],
};
