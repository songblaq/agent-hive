import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { stringify } from "yaml";
import {
  HARNESS_DIR,
  HARNESS_MANIFEST_FILE,
  HARNESS_CONVENTIONS_DIR,
  HARNESS_PROMPTS_DIR,
  HARNESS_SKILLS_DIR,
  HARNESS_KNOWLEDGE_DIR,
} from "./constants.js";
import { readYaml } from "./yaml-utils.js";
import type { HarnessFile, HarnessManifest, ResolvedHarness } from "../models/harness.js";
import { DEFAULT_HARNESS_MANIFEST } from "../models/harness.js";

const GLOBAL_HARNESS_PATH = join(homedir(), ".agenthive");

/** Initialize harness directory for a project */
export async function initHarness(projectHubPath: string): Promise<void> {
  const harnessDir = join(projectHubPath, HARNESS_DIR);

  await mkdir(join(harnessDir, HARNESS_CONVENTIONS_DIR), { recursive: true });
  await mkdir(join(harnessDir, HARNESS_PROMPTS_DIR), { recursive: true });
  await mkdir(join(harnessDir, HARNESS_SKILLS_DIR), { recursive: true });
  await mkdir(join(harnessDir, HARNESS_KNOWLEDGE_DIR), { recursive: true });

  const manifestPath = join(harnessDir, HARNESS_MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    await writeFile(manifestPath, stringify(DEFAULT_HARNESS_MANIFEST, { lineWidth: 0 }), "utf-8");
  }
}

/** Check if harness is initialized */
export function harnessExists(projectHubPath: string): boolean {
  return existsSync(join(projectHubPath, HARNESS_DIR, HARNESS_MANIFEST_FILE));
}

/** Get harness manifest */
export async function getHarnessManifest(projectHubPath: string): Promise<HarnessManifest> {
  const manifestPath = join(projectHubPath, HARNESS_DIR, HARNESS_MANIFEST_FILE);
  if (!existsSync(manifestPath)) return { ...DEFAULT_HARNESS_MANIFEST };
  return readYaml<HarnessManifest>(manifestPath);
}

/** Read files listed in manifest (relative paths from baseDir) */
async function readHarnessFiles(baseDir: string, relativePaths: string[]): Promise<HarnessFile[]> {
  const results: HarnessFile[] = [];
  for (const relPath of relativePaths) {
    const filePath = join(baseDir, relPath);
    if (!existsSync(filePath)) continue;
    try {
      const content = await readFile(filePath, "utf-8");
      results.push({ path: filePath, name: basename(relPath), content });
    } catch {
      // Skip unreadable files
    }
  }
  return results;
}

/** Read prompt files listed in manifest (returns Record<key, HarnessFile>) */
async function readHarnessPrompts(
  baseDir: string,
  prompts: Record<string, string>,
): Promise<Record<string, HarnessFile>> {
  const results: Record<string, HarnessFile> = {};
  for (const [key, relPath] of Object.entries(prompts)) {
    const filePath = join(baseDir, relPath);
    if (!existsSync(filePath)) continue;
    try {
      const content = await readFile(filePath, "utf-8");
      results[key] = { path: filePath, name: basename(relPath), content };
    } catch {
      // Skip unreadable files
    }
  }
  return results;
}

/**
 * Resolve harness by merging global (~/.agenthive/harness/) and project harness.
 * Project files override global files with the same name.
 */
export async function resolveHarness(
  projectHubPath: string,
  globalHubPath?: string,
): Promise<ResolvedHarness> {
  const globalHub = globalHubPath ?? GLOBAL_HARNESS_PATH;
  const globalHarnessDir = join(globalHub, HARNESS_DIR);
  const projectHarnessDir = join(projectHubPath, HARNESS_DIR);

  // Read global harness if it exists
  let globalManifest: HarnessManifest = { ...DEFAULT_HARNESS_MANIFEST };
  let globalConventions: HarnessFile[] = [];
  let globalPrompts: Record<string, HarnessFile> = {};
  let globalSkills: HarnessFile[] = [];
  let globalKnowledge: HarnessFile[] = [];

  if (existsSync(join(globalHarnessDir, HARNESS_MANIFEST_FILE))) {
    globalManifest = await readYaml<HarnessManifest>(join(globalHarnessDir, HARNESS_MANIFEST_FILE));
    globalConventions = await readHarnessFiles(globalHarnessDir, globalManifest.conventions);
    globalPrompts = await readHarnessPrompts(globalHarnessDir, globalManifest.prompts);
    globalSkills = await readHarnessFiles(globalHarnessDir, globalManifest.skills);
    globalKnowledge = await readHarnessFiles(globalHarnessDir, globalManifest.knowledge);
  }

  // Read project harness
  let projectManifest: HarnessManifest = { ...DEFAULT_HARNESS_MANIFEST };
  let projectConventions: HarnessFile[] = [];
  let projectPrompts: Record<string, HarnessFile> = {};
  let projectSkills: HarnessFile[] = [];
  let projectKnowledge: HarnessFile[] = [];

  if (existsSync(join(projectHarnessDir, HARNESS_MANIFEST_FILE))) {
    projectManifest = await readYaml<HarnessManifest>(join(projectHarnessDir, HARNESS_MANIFEST_FILE));
    projectConventions = await readHarnessFiles(projectHarnessDir, projectManifest.conventions);
    projectPrompts = await readHarnessPrompts(projectHarnessDir, projectManifest.prompts);
    projectSkills = await readHarnessFiles(projectHarnessDir, projectManifest.skills);
    projectKnowledge = await readHarnessFiles(projectHarnessDir, projectManifest.knowledge);
  }

  // Merge: project files with same name override global files
  const mergeFiles = (global: HarnessFile[], project: HarnessFile[]): HarnessFile[] => {
    const projectNames = new Set(project.map(f => f.name));
    const filtered = global.filter(f => !projectNames.has(f.name));
    return [...filtered, ...project];
  };

  const conventions = mergeFiles(globalConventions, projectConventions);
  const skills = mergeFiles(globalSkills, projectSkills);
  const knowledge = mergeFiles(globalKnowledge, projectKnowledge);
  const prompts: Record<string, HarnessFile> = { ...globalPrompts, ...projectPrompts };

  // Merged manifest uses project manifest as base
  const manifest: HarnessManifest = {
    ...globalManifest,
    ...projectManifest,
    inject_into: { ...globalManifest.inject_into, ...projectManifest.inject_into },
  };

  return { conventions, prompts, skills, knowledge, manifest };
}

/** List convention files in project harness */
export async function listConventions(projectHubPath: string): Promise<HarnessFile[]> {
  const dir = join(projectHubPath, HARNESS_DIR, HARNESS_CONVENTIONS_DIR);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir);
    const results: HarnessFile[] = [];
    for (const entry of entries) {
      const filePath = join(dir, entry);
      const content = await readFile(filePath, "utf-8");
      results.push({ path: filePath, name: entry, content });
    }
    return results;
  } catch {
    return [];
  }
}

/** List prompt files in project harness */
export async function listPrompts(projectHubPath: string): Promise<HarnessFile[]> {
  const dir = join(projectHubPath, HARNESS_DIR, HARNESS_PROMPTS_DIR);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir);
    const results: HarnessFile[] = [];
    for (const entry of entries) {
      const filePath = join(dir, entry);
      const content = await readFile(filePath, "utf-8");
      results.push({ path: filePath, name: entry, content });
    }
    return results;
  } catch {
    return [];
  }
}

/** List skill files in project harness */
export async function listSkills(projectHubPath: string): Promise<HarnessFile[]> {
  const dir = join(projectHubPath, HARNESS_DIR, HARNESS_SKILLS_DIR);
  if (!existsSync(dir)) return [];
  try {
    const entries = await readdir(dir);
    const results: HarnessFile[] = [];
    for (const entry of entries) {
      const filePath = join(dir, entry);
      const content = await readFile(filePath, "utf-8");
      results.push({ path: filePath, name: entry, content });
    }
    return results;
  } catch {
    return [];
  }
}
