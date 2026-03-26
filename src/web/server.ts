import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { timingSafeEqual } from "node:crypto";
import { DEFAULT_HUB_PATH, REGISTRY_FILE, PROJECTS_DIR } from "../core/constants.js";
import { readYaml } from "../core/yaml-utils.js";
import { createTask, claimTask, completeTask, listTasks } from "../core/task-manager.js";
import { addProject, listProjects } from "../core/registry.js";
import { listChannelsWithStats, readMessages, postMessage, createChannel } from "../core/collab.js";
import { resolveHarness, harnessExists } from "../core/harness.js";
import { getSyncStatus, syncExists } from "../core/sync.js";
import type { Registry } from "../models/registry.js";
import type { HubConfig } from "../models/config.js";
import type { Project } from "../models/project.js";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dashboardHtml } from "./dashboard.js";

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

const MUTATION_API_TOKEN = (process.env.AGENTHIVE_API_TOKEN ?? "").trim();

const AGENTHIVE_LOG_JSON =
  (process.env.AGENTHIVE_LOG_FORMAT ?? "").trim().toLowerCase() === "json";

function maskHomeInPath(p: string): string {
  const home = homedir();
  if (!p || !home) return p;
  if (p === home) return "~";
  if (p.startsWith(home + "/") || p.startsWith(home + "\\")) {
    return "~" + p.slice(home.length);
  }
  return p;
}

function requireMutationAuth(req: IncomingMessage, res: ServerResponse, corsOrigin: string): boolean {
  if (!MUTATION_API_TOKEN) return true;
  const raw = (req.headers.authorization ?? "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) {
    json(res, 401, { error: "Unauthorized" }, corsOrigin);
    return false;
  }
  const token = raw.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(MUTATION_API_TOKEN, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    json(res, 403, { error: "Forbidden" }, corsOrigin);
    return false;
  }
  return true;
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      size += typeof chunk === "string" ? chunk.length : chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown, corsOrigin?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (corsOrigin) headers["Access-Control-Allow-Origin"] = corsOrigin;
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

function validateSlug(slug: string, hub: string): boolean {
  if (!slug) return false;
  if (slug.includes("..") || slug.includes("\0")) return false;
  // Verify resolved path stays inside projects dir
  const resolved = resolve(join(hub, PROJECTS_DIR, slug));
  const base = resolve(join(hub, PROJECTS_DIR));
  return resolved.startsWith(base + "/");
}

async function getProjects(hubPath: string) {
  const registry = await readYaml<Registry>(join(hubPath, REGISTRY_FILE));
  const projects = [];
  for (const entry of registry.projects) {
    const projectHubPath = join(hubPath, PROJECTS_DIR, entry.slug);
    let description = "";
    let activeAgents: { agent_id: string; default_role: string }[] = [];
    try {
      const project = await readYaml<Project>(join(projectHubPath, "project.yaml"));
      description = project.description || "";
      activeAgents = project.active_agents || [];
    } catch { /* skip */ }
    const tasks = await listTasks(projectHubPath);
    const taskCounts: Record<string, number> = {};
    for (const t of tasks) {
      taskCounts[t.status] = (taskCounts[t.status] || 0) + 1;
    }
    projects.push({ slug: entry.slug, name: entry.name, description, path: maskHomeInPath(entry.path), active: entry.active, activeAgents, taskCounts });
  }
  return projects;
}

async function getDecisions(hubPath: string, slug: string) {
  const dir = join(hubPath, PROJECTS_DIR, slug, "decisions");
  if (!existsSync(dir)) return [];
  const items = await readdir(dir);
  const results = [];
  for (const item of items) {
    if (item.endsWith(".yaml")) {
      try { results.push(await readYaml<Record<string, unknown>>(join(dir, item))); } catch { /* skip */ }
    }
  }
  return results;
}

async function getLog(hubPath: string, slug: string) {
  const dir = join(hubPath, PROJECTS_DIR, slug, "log");
  if (!existsSync(dir)) return [];
  const items = await readdir(dir);
  const logs = [];
  for (const item of items.sort().reverse()) {
    if (item.endsWith(".md")) {
      logs.push({ date: item.replace(".md", ""), content: await readFile(join(dir, item), "utf-8") });
    }
  }
  return logs;
}

async function getThreads(hubPath: string, slug: string) {
  const dir = join(hubPath, PROJECTS_DIR, slug, "threads");
  if (!existsSync(dir)) return [];
  const items = await readdir(dir);
  const threads = [];
  for (const item of items.sort().reverse()) {
    if (item.endsWith(".md")) {
      threads.push({ name: item.replace(".md", ""), content: await readFile(join(dir, item), "utf-8") });
    }
  }
  return threads;
}

export function startServer(port: number, hubPath?: string, defaultProject?: string): Server {
  if (!process.env.AGENTHIVE_API_TOKEN) {
    console.warn("[WARN] AGENTHIVE_API_TOKEN not set — mutation APIs are unprotected");
  }
  const hub = hubPath ?? DEFAULT_HUB_PATH;
  const origin = `http://localhost:${port}`;

  const server = createServer(async (req, res) => {
    const reqStart = Date.now();
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const projectParam = url.searchParams.get("project") ?? "";
    if (AGENTHIVE_LOG_JSON) {
      res.once("finish", () => {
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            method: req.method ?? "GET",
            path: url.pathname,
            project: projectParam,
            status: res.statusCode,
            duration_ms: Date.now() - reqStart,
          }),
        );
      });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    const slug = projectParam;
    if (slug && !validateSlug(slug, hub)) {
      json(res, 400, { error: "Invalid project slug" }, origin);
      return;
    }
    const projectHubPath = slug ? join(hub, PROJECTS_DIR, slug) : "";

    try {
      // === READ APIs ===
      if (req.method === "GET" && url.pathname === "/api/projects") {
        json(res, 200, await getProjects(hub), origin);
      } else if (req.method === "GET" && url.pathname === "/api/tasks") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        json(res, 200, await listTasks(projectHubPath), origin);
      } else if (req.method === "GET" && url.pathname === "/api/decisions") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        json(res, 200, await getDecisions(hub, slug), origin);
      } else if (req.method === "GET" && url.pathname === "/api/log") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        json(res, 200, await getLog(hub, slug), origin);
      } else if (req.method === "GET" && url.pathname === "/api/threads") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        json(res, 200, await getThreads(hub, slug), origin);

      // === COLLAB APIs ===
      } else if (req.method === "GET" && url.pathname === "/api/collab/channels") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        json(res, 200, await listChannelsWithStats(projectHubPath), origin);

      } else if (req.method === "GET" && url.pathname === "/api/collab/messages") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const channel = url.searchParams.get("channel") ?? "general";
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        const from = url.searchParams.get("from") ?? undefined;
        const type = url.searchParams.get("type") ?? undefined;
        json(res, 200, await readMessages(projectHubPath, channel, { limit, from, type: type as any }), origin);

      } else if (req.method === "GET" && url.pathname === "/api/harness") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        if (!harnessExists(projectHubPath)) { json(res, 200, { exists: false, harness: null }, origin); return; }
        const resolved = await resolveHarness(projectHubPath, hub);
        json(res, 200, { exists: true, harness: resolved }, origin);

      } else if (req.method === "GET" && url.pathname === "/api/sync/status") {
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        if (!syncExists(projectHubPath)) { json(res, 200, { exists: false, status: null }, origin); return; }
        const status = await getSyncStatus(projectHubPath);
        json(res, 200, { exists: true, status }, origin);

      } else if (req.method === "GET" && url.pathname === "/api/config") {
        const config = await readYaml<HubConfig>(join(hub, "config.yaml"));
        json(res, 200, { version: config.version, display_language: config.display_language }, origin);

      // === MUTATION APIs ===
      } else if (req.method === "POST" && url.pathname.startsWith("/api/") && !requireMutationAuth(req, res, origin)) {
        return;
      } else if (req.method === "POST" && url.pathname === "/api/tasks/create") {
        const body = await parseBody(req);
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const result = await createTask(projectHubPath, {
          title: String(body.title || ""),
          category: String(body.category || "general"),
          priority: String(body.priority || "medium"),
          createdBy: String(body.created_by || "human"),
          scopePath: String(body.scope_path || "/"),
          scopeFiles: Array.isArray(body.scope_files) ? body.scope_files as string[] : [],
        });
        json(res, 201, result, origin);

      } else if (req.method === "POST" && url.pathname === "/api/tasks/claim") {
        const body = await parseBody(req);
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const result = await claimTask(
          projectHubPath,
          String(body.task_id || ""),
          String(body.agent || "human"),
          String(body.role || "builder"),
        );
        json(res, result.success ? 200 : 409, result, origin);

      } else if (req.method === "POST" && url.pathname === "/api/tasks/status") {
        const body = await parseBody(req);
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const result = await completeTask(
          projectHubPath,
          String(body.task_id || ""),
          (body.status as any) || "done",
          String(body.agent ?? ""),
        );
        const status = result.success ? 200 : result.forbidden ? 403 : 400;
        json(res, status, result, origin);

      } else if (req.method === "POST" && url.pathname === "/api/projects/add") {
        const body = await parseBody(req);
        const result = await addProject(String(body.path || ""), {
          hubPath: hub,
          name: body.name ? String(body.name) : undefined,
        });
        json(res, result.created ? 201 : 200, result, origin);

      } else if (req.method === "POST" && url.pathname === "/api/collab/post") {
        const body = await parseBody(req);
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const result = await postMessage(
          projectHubPath,
          String(body.channel || "general"),
          String(body.from || "anonymous"),
          String(body.content || ""),
          {
            type: body.type as any,
            refs: Array.isArray(body.refs) ? body.refs as string[] : undefined,
            tags: Array.isArray(body.tags) ? body.tags as string[] : undefined,
            reply_to: body.reply_to ? String(body.reply_to) : undefined,
          },
        );
        json(res, 201, result, origin);

      } else if (req.method === "POST" && url.pathname === "/api/collab/channel") {
        const body = await parseBody(req);
        if (!slug) { json(res, 400, { error: "project required" }, origin); return; }
        const result = await createChannel(
          projectHubPath,
          String(body.id || ""),
          String(body.description || ""),
        );
        json(res, 201, result, origin);

      // === Dashboard HTML ===
      } else {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(dashboardHtml(defaultProject));
      }
    } catch (err) {
      const status = err instanceof Error && err.message === "Invalid JSON" ? 400
        : err instanceof Error && err.message === "Request body too large" ? 413
        : 500;
      const message = status === 400 ? "Invalid request body"
        : status === 413 ? "Request body too large"
        : "Internal server error";
      json(res, status, { error: message }, origin);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const addr = server.address();
    const displayPort = typeof addr === "object" && addr ? addr.port : port;
    console.log(`\n  AgentHive Dashboard`);
    console.log(`  http://localhost:${displayPort}\n`);
    console.log(`  Hub: ${hub}`);
    if (defaultProject) console.log(`  Project: ${defaultProject}`);
    console.log(`  Press Ctrl+C to stop\n`);
  });
  return server;
}
