import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { readYaml, writeYaml } from "./yaml-utils.js";
import { SYNC_DIR, SYNC_CONFIG_FILE, SYNC_ISSUE_MAP_FILE, SYNC_PR_MAP_FILE } from "./constants.js";
import { createTask } from "./task-manager.js";
import type { SyncConfig, SyncState, IssueMapping, PRMapping } from "../models/sync.js";
import { DEFAULT_SYNC_CONFIG } from "../models/sync.js";

function syncDir(projectHubPath: string): string {
  return join(projectHubPath, SYNC_DIR);
}

function syncConfigPath(projectHubPath: string): string {
  return join(syncDir(projectHubPath), SYNC_CONFIG_FILE);
}

function issueMapPath(projectHubPath: string): string {
  return join(syncDir(projectHubPath), SYNC_ISSUE_MAP_FILE);
}

function prMapPath(projectHubPath: string): string {
  return join(syncDir(projectHubPath), SYNC_PR_MAP_FILE);
}

function runGh(args: string): string {
  try {
    return execSync(`gh ${args}`, { encoding: "utf-8", timeout: 30000 });
  } catch (err) {
    throw new Error(`GitHub CLI failed: ${(err as Error).message}`);
  }
}

function detectGitRepo(projectPath?: string): string | null {
  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf-8",
      cwd: projectPath,
      timeout: 5000,
    }).trim();
    // Parse github.com/owner/repo from URL
    const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    return match ? match[1].replace(/\.git$/, "") : null;
  } catch {
    return null;
  }
}

export async function initSync(projectHubPath: string, repo?: string): Promise<SyncConfig> {
  const dir = syncDir(projectHubPath);
  await mkdir(dir, { recursive: true });

  const resolvedRepo = repo ?? detectGitRepo(projectHubPath) ?? "";

  const config: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    repo: resolvedRepo,
  };

  await writeYaml(syncConfigPath(projectHubPath), config);

  // Initialize empty maps if they don't exist
  if (!existsSync(issueMapPath(projectHubPath))) {
    await writeYaml(issueMapPath(projectHubPath), { mappings: [] });
  }
  if (!existsSync(prMapPath(projectHubPath))) {
    await writeYaml(prMapPath(projectHubPath), { mappings: [] });
  }

  return config;
}

export function syncExists(projectHubPath: string): boolean {
  return existsSync(syncConfigPath(projectHubPath));
}

export async function getSyncConfig(projectHubPath: string): Promise<SyncConfig> {
  return readYaml<SyncConfig>(syncConfigPath(projectHubPath));
}

export interface ImportIssuesOptions {
  limit?: number;
  state?: "open" | "closed" | "all";
}

interface GhIssue {
  number: number;
  title: string;
  url: string;
  labels: Array<{ name: string }>;
  state: string;
}

interface IssueMappingFile {
  mappings: IssueMapping[];
}

export async function importIssues(
  projectHubPath: string,
  options?: ImportIssuesOptions,
): Promise<IssueMapping[]> {
  const config = await getSyncConfig(projectHubPath);

  if (!config.repo) {
    throw new Error("GitHub repo not configured. Run initSync with a repo or set repo in github.yaml.");
  }

  // Verify gh CLI is available
  try {
    execSync("gh --version", { encoding: "utf-8", timeout: 5000 });
  } catch {
    throw new Error("GitHub CLI (gh) is not available. Install it from https://cli.github.com/");
  }

  const state = options?.state ?? config.import.issues.filter.state ?? "open";
  const limit = options?.limit ?? 100;

  const raw = runGh(
    `issue list --repo ${config.repo} --json number,title,url,labels,state --state ${state} --limit ${limit}`,
  );

  const issues: GhIssue[] = JSON.parse(raw);

  // Load existing mappings
  let existing: IssueMapping[] = [];
  if (existsSync(issueMapPath(projectHubPath))) {
    const file = await readYaml<IssueMappingFile>(issueMapPath(projectHubPath));
    existing = file.mappings ?? [];
  }

  const existingNumbers = new Set(existing.map((m) => m.issue_number));

  const excludeLabels = new Set(config.import.issues.filter.exclude_labels ?? []);
  const requireLabels = config.import.issues.filter.labels ?? [];

  const newMappings: IssueMapping[] = [];

  for (const issue of issues) {
    if (existingNumbers.has(issue.number)) continue;

    const issueLabels = issue.labels.map((l) => l.name);

    // Skip if any exclude label matches
    if (issueLabels.some((l) => excludeLabels.has(l))) continue;

    // Skip if require labels specified and none match
    if (requireLabels.length > 0 && !requireLabels.some((l) => issueLabels.includes(l))) continue;

    // Create task
    const result = await createTask(projectHubPath, {
      title: issue.title,
      category: "github-issue",
      createdBy: "github-sync",
    });

    const mapping: IssueMapping = {
      issue_number: issue.number,
      task_id: result.id,
      repo: config.repo,
      issue_url: issue.url,
      issue_title: issue.title,
      synced_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      direction: "import",
    };

    newMappings.push(mapping);
    existing.push(mapping);
  }

  // Persist updated mappings
  await writeYaml(issueMapPath(projectHubPath), { mappings: existing });

  return newMappings;
}

export async function getIssueMappings(projectHubPath: string): Promise<IssueMapping[]> {
  if (!existsSync(issueMapPath(projectHubPath))) return [];
  const file = await readYaml<IssueMappingFile>(issueMapPath(projectHubPath));
  return file.mappings ?? [];
}

interface PRMappingFile {
  mappings: PRMapping[];
}

export async function getPRMappings(projectHubPath: string): Promise<PRMapping[]> {
  if (!existsSync(prMapPath(projectHubPath))) return [];
  const file = await readYaml<PRMappingFile>(prMapPath(projectHubPath));
  return file.mappings ?? [];
}

export async function getSyncStatus(projectHubPath: string): Promise<SyncState> {
  const config = await getSyncConfig(projectHubPath);
  const issue_mappings = await getIssueMappings(projectHubPath);
  const pr_mappings = await getPRMappings(projectHubPath);

  // Derive last_sync from most recent synced_at across all mappings
  const allDates = [
    ...issue_mappings.map((m) => m.synced_at),
    ...pr_mappings.map((m) => m.synced_at),
  ].sort();
  const last_sync = allDates.length > 0 ? allDates[allDates.length - 1] : null;

  return { config, issue_mappings, pr_mappings, last_sync };
}
