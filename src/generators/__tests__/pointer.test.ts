import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { generatePointerFiles } from "../pointer.js";
import type { PointerContext } from "../pointer.js";

describe("generatePointerFiles", () => {
  let tempDir: string;
  let ctx: PointerContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenthive-ptr-"));
    ctx = {
      projectName: "TestApp",
      projectDescription: "A test application",
      hubPath: "~/.agenthive",
      slug: "Users--test--projects/testapp",
      hubProjectPath: "~/.agenthive/projects/Users--test--projects/testapp",
      repoPath: tempDir,
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("generates CLAUDE.md for claude target", async () => {
    const files = await generatePointerFiles(ctx, "claude");
    expect(files.length).toBeGreaterThanOrEqual(2); // pointer.yaml + CLAUDE.md (+ optional skill symlink)

    const content = await readFile(join(tempDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("TestApp");
    expect(content).toContain("~/.agenthive/PROTOCOL.md");
    expect(content).toContain(ctx.hubProjectPath);
  });

  it("generates AGENTS.md for codex target", async () => {
    const files = await generatePointerFiles(ctx, "codex");
    expect(files.length).toBeGreaterThanOrEqual(2);

    const content = await readFile(join(tempDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("AgentHive collaboration protocol");
    expect(content).toContain(ctx.hubProjectPath);
  });

  it("generates cursor rules for cursor target", async () => {
    const files = await generatePointerFiles(ctx, "cursor");
    expect(files.length).toBeGreaterThanOrEqual(2);

    const rulePath = join(tempDir, ".cursor", "rules", "00-agenthive.mdc");
    expect(existsSync(rulePath)).toBe(true);
    const content = await readFile(rulePath, "utf-8");
    expect(content).toContain("alwaysApply: true");
    expect(content).toContain(ctx.hubProjectPath);
  });

  it("generates copilot instructions for copilot target", async () => {
    const files = await generatePointerFiles(ctx, "copilot");
    expect(files.length).toBeGreaterThanOrEqual(2);

    const path = join(tempDir, ".github", "copilot-instructions.md");
    expect(existsSync(path)).toBe(true);
    const content = await readFile(path, "utf-8");
    expect(content).toContain("TestApp");
    expect(content).toContain(ctx.hubProjectPath);
  });

  it("generates all files for 'all' target", async () => {
    const files = await generatePointerFiles(ctx, "all");
    // pointer.yaml + 7 agents = 8 (+ optional skill symlinks)
    expect(files.length).toBeGreaterThanOrEqual(8);

    expect(existsSync(join(tempDir, ".agenthive.pointer.yaml"))).toBe(true);
    expect(existsSync(join(tempDir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(tempDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tempDir, ".cursor", "rules", "00-agenthive.mdc"))).toBe(true);
    expect(existsSync(join(tempDir, ".github", "copilot-instructions.md"))).toBe(true);
    expect(existsSync(join(tempDir, ".antigravity", "agenthive.md"))).toBe(true);
    expect(existsSync(join(tempDir, ".vscode", "agenthive.md"))).toBe(true);
    expect(existsSync(join(tempDir, ".openclaw", "agenthive.md"))).toBe(true);
  });

  it("always generates .agenthive.pointer.yaml", async () => {
    await generatePointerFiles(ctx, "claude");
    const content = await readFile(join(tempDir, ".agenthive.pointer.yaml"), "utf-8");
    expect(content).toContain("hub:");
    expect(content).toContain(ctx.slug);
  });
});
