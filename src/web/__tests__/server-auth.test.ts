import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { initHub } from "../../core/hub.js";

const TEST_TOKEN = "test-secret-token";

function httpRequest(
  port: number,
  method: string,
  path: string,
  opts?: { headers?: Record<string, string>; body?: string },
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path,
        headers: opts?.headers ?? {},
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body: data });
        });
      },
    );
    req.on("error", reject);
    if (opts?.body !== undefined) req.write(opts.body);
    req.end();
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function listeningPort(server: Server): Promise<number> {
  await once(server, "listening");
  const addr = server.address() as AddressInfo;
  return addr.port;
}

describe("web server mutation auth (no AGENTHIVE_API_TOKEN)", () => {
  let hubPath: string;
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const base = await mkdtemp(join(tmpdir(), "agenthive-auth-none-"));
    hubPath = join(base, "hub");
    await initHub({ hubPath });

    delete process.env.AGENTHIVE_API_TOKEN;
    vi.resetModules();
    const { startServer } = await import("../server.js");
    server = startServer(0, hubPath);
    port = await listeningPort(server);
  });

  afterAll(async () => {
    await closeServer(server);
    await rm(join(hubPath, ".."), { recursive: true, force: true });
    vi.resetModules();
  });

  it("allows mutation API when token is unset (not 401/403)", async () => {
    const { statusCode } = await httpRequest(port, "POST", "/api/tasks/create", {
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(statusCode).not.toBe(401);
    expect(statusCode).not.toBe(403);
  });
});

describe("web server mutation auth (AGENTHIVE_API_TOKEN set)", () => {
  let hubPath: string;
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const base = await mkdtemp(join(tmpdir(), "agenthive-auth-token-"));
    hubPath = join(base, "hub");
    await initHub({ hubPath });
    await mkdir(join(hubPath, "projects", "p1"), { recursive: true });

    process.env.AGENTHIVE_API_TOKEN = TEST_TOKEN;
    vi.resetModules();
    const { startServer } = await import("../server.js");
    server = startServer(0, hubPath);
    port = await listeningPort(server);
  });

  afterAll(async () => {
    await closeServer(server);
    await rm(join(hubPath, ".."), { recursive: true, force: true });
    delete process.env.AGENTHIVE_API_TOKEN;
    vi.resetModules();
  });

  it("rejects mutation without Authorization when token is set (401)", async () => {
    const { statusCode } = await httpRequest(port, "POST", "/api/tasks/create", {
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(statusCode).toBe(401);
  });

  it("rejects mutation with wrong Bearer token (403)", async () => {
    const { statusCode } = await httpRequest(port, "POST", "/api/tasks/create", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-token",
      },
      body: "{}",
    });
    expect(statusCode).toBe(403);
  });

  it("allows mutation with correct Bearer token (2xx, not 401/403)", async () => {
    const { statusCode } = await httpRequest(
      port,
      "POST",
      "/api/tasks/create?project=p1",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ title: "auth test task" }),
      },
    );
    expect(statusCode).toBeGreaterThanOrEqual(200);
    expect(statusCode).toBeLessThan(300);
    expect(statusCode).not.toBe(401);
    expect(statusCode).not.toBe(403);
  });

  it("allows GET /api/projects regardless of token (200)", async () => {
    const { statusCode } = await httpRequest(port, "GET", "/api/projects");
    expect(statusCode).toBe(200);
  });
});
