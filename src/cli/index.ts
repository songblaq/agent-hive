import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { projectCommand } from "./commands/project.js";
import { taskCommand } from "./commands/task.js";
import { statusCommand } from "./commands/status.js";
import { setupCommand } from "./commands/setup.js";
import { webCommand } from "./commands/web.js";
import { collabCommand } from "./commands/collab.js";
import { harnessCommand } from "./commands/harness.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command();

program
  .name("agenthive")
  .description("File-based multi-agent collaboration protocol and CLI")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(projectCommand);
program.addCommand(taskCommand);
program.addCommand(statusCommand);
program.addCommand(setupCommand);
program.addCommand(webCommand);
program.addCommand(collabCommand);
program.addCommand(harnessCommand);
program.addCommand(syncCommand);

program.parse();
