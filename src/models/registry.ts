import type { ValidationResult, ValidationError } from "../core/yaml-utils.js";
import { ok, fail, requireString, requireArray, optionalString } from "../core/yaml-utils.js";

export interface RegistryEntry {
  slug: string;
  name: string;
  path: string;
  alt_paths?: string[];
  git_remote?: string | null;
  active: boolean;
  created_at: string;
}

export interface Registry {
  version: string;
  projects: RegistryEntry[];
}

export function validateRegistryEntry(data: unknown, index: number): ValidationError[] {
  if (!data || typeof data !== "object") {
    return [{ field: `projects[${index}]`, message: "entry must be an object" }];
  }
  const obj = data as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const prefix = `projects[${index}].`;

  requireString(obj, "slug", errors);
  requireString(obj, "name", errors);
  requireString(obj, "path", errors);
  requireString(obj, "created_at", errors);

  if (typeof obj.active !== "boolean") {
    errors.push({ field: `${prefix}active`, message: "active must be a boolean" });
  }

  optionalString(obj, "git_remote", errors);

  if (obj.alt_paths !== undefined && !Array.isArray(obj.alt_paths)) {
    errors.push({ field: `${prefix}alt_paths`, message: "alt_paths must be an array" });
  }

  return errors.map((e) => ({ ...e, field: e.field.startsWith("projects") ? e.field : `${prefix}${e.field}` }));
}

export function validateRegistry(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return fail([{ field: "root", message: "registry must be an object" }]);
  }
  const obj = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  requireString(obj, "version", errors);
  requireArray(obj, "projects", errors);

  if (Array.isArray(obj.projects)) {
    for (let i = 0; i < obj.projects.length; i++) {
      errors.push(...validateRegistryEntry(obj.projects[i], i));
    }
  }

  return errors.length ? fail(errors) : ok();
}

export const DEFAULT_REGISTRY: Registry = {
  version: "1.0",
  projects: [],
};
