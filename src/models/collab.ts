/**
 * Collab — Agent-to-agent communication layer
 * JSONL-based append-only conversation system
 */

export type CollabMessageType =
  | "message"
  | "proposal"
  | "question"
  | "answer"
  | "review-request"
  | "review-response"
  | "decision"
  | "standup"
  | "reaction"
  | "summary";

export const COLLAB_MESSAGE_TYPES: CollabMessageType[] = [
  "message", "proposal", "question", "answer",
  "review-request", "review-response", "decision",
  "standup", "reaction", "summary",
];

export interface CollabMessage {
  id: string;
  ts: string;
  from: string;
  type: CollabMessageType;
  content: string;
  refs: string[];
  tags: string[];
  reply_to: string | null;
}

export interface CollabChannel {
  id: string;
  description: string;
  visibility: string[] | "all";
  auto_summary?: boolean;
}

export interface CollabConfig {
  version: string;
  channels: CollabChannel[];
  rules: {
    max_message_size: number;
    require_type: boolean;
    auto_archive_days: number;
  };
}

export interface CollabProfile {
  agent_id: string;
  display_name: string;
  role_preferences: string[];
  communication_style: string;
  expertise: string[];
  availability: string;
  auto_standup: boolean;
}

export const DEFAULT_COLLAB_CONFIG: CollabConfig = {
  version: "1.0",
  channels: [
    { id: "general", description: "General project discussion", visibility: "all" },
  ],
  rules: {
    max_message_size: 4096,
    require_type: false,
    auto_archive_days: 30,
  },
};
