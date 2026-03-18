import { Command } from "commander";
import { createInterface } from "node:readline";
import { initHub } from "../../core/hub.js";

async function promptLanguage(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Display language (en/ko/ja) [en]: ", (answer) => {
      rl.close();
      resolve(answer.trim() || "en");
    });
  });
}

export const initCommand = new Command("init")
  .description("Initialize the AgentHive hub (~/.agenthive/)")
  .option("-l, --lang <language>", "Display language (e.g., ko, en, ja)")
  .option("--hub-path <path>", "Custom hub path (default: ~/.agenthive)")
  .option("--collab-only", "Initialize with Collab only (no task management)")
  .action(async (options) => {
    const lang = options.lang ?? await promptLanguage();

    const result = await initHub({
      hubPath: options.hubPath,
      displayLanguage: lang,
      collabOnly: options.collabOnly,
    });

    if (result.created) {
      console.log(`✓ ${result.message}`);
      if (options.collabOnly) {
        console.log(`  config.yaml, registry.yaml, PROTOCOL.md created (Collab-only mode)`);
      } else {
        console.log(`  config.yaml, registry.yaml, PROTOCOL.md created`);
      }
      console.log(`\nNext: agenthive project add <path>`);
    } else {
      console.log(`ℹ ${result.message}`);
    }
  });
