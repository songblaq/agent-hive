import type { ARAdapter } from "./types.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { codexAdapter } from "./codex.js";
import { copilotAdapter } from "./copilot.js";
import { cursorAdapter } from "./cursor.js";
import { genericAdapter } from "./generic.js";

const adapters: Map<string, ARAdapter> = new Map([
  ["claude-code", claudeCodeAdapter],
  ["claude", claudeCodeAdapter],
  ["codex", codexAdapter],
  ["copilot", copilotAdapter],
  ["cursor", cursorAdapter],
  ["generic", genericAdapter],
]);

export function getAdapter(id: string): ARAdapter {
  const adapter = adapters.get(id);
  if (!adapter) throw new Error(`Unknown runtime adapter: ${id}. Available: ${[...new Set(adapters.values())].map(a => a.id).join(", ")}`);
  return adapter;
}

export function listAdapters(): ARAdapter[] {
  return [...new Set(adapters.values())];
}

export { claudeCodeAdapter, codexAdapter, copilotAdapter, cursorAdapter, genericAdapter };
export type { ARAdapter, ProjectContext, GeneratedFile } from "./types.js";
