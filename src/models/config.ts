import type { ValidationResult } from "../core/yaml-utils.js";
import { ok, fail, requireString } from "../core/yaml-utils.js";

export interface HubConfig {
  version: string;
  display_language: string;
  hub_path: string;
  internal_language: string;
}

export function validateConfig(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return fail([{ field: "root", message: "config must be an object" }]);
  }
  const obj = data as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  requireString(obj, "version", errors);
  requireString(obj, "display_language", errors);
  requireString(obj, "hub_path", errors);
  requireString(obj, "internal_language", errors);
  return errors.length ? fail(errors) : ok();
}

export const DEFAULT_CONFIG: HubConfig = {
  version: "1.0",
  display_language: "en",
  hub_path: "~/.agenthive",
  internal_language: "en",
};
