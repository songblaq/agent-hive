/**
 * Harness — Shared conventions, prompts, skills, and knowledge layer
 * Portable across runtimes (Claude Code, Codex, Cursor, etc.)
 */

export interface HarnessFile {
  path: string;
  name: string;
  content: string;
}

export interface HarnessManifest {
  version: string;
  name: string;
  description: string;
  extends: string[];
  conventions: string[];
  prompts: Record<string, string>;
  skills: string[];
  knowledge: string[];
  inject_into: Record<string, boolean>;
}

export interface ResolvedHarness {
  conventions: HarnessFile[];
  prompts: Record<string, HarnessFile>;
  skills: HarnessFile[];
  knowledge: HarnessFile[];
  manifest: HarnessManifest;
}

export const DEFAULT_HARNESS_MANIFEST: HarnessManifest = {
  version: "1.0",
  name: "",
  description: "",
  extends: [],
  conventions: [],
  prompts: {},
  skills: [],
  knowledge: [],
  inject_into: {
    claude: true,
    codex: true,
    cursor: true,
    copilot: true,
  },
};
