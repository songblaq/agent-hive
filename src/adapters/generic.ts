import type { ARAdapter, ProjectContext, GeneratedFile } from "./types.js";
import type { ResolvedHarness } from "../models/harness.js";

export const genericAdapter: ARAdapter = {
  id: "generic",
  name: "Generic",
  instructionFile: "AGENTHIVE.md",

  generateInstructions(ctx: ProjectContext, harness?: ResolvedHarness): GeneratedFile {
    let content = `# AgentHive Instructions\n\n`;
    content += `Project: ${ctx.projectName}\n`;
    content += `Hub: ${ctx.hubPath}\n`;
    content += `Protocol: ${ctx.hubPath}/PROTOCOL.md\n\n`;
    content += `## Quick Start\n\n`;
    content += `1. Read the protocol\n`;
    content += `2. Check ${ctx.hubProjectPath}/tasks/BACKLOG.md\n`;
    content += `3. Claim a task, plan, build, get reviewed\n\n`;

    if (harness && harness.conventions.length > 0) {
      content += `## Conventions\n\n`;
      for (const conv of harness.conventions) {
        content += `- ${conv.name}\n`;
      }
      content += `\n`;
    }

    return { path: ctx.repoPath, filename: "AGENTHIVE.md", content };
  },
};
