import { Command } from "commander";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { DEFAULT_HUB_PATH } from "../../core/constants.js";
import {
  initHarness,
  harnessExists,
  resolveHarness,
  getHarnessManifest,
} from "../../core/harness.js";
import { resolveProjectPath } from "../utils.js";

export const harnessCommand = new Command("harness")
  .description("Manage project conventions, prompts, skills, and knowledge");

// agenthive harness init
harnessCommand
  .command("init")
  .description("Initialize Harness for a project")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath, slug } = await resolveProjectPath(options.project, options.hubPath);
    await initHarness(projectHubPath);
    console.log(`✓ Harness initialized for project: ${slug}`);
    console.log(`  Created: harness.yaml, conventions/, prompts/, skills/, knowledge/`);
  });

// agenthive harness show
harnessCommand
  .command("show")
  .description("Show resolved harness (global + project merged)")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const hub = options.hubPath ?? DEFAULT_HUB_PATH;
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    const resolved = await resolveHarness(projectHubPath, hub);

    console.log(`\nHarness: ${resolved.manifest.name || "(unnamed)"}`);
    if (resolved.manifest.description) console.log(`  ${resolved.manifest.description}`);
    console.log(`\nConventions (${resolved.conventions.length}):`);
    for (const c of resolved.conventions) console.log(`  - ${c.name}`);
    console.log(`\nPrompts (${Object.keys(resolved.prompts).length}):`);
    for (const [key] of Object.entries(resolved.prompts)) console.log(`  - ${key}`);
    console.log(`\nSkills (${resolved.skills.length}):`);
    for (const s of resolved.skills) console.log(`  - ${s.name}`);
    console.log(`\nKnowledge (${resolved.knowledge.length}):`);
    for (const k of resolved.knowledge) console.log(`  - ${k.name}`);
    console.log(`\nInject into:`);
    for (const [rt, enabled] of Object.entries(resolved.manifest.inject_into)) {
      console.log(`  ${enabled ? "✓" : "✗"} ${rt}`);
    }
    console.log("");
  });

// agenthive harness export
harnessCommand
  .command("export")
  .description("Export project harness as tarball")
  .option("-p, --project <slug>", "Project slug")
  .option("-o, --output <path>", "Output file path")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath, slug } = await resolveProjectPath(options.project, options.hubPath);
    if (!harnessExists(projectHubPath)) {
      console.log("No harness found. Run: agenthive harness init");
      return;
    }
    const harnessDir = join(projectHubPath, "harness");
    const output = options.output || `harness-${slug.split("/").pop()}.tar.gz`;
    try {
      execSync(`tar -czf "${output}" -C "${harnessDir}" .`, { encoding: "utf-8" });
      console.log(`✓ Harness exported to: ${output}`);
    } catch (err) {
      console.error(`Failed to export: ${(err as Error).message}`);
    }
  });
