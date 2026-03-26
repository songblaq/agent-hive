import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { parse } from "yaml";
import {
  initCollab,
  createChannel,
  postMessage,
  readMessages,
  listChannels,
} from "../collab.js";

describe("collab", () => {
  let tempDir: string;
  let hubPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenthive-collab-test-"));
    hubPath = join(tempDir, ".agenthive");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("initCollab creates config file and general channel", async () => {
    await initCollab(hubPath);
    const collabDir = join(hubPath, "collab");
    expect(existsSync(join(collabDir, "collab.yaml"))).toBe(true);
    expect(existsSync(join(collabDir, "channels", "general.jsonl"))).toBe(true);

    const raw = await readFile(join(collabDir, "collab.yaml"), "utf-8");
    const config = parse(raw) as { version: string; channels: Array<{ id: string }> };
    expect(config.version).toBe("1.0");
    expect(config.channels.some(c => c.id === "general")).toBe(true);
  });

  it("createChannel adds a new channel", async () => {
    await initCollab(hubPath);
    const channel = await createChannel(hubPath, "design", "Design discussion", "all");
    expect(channel.id).toBe("design");
    expect(channel.description).toBe("Design discussion");

    const channels = await listChannels(hubPath);
    expect(channels.map(c => c.id).sort()).toEqual(["design", "general"].sort());

    expect(existsSync(join(hubPath, "collab", "channels", "design.jsonl"))).toBe(true);
  });

  it("postMessage appends a line to the channel JSONL file", async () => {
    await initCollab(hubPath);
    const msg = await postMessage(hubPath, "general", "agent-1", "hello world");
    const raw = await readFile(join(hubPath, "collab", "channels", "general.jsonl"), "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      from: "agent-1",
      type: "message",
      content: "hello world",
      refs: [],
      tags: [],
      reply_to: null,
    });
    expect(parsed.id).toBe(msg.id);
  });

  it("readMessages returns posted messages correctly", async () => {
    await initCollab(hubPath);
    const msg = await postMessage(hubPath, "general", "alice", "first");
    const messages = await readMessages(hubPath, "general");
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(msg.id);
    expect(messages[0].from).toBe("alice");
    expect(messages[0].content).toBe("first");
  });

  it("readMessages returns empty array for an empty channel", async () => {
    await initCollab(hubPath);
    const messages = await readMessages(hubPath, "general");
    expect(messages).toEqual([]);
  });

  it("postMessage throws when channel does not exist", async () => {
    await initCollab(hubPath);
    await expect(postMessage(hubPath, "ghost", "a", "x")).rejects.toThrow(
      'Channel "ghost" does not exist',
    );
  });
});
