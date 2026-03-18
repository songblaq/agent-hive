import { join } from "node:path";
import { DEFAULT_HUB_PATH, PROJECTS_DIR } from "../core/constants.js";
import { listProjects } from "../core/registry.js";

export async function resolveProjectPath(
  slug?: string,
  hubPath?: string,
): Promise<{ projectHubPath: string; slug: string }> {
  const hub = hubPath ?? DEFAULT_HUB_PATH;
  if (slug) {
    return { projectHubPath: join(hub, PROJECTS_DIR, slug), slug };
  }
  const projects = await listProjects(hub);
  if (!projects.length) throw new Error("No projects registered. Use: agenthive project add <path>");
  return { projectHubPath: join(hub, PROJECTS_DIR, projects[0].slug), slug: projects[0].slug };
}
