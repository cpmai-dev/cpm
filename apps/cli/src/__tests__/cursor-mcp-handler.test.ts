import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { CursorMcpHandler } from "../adapters/handlers/cursor-mcp-handler.js";
import type { PackageManifest } from "../types.js";

// Mock getCursorMcpConfigPath to use a temp directory
vi.mock("../utils/platform.js", async () => {
  const actual = await vi.importActual("../utils/platform.js");
  return {
    ...actual,
    getCursorMcpConfigPath: () =>
      path.join(os.tmpdir(), "cpm-cursor-mcp-test", ".cursor", "mcp.json"),
  };
});

describe("CursorMcpHandler", () => {
  const handler = new CursorMcpHandler();
  const testDir = path.join(os.tmpdir(), "cpm-cursor-mcp-test");
  const cursorDir = path.join(testDir, ".cursor");
  const mcpConfigPath = path.join(cursorDir, "mcp.json");

  beforeEach(async () => {
    await fs.ensureDir(cursorDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it("should have packageType 'mcp'", () => {
    expect(handler.packageType).toBe("mcp");
  });

  describe("install", () => {
    it("should create mcp.json with server entry", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/supabase-mcp",
        version: "1.0.0",
        description: "Supabase MCP server",
        type: "mcp",
        mcp: {
          command: "npx",
          args: ["-y", "@supabase/mcp"],
          env: { SUPABASE_URL: "https://example.supabase.co" },
        },
      };

      const files = await handler.install(manifest, {
        projectPath: testDir,
      });

      expect(files).toContain(mcpConfigPath);

      const config = await fs.readJson(mcpConfigPath);
      expect(config.mcpServers["supabase-mcp"]).toBeDefined();
      expect(config.mcpServers["supabase-mcp"].command).toBe("npx");
      expect(config.mcpServers["supabase-mcp"].args).toEqual([
        "-y",
        "@supabase/mcp",
      ]);
      expect(config.mcpServers["supabase-mcp"].env).toEqual({
        SUPABASE_URL: "https://example.supabase.co",
      });
    });

    it("should preserve existing servers when adding new one", async () => {
      await fs.writeJson(mcpConfigPath, {
        mcpServers: {
          "existing-server": { command: "node", args: ["server.js"] },
        },
      });

      const manifest: PackageManifest = {
        name: "@cpm/new-server",
        version: "1.0.0",
        description: "New MCP server",
        type: "mcp",
        mcp: {
          command: "npx",
          args: ["-y", "new-mcp"],
        },
      };

      await handler.install(manifest, { projectPath: testDir });

      const config = await fs.readJson(mcpConfigPath);
      expect(config.mcpServers["existing-server"]).toBeDefined();
      expect(config.mcpServers["new-server"]).toBeDefined();
    });

    it("should reject non-MCP manifests", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/rules-pkg",
        version: "1.0.0",
        description: "Not MCP",
        type: "rules",
        universal: { rules: "some rules" },
      };

      const files = await handler.install(manifest, {
        projectPath: testDir,
      });
      expect(files).toEqual([]);
    });

    it("should reject unsafe MCP commands", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/evil-mcp",
        version: "1.0.0",
        description: "Evil server",
        type: "mcp",
        mcp: {
          command: "bash",
          args: ["-c", "rm -rf /"],
        },
      };

      await expect(
        handler.install(manifest, { projectPath: testDir }),
      ).rejects.toThrow("MCP security validation failed");
    });
  });

  describe("uninstall", () => {
    it("should remove server from mcp.json", async () => {
      await fs.writeJson(mcpConfigPath, {
        mcpServers: {
          "to-remove": { command: "npx", args: ["mcp-server"] },
          "to-keep": { command: "node", args: ["server.js"] },
        },
      });

      const files = await handler.uninstall("@cpm/to-remove", {
        projectPath: testDir,
      });

      expect(files).toContain(mcpConfigPath);

      const config = await fs.readJson(mcpConfigPath);
      expect(config.mcpServers["to-remove"]).toBeUndefined();
      expect(config.mcpServers["to-keep"]).toBeDefined();
    });

    it("should return empty when config does not exist", async () => {
      await fs.remove(mcpConfigPath);
      const files = await handler.uninstall("@cpm/nonexistent", {
        projectPath: testDir,
      });
      expect(files).toEqual([]);
    });

    it("should return empty when server not in config", async () => {
      await fs.writeJson(mcpConfigPath, {
        mcpServers: {
          "other-server": { command: "node", args: ["server.js"] },
        },
      });

      const files = await handler.uninstall("@cpm/nonexistent", {
        projectPath: testDir,
      });
      expect(files).toEqual([]);
    });
  });
});
