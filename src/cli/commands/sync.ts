import { Command } from "commander";
import { initSync, importIssues, getSyncStatus, getSyncConfig } from "../../core/sync.js";
import { resolveProjectPath } from "../utils.js";

export const syncCommand = new Command("sync")
  .description("GitHub issue/PR synchronization");

// agenthive sync init
syncCommand
  .command("init")
  .description("Initialize GitHub Sync for a project")
  .option("-p, --project <slug>", "Project slug")
  .option("-r, --repo <owner/repo>", "GitHub repository (e.g., owner/repo)")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath, slug } = await resolveProjectPath(options.project, options.hubPath);
    await initSync(projectHubPath, options.repo);
    const config = await getSyncConfig(projectHubPath);
    console.log(`✓ GitHub Sync initialized for: ${slug}`);
    if (config.repo) console.log(`  Repository: ${config.repo}`);
    else console.log(`  ⚠ No repo detected. Edit sync/github.yaml to set repo.`);
  });

// agenthive sync import
syncCommand
  .command("import")
  .description("Import GitHub issues as task cards")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    try {
      const mappings = await importIssues(projectHubPath);
      if (!mappings.length) {
        console.log("No new issues to import.");
      } else {
        console.log(`✓ Imported ${mappings.length} issues:`);
        for (const m of mappings) {
          console.log(`  #${m.issue_number} → ${m.task_id}: ${m.issue_title}`);
        }
      }
    } catch (err) {
      console.error(`Import failed: ${(err as Error).message}`);
      console.log("Make sure 'gh' CLI is installed and authenticated (gh auth login).");
    }
  });

// agenthive sync status
syncCommand
  .command("status")
  .description("Show sync status and mappings")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    try {
      const status = await getSyncStatus(projectHubPath);
      console.log(`\nGitHub Sync Status`);
      console.log(`  Repo: ${status.config.repo || "(not set)"}`);
      console.log(`  Mode: ${status.config.sync_mode}`);
      console.log(`  Last sync: ${status.last_sync || "never"}`);
      console.log(`\n  Issues mapped: ${status.issue_mappings.length}`);
      for (const m of status.issue_mappings.slice(-10)) {
        console.log(`    #${m.issue_number} → ${m.task_id} (${m.direction})`);
      }
      console.log(`\n  PRs mapped: ${status.pr_mappings.length}`);
      for (const m of status.pr_mappings.slice(-10)) {
        console.log(`    PR#${m.pr_number} → ${m.task_id} [${m.status}]`);
      }
      console.log("");
    } catch (err) {
      console.error(`Status check failed: ${(err as Error).message}`);
    }
  });
