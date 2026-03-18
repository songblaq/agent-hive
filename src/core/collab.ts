import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import { COLLAB_DIR, COLLAB_CONFIG_FILE, COLLAB_CHANNELS_DIR, COLLAB_PROFILES_DIR, TASK_THREAD_FILE } from "./constants.js";
import { readYaml } from "./yaml-utils.js";
import type { CollabMessage, CollabMessageType, CollabConfig, CollabChannel } from "../models/collab.js";
import { DEFAULT_COLLAB_CONFIG, COLLAB_MESSAGE_TYPES } from "../models/collab.js";

/** Generate a message ID: msg-YYYYMMDD-HHMMSS-agentid */
function generateMessageId(agentId: string): string {
  const now = new Date();
  const date = now.toISOString().replace(/[-:T]/g, "").slice(0, 8);
  const time = now.toISOString().replace(/[-:T]/g, "").slice(8, 14);
  const safe = agentId.replace(/[^a-z0-9-]/g, "").slice(0, 20);
  return `msg-${date}-${time}-${safe}`;
}

/** Initialize collab directory for a project */
export async function initCollab(projectHubPath: string): Promise<void> {
  const collabDir = join(projectHubPath, COLLAB_DIR);
  const channelsDir = join(collabDir, COLLAB_CHANNELS_DIR);
  const profilesDir = join(collabDir, COLLAB_PROFILES_DIR);

  await mkdir(channelsDir, { recursive: true });
  await mkdir(profilesDir, { recursive: true });

  // Write default config if missing
  const configPath = join(collabDir, COLLAB_CONFIG_FILE);
  if (!existsSync(configPath)) {
    await writeFile(configPath, stringify(DEFAULT_COLLAB_CONFIG, { lineWidth: 0 }), "utf-8");
  }

  // Create default general channel file
  const generalPath = join(channelsDir, "general.jsonl");
  if (!existsSync(generalPath)) {
    await writeFile(generalPath, "", "utf-8");
  }
}

/** Check if collab is initialized */
export function collabExists(projectHubPath: string): boolean {
  return existsSync(join(projectHubPath, COLLAB_DIR, COLLAB_CONFIG_FILE));
}

/** Get collab config */
export async function getCollabConfig(projectHubPath: string): Promise<CollabConfig> {
  const configPath = join(projectHubPath, COLLAB_DIR, COLLAB_CONFIG_FILE);
  if (!existsSync(configPath)) return DEFAULT_COLLAB_CONFIG;
  return readYaml<CollabConfig>(configPath);
}

/** List available channels */
export async function listChannels(projectHubPath: string): Promise<CollabChannel[]> {
  const config = await getCollabConfig(projectHubPath);
  return config.channels;
}

/** Create a new channel */
export async function createChannel(
  projectHubPath: string,
  id: string,
  description: string,
  visibility: string[] | "all" = "all",
): Promise<CollabChannel> {
  const config = await getCollabConfig(projectHubPath);

  // Check duplicate
  if (config.channels.some(ch => ch.id === id)) {
    throw new Error(`Channel "${id}" already exists`);
  }

  const channel: CollabChannel = { id, description, visibility };
  config.channels.push(channel);

  // Write updated config
  const configPath = join(projectHubPath, COLLAB_DIR, COLLAB_CONFIG_FILE);
  await writeFile(configPath, stringify(config, { lineWidth: 0 }), "utf-8");

  // Create channel file
  const channelPath = join(projectHubPath, COLLAB_DIR, COLLAB_CHANNELS_DIR, `${id}.jsonl`);
  if (!existsSync(channelPath)) {
    await writeFile(channelPath, "", "utf-8");
  }

  return channel;
}

/** Post a message to a channel */
export async function postMessage(
  projectHubPath: string,
  channel: string,
  from: string,
  content: string,
  options: {
    type?: CollabMessageType;
    refs?: string[];
    tags?: string[];
    reply_to?: string;
  } = {},
): Promise<CollabMessage> {
  const config = await getCollabConfig(projectHubPath);

  // Validate channel exists
  if (!config.channels.some(ch => ch.id === channel)) {
    throw new Error(`Channel "${channel}" does not exist`);
  }

  // Validate content size
  if (content.length > config.rules.max_message_size) {
    throw new Error(`Message exceeds max size of ${config.rules.max_message_size} characters`);
  }

  // Validate type
  const type = options.type ?? "message";
  if (!COLLAB_MESSAGE_TYPES.includes(type)) {
    throw new Error(`Invalid message type: ${type}`);
  }

  const message: CollabMessage = {
    id: generateMessageId(from),
    ts: new Date().toISOString(),
    from,
    type,
    content,
    refs: options.refs ?? [],
    tags: options.tags ?? [],
    reply_to: options.reply_to ?? null,
  };

  const channelPath = join(projectHubPath, COLLAB_DIR, COLLAB_CHANNELS_DIR, `${channel}.jsonl`);
  await appendFile(channelPath, JSON.stringify(message) + "\n", "utf-8");

  return message;
}

/** Post a message to a task thread */
export async function postTaskThread(
  taskDir: string,
  from: string,
  content: string,
  options: {
    type?: CollabMessageType;
    refs?: string[];
    tags?: string[];
    reply_to?: string;
  } = {},
): Promise<CollabMessage> {
  const type = options.type ?? "message";

  const message: CollabMessage = {
    id: generateMessageId(from),
    ts: new Date().toISOString(),
    from,
    type,
    content,
    refs: options.refs ?? [],
    tags: options.tags ?? [],
    reply_to: options.reply_to ?? null,
  };

  const threadPath = join(taskDir, TASK_THREAD_FILE);
  await appendFile(threadPath, JSON.stringify(message) + "\n", "utf-8");

  return message;
}

/** Read messages from a channel */
export async function readMessages(
  projectHubPath: string,
  channel: string,
  options: {
    limit?: number;
    before?: string;
    after?: string;
    from?: string;
    type?: CollabMessageType;
  } = {},
): Promise<CollabMessage[]> {
  const channelPath = join(projectHubPath, COLLAB_DIR, COLLAB_CHANNELS_DIR, `${channel}.jsonl`);
  if (!existsSync(channelPath)) return [];

  const content = await readFile(channelPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());

  let messages: CollabMessage[] = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  // Apply filters
  if (options.from) {
    messages = messages.filter(m => m.from === options.from);
  }
  if (options.type) {
    messages = messages.filter(m => m.type === options.type);
  }
  if (options.before) {
    const idx = messages.findIndex(m => m.id === options.before);
    if (idx >= 0) messages = messages.slice(0, idx);
  }
  if (options.after) {
    const idx = messages.findIndex(m => m.id === options.after);
    if (idx >= 0) messages = messages.slice(idx + 1);
  }

  // Apply limit (from the end — most recent messages)
  const limit = options.limit ?? 100;
  if (messages.length > limit) {
    messages = messages.slice(-limit);
  }

  return messages;
}

/** Read messages from a task thread */
export async function readTaskThread(
  taskDir: string,
  options: { limit?: number } = {},
): Promise<CollabMessage[]> {
  const threadPath = join(taskDir, TASK_THREAD_FILE);
  if (!existsSync(threadPath)) return [];

  const content = await readFile(threadPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());

  const messages: CollabMessage[] = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  const limit = options.limit ?? 100;
  if (messages.length > limit) {
    return messages.slice(-limit);
  }

  return messages;
}

/** Count messages in a JSONL file by counting non-empty lines */
async function countMessages(filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0;
  const content = await readFile(filePath, "utf-8");
  return content.trim() ? content.trim().split("\n").length : 0;
}

/** Get the last message in a JSONL file by reading only the last line */
async function getLastMessage(filePath: string): Promise<CollabMessage | null> {
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);
  if (!lines.length) return null;
  try { return JSON.parse(lines[lines.length - 1]); } catch { return null; }
}

/** List all channels with message counts */
export async function listChannelsWithStats(
  projectHubPath: string,
): Promise<Array<CollabChannel & { messageCount: number; lastMessage?: CollabMessage }>> {
  const config = await getCollabConfig(projectHubPath);
  const results: Array<CollabChannel & { messageCount: number; lastMessage?: CollabMessage }> = [];

  for (const channel of config.channels) {
    const filePath = join(projectHubPath, COLLAB_DIR, COLLAB_CHANNELS_DIR, `${channel.id}.jsonl`);
    const messageCount = await countMessages(filePath);
    const lastMessage = await getLastMessage(filePath) ?? undefined;
    results.push({ ...channel, messageCount, lastMessage });
  }

  return results;
}
