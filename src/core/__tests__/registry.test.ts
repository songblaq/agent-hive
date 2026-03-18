import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { parse } from "yaml";
import { initHub } from "../hub.js";
import { addProject, listProjects } from "../registry.js";

describe("addProject", () => {
  let tempDir: string;
  let hubPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenthive-reg-"));
    hubPath = join(tempDir, ".agenthive");
    await initHub({ hubPath });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("registers a project and creates hub dirs", async () => {
    const result = await addProject("/Users/test/projects/myapp", { hubPath });

    expect(result.created).toBe(true);
    expect(result.slug).toBe("Users--test--projects/myapp");
    expect(existsSync(join(result.projectHubPath, "project.yaml"))).toBe(true);
    expect(existsSync(join(result.projectHubPath, "context"))).toBe(true);
    expect(existsSync(join(result.projectHubPath, "tasks"))).toBe(true);
    expect(existsSync(join(result.projectHubPath, "decisions"))).toBe(true);
    expect(existsSync(join(result.projectHubPath, "threads"))).toBe(true);
    expect(existsSync(join(result.projectHubPath, "log"))).toBe(true);
  });

  it("writes correct project.yaml", async () => {
    const result = await addProject("/Users/test/projects/myapp", {
      hubPath,
      name: "My App",
    });

    const raw = await readFile(join(result.projectHubPath, "project.yaml"), "utf-8");
    const project = parse(raw);
    expect(project.id).toBe("myapp");
    expect(project.name).toBe("My App");
    expect(project.slug).toBe("Users--test--projects/myapp");
    expect(project.paths).toEqual(["/Users/test/projects/myapp"]);
  });

  it("updates registry.yaml", async () => {
    await addProject("/Users/test/projects/myapp", { hubPath });

    const raw = await readFile(join(hubPath, "registry.yaml"), "utf-8");
    const registry = parse(raw);
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0].slug).toBe("Users--test--projects/myapp");
    expect(registry.projects[0].active).toBe(true);
  });

  it("creates BACKLOG.md", async () => {
    const result = await addProject("/Users/test/projects/myapp", { hubPath });
    const backlog = await readFile(join(result.projectHubPath, "tasks/BACKLOG.md"), "utf-8");
    expect(backlog).toContain("# Task Index");
  });

  it("handles duplicate gracefully", async () => {
    const first = await addProject("/Users/test/projects/myapp", { hubPath });
    expect(first.created).toBe(true);

    const second = await addProject("/Users/test/projects/myapp", { hubPath });
    expect(second.created).toBe(false);
    expect(second.message).toContain("already registered");

    // Registry still has only one entry
    const raw = await readFile(join(hubPath, "registry.yaml"), "utf-8");
    const registry = parse(raw);
    expect(registry.projects).toHaveLength(1);
  });

  it("preserves _ in slugs", async () => {
    const result = await addProject("/Users/alice/projects/my-app", { hubPath });
    expect(result.slug).toBe("Users--alice--projects/my-app");
  });
});

describe("listProjects", () => {
  let tempDir: string;
  let hubPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenthive-list-"));
    hubPath = join(tempDir, ".agenthive");
    await initHub({ hubPath });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty for fresh hub", async () => {
    const projects = await listProjects(hubPath);
    expect(projects).toEqual([]);
  });

  it("returns registered projects", async () => {
    await addProject("/Users/test/projects/app1", { hubPath, name: "App One" });
    await addProject("/Users/test/projects/app2", { hubPath, name: "App Two" });

    const projects = await listProjects(hubPath);
    expect(projects).toHaveLength(2);
    expect(projects[0].name).toBe("App One");
    expect(projects[1].name).toBe("App Two");
  });
});
