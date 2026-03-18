import type { ValidationResult } from "../core/yaml-utils.js";
import type { AgentRole } from "./task.js";
import { ok, fail, requireString } from "../core/yaml-utils.js";

export interface Lock {
  task: string;
  agent: string;
  role: AgentRole;
  claimed_at: string;
  lease_until: string;
}

export function validateLock(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return fail([{ field: "root", message: "lock must be an object" }]);
  }
  const obj = data as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];

  requireString(obj, "task", errors);
  requireString(obj, "agent", errors);
  requireString(obj, "role", errors);
  requireString(obj, "claimed_at", errors);
  requireString(obj, "lease_until", errors);

  return errors.length ? fail(errors) : ok();
}
