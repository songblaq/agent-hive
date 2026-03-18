import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { parse } from "yaml";
import { initHub, hubExists } from "../hub.js";

describe("initHub", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenthive-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates hub with default structure", async () => {
    const hubPath = join(tempDir, ".agenthive");
    const result = await initHub({ hubPath });

    expect(result.created).toBe(true);
    expect(existsSync(join(hubPath, "config.yaml"))).toBe(true);
    expect(existsSync(join(hubPath, "registry.yaml"))).toBe(true);
    expect(existsSync(join(hubPath, "PROTOCOL.md"))).toBe(true);
    expect(existsSync(join(hubPath, "agents"))).toBe(true);
  });

  it("writes correct config with language", async () => {
    const hubPath = join(tempDir, ".agenthive");
    await initHub({ hubPath, displayLanguage: "ko" });

    const raw = await readFile(join(hubPath, "config.yaml"), "utf-8");
    const config = parse(raw);
    expect(config.version).toBe("1.0");
    expect(config.display_language).toBe("ko");
    expect(config.internal_language).toBe("en");
  });

  it("is idempotent — second run does not overwrite", async () => {
    const hubPath = join(tempDir, ".agenthive");

    const first = await initHub({ hubPath, displayLanguage: "ko" });
    expect(first.created).toBe(true);

    const second = await initHub({ hubPath, displayLanguage: "ja" });
    expect(second.created).toBe(false);
    expect(second.message).toContain("already exists");

    // Original language preserved
    const raw = await readFile(join(hubPath, "config.yaml"), "utf-8");
    const config = parse(raw);
    expect(config.display_language).toBe("ko");
  });

  it("writes empty registry", async () => {
    const hubPath = join(tempDir, ".agenthive");
    await initHub({ hubPath });

    const raw = await readFile(join(hubPath, "registry.yaml"), "utf-8");
    const registry = parse(raw);
    expect(registry.version).toBe("1.0");
    expect(registry.projects).toEqual([]);
  });
});

describe("hubExists", () => {
  it("returns false for non-existent path", () => {
    expect(hubExists("/tmp/nonexistent-agenthive-path")).toBe(false);
  });
});
