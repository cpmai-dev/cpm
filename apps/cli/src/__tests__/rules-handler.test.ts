import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import type { PackageManifest } from "../types.js";

// Mock getClaudeHome to use a temp directory instead of real ~/.claude
const mockClaudeHome = vi.hoisted(() => ({ value: "" }));

vi.mock("../utils/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/config.js")>();
  return {
    ...actual,
    getClaudeHome: () => mockClaudeHome.value,
  };
});

// Import after mock setup
const { RulesHandler } = await import("../adapters/handlers/rules-handler.js");

describe("RulesHandler", () => {
  const handler = new RulesHandler();
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpm-rules-handler-"));
    mockClaudeHome.value = tmpDir;
    await fs.ensureDir(path.join(tmpDir, "rules"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("should have packageType 'rules'", () => {
    expect(handler.packageType).toBe("rules");
  });

  describe("install from manifest content", () => {
    it("should create RULES.md with content", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/typescript-rules",
        version: "1.0.0",
        description: "TypeScript coding standards",
        type: "rules",
        universal: {
          rules: "## Always use strict mode\n- Enable strict TypeScript",
        },
      };

      const files = await handler.install(manifest, {
        projectPath: process.cwd(),
      });

      expect(files.length).toBeGreaterThan(0);

      const rulesFile = files.find((f) => f.endsWith("RULES.md"));
      expect(rulesFile).toBeDefined();

      const content = await fs.readFile(rulesFile!, "utf-8");
      expect(content).toContain("## Always use strict mode");
      expect(content).toContain("@cpm/typescript-rules");
    });

    it("should create .cpm.json metadata", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/test-rules",
        version: "2.0.0",
        description: "Test rules",
        type: "rules",
        universal: { rules: "Some rules content" },
      };

      const files = await handler.install(manifest, {
        projectPath: process.cwd(),
      });

      const metadataFile = files.find((f) => f.endsWith(".cpm.json"));
      expect(metadataFile).toBeDefined();

      const metadata = await fs.readJson(metadataFile!);
      expect(metadata.name).toBe("@cpm/test-rules");
      expect(metadata.version).toBe("2.0.0");
      expect(metadata.type).toBe("rules");
    });
  });

  describe("install from package files", () => {
    it("should copy .md files from packagePath", async () => {
      const packagePath = path.join(tmpDir, "pkg");
      await fs.ensureDir(packagePath);
      await fs.writeFile(
        path.join(packagePath, "coding-standards.md"),
        "# Coding Standards\n\nUse strict mode.",
        "utf-8",
      );

      const manifest: PackageManifest = {
        name: "@cpm/file-rules",
        version: "1.0.0",
        description: "File-based rules",
        type: "rules",
        universal: { rules: "fallback" },
      };

      const files = await handler.install(manifest, {
        projectPath: process.cwd(),
        packagePath,
      });

      const mdFile = files.find((f) => f.endsWith("coding-standards.md"));
      expect(mdFile).toBeDefined();

      const content = await fs.readFile(mdFile!, "utf-8");
      expect(content).toContain("# Coding Standards");
    });
  });

  describe("missing content handling", () => {
    it("should warn and clean up directory when no content is found", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/empty-rules",
        version: "1.0.0",
        description: "Empty rules",
        type: "rules",
      };

      const files = await handler.install(manifest, {
        projectPath: process.cwd(),
      });

      expect(files).toHaveLength(0);

      const rulesDir = path.join(tmpDir, "rules", "cpm-empty-rules");
      expect(await fs.pathExists(rulesDir)).toBe(false);
    });

    it("should warn and clean up when packagePath is empty", async () => {
      const emptyPkgDir = path.join(tmpDir, "empty-pkg");
      await fs.ensureDir(emptyPkgDir);

      const manifest: PackageManifest = {
        name: "@cpm/no-files",
        version: "1.0.0",
        description: "No files",
        type: "rules",
      };

      const files = await handler.install(manifest, {
        projectPath: process.cwd(),
        packagePath: emptyPkgDir,
      });

      expect(files).toHaveLength(0);

      const rulesDir = path.join(tmpDir, "rules", "cpm-no-files");
      expect(await fs.pathExists(rulesDir)).toBe(false);
    });
  });

  describe("uninstall", () => {
    it("should remove package directory", async () => {
      const manifest: PackageManifest = {
        name: "@cpm/to-remove",
        version: "1.0.0",
        description: "Remove me",
        type: "rules",
        universal: { rules: "Temporary rules" },
      };

      await handler.install(manifest, { projectPath: process.cwd() });
      const removed = await handler.uninstall("@cpm/to-remove", {
        projectPath: process.cwd(),
      });

      expect(removed.length).toBeGreaterThan(0);

      for (const p of removed) {
        expect(await fs.pathExists(p)).toBe(false);
      }
    });

    it("should return empty array for non-existent package", async () => {
      const removed = await handler.uninstall("@cpm/nonexistent", {
        projectPath: process.cwd(),
      });
      expect(removed).toEqual([]);
    });
  });
});
