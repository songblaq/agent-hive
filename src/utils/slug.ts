import { dirname, basename, resolve } from "node:path";
import { SLUG_SEPARATOR } from "../core/constants.js";

/**
 * Generate a hub-compatible slug from an absolute project path.
 *
 * Rules (from spec):
 * 1. Take the parent directory of the project (not the project dir itself)
 * 2. Remove leading /
 * 3. Replace each / with --
 * 4. Preserve all other characters as-is (including _)
 * 5. Remove trailing / if any
 *
 * @example
 * slugFromPath("/Users/alice/projects/my-app")
 * // => { parentSlug: "Users--alice--projects", projectName: "agent-hive" }
 */
export function slugFromPath(absolutePath: string): {
  parentSlug: string;
  projectName: string;
  fullSlug: string;
} {
  const resolved = resolve(absolutePath);
  const parent = dirname(resolved);
  const projectName = basename(resolved);

  // Remove leading /
  const stripped = parent.startsWith("/") ? parent.slice(1) : parent;

  // Replace / with --
  const parentSlug = stripped.replace(/\//g, SLUG_SEPARATOR);

  return {
    parentSlug,
    projectName,
    fullSlug: `${parentSlug}/${projectName}`,
  };
}
