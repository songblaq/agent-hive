import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { TASKS_DIR, TASK_YAML, BACKLOG_FILE } from "./constants.js";
import { readYaml } from "./yaml-utils.js";
import type { Task, TaskStatus } from "../models/task.js";
import type { Project } from "../models/project.js";

interface BacklogEntry {
  id: string;
  title: string;
  priority: string;
  owner: string | null;
  status: TaskStatus;
}

/**
 * Regenerate BACKLOG.md from all task.yaml files in the project hub.
 * Reads project name from project.yaml if not provided.
 */
export async function regenerateBacklog(
  hubProjectPath: string,
  projectName?: string,
): Promise<void> {
  if (!projectName) {
    const projectYaml = join(hubProjectPath, "project.yaml");
    if (existsSync(projectYaml)) {
      try {
        const project = await readYaml<Project>(projectYaml);
        projectName = project.name;
      } catch {
        // Fall through to default
      }
    }
  }
  const tasksDir = join(hubProjectPath, TASKS_DIR);
  const entries: BacklogEntry[] = [];

  const items = await readdir(tasksDir, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory() || !item.name.startsWith("TASK-")) continue;
    try {
      const task = await readYaml<Task>(join(tasksDir, item.name, TASK_YAML));
      entries.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        owner: task.owner,
        status: task.status,
      });
    } catch {
      // Skip invalid task dirs
    }
  }

  // Sort by ID number
  entries.sort((a, b) => {
    const na = parseInt(a.id.replace("TASK-", ""), 10);
    const nb = parseInt(b.id.replace("TASK-", ""), 10);
    return na - nb;
  });

  const sections: Record<string, BacklogEntry[]> = {
    Backlog: entries.filter((e) => e.status === "backlog"),
    Ready: entries.filter((e) => e.status === "ready"),
    Doing: entries.filter((e) => e.status === "doing"),
    Review: entries.filter((e) => e.status === "review"),
    Done: entries.filter((e) => e.status === "done"),
  };

  // Also include blocked tasks in a separate section if any
  const blocked = entries.filter((e) => e.status === "blocked");

  let md = `# Task Index — ${projectName ?? "Project"}\n`;

  for (const [section, items] of Object.entries(sections)) {
    md += `\n## ${section}\n`;
    for (const item of items) {
      const ownerStr = item.owner ? `@${item.owner}` : "unassigned";
      const suffix = section === "Review" && item.owner ? ` → awaiting reviewer` : "";
      md += `- ${item.id} | ${item.title} | ${item.priority} | ${ownerStr}${suffix}\n`;
    }
  }

  if (blocked.length > 0) {
    md += `\n## Blocked\n`;
    for (const item of blocked) {
      const ownerStr = item.owner ? `@${item.owner}` : "unassigned";
      md += `- ${item.id} | ${item.title} | ${item.priority} | ${ownerStr}\n`;
    }
  }

  await writeFile(join(tasksDir, BACKLOG_FILE), md, "utf-8");
}
