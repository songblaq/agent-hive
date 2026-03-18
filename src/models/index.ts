// Hub data models — TASK-002
export type { HubConfig } from "./config.js";
export { validateConfig, DEFAULT_CONFIG } from "./config.js";

export type { Registry, RegistryEntry } from "./registry.js";
export { validateRegistry, DEFAULT_REGISTRY } from "./registry.js";

export type {
  Project,
  ProjectGit,
  ProjectBranching,
  ProjectReview,
  ProjectAgent,
} from "./project.js";
export { validateProject, DEFAULT_PROJECT } from "./project.js";

export type {
  Task,
  TaskStatus,
  WorkflowMode,
  AgentRole,
  TaskPriority,
  TaskScope,
  TaskHandoff,
} from "./task.js";
export {
  validateTask,
  TASK_STATUSES,
  WORKFLOW_MODES,
  AGENT_ROLES,
} from "./task.js";

export type { Lock } from "./lock.js";
export { validateLock } from "./lock.js";

export type { AgentProfile, AgentConfigFiles } from "./agent.js";
export { validateAgentProfile } from "./agent.js";
