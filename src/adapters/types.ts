/**
 * AR (Agent-Runtime) Adapter Interface
 * Translates AgentHive protocol + harness into runtime-specific files
 */

import type { ResolvedHarness } from "../models/harness.js";

export interface ProjectContext {
  projectName: string;
  projectDescription: string;
  hubPath: string;
  slug: string;
  hubProjectPath: string;
  repoPath: string;
  hasCollab: boolean;
  hasHarness: boolean;
  hasSync: boolean;
}

export interface GeneratedFile {
  path: string;
  filename: string;
  content: string;
}

export interface ARAdapter {
  readonly id: string;
  readonly name: string;
  readonly instructionFile: string;
  generateInstructions(ctx: ProjectContext, harness?: ResolvedHarness): GeneratedFile;
}
