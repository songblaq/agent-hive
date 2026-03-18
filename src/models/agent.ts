import type { ValidationResult, ValidationError } from "../core/yaml-utils.js";
import type { AgentRole } from "./task.js";
import { ok, fail, requireString, requireArray } from "../core/yaml-utils.js";

export interface AgentConfigFiles {
  instructions: string;
  skills_dir?: string;
}

export interface AgentProfile {
  agent_id: string;
  tool: string;
  type: string;
  capabilities: string[];
  limitations: string[];
  preferred_roles: AgentRole[];
  config_files: AgentConfigFiles;
}

export function validateAgentProfile(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return fail([{ field: "root", message: "agent profile must be an object" }]);
  }
  const obj = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  requireString(obj, "agent_id", errors);
  requireString(obj, "tool", errors);
  requireString(obj, "type", errors);
  requireArray(obj, "capabilities", errors);
  requireArray(obj, "limitations", errors);
  requireArray(obj, "preferred_roles", errors);

  if (obj.config_files && typeof obj.config_files === "object") {
    const cf = obj.config_files as Record<string, unknown>;
    requireString(cf, "instructions", errors);
  }

  return errors.length ? fail(errors) : ok();
}
