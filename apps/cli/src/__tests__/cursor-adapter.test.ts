import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { CursorAdapter } from "../adapters/cursor.js";
import type { PackageManifest } from "../types.js";

// Mock getCursorMcpConfigPath for MCP tests
vi.mock("../utils/platform.js", async () => {
  const actual = await vi.importActual("../utils/platform.js");
  return {
    ...actual,
    getCursorMcpConfigPath: () =>
      path.join(os.tmpdir(), "cpm-cursor-adapter-test", ".cursor", "mcp.json"),
  };
});

describe("CursorAdapter", () => {
  const adapter = new CursorAdapter();
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), "cpm-cursor-adapter-test");
    projectPath = path.join(tmpDir, "project");
    await fs.ensureDir(path.join(projectPath, ".cursor", "rules"));
    await fs.ensureDir(path.join(tmpDir, ".cursor"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("should have platform 'cursor'", () => {
    expect(adapter.platform).toBe("cursor");
  });

  it("should have displayName 'Cursor'", () => {
    expect(adapter.displayName).toBe("Cursor");
  });

  describe("install rules", () => {
    it("should install rules as .mdc files", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/ts-rules",
        version: "1.0.0",
        description: "TypeScript rules",
        type: "rules",
        universal: { rules: "Use strict mode" },
      };

      const result = await adapter.install(manifest, projectPath);

      expect(result.success).toBe(true);
      expect(result.platform).toBe("cursor");
      expect(result.filesWritten.length).toBeGreaterThan(0);
      expect(result.filesWritten.some((f) => f.endsWith(".mdc"))).toBe(true);
    });
  });

  describe("install MCP", () => {
    it("should install MCP servers", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/test-mcp",
        version: "1.0.0",
        description: "Test MCP",
        type: "mcp",
        mcp: {
          command: "npx",
          args: ["-y", "test-mcp-server"],
        },
      };

      const result = await adapter.install(manifest, projectPath);

      expect(result.success).toBe(true);
      expect(result.platform).toBe("cursor");
      expect(result.filesWritten.length).toBeGreaterThan(0);
    });
  });

  describe("install skill (unsupported)", () => {
    it("should skip skill packages with warning", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/commit-skill",
        version: "1.0.0",
        description: "Commit skill",
        type: "skill",
        skill: { command: "/commit", description: "Create commits" },
      };

      const result = await adapter.install(manifest, projectPath);

      expect(result.success).toBe(true);
      expect(result.platform).toBe("cursor");
      expect(result.filesWritten).toEqual([]);
    });
  });

  describe("uninstall", () => {
    it("should remove installed rules", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/remove-me",
        version: "1.0.0",
        description: "Remove me",
        type: "rules",
        universal: { rules: "Temporary" },
      };

      await adapter.install(manifest, projectPath);
      const result = await adapter.uninstall("remove-me", projectPath);

      expect(result.success).toBe(true);
      expect(result.platform).toBe("cursor");
    });
  });

  describe("isAvailable", () => {
    it("should return true", async () => {
      const available = await adapter.isAvailable(projectPath);
      expect(available).toBe(true);
    });
  });
});
