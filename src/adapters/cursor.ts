import type { ARAdapter, ProjectContext, GeneratedFile } from "./types.js";
import type { ResolvedHarness } from "../models/harness.js";
import { join } from "node:path";

export const cursorAdapter: ARAdapter = {
  id: "cursor",
  name: "Cursor",
  instructionFile: ".cursor/rules/agenthive.mdc",

  generateInstructions(ctx: ProjectContext, harness?: ResolvedHarness): GeneratedFile {
    let content = `---\ndescription: AgentHive project conventions\nglobs: **/*\nalwaysApply: true\n---\n\n`;
    content += `# AgentHive Project: ${ctx.projectName}\n\n`;
    content += `Hub: ${ctx.hubPath}\n`;
    content += `Project: ${ctx.hubProjectPath}\n\n`;
    content += `## Workflow\n\n`;
    content += `Check BACKLOG.md for tasks. Claim before working. Plan before coding.\n\n`;

    if (harness && harness.conventions.length > 0) {
      content += `## Conventions\n\n`;
      for (const conv of harness.conventions) {
        content += `### ${conv.name}\n\n${conv.content}\n\n`;
      }
    }

    return { path: join(ctx.repoPath, ".cursor", "rules"), filename: "agenthive.mdc", content };
  },
};
