/**
 * Khala Adapter for AgentHive Collab
 *
 * AgentHive의 Collab 시스템이 Khala를 백엔드로 사용하도록 하는 어댑터.
 * 기존 Collab API(postMessage, readMessages 등)를 유지하면서
 * 실제 저장소를 Khala 채널로 라우팅한다.
 *
 * 채널 매핑: collab/{project-slug}/{channel}.jsonl
 * 위치: ~/.aria/khala/channels/collab/
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { CollabMessage, CollabMessageType } from "../models/collab.js";

// === Khala 경로 ===
const KHALA_ROOT = join(homedir(), ".aria", "khala");
const KHALA_COLLAB_DIR = join(KHALA_ROOT, "channels", "collab");

// === Collab ↔ Khala 타입 매핑 ===
const COLLAB_TO_KHALA_TYPE: Record<string, string> = {
  message: "message",
  proposal: "coordination",
  question: "request",
  answer: "reply",
  "review-request": "request",
  "review-response": "reply",
  decision: "coordination",
  standup: "message",
  reaction: "message",
  summary: "message",
};

const KHALA_TO_COLLAB_TYPE: Record<string, CollabMessageType> = {
  message: "message",
  request: "question",
  reply: "answer",
  alert: "message",
  coordination: "proposal",
};

// === Khala 메시지 인터페이스 ===
interface KhalaMessage {
  id: string;
  channel: string;
  from: { instance: string; agent: string };
  to: { instance: string | null; agent: string | null };
  mention: string[];
  content: string;
  type: string;
  priority: string;
  reply_to: string | null;
  artifacts: string[];
  correlation_id: string;
  timestamp: string;
  ttl: number;
  _collab?: {
    original_type: string;
    tags: string[];
    refs: string[];
    project: string;
  };
}

// === 변환 함수 ===

/** Collab 메시지 → Khala 메시지 */
export function collabToKhala(
  msg: CollabMessage,
  projectSlug: string,
  channel: string,
): KhalaMessage {
  return {
    id: msg.id,
    channel: `collab/${projectSlug}/${channel}`,
    from: { instance: "agenthive", agent: msg.from },
    to: { instance: null, agent: null },
    mention: [],
    content: msg.content,
    type: COLLAB_TO_KHALA_TYPE[msg.type] ?? "message",
    priority: "normal",
    reply_to: msg.reply_to,
    artifacts: msg.refs,
    correlation_id: `collab-${projectSlug}-${channel}`,
    timestamp: msg.ts,
    ttl: 86400,
    _collab: {
      original_type: msg.type,
      tags: msg.tags,
      refs: msg.refs,
      project: projectSlug,
    },
  };
}

/** Khala 메시지 → Collab 메시지 */
export function khalaToCollab(msg: KhalaMessage): CollabMessage {
  const collab = msg._collab;
  const fromField = msg.from;
  const agentName = typeof fromField === "object" ? fromField.agent : String(fromField);

  return {
    id: msg.id,
    ts: msg.timestamp,
    from: agentName,
    type: (collab?.original_type as CollabMessageType) ??
      KHALA_TO_COLLAB_TYPE[msg.type] ?? "message",
    content: msg.content,
    refs: collab?.refs ?? msg.artifacts ?? [],
    tags: collab?.tags ?? [],
    reply_to: msg.reply_to ?? null,
  };
}

// === Khala 백엔드 함수 ===

/** Khala collab 채널 경로 */
function khalaChannelPath(projectSlug: string, channel: string): string {
  return join(KHALA_COLLAB_DIR, projectSlug, `${channel}.jsonl`);
}

/** Khala를 통해 메시지 publish */
export async function khalaPostMessage(
  projectSlug: string,
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
  const now = new Date();
  const date = now.toISOString().replace(/[-:T]/g, "").slice(0, 8);
  const time = now.toISOString().replace(/[-:T]/g, "").slice(8, 14);
  const safe = from.replace(/[^a-z0-9-]/g, "").slice(0, 20);

  const collabMsg: CollabMessage = {
    id: `msg-${date}-${time}-${safe}`,
    ts: now.toISOString(),
    from,
    type: options.type ?? "message",
    content,
    refs: options.refs ?? [],
    tags: options.tags ?? [],
    reply_to: options.reply_to ?? null,
  };

  const khalaMsg = collabToKhala(collabMsg, projectSlug, channel);
  const filePath = khalaChannelPath(projectSlug, channel);

  // Ensure directory exists
  const dir = join(KHALA_COLLAB_DIR, projectSlug);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await appendFile(filePath, JSON.stringify(khalaMsg) + "\n", "utf-8");
  return collabMsg;
}

/** Khala에서 Collab 메시지 읽기 */
export async function khalaReadMessages(
  projectSlug: string,
  channel: string,
  options: {
    limit?: number;
    from?: string;
    type?: CollabMessageType;
  } = {},
): Promise<CollabMessage[]> {
  const filePath = khalaChannelPath(projectSlug, channel);
  if (!existsSync(filePath)) return [];

  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());

  let messages: CollabMessage[] = [];
  for (const line of lines) {
    try {
      const khalaMsg = JSON.parse(line) as KhalaMessage;
      messages.push(khalaToCollab(khalaMsg));
    } catch {
      // Skip malformed lines
    }
  }

  if (options.from) messages = messages.filter(m => m.from === options.from);
  if (options.type) messages = messages.filter(m => m.type === options.type);

  const limit = options.limit ?? 100;
  return messages.length > limit ? messages.slice(-limit) : messages;
}

/** Khala 백엔드 사용 가능 여부 확인 */
export function isKhalaAvailable(): boolean {
  return existsSync(KHALA_ROOT) && existsSync(KHALA_COLLAB_DIR);
}

/** 프로젝트의 Khala collab 채널 목록 */
export async function khalaListChannels(projectSlug: string): Promise<string[]> {
  const dir = join(KHALA_COLLAB_DIR, projectSlug);
  if (!existsSync(dir)) return [];

  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);
  return files.filter(f => f.endsWith(".jsonl")).map(f => f.replace(".jsonl", ""));
}
